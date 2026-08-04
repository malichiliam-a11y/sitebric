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
          <div style={h2}>3. Subscriptions and billing</div>
          <p style={p}>
            Sitebric is offered on paid monthly subscription plans, billed through Stripe. Plans include limits on
            client sites, AI generations, and lead searches as described on our Pricing page. Subscriptions renew
            automatically each billing period unless cancelled. You can cancel anytime from your dashboard's Billing
            tab — cancellation takes effect at the end of your current billing period, and you keep access until
            then. We don't provide refunds for partial billing periods except where required by law.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>4. Acceptable use</div>
          <p style={p}>
            You agree not to use Sitebric to generate content that is illegal, fraudulent, defamatory, or that
            infringes on someone else's rights. You're responsible for the accuracy of information you provide about
            the businesses you generate sites for, and for how you use the lead-finding feature (e.g. complying with
            any applicable telemarketing or outreach laws when contacting businesses).
          </p>
        </div>

        <div style={section}>
          <div style={h2}>5. Generated content ownership</div>
          <p style={p}>
            You own the websites you generate through Sitebric and are free to publish, sell, or hand them off to
            your clients. We don't claim ownership over the specific content generated for your projects.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>6. Service availability</div>
          <p style={p}>
            We aim to keep Sitebric available and reliable but don't guarantee uninterrupted access. Features may
            change, be added, or be removed over time as the product evolves.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>7. Limitation of liability</div>
          <p style={p}>
            Sitebric is provided "as is." We aren't liable for indirect, incidental, or consequential damages arising
            from your use of the service, including issues with AI-generated content accuracy or third-party services
            (such as domain registrars or Stripe) that Sitebric integrates with.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>8. Termination</div>
          <p style={p}>
            You can delete your account anytime from the Settings tab, which permanently removes your data. We may
            suspend or terminate accounts that violate these Terms.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>9. Changes to these terms</div>
          <p style={p}>
            We may update these Terms from time to time. Continued use of Sitebric after changes means you accept the
            updated Terms.
          </p>
        </div>

        <div style={section}>
          <div style={h2}>10. Contact</div>
          <p style={p}>
            Questions about these Terms? Reach out at{" "}
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
