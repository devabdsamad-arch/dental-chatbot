// ================================================
// SMS SERVICE — Twilio
// ------------------------------------------------
// Three flows:
// 1. Booking confirmation — immediate
// 2. 24hr reminder — scheduled
// 3. Review request — 2hrs after appointment
//
// ⚠️ Add to .env.local:
// TWILIO_ACCOUNT_SID=ACxxxxxxxx
// TWILIO_AUTH_TOKEN=xxxxxxxx
// TWILIO_PHONE_NUMBER=+61xxxxxxxxx
// ================================================

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Missing Twilio credentials in .env.local");
  }

  const twilio = require("twilio");
  return twilio(accountSid, authToken);
}

// ── SEND SMS ─────────────────────────────────────

async function sendSMS(to: string, body: string): Promise<boolean> {
  try {
    const client = getTwilioClient();
    const from   = process.env.TWILIO_PHONE_NUMBER;

    if (!from) throw new Error("Missing TWILIO_PHONE_NUMBER");

    // Normalise phone number — ensure it has a + prefix
    const normalisedTo = normalisePhone(to);
    if (!normalisedTo) {
      console.error(`Invalid phone number: ${to}`);
      return false;
    }

    await client.messages.create({
      body,
      from,
      to: normalisedTo,
    });

    console.log(`[SMS sent] to ${normalisedTo}`);
    return true;

  } catch (err: any) {
    console.error(`[SMS failed] ${err.message}`);
    return false;
  }
}

// ── BOOKING CONFIRMATION ─────────────────────────
// Sent immediately when appointment is booked

export async function sendBookingConfirmation(params: {
  to:          string;
  patientName: string;
  clinicName:  string;
  clinicPhone: string;
  service:     string;
  date:        string;  // human-readable e.g. "Tuesday 25 Mar"
  time:        string;  // e.g. "10:00 AM"
}): Promise<boolean> {
  const body =
    `Hi ${params.patientName}, your ${params.service} at ${params.clinicName} ` +
    `is confirmed for ${params.date} at ${params.time}. ` +
    `Need to reschedule? Call us on ${params.clinicPhone}. See you then!`;

  return sendSMS(params.to, body);
}

// ── 24-HOUR REMINDER ─────────────────────────────
// Sent the day before the appointment

export async function send24HourReminder(params: {
  to:          string;
  patientName: string;
  clinicName:  string;
  clinicPhone: string;
  service:     string;
  time:        string;
}): Promise<boolean> {
  const body =
    `Hi ${params.patientName}, just a reminder that your ${params.service} ` +
    `at ${params.clinicName} is tomorrow at ${params.time}. ` +
    `Can't make it? Please call ${params.clinicPhone} so we can offer your spot to someone else. See you tomorrow!`;

  return sendSMS(params.to, body);
}

// ── 1-HOUR REMINDER ──────────────────────────────
// Sent 1 hour before the appointment

export async function send1HourReminder(params: {
  to:          string;
  patientName: string;
  clinicName:  string;
  service:     string;
  time:        string;
}): Promise<boolean> {
  const body =
    `Hi ${params.patientName}, your ${params.service} at ${params.clinicName} ` +
    `is in 1 hour at ${params.time}. See you soon!`;

  return sendSMS(params.to, body);
}

// ── REVIEW REQUEST ───────────────────────────────
// Sent ~2 hours after appointment time

export async function sendReviewRequest(params: {
  to:          string;
  patientName: string;
  clinicName:  string;
  reviewLink:  string;
}): Promise<boolean> {
  const body =
    `Hi ${params.patientName}, we hope your visit to ${params.clinicName} went well! ` +
    `If you have a moment, a Google review would mean a lot to the team: ${params.reviewLink}`;

  return sendSMS(params.to, body);
}

// ── PHONE NORMALISER ─────────────────────────────
// Ensures numbers have international format

function normalisePhone(phone: string): string | null {
  // Strip everything except digits and leading +
  const cleaned = phone.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) return cleaned;

  // Australian numbers
  if (cleaned.startsWith("04") || cleaned.startsWith("02") ||
      cleaned.startsWith("03") || cleaned.startsWith("07") ||
      cleaned.startsWith("08")) {
    return "+61" + cleaned.slice(1);
  }

  // UK numbers
  if (cleaned.startsWith("07") || cleaned.startsWith("01") ||
      cleaned.startsWith("02")) {
    return "+44" + cleaned.slice(1);
  }

  // US numbers
  if (cleaned.length === 10) {
    return "+1" + cleaned;
  }

  // Already has country code (11+ digits)
  if (cleaned.length >= 11) return "+" + cleaned;

  return null;
}