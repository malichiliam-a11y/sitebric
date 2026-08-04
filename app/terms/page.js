export const metadata = {
  title: "Terms of Service — sitebric",
};

export default function TermsPage() {
  const section = { marginBottom: 28 };
  const h2 = { fontSize: 18, fontWeight: 700, marginBottom: 10, fontFamily: "'Space Grotesk', sans-serif" };
  const p = { fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.65)" };

  return (
    <div style={{ background: "#0A0A10", color: "#F2F0FA", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 24px 100px" }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 40 }}>
          Last updated: August 2026
        </p>

        <div style={section}>
          <div style={h2}>1. Overview</div>
          <p style={p}>
            Sitebric ("we," "us," "our") provides an AI-powered tool that generates website content for use by
            resellers and small businesses. By creating an account or using Sitebric, you agree to these Terms.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>2. Accounts</div>
          <p style={p}>
            You're responsible for keeping your account credentials secure and for all activity that happens under
            your account. You must provide accurate information when signing up.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>3. Subscriptions & billing</div>
          <p style={p}>
            Sitebric is offered on paid monthly subscription plans, billed through Stripe. Plans include limits on
            client sites, AI generations, and lead searches as described on our Pricing page. Subscriptions renew
