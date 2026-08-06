import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL } from "@/lib/admin";
import { PLAN_PRICES } from "@/lib/plans";

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

  const display = "'Space Grotesk', sans-serif";
  const body = "'Inter', sans-serif";
  const stats = [
    ["Total signups", totalSignups],
    ["Paid subscribers", paidCount],
    ["Monthly recurring revenue", formatDollars(mrrCents)],
    ["Commission owed (25%)", formatDollars(commissionCents)],
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A10", color: "#F2F0FA", fontFamily: body, padding: "60px 6%" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ fontFamily: display, fontWeight: 700, fontSize: 28, marginBottom: 8 }}>
          Referral stats — {REFERRAL_CODE}
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 40 }}>
          Only visible to you.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
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
      </div>
    </div>
  );
}
