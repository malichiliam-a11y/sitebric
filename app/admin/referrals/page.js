import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL } from "@/lib/admin";
import { PLAN_PRICES, limitsFor } from "@/lib/plans";

// The one referral code in use today. Not read from the query string —
// this page reports on a specific partner, not on referrals in general.
const REFERRAL_CODE = "APEX";

// Bypasses RLS: profiles' select policy only lets a user read their own
// row, but this page needs every row referred by APEX regardless of
// who owns it.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function formatDollars(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function ReferralStats() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("referred_by", REFERRAL_CODE);

  const referred = data || [];
  const totalSignups = referred.length;
  const paid = referred.filter((row) => PLAN_PRICES[row.plan] != null);
  const paidCount = paid.length;
  const mrrCents = paid.reduce((sum, row) => sum + PLAN_PRICES[row.plan], 0);
  const commissionCents = Math.round(mrrCents * 0.25);

  const display = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  const body = "'Inter', sans-serif";
  const stats = [
    ["Total signups", totalSignups],
    ["Paid subscribers", paidCount],
    ["Monthly recurring revenue", formatDollars(mrrCents)],
    ["Commission owed (25%)", formatDollars(commissionCents)],
  ];

  // Every signup, not just APEX's — this is the per-user answer to
  // "was this one his lead or mine". profiles has no email column, so
  // it's joined against the auth admin API by user id.
  const { data: allProfiles } = await supabaseAdmin
    .from("profiles")
    .select("id, plan, referred_by, created_at")
    .order("created_at", { ascending: false });

  const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map((userList?.users || []).map((u) => [u.id, u.email]));

  const signups = (allProfiles || []).map((p) => ({
    ...p,
    email: emailById.get(p.id) || "—",
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A10", color: "#F2F0FA", fontFamily: body, padding: "60px 6%" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ fontFamily: display, fontWeight: 700, fontSize: 28, marginBottom: 8 }}>
          Referral stats — {REFERRAL_CODE}
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 40 }}>
          Only visible to you.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 48 }}>
          {stats.map(([label, value]) => (
            <div
              key={label}
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{label}</div>
              <div style={{ fontFamily: display, fontWeight: 700, fontSize: 26 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily: display, fontWeight: 600, fontSize: 18, marginBottom: 16 }}>
          All signups
        </div>
        <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                {["Email", "Plan", "Referred by", "Signed up"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      color: "rgba(255,255,255,0.5)",
                      fontWeight: 500,
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signups.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "20px 16px", color: "rgba(255,255,255,0.4)" }}>
                    No signups yet.
                  </td>
                </tr>
              )}
              {signups.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "12px 16px" }}>{s.email}</td>
                  <td style={{ padding: "12px 16px" }}>{limitsFor(s.plan).label}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {s.referred_by ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          background: "rgba(251,191,36,0.12)",
                          color: "#FBBF24",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {s.referred_by}
                      </span>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>organic</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.6)" }}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
