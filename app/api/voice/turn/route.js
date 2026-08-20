import Anthropic from "@anthropic-ai/sdk";
import { readTwilioRequest, supabaseAdmin } from "@/lib/voice-request";
import { publicUrlFor } from "@/lib/twilio-signature";
import { sayAndGather, sayAndDial, sayAndHangUp, twimlResponse } from "@/lib/twiml";
import {
  systemPrompt,
  interpretReply,
  silenceReply,
  outOfTurnsReply,
  TURN_MODEL,
  TURN_MAX_TOKENS,
  MAX_TURNS,
  DEMO_MAX_TURNS,
} from "@/lib/receptionist";

// One exchange: the caller said something, work out what to say back.
//
// The hard constraint here is not correctness, it is TIME. Twilio gives a
// webhook about fifteen seconds before it gives up and drops the call, and
// every second before that is dead air in someone's ear. So the model call
// runs under an abort well inside that budget, and if it does not land in
// time the caller gets a real sentence rather than silence followed by a
// disconnection.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const dynamic = "force-dynamic";
export const maxDuration = 15;

// Comfortably inside Twilio's patience, leaving room for the database
// round trips either side.
const MODEL_TIMEOUT_MS = 8000;

export async function POST(req) {
  const url = new URL(req.url);
  const callId = url.searchParams.get("call") || "";
  const silences = Number(url.searchParams.get("s") || 0);

  // The query string is part of what Twilio signed, so it is rebuilt
  // exactly rather than approximated.
  const auth = await readTwilioRequest(
    req,
    `/api/voice/turn?call=${encodeURIComponent(callId)}&s=${silences}`
  );
  if (!auth.ok) {
    console.warn(`voice/turn rejected: ${auth.reason}`);
    return new Response("forbidden", { status: 403 });
  }

  const spoken = String(auth.params.SpeechResult || "").trim().slice(0, 1000);

  try {
    const { data: call } = await supabaseAdmin
      .from("receptionist_calls")
      .select("*, receptionist_numbers(*)")
      .eq("id", callId)
      .maybeSingle();

    const number = call?.receptionist_numbers;
    if (!call || !number) {
      return twimlResponse(
        sayAndHangUp("Sorry, something went wrong with this call. Please try again.")
      );
    }

    const canForward = Boolean(number.forward_to);
    const transcript = Array.isArray(call.transcript) ? call.transcript : [];

    // Silence. Twilio posts an empty SpeechResult, and the answer is not
    // to ask the same question forever.
    if (!spoken) {
      const reply = silenceReply(silences);
      return respond({ reply, callId, silences: silences + 1, transcript, number, call });
    }

    const withCaller = [...transcript, { role: "caller", text: spoken }];

    // Past the ceiling this call is not going anywhere and is costing
    // money on every exchange. The public demo line gets a lower one: it
    // has to prove the thing works, not book a job, and every turn on it
    // is spent on someone who might just be poking it.
    const ceiling = number.is_demo ? DEMO_MAX_TURNS : MAX_TURNS;
    const callerTurns = withCaller.filter((t) => t.role === "caller").length;
    if (callerTurns > ceiling) {
      return respond({
        reply: outOfTurnsReply(),
        callId,
        silences: 0,
        transcript: withCaller,
        number,
        call,
      });
    }

    const messages = withCaller.map((t) => ({
      role: t.role === "caller" ? "user" : "assistant",
      content: t.text,
    }));
    // The model must be answering something. A transcript that somehow
    // starts with the caller's turn is fine; one that ends on ours is not.
    if (messages[0]?.role === "assistant") messages.shift();

    let raw = "";
    const abort = AbortController ? new AbortController() : null;
    const timer = setTimeout(() => abort?.abort(), MODEL_TIMEOUT_MS);
    try {
      const result = await anthropic.messages.create(
        {
          model: TURN_MODEL,
          max_tokens: TURN_MAX_TOKENS,
          system: systemPrompt({
            businessName: number.business_name,
            businessFacts: number.business_facts,
            canForward,
          }),
          messages,
        },
        { signal: abort?.signal }
      );
      raw = result.content?.map((c) => c.text || "").join("") || "";
    } catch (err) {
      // Dead air is the one failure a caller cannot forgive, so this says
      // something true and keeps the conversation open.
      console.error("voice/turn model call failed:", err?.message);
      raw = "Sorry, could you say that once more for me?";
    } finally {
      clearTimeout(timer);
    }

    const reply = interpretReply(raw, { canForward });
    return respond({ reply, callId, silences: 0, transcript: withCaller, number, call });
  } catch (err) {
    console.error("voice/turn failed:", err?.message);
    return twimlResponse(
      sayAndHangUp("Sorry, we're having trouble with this call. Please try again in a moment.")
    );
  }
}

async function respond({ reply, callId, silences, transcript, number, call }) {
  const updated = reply.text ? [...transcript, { role: "assistant", text: reply.text }] : transcript;

  await supabaseAdmin
    .from("receptionist_calls")
    .update({
      transcript: updated,
      outcome:
        reply.action === "transfer"
          ? "transferred"
          : reply.action === "finish"
            ? "completed"
            : call.outcome,
    })
    .eq("id", callId);

  if (reply.action === "transfer") {
    return twimlResponse(
      sayAndDial({
        text: "Of course — let me put you through now.",
        to: number.forward_to,
        callerId: number.phone_number,
      })
    );
  }

  if (reply.action === "finish") {
    return twimlResponse(sayAndHangUp(reply.text));
  }

  return twimlResponse(
    sayAndGather({
      text: reply.text,
      action: publicUrlFor(`/api/voice/turn?call=${encodeURIComponent(callId)}&s=${silences}`),
    })
  );
}
