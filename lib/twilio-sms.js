// Sending a text message.
//
// Plain fetch against Twilio's REST API, same reasoning as
// lib/twilio-numbers.js: it is one endpoint, and the SDK is a large
// dependency to cold-start inside a serverless function that has fifteen
// seconds to answer a phone.
//
// This runs DURING a call, so it is on the critical path of a caller
// waiting in silence. It gets its own short timeout and never throws:
// a text that failed to send is a small problem, and a call that dropped
// because a text failed to send is a large one.

const API = "https://api.twilio.com/2010-04-01";

// Comfortably inside what is left of Twilio's patience once the model
// call has already taken its share.
const SEND_TIMEOUT_MS = 3500;

function auth() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return { sid, header: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` };
}

/**
 * Sends one message. Returns { sent: boolean }.
 *
 * `from` is the receptionist's own number, so the text arrives from the
 * number the caller just dialled rather than from a stranger — which is
 * the difference between a link that gets tapped and one that gets
 * reported as spam.
 */
export async function sendSms({ to, from, body }) {
  const creds = auth();
  if (!creds || !to || !from || !body) return { sent: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const res = await fetch(`${API}/Accounts/${creds.sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: creds.header,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: String(body).slice(0, 1200) }),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Logged without the body: it contains the caller's phone number.
      console.error(`sendSms failed: ${res.status}`);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error("sendSms failed:", err?.message);
    return { sent: false };
  } finally {
    clearTimeout(timer);
  }
}
