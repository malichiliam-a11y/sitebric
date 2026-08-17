import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ADMIN_EMAIL } from "@/lib/admin";
import { PLAN_LIMITS } from "@/lib/plans";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Activates a plan for someone who paid outside Stripe.
//
// Stripe cannot reach every customer. EcoCash in Zimbabwe has no Stripe
// integration at all, and plenty of African debit cards are domestic-only
// and will never clear a USD charge — so a customer can be willing and
// able to pay while checkout remains structurally impossible for them.
// This is the manual route for those: they pay by whatever rail works,
// and their plan is switched on here.
//
// This is the one control that hands out paid access without payment, so
// it is gated the same way /admin/referrals is — the signed-in user must
// be the admin. The check runs on the server against the session, never
// on anything the caller supplies.
export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const { email, plan } = await req.json();
  const target = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!target) return NextResponse.json({ error: "Enter an email address." }, { status: 400 });
  if (!PLAN_LIMITS[plan] || plan === "none") {
    return NextResponse.json({ error: "Pick a plan." }, { status: 400 });
  }

  // Supabase has no lookup-by-email, so the page is walked. Fine at this
  // scale; it is the same approach /admin/referrals already uses.
  const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    return NextResponse.json({ error: "Couldn't read the user list." }, { status: 500 });
  }

  const match = (list?.users || []).find((u) => (u.email || "").toLowerCase() === target);
  if (!match) {
    return NextResponse.json(
      { error: `No account found for ${target}. They need to sign up first.` },
      { status: 404 }
    );
  }

  // Usage resets, because this is the start of their paid month. upsert
  // rather than update: someone can be activated before they have ever
  // generated anything, and so may have no profile row yet.
  const { error: saveError } = await supabaseAdmin.from("profiles").upsert({
    id: match.id,
    plan,
    generations_used: 0,
    searches_used: 0,
  });

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  console.log(`Manually activated ${plan} for ${target} (${match.id})`);

  return NextResponse.json({
    ok: true,
    email: target,
    plan,
    limits: PLAN_LIMITS[plan],
  });
}
