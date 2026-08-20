import { readTwilioRequest, supabaseAdmin, normalizeNumber } from "@/lib/voice-request";
import { publicUrlFor } from "@/lib/twilio-signature";
import { sayAndGather, sayAndDial, sayAndHangUp, twimlResponse } from "@/lib/twiml";
import { greetingFor, overLimitMessage, demoLimitMessage, DEMO_CALLS_PER_DAY } from "@/lib/receptionist";

// A phone rang. This is the first thing that happens.
//
// Every path here ends in valid TwiML, including the failures. A 500 from
// this route is a caller hearing a Twilio error recording instead of the
// business they rang — so anything that goes wrong falls back to a
// sentence a human would not be embarrassed by.

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const PATH = "/api/voice/incoming";

export async function POST(req) {
  const auth = await readTwilioRequest(req, PATH);
  if (!auth.ok) {
    console.warn(`voice/incoming rejected: ${auth.reason}`);
    // 403 with no TwiML: this was not Twilio, so there is no call to be
    // polite to.
    return new Response("forbidden", { status: 403 });
  }

  const { params } = auth;
  const to = normalizeNumber(params.To);
  const from = normalizeNumber(params.From);
  const callSid = String(params.CallSid || "").slice(0, 64);

  try {
    const { data: number } = await supabaseAdmin
      .from("receptionist_numbers")
      .select("*")
      .eq("phone_number", to)
      .maybeSingle();

    // A number Twilio still points at us but we no longer have a record
    // for. Nothing useful to say, and pretending otherwise would have the
    // caller talk to an assistant with no business behind it.
    if (!number || !number.active) {
      return twimlResponse(
        sayAndHangUp("Sorry, this number isn't in service. Please check the number and try again.")
      );
    }

    // The demo line is public, so one bored caller could otherwise spend
    // the whole month's minutes on their own. Counted per calling number
    // rather than per day overall, so one person cannot lock everybody
    // else out of hearing the product.
    if (number.is_demo && from) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recent } = await supabaseAdmin
        .from("receptionist_calls")
        .select("id", { count: "exact", head: true })
        .eq("number_id", number.id)
        .eq("from_number", from)
        .gte("created_at", since);

      if ((recent || 0) >= DEMO_CALLS_PER_DAY) {
        return twimlResponse(sayAndHangUp(demoLimitMessage()));
      }
    }

    // The month's minutes are gone. The caller is still logged — Twilio
    // gave us their number — so the business finds out who rang even
    // though nobody answered properly.
    if (Number(number.minutes_used) >= Number(number.minutes_limit)) {
      await supabaseAdmin.from("receptionist_calls").upsert(
        {
          number_id: number.id,
          user_id: number.user_id,
          call_sid: callSid,
          from_number: from,
          outcome: "over_limit",
          summary: "Call came in after this number's monthly minutes ran out.",
          urgency: "normal",
        },
        { onConflict: "call_sid" }
      );

      if (number.forward_to) {
        return twimlResponse(
          sayAndDial({
            text: "One moment, I'll put you through.",
            to: number.forward_to,
            callerId: number.phone_number,
          })
        );
      }
      return twimlResponse(sayAndHangUp(overLimitMessage(number.business_name)));
    }

    const { data: call } = await supabaseAdmin
      .from("receptionist_calls")
      .upsert(
        {
          number_id: number.id,
          user_id: number.user_id,
          call_sid: callSid,
          from_number: from,
          transcript: [],
          outcome: "in_progress",
        },
        { onConflict: "call_sid" }
      )
      .select()
      .single();

    const greeting = greetingFor(number);

    if (call) {
      await supabaseAdmin
        .from("receptionist_calls")
        .update({ transcript: [{ role: "assistant", text: greeting }] })
        .eq("id", call.id);
    }

    // Absolute rather than relative. Twilio signs the URL it resolves, and
    // an absolute one leaves nothing to be inferred from a proxied host —
    // the next request's signature check has to reconstruct exactly this
    // string.
    return twimlResponse(
      sayAndGather({
        text: greeting,
        action: publicUrlFor(`/api/voice/turn?call=${call?.id || ""}&s=0`),
      })
    );
  } catch (err) {
    console.error("voice/incoming failed:", err?.message);
    return twimlResponse(
      sayAndHangUp(
        "Sorry, we're having trouble taking calls at the moment. Please try again in a few minutes."
      )
    );
  }
}
