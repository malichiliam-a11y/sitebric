import Anthropic from "@anthropic-ai/sdk";
import { readTwilioRequest, supabaseAdmin } from "@/lib/voice-request";
import { publicUrlFor } from "@/lib/twilio-signature";
import { bookingUrl, bookingSms, bookingSpoken, bookingFailedSpoken } from "@/lib/booking";
import { sendSms } from "@/lib/twilio-sms";
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
  isDecline,
  closingQuestion,
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

// The action URL, built in one place.
//
// It is both the address Twilio calls next AND the string the POST
// signature is computed over, so the two must be byte-identical. Building
// it twice by hand is how a signature check starts failing for a reason
// nobody can see.
function turnPath({ callId, silences, closing }) {
  return `/api/voice/turn?call=${encodeURIComponent(callId)}&s=${silences}${closing ? "&closing=1" : ""}`;
}
export const maxDuration = 15;

// Comfortably inside Twilio's patience, leaving room for the database
// round trips either side.
const MODEL_TIMEOUT_MS = 8000;

async function handle(req) {
  const url = new URL(req.url);
  const callId = url.searchParams.get("call") || "";
  const silences = Number(url.searchParams.get("s") || 0);
  // Set only on the one extra turn after the assistant has said its
  // goodbye and asked whether there is anything else.
  const closing = url.searchParams.get("closing") === "1";

  // The query string is part of what Twilio signed, so it is rebuilt
  // exactly rather than approximated.
  const auth = await readTwilioRequest(req, turnPath({ callId, silences, closing }));
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
    const canBook = Boolean(bookingUrl(number.booking_url));
    const transcript = Array.isArray(call.transcript) ? call.transcript : [];

    // The closing turn. The assistant has already said goodbye and asked
    // whether there is anything else; this is the answer to that.
    //
    // Decided here rather than by the model: it costs a round trip we do
    // not need, and the model is the thing that wanted to hang up in the
    // first place. If they are done, end it. If they are not — a
    // follow-up question, anything ambiguous, anything at all that is not
    // clearly "no" — the call carries on exactly as before.
    if (closing) {
      if (isDecline(spoken)) {
        const withCloser = spoken ? [...transcript, { role: "caller", text: spoken }] : transcript;
        return respond({
          reply: { action: "finish", text: "Thanks very much. Bye for now." },
          callId,
          silences: 0,
          transcript: withCloser,
          number,
          call,
          endNow: true,
        });
      }
      // Not a decline: fall through and treat it as an ordinary turn.
    }

    // Silence. Twilio posts an empty SpeechResult, and the answer is not
    // to ask the same question forever.
    if (!spoken) {
      const reply = silenceReply(silences);
      return respond({
        reply,
        callId,
        silences: silences + 1,
        transcript,
        number,
        call,
        // Nobody is there. Asking "anything else?" into silence is absurd.
        endNow: reply.action === "finish",
      });
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
        // The ceiling exists to stop the call. Offering another turn here
        // would defeat it.
        endNow: true,
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

    const reply = interpretReply(raw, { canForward, canBook });
    return respond({ reply, callId, silences: 0, transcript: withCaller, number, call });
  } catch (err) {
    console.error("voice/turn failed:", err?.message);
    return twimlResponse(
      sayAndHangUp("Sorry, we're having trouble with this call. Please try again in a moment.")
    );
  }
}

async function respond({ reply, callId, silences, transcript, number, call, endNow = false }) {
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

  // Send the booking link, then carry on talking.
  //
  // Sent here rather than after the call so the caller has it while they
  // are still on the phone — that is the whole difference between "I'll
  // text you a link" and a link that actually arrives. The call is held
  // open afterwards rather than finished: someone who has just been sent
  // a booking page usually has one more question.
  if (reply.action === "book") {
    const link = bookingUrl(number.booking_url);
    const { sent } = await sendSms({
      to: call.from_number,
      from: number.phone_number,
      body: bookingSms({ businessName: number.business_name, url: link }),
    });
    // Never claims to have sent something it did not. A caller told the
    // text is coming will sit waiting for it.
    const text = sent ? bookingSpoken() : bookingFailedSpoken();
    const withReply = [...transcript, { role: "assistant", text }];

    await supabaseAdmin
      .from("receptionist_calls")
      .update({ transcript: withReply, outcome: sent ? "booking_sent" : call.outcome })
      .eq("id", callId);

    return twimlResponse(
      sayAndGather({
        text: `${text} ${closingQuestion()}`,
        voice: number.voice,
        action: publicUrlFor(turnPath({ callId, silences: 0, closing: true })),
      })
    );
  }

  if (reply.action === "transfer") {
    return twimlResponse(
      sayAndDial({
        text: "Of course — let me put you through now.",
        to: number.forward_to,
        callerId: number.phone_number,
        voice: number.voice,
      })
    );
  }

  // "Finished" is the model's opinion, not the caller's.
  //
  // It decides it is done the moment it has a name, a number and a
  // reason — which on a real call is routinely while the caller is still
  // talking. The first call that worked end to end was cut off
  // mid-conversation, one question after a good answer, and that is the
  // rudest thing this product can do to someone else's customer.
  //
  // So the closing line is spoken and then it listens once more. Only an
  // answer that is clearly "no" ends the call; `closing` is false on that
  // second pass so it cannot loop.
  if (reply.action === "finish") {
    if (endNow) return twimlResponse(sayAndHangUp(reply.text, number.voice));
    return twimlResponse(
      sayAndGather({
        text: `${reply.text} ${closingQuestion()}`,
        voice: number.voice,
        action: publicUrlFor(turnPath({ callId, silences: 0, closing: true })),
      })
    );
  }

  return twimlResponse(
    sayAndGather({
      text: reply.text,
      voice: number.voice,
      action: publicUrlFor(turnPath({ callId, silences, closing: false })),
    })
  );
}

// Both methods, same handler.
//
// Twilio signs GET and POST differently and readTwilioRequest handles
// that; what must never happen again is a method arriving that no
// handler answers, because Next returns 405 before any of our code runs
// and the caller hears "an application error has occurred" with nothing
// written to the logs to explain it.
export const POST = handle;
export const GET = handle;
