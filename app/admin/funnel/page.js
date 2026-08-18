import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL } from "@/lib/admin";
import { PLAN_PRICES } from "@/lib/plans";
import { t, cardBg } from "@/lib/theme";

// Where people stop.
//
// The single worst number in this product was invisible until someone
// went looking for it: 21 of the first 38 trial accounts never generated
// anything at all. Not "built a site and didn't publish" — never started.
// Nothing in the product would have surfaced that, so it went unnoticed
// for weeks while the obvious explanations (pricing, design quality) got
// the attention instead.
//
// This page exists so the next one of those is noticed the same day.
// Every number here is a count of real rows; nothing is estimated.

export const dynamic = "force-dynamic";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAID_PLANS = ["starter", "growth", "pro"];

function daysAgo(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function Stat({ label, value, sub, tone }) {
  const colour = tone === "bad" ? t.negative : tone === "good" ? t.positive : t.text;
  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: "18px 20px",
        flex: "1 1 180px",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textFaint }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", marginTop: 6, color: colour }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 4, lineHeight: 1.45 }}>{sub}</div>}
    </div>
  );
}

export default async function Funnel() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const [{ data: profiles }, { data: projects }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, plan, created_at, utm_source, referred_by"),
    supabaseAdmin.from("projects").select("user_id, status, published, slug, created_at, completed_at"),
  ]);

  const rows = profiles || [];
  const sites = projects || [];

  const byUser = new Map();
  for (const p of sites) {
    if (!byUser.has(p.user_id)) byUser.set(p.user_id, []);
    byUser.get(p.user_id).push(p);
  }

  const started = rows.filter((r) => (byUser.get(r.id) || []).length > 0);
  const finished = rows.filter((r) => (byUser.get(r.id) || []).some((p) => p.status === "done"));
  const published = rows.filter((r) => (byUser.get(r.id) || []).some((p) => p.published));
  const paying = rows.filter((r) => PAID_PLANS.includes(r.plan));

  const neverStarted = rows.filter((r) => (byUser.get(r.id) || []).length === 0);

  // A published site that was taken down again is not a change of mind —
  // it is someone using Publish as a share button. Counted separately so
  // "published" doesn't quietly overstate how many sites went live.
  const doneSites = sites.filter((p) => p.status === "done");
  const liveNow = doneSites.filter((p) => p.published);
  const takenDown = doneSites.filter((p) => !p.published && p.slug);

  // Paying customers who have gone quiet: they are the next churn, and
  // there is no other place in the product that says so.
  const quiet = paying
    .map((r) => {
      const theirs = byUser.get(r.id) || [];
      const last = theirs.reduce(
        (acc, p) => (!acc || new Date(p.created_at) > new Date(acc) ? p.created_at : acc),
        null
      );
      return {
        plan: r.plan,
        sites: theirs.filter((p) => p.status === "done").length,
        published: theirs.filter((p) => p.published).length,
        idleDays: daysAgo(last) ?? daysAgo(r.created_at),
      };
    })
    .sort((a, b) => (b.idleDays ?? 0) - (a.idleDays ?? 0));

  const mrr = paying.reduce((sum, r) => sum + (PLAN_PRICES[r.plan] || 0), 0);

  const pct = (n) => (rows.length ? Math.round((n / rows.length) * 100) : 0);

  const steps = [
    ["Signed up", rows.length, null],
    ["Started a site", started.length, `${pct(started.length)}% of signups`],
    ["Finished one", finished.length, `${pct(finished.length)}% of signups`],
    ["Published one", published.length, `${pct(published.length)}% of signups`],
    ["Paying", paying.length, `${pct(paying.length)}% of signups`],
  ];

  const label = { fontSize: 12.5, color: t.textMuted };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, padding: "44px 6%", fontFamily: t.body }}>
      <div style={{ maxWidth: 940, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, letterSpacing: "-0.03em", margin: "0 0 6px" }}>Where people stop</h1>
        <p style={{ ...label, margin: "0 0 30px", lineHeight: 1.6 }}>
          Live counts of real rows. The biggest leak in this product went unnoticed for weeks because
          nothing displayed it — this is that display.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <Stat label="Signups" value={rows.length} />
          <Stat
            label="Never started"
            value={neverStarted.length}
            sub={`${pct(neverStarted.length)}% signed up and did nothing`}
            tone={neverStarted.length > rows.length / 3 ? "bad" : undefined}
          />
          <Stat label="Paying" value={paying.length} sub={`$${(mrr / 100).toFixed(2)} / mo`} tone="good" />
        </div>

        {/* The funnel itself, as bars — the gap between two rows is the
            thing worth looking at, and a bar shows it faster than a table. */}
        <div
          style={{
            background: cardBg,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            padding: "22px 24px",
            marginBottom: 14,
          }}
        >
          {steps.map(([name, value, sub], i) => {
            const width = rows.length ? Math.max(2, (value / rows.length) * 100) : 0;
            const dropped = i > 0 ? steps[i - 1][1] - value : 0;
            return (
              <div key={name} style={{ marginBottom: i === steps.length - 1 ? 0 : 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{name}</span>
                  <span style={{ fontSize: 13.5, fontVariantNumeric: "tabular-nums" }}>
                    {value}
                    {sub && <span style={{ color: t.textFaint }}> · {sub}</span>}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${width}%`,
                      borderRadius: 4,
                      background: i === 0 ? t.textMuted : t.text,
                    }}
                  />
                </div>
                {dropped > 0 && (
                  <div style={{ fontSize: 11.5, color: t.negative, marginTop: 5 }}>
                    −{dropped} lost here
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <Stat label="Sites built" value={doneSites.length} />
          <Stat label="Live now" value={liveNow.length} />
          <Stat
            label="Published then removed"
            value={takenDown.length}
            sub="Was live once, taken down since"
          />
        </div>

        <div
          style={{
            background: cardBg,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            padding: "22px 24px",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Paying customers, quietest first</div>
          <p style={{ ...label, margin: "0 0 16px", lineHeight: 1.55 }}>
            A paying customer with nothing built is the next cancellation. Nowhere else in the
            product says so.
          </p>
          {quiet.length === 0 && <div style={label}>Nobody paying yet.</div>}
          {quiet.map((c, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "11px 0",
                borderBottom: i === quiet.length - 1 ? "none" : `1px solid ${t.border}`,
              }}
            >
              <span style={{ fontSize: 13.5, textTransform: "capitalize" }}>{c.plan}</span>
              <span style={{ fontSize: 13, color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>
                {c.sites} built · {c.published} live ·{" "}
                <span style={{ color: c.idleDays >= 7 ? t.negative : t.textMuted }}>
                  {c.idleDays === null ? "—" : `quiet ${c.idleDays}d`}
                </span>
              </span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: t.textFaint, marginTop: 22, lineHeight: 1.6 }}>
          No names or emails here on purpose — this repository is public, and the page only needs the
          shape of the problem, not who it happened to.
        </p>
      </div>
    </div>
  );
}
