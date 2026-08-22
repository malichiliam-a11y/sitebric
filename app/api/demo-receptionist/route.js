import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "node:crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { systemPrompt, interpretReply, TURN_MODEL, TURN_MAX_TOKENS } from "@/lib/receptionist";
import {
  DEMO_BUSINESS,
  DEMO_FACTS,
  DEMO_CHAT_MAX_TURNS,
  DEMO_CHAT_TURNS_PER_DAY,
  sanitizeHistory,
  turnsUsed,
  outOfTurnsMessage,
  rateLimitedMessage,
} from "@/lib/demo-chat";

// The receptionist, in a browser.
//
// Public and unauthenticated on purpose — the whole point is that someone
// who has not signed up can hear it work. Which also means this is the
// one route in the product where a stranger can spend our Anthropic
// credit, so the ceiling below is not a nicety: without it, one person
// with a loop empties the balance and every paying customer's site
// generation stops.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MODEL_TIMEOUT_MS = 12000;

// Hashed, not stored. This is a rate-limit counter and does not need to
// be able to identify anybody. Salted with the service key so the table
// is not a rainbow-table of visitor IPs if it ever leaks.
function ipHash(req) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return crypto
    .createHash("sha256")
    .update(`${ip}:${process.env.SUPABASE_SERVICE_ROLE_KEY || "salt"}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Counts this turn against the day's allowance.
 *
 * Fails OPEN: if the counter is unreachable the demo still answers.
 * A prospect hitting an error is a lost customer; a few uncounted turns
 * during a database blip is a few cents. Same reasoning as
 * lib/entitlements.js, and the opposite of how plan limits work.
 */
async function overDailyLimit(hash) {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const { data } = await supabaseAdmin
      .from("demo_chat_usage")
      .select("turns")
      .eq("ip_hash", hash)
      .eq("day", day)
      .maybeSingle();

    const used = Number(data?.turns || 0);
    if (used >= DEMO_CHAT_TURNS_PER_DAY) return true;

    await supabaseAdmin
      .from("demo_chat_usage")
      .upsert(
        { ip_hash: hash, day, turns: used + 1, updated_at: new Date().toISOString() },
        { onConflict: "ip_hash,day" }
      );
    return false;
  } catch (err) {
    console.error("demo rate limit check failed:", err?.message);
    return false;
  }
}

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ reply: rateLimitedMessage(), done: true });
  }

  const body = await req.json().catch(() => ({}));
  const said = String(body.said || "").trim().slice(0, 500);
  const history = sanitizeHistory(body.history);

  if (!said) {
    return NextResponse.json({ reply: "Sorry, I didn't catch that.", done: false });
  }

  // Counted here rather than trusted from the browser, which posts the
  // transcript back on every turn and could simply send a shorter one.
  if (turnsUsed(history) >= DEMO_CHAT_MAX_TURNS) {
    return NextResponse.json({ reply: outOfTurnsMessage(), done: true });
  }

  if (await overDailyLimit(ipHash(req))) {
    return NextResponse.json({ reply: rateLimitedMessage(), done: true });
  }

  // The same prompt a real call runs, against the same fenced facts. A
  // demo that behaves better than the product is a lie told to a
  // prospect.
  const messages = [...history, { role: "user", text: said }].map((m) => ({
    role: m.role,
    content: m.text,
  }));

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), MODEL_TIMEOUT_MS);
  let raw = "";
  try {
    const result = await anthropic.messages.create(
      {
        model: TURN_MODEL,
        max_tokens: TURN_MAX_TOKENS,
        system: systemPrompt({
          businessName: DEMO_BUSINESS,
          businessFacts: DEMO_FACTS,
          canForward: false,
          canBook: false,
        }),
        messages,
      },
      { signal: abort.signal }
    );
    raw = result.content?.map((c) => c.text || "").join("") || "";
  } catch (err) {
    console.error("demo receptionist failed:", err?.message);
    return NextResponse.json({
      reply: "Sorry, could you say that once more for me?",
      done: false,
    });
  } finally {
    clearTimeout(timer);
  }

  const reply = interpretReply(raw, { canForward: false, canBook: false });
  return NextResponse.json({
    reply: reply.text,
    // The phone version hangs up here. In a browser there is nothing to
    // hang up, and ending the conversation on someone who is still
    // curious is the opposite of what a demo is for — so it just keeps
    // listening.
    done: false,
  });
}
