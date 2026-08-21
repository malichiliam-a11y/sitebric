// The page a visitor gets when the reseller who published a site stopped
// paying.
//
// Written for the business's own customers, who have never heard of
// Sitebric and did nothing wrong. It doesn't name the reseller, doesn't
// say "unpaid", and doesn't advertise at them — whether the web guy paid
// his bill is not his client's customers' business, and shaming a real
// business in front of them would be an ugly way to collect $15.
//
// 503 rather than 404, deliberately: the site exists and is expected
// back. A 404 tells search engines to drop it, which would cost the
// business its search ranking over something it had no part in — damage
// that outlasts the missed payment by months and can't be undone by
// paying up.
//
// Pure — it builds no framework object — so a plain `node test/*.mjs` can
// assert the status code and the headers. The 503-not-404 rule is the
// kind that survives review and dies in a refactor, and it is worth a
// test that does not need Next running to check it.
export function offlinePage() {
  return {
    body: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Temporarily unavailable</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0e0e12;color:#fff;font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:24px">
<div><h1 style="font-size:20px;font-weight:600;margin:0 0 8px">This site is temporarily unavailable</h1>
<p style="margin:0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.6)">Please check back shortly.</p></div>
</body></html>`,
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "86400",
      "Cache-Control": "no-store",
    },
  };
}
