// ================================================
// SMS SERVICE — Twilio
// ------------------------------------------------
// Three flows:
// 1. Booking confirmation — fires immediately
// 2. 24hr reminder       — fires via cron job
// 3. Review request      — fires via cron job
//
// ⚠️ Add to .env.local:
// TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// TWILIO_AUTH_TOKEN=your-auth-token
// TWILIO_PHONE_NUMBER=+61xxxxxxxxx
// ================================================

async function sendSMSRaw(to: string, body: string): Promise<boolean> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const from       = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !from) {
      console.warn("[SMS] Missing Twilio credentials — SMS not sent");
      return false;
    }

    const { default: twilio } = await import("twilio");
    const client = twilio(accountSid, authToken) as any;

    await client.messages.create({ to, from, body });
    console.log(`[SMS sent] to ${to}`);
    return true;

  } catch (err: any) {
    console.error(`[SMS failed] to ${to}:`, err.message);
    return false;
  }
}

// ── 1. BOOKING CONFIRMATION ──────────────────────

export async function sendBookingConfirmation(params: {
  to:          string;
  patientName: string;
  clinicName:  string;
  clinicPhone: string;
  service:     string;
  date:        string;
  time:        string;
}) {
  const msg =
    `Hi ${params.patientName}, your ${params.service} appointment at ` +
    `${params.clinicName} is confirmed for ${params.date} at ${params.time}. ` +
    `Questions? Call us on ${params.clinicPhone}. ` +
    `Reply STOP to opt out.`;

  return sendSMSRaw(params.to, msg);
}

// ── 2. 24-HOUR REMINDER ──────────────────────────

export async function send24HourReminder(params: {
  to:          string;
  patientName: string;
  clinicName:  string;
  clinicPhone: string;
  service:     string;
  time:        string;
}) {
  const msg =
    `Hi ${params.patientName}, just a reminder that your ` +
    `${params.service} appointment at ${params.clinicName} ` +
    `is tomorrow at ${params.time}. ` +
    `Need to reschedule? Call ${params.clinicPhone}. ` +
    `Reply STOP to opt out.`;

  return sendSMSRaw(params.to, msg);
}

// ── 3. REVIEW REQUEST ────────────────────────────

export async function sendReviewRequest(params: {
  to:          string;
  patientName: string;
  clinicName:  string;
  reviewLink:  string;
}) {
  const msg =
    `Hi ${params.patientName}, thanks for visiting ${params.clinicName} today! ` +
    `If you had a good experience, a quick Google review would mean a lot to the team: ` +
    `${params.reviewLink} ` +
    `Reply STOP to opt out.`;

  return sendSMSRaw(params.to, msg);
}