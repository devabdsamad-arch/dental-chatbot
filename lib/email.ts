// ================================================
// EMAIL NOTIFICATIONS — Resend
// ------------------------------------------------
// Two flows:
// 1. New booking  — fires when appointment confirmed
// 2. New lead     — fires when name + phone captured
//    but no booking made yet
//
// ⚠️ Add to .env.local:
// RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
// RESEND_FROM_EMAIL=onboarding@resend.dev
// ================================================

async function getResend() {
  const { Resend } = await import("resend");
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] Missing RESEND_API_KEY — email not sent");
    return null;
  }
  return new Resend(apiKey);
}

const FROM = () => process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

// ── 1. BOOKING CONFIRMATION TO CLINIC ────────────

export async function sendBookingNotification(params: {
  to:          string;   // clinic owner email
  clinicName:  string;
  patientName: string;
  patientPhone: string;
  service:     string;
  date:        string;
  time:        string;
}) {
  const resend = await getResend();
  if (!resend) return;

  try {
    await resend.emails.send({
      from:    FROM(),
      to:      params.to,
      subject: `New booking — ${params.patientName} · ${params.service}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
          <div style="background:#2a7a5a;border-radius:12px;padding:24px;margin-bottom:24px">
            <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 4px">ChatFlow AI · ${params.clinicName}</p>
            <h1 style="color:white;font-size:22px;margin:0;font-weight:600">New appointment booked</h1>
          </div>

          <div style="background:#f8f9fa;border-radius:10px;padding:20px;margin-bottom:20px">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px;width:120px">Patient</td>
                <td style="padding:8px 0;font-weight:600;font-size:14px;color:#111">${params.patientName}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px">Phone</td>
                <td style="padding:8px 0;font-weight:600;font-size:14px;color:#111">
                  <a href="tel:${params.patientPhone}" style="color:#2a7a5a">${params.patientPhone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px">Service</td>
                <td style="padding:8px 0;font-weight:600;font-size:14px;color:#111">${params.service}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px">Date</td>
                <td style="padding:8px 0;font-weight:600;font-size:14px;color:#111">${params.date}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px">Time</td>
                <td style="padding:8px 0;font-weight:600;font-size:14px;color:#111">${params.time}</td>
              </tr>
            </table>
          </div>

          <p style="color:#6b7280;font-size:12px;margin:0">
            This booking was made via your ChatFlow AI widget. A reminder SMS will be sent to the patient 24 hours before their appointment.
          </p>
        </div>
      `,
    });
    console.log(`[Email] Booking notification sent to ${params.to}`);
  } catch (err: any) {
    console.error("[Email] Booking notification failed:", err.message);
  }
}

// ── 2. NEW LEAD NOTIFICATION TO CLINIC ───────────

export async function sendLeadNotification(params: {
  to:          string;
  clinicName:  string;
  patientName: string;
  patientPhone: string;
  issue:       string;
  urgency:     string;
}) {
  const resend = await getResend();
  if (!resend) return;

  const urgencyColor = params.urgency === "emergency" ? "#ef4444"
    : params.urgency === "soon" ? "#f59e0b"
    : "#2a7a5a";

  const urgencyLabel = params.urgency === "emergency" ? "EMERGENCY"
    : params.urgency === "soon" ? "Needs attention soon"
    : "Routine";

  try {
    await resend.emails.send({
      from:    FROM(),
      to:      params.to,
      subject: `New lead — ${params.patientName} · ${urgencyLabel}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
          <div style="background:#111;border-radius:12px;padding:24px;margin-bottom:24px">
            <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px">ChatFlow AI · ${params.clinicName}</p>
            <h1 style="color:white;font-size:22px;margin:0;font-weight:600">New lead captured</h1>
          </div>

          <div style="background:#f8f9fa;border-radius:10px;padding:20px;margin-bottom:16px">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px;width:120px">Name</td>
                <td style="padding:8px 0;font-weight:600;font-size:14px;color:#111">${params.patientName}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px">Phone</td>
                <td style="padding:8px 0;font-weight:600;font-size:14px;color:#111">
                  <a href="tel:${params.patientPhone}" style="color:#2a7a5a">${params.patientPhone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px">Reason</td>
                <td style="padding:8px 0;font-size:14px;color:#111">${params.issue}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px">Urgency</td>
                <td style="padding:8px 0">
                  <span style="background:${urgencyColor}18;color:${urgencyColor};font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px">
                    ${urgencyLabel}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <p style="color:#6b7280;font-size:12px;margin:0">
            This patient chatted with your widget but did not complete a booking. Follow up with them directly.
          </p>
        </div>
      `,
    });
    console.log(`[Email] Lead notification sent to ${params.to}`);
  } catch (err: any) {
    console.error("[Email] Lead notification failed:", err.message);
  }
}