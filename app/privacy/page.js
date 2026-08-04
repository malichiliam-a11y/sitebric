export const metadata = {
  title: "Privacy Policy — sitebric",
};

export default function PrivacyPage() {
  const section = { marginBottom: 28 };
  const h2 = { fontSize: 18, fontWeight: 700, marginBottom: 10, fontFamily: "'Space Grotesk', sans-serif" };
  const p = { fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.65)" };
  const ul = { fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.65)", paddingLeft: 20 };

  return (
    <div style={{ background: "#0A0A10", color: "#F2F0FA", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 24px 100px" }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 40 }}>
          Last updated: August 2026
        </p>

        <div style={section}>
          <div style={h2}>1. What we collect</div>
          <ul style={ul}>
            <li>Account info: your email address, used for login and communication</li>
            <li>Payment info: handled entirely by Stripe — we never see or store your card details ourselves</li>
            <li>Usage data: the client sites and prompts you create, generation and lead-search counts</li>
            <li>Lead search data: business names, addresses, and phone numbers you search for via Google Places</li>
          </ul>
        </div>

        <div style={section}>
          <div style={h2}>2. How we use it</div>
          <p style={p}>
            We use your data to operate your account, generate and store your client websites, process billing
            through Stripe, and improve Sitebric over time. We don't sell your personal data to third parties.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>3. Third-party services</div>
          <p style={p}>
            Sitebric relies on a few third-party services to operate: Supabase (database and authentication), Stripe
            (payment processing), Anthropic (AI site generation), Google Places (lead search), and Vercel (hosting).
            Each of these providers processes relevant data as part of delivering their service to us, under their
            own privacy policies.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>4. Data retention</div>
          <p style={p}>
            We keep your account data as long as your account is active. If you delete your account from the
            Settings tab, your client sites, profile, and authentication record are permanently removed from our
            systems.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>5. Your rights</div>
          <p style={p}>
            You can view, edit, or delete your client sites anytime from your dashboard, and delete your entire
            account and all associated data from Settings. If you have questions about your data, contact us at the
            email below.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>6. Cookies</div>
          <p style={p}>
            Sitebric uses cookies to keep you logged in securely. We don't use tracking cookies for advertising
            purposes.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>7. Children's privacy</div>
          <p style={p}>
            Sitebric is not directed at children under 13, and we don't knowingly collect personal information from
            children under 13.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>8. Changes to this policy</div>
          <p style={p}>
            We may update this Privacy Policy occasionally. Continued use of Sitebric after changes means you accept
            the updated policy.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>9. Contact</div>
          <p style={p}>
            Questions about your data or this policy? Reach out at{" "}
            <a href="mailto:supportsitebric@gmail.com" style={{ color: "#22D3EE" }}>
              supportsitebric@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
