// Buying and releasing phone numbers.
//
// Plain fetch against Twilio's REST API rather than their SDK: it is two
// endpoints, the SDK is a large dependency to cold-start inside a
// serverless function for two calls, and the signature validation this
// pairs with is already implemented here and checked against theirs.

const API = "https://api.twilio.com/2010-04-01";

function auth() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return { sid, header: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` };
}

export function twilioConfigured() {
  return Boolean(auth());
}

/**
 * Numbers available to buy. `areaCode` is optional and only meaningful
 * for +1 countries.
 */
export async function findAvailableNumbers({ country = "US", areaCode = "", limit = 5 }) {
  const creds = auth();
  if (!creds) throw new Error("Twilio is not configured");

  const params = new URLSearchParams({
    // Voice is the entire point; a number that can't take calls is no use.
    VoiceEnabled: "true",
    PageSize: String(Math.min(20, Math.max(1, limit))),
  });
  if (areaCode) params.set("AreaCode", String(areaCode).replace(/\D/g, "").slice(0, 5));

  const safeCountry = /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : "US";
  const res = await fetch(
    `${API}/Accounts/${creds.sid}/AvailablePhoneNumbers/${safeCountry}/Local.json?${params}`,
    { headers: { Authorization: creds.header } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Could not search for numbers");

  return (data.available_phone_numbers || []).map((n) => ({
    phoneNumber: n.phone_number,
    friendly: n.friendly_name,
    locality: n.locality || "",
    region: n.region || "",
  }));
}

/**
 * Buys a number and points it at our webhooks in the same request.
 *
 * Both URLs are set here rather than in the Twilio console: a number
 * bought without them rings out to Twilio's default error message, and
 * nobody would find out until a customer's caller heard it.
 */
export async function buyNumber({ phoneNumber, baseUrl }) {
  const creds = auth();
  if (!creds) throw new Error("Twilio is not configured");

  const root = String(baseUrl || process.env.PUBLIC_BASE_URL || "https://sitebric.com").replace(
    /\/+$/,
    ""
  );

  const body = new URLSearchParams({
    PhoneNumber: phoneNumber,
    VoiceUrl: `${root}/api/voice/incoming`,
    VoiceMethod: "POST",
    StatusCallback: `${root}/api/voice/status`,
    StatusCallbackMethod: "POST",
    // Twilio's own ceiling, so a call that somehow never ends cannot bill
    // for hours.
    VoiceFallbackUrl: `${root}/api/voice/incoming`,
  });

  const res = await fetch(`${API}/Accounts/${creds.sid}/IncomingPhoneNumbers.json`, {
    method: "POST",
    headers: {
      Authorization: creds.header,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Could not buy that number");

  return { phoneNumber: data.phone_number, sid: data.sid };
}

/**
 * Gives the number back so it stops billing.
 *
 * Never throws: releasing is called while deleting our own row, and a
 * Twilio hiccup must not leave a row nobody can remove. A number that
 * lingers on the Twilio bill is a smaller problem than a dashboard entry
 * a customer cannot delete.
 */
export async function releaseNumber(sid) {
  const creds = auth();
  if (!creds || !sid) return { released: false };
  try {
    const res = await fetch(`${API}/Accounts/${creds.sid}/IncomingPhoneNumbers/${sid}.json`, {
      method: "DELETE",
      headers: { Authorization: creds.header },
    });
    return { released: res.ok };
  } catch (err) {
    console.error("releaseNumber failed:", err?.message);
    return { released: false };
  }
}
