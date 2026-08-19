import Anthropic from "@anthropic-ai/sdk";
import { readTwilioRequest, supabaseAdmin } from "@/lib/voice-request";
import { summaryPrompt, parseSummary } from "@/lib/receptionist";

// The call ended. Turn it into something someone can act on.
//
// This runs after the caller has hung up, so nothing here is heard by
// anyone and there is no fifteen-second ceiling. It is the only place in
// the receptionist that can afford to be careful, and it is where the
// actual product value lands: a row saying who rang, on what number, and
// what they wanted.
//
// Twilio does not guarantee this fires exactly once, so everything is
// written idempotently — a duplicate must not bill the minutes twice.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PATH = "/api/voice/status";

export async function POST(req) {
  const auth = await readTwilioRequest(req, PATH);
  if (!auth.ok) {
    console.warn(`voice/status rejected: ${auth.reason}`);
    return new Response("forbidden", { status: 403 });
  }

  const { params } = auth;
  const callSid = String(params.CallSid || "").slice(0, 64);
  const seconds = Math.max(0, Math.min(7200, parseInt(params.CallDuration || "0", 10) || 0));

  try {
    const { data: call } = await supabaseAdmin
      .from("receptionist_calls")
      .select("*, receptionist_numbers(*)")
      .eq("call_sid", callSid)
      .maybeSingle();

    if (!call || !call.receptionist_numbers) return new Response("", { status: 204 });

    // Already accounted for. Twilio can deliver a status callback more
    // than once, and billing the same call twice would eat a customer's
    // minutes for calls that never happened.
    if (call.seconds > 0) return new Response("", { status: 204 });

    const number = call.receptionist_numbers;
    const transcript = Array.isArray(call.transcript) ? call.transcript : [];
    const heardFromCaller = transcript.some((t) => t.role === "caller");

    let summary = { caller_name: "", callback_number: "", summary: "", urgency: "normal" };

    if (heardFromCaller) {
      try {
        const result = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          messages: [{ role: "user", content: summaryPrompt(transcript) }],
        });
        summary = parseSummary(result.content?.map((c) => c.text || "").join(""));
      } catch (err) {
        // The transcript and the caller's number are already saved, which
        // is most of the value. A failed summary must not lose the call.
        console.error("voice/status summary failed:", err?.message);
      }
    } else {
      summary.summary = "Call connected but the caller didn't say anything.";
    }

    // Twilio's own caller ID is the reliable one. What was spoken is only
    // used when Twilio withheld the number.
    const callback = call.from_number || summary.callback_number;

    await supabaseAdmin
      .from("receptionist_calls")
      .update({
        seconds,
        outcome: call.outcome === "in_progress" ? "completed" : call.outcome,
        caller_name: summary.caller_name,
        callback_number: callback,
        summary: summary.summary,
        urgency: summary.urgency,
      })
      .eq("id", call.id);

    // Minutes are rounded up, the same way telephony is billed, so the
    // cap means what it says.
    const minutes = Math.ceil(seconds / 60);
    await supabaseAdmin
      .from("receptionist_numbers")
      .update({ minutes_used: Number(number.minutes_used) + minutes })
      .eq("id", number.id);

    await notify({ number, call, summary, callback });

    return new Response("", { status: 204 });
  } catch (err) {
    console.error("voice/status failed:", err?.message);
    // 204 rather than 500 on purpose: Twilio retries a failed status
    // callback, and a retry would re-run the model call for a call that
    // is already over.
    return new Response("", { status: 204 });
  }
}

// Tells the reseller a call came in. Fire-and-forget — a mail failure
// must not lose the row that was just saved.
async function notify({ number, call, summary, callback }) {
  if (!process.env.RESEND_API_KEY) return;

  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(number.user_id);
    const to = data?.user?.email;
    if (!to) return;

    const urgent = summary.urgency === "urgent";
    const lines = [
      `${number.business_name} had a call.`,
      "",
      summary.caller_name ? `Name: ${summary.caller_name}` : "Name: not given",
      `Number: ${callback || "withheld"}`,
      "",
      summary.summary || "(nothing was said)",
      "",
      urgent ? "They said it can't wait. Call them first." : "",
      `Full transcript: https://sitebric.com/dashboard`,
    ];

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sitebric <hello@sitebric.com>",
        to,
        subject: `${urgent ? "URGENT — " : ""}Call for ${number.business_name}${
          summary.caller_name ? ` from ${summary.caller_name}` : ""
        }`,
        text: lines.filter((l) => l !== "").join("\n"),
      }),
    });
  } catch (err) {
    console.error("voice/status notify failed:", err?.message);
  }
}
