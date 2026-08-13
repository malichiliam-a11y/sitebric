import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const clientName = typeof body.clientName === "string" ? body.clientName.trim().slice(0, 200) : "";
  const clientEmail = typeof body.clientEmail === "string" ? body.clientEmail.trim().slice(0, 200) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";
  const projectId = typeof body.projectId === "string" && body.projectId ? body.projectId : null;
  const amount = Number(body.amount);

  if (!clientName || !clientEmail || !amount || amount <= 0) {
    return NextResponse.json({ error: "missing or invalid fields" }, { status: 400 });
  }
  if (!clientEmail.includes("@")) {
    return NextResponse.json({ error: "invalid client email" }, { status: 400 });
  }

  const amountCents = Math.round(amount * 100);
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

  const { data: invoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      project_id: projectId,
      client_name: clientName,
      client_email: clientEmail,
      amount_cents: amountCents,
      description: description || null,
      invoice_number: invoiceNumber,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const amountDisplay = (amountCents / 100).toFixed(2);
  const dateDisplay = new Date(invoice.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Best-effort — the invoice record is already saved even if the send
  // itself fails, so the reseller doesn't lose their work over an email
  // hiccup and can resend or follow up manually.
  let emailError = null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sitebric Invoices <invoices@sitebric.com>",
        to: [clientEmail],
        reply_to: user.email,
        subject: `Invoice ${invoiceNumber} — $${amountDisplay}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
            <h2 style="margin-bottom: 4px;">Invoice ${invoiceNumber}</h2>
            <p style="color: #666; margin-top: 0;">${dateDisplay}</p>
            <p><strong>Bill to:</strong> ${clientName}</p>
            ${description ? `<p><strong>For:</strong> ${description}</p>` : ""}
            <div style="font-size: 28px; font-weight: 700; margin: 24px 0;">$${amountDisplay}</div>
            <p style="color: #666; font-size: 13px;">
              This is a summary of charges, not a payment link. Please arrange payment directly with
              ${user.email}.
            </p>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      emailError = data?.message || `Resend API error (${res.status})`;
    }
  } catch (err) {
    emailError = err.message;
  }

  return NextResponse.json({ invoice, emailError });
}
