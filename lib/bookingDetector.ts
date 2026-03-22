import { AvailableSlot } from "./googleCalendar";

// ================================================
// BOOKING DETECTOR
// ------------------------------------------------
// All functions are pure — no side effects.
// Tested against real conversation patterns.
// ================================================

// ── BOOKING CONFIRMATION DETECTION ───────────────

export function isBookingConfirmation(reply: string): boolean {
  const patterns = [
    /your .+ is (set|confirmed|booked|all yours)/i,
    /booked you (in|for)/i,
    /appointment is confirmed/i,
    /i['']?ve booked you/i,
    /i['']?ve got you (booked|down|in)/i,
    /see you (on|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /we['']?ll (see you|send you a reminder)/i,
    /looking forward to seeing you/i,
    /you['']?re (all set|booked in)/i,
  ];
  return patterns.some(p => p.test(reply));
}

// ── SLOT SELECTION ────────────────────────────────

// Convert any time string to minutes since midnight
// Handles ALL formats: "8:15 AM", "8.15", "8:15", "815", "8 15", "9am", "9"
function timeToMinutes(input: string): number | null {
  const s = input.trim().toLowerCase();

  // Must contain at least one digit
  if (!/\d/.test(s)) return null;

  const hasPM = /pm/.test(s);
  const hasAM = /am/.test(s);

  // Strip everything except digits, colon, dot
  const clean = s.replace(/[^0-9:.]/g, "");
  if (!clean) return null;

  let hours: number;
  let mins: number;

  if (clean.includes(":")) {
    const parts = clean.split(":");
    hours = parseInt(parts[0]);
    mins  = parseInt(parts[1]) || 0;
  } else if (clean.includes(".")) {
    const parts = clean.split(".");
    hours = parseInt(parts[0]);
    mins  = parseInt(parts[1]) || 0;
  } else if (clean.length === 3) {
    // "815" -> 8:15
    hours = parseInt(clean[0]);
    mins  = parseInt(clean.slice(1));
  } else if (clean.length === 4) {
    // "0815" -> 8:15
    hours = parseInt(clean.slice(0, 2));
    mins  = parseInt(clean.slice(2));
  } else {
    hours = parseInt(clean);
    mins  = 0;
  }

  if (isNaN(hours) || isNaN(mins)) return null;
  if (mins > 59) return null;
  if (hours > 23) return null;

  // Apply AM/PM
  if (hasPM && hours < 12) hours += 12;
  if (hasAM && hours === 12) hours = 0;

  // No AM/PM given — apply clinic context heuristic
  // 1–6 without qualifier = afternoon (1pm–6pm)
  // 7–11 without qualifier = morning
  if (!hasPM && !hasAM && hours >= 1 && hours <= 6) {
    hours += 12;
  }

  return hours * 60 + mins;
}

// Get slot time in minutes
function slotToMinutes(slot: AvailableSlot): number | null {
  return timeToMinutes(slot.time);
}

export function detectSlotSelection(
  userMessage: string,
  offeredSlots: AvailableSlot[]
): AvailableSlot | null {
  if (!offeredSlots.length) return null;

  const lower = userMessage.toLowerCase().trim();

  // Date match first (most specific)
  for (const slot of offeredSlots) {
    if (lower.includes(slot.date.toLowerCase())) return slot;
  }

  // Convert user message to minutes and find exact match
  const userMins = timeToMinutes(userMessage);
  if (userMins !== null) {
    for (const slot of offeredSlots) {
      const slotMins = slotToMinutes(slot);
      if (slotMins === userMins) return slot;
    }
  }

  // Positional selection
  if (/\b(first|1st|earliest|soonest)\b/i.test(userMessage)) {
    return offeredSlots[0] ?? null;
  }
  if (/\b(second|2nd)\b/i.test(userMessage)) {
    return offeredSlots[1] ?? null;
  }
  if (/\b(third|3rd)\b/i.test(userMessage)) {
    return offeredSlots[2] ?? null;
  }

  // INTENTIONALLY no "yes/ok/sure" matching
  // Those words appear in phone confirmation and must never select a slot

  return null;
}

// ── SERVICE EXTRACTION ────────────────────────────

export function extractService(messages: any[]): string {
  const serviceMap: Record<string, string> = {
    "checkup":       "general checkup",
    "check-up":      "general checkup",
    "check up":      "general checkup",
    "general":       "general checkup",
    "cleaning":      "teeth cleaning",
    "clean":         "teeth cleaning",
    "whitening":     "teeth whitening",
    "whiten":        "teeth whitening",
    "filling":       "filling",
    "root canal":    "root canal",
    "root":          "root canal",
    "implant":       "dental implant",
    "orthodontic":   "orthodontic consultation",
    "braces":        "orthodontic consultation",
    "invisalign":    "orthodontic consultation",
    "align":         "orthodontic consultation",
    "emergency":     "emergency consultation",
    "urgent":        "emergency consultation",
    "pain":          "emergency consultation",
    "children":      "children's dentistry",
    "child":         "children's dentistry",
    "kid":           "children's dentistry",
    "paediatric":    "children's dentistry",
  };

  const allText = messages
    .filter((m: any) => m.role === "user")
    .map((m: any) => m.content.toLowerCase())
    .join(" ");

  for (const [kw, service] of Object.entries(serviceMap)) {
    if (allText.includes(kw)) return service;
  }
  return "general checkup";
}

// ── NAME EXTRACTION ───────────────────────────────

// Words that indicate the message is NOT a name
const NON_NAME_WORDS = /\b(what|when|where|how|why|which|available|slots|slot|can|could|would|should|appointment|booking|time|date|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|am|pm|please|thanks|thank|ok|okay|yes|no|sure|great|perfect)\b/i;

export function extractPatientName(messages: any[]): string | null {
  const userMessages = messages.filter((m: any) => m.role === "user");

  // 1. Explicit introduction patterns anywhere in conversation
  for (const msg of userMessages) {
    const text = msg.content.trim();

    const patterns = [
      /(?:my name is|i am|i'?m|it'?s|this is|call me)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      /^(?:hi|hello|hey)[,!\s]+(?:i'?m|i am|it'?s|this is)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      /^(?:hi|hello|hey)[,!\s]+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:here|speaking)$/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
  }

  // 2. Bot asked for name — extract from next user message
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];

    if (prev.role !== "assistant" || curr.role !== "user") continue;

    const botAskedForName =
      /\b(your name|what('?s| is) your name|name to hold|name please|can i (get|have) your name|what do i call you)\b/i.test(prev.content);

    if (!botAskedForName) continue;

    // Strip phone number from the response
    const stripped = curr.content
      .replace(/\+?\d[\d\s\-().]{8,}/g, "")
      .trim();

    if (!stripped || stripped.length < 2) continue;

    const words = stripped.trim().split(/\s+/);

    // Reject if contains non-name indicators
    if (NON_NAME_WORDS.test(stripped)) continue;

    // Reject if too long (names are 1-4 words)
    if (words.length > 4) continue;

    // Reject if contains digits
    if (/\d/.test(stripped)) continue;

    return stripped.trim();
  }

  return null;
}

// ── PHONE EXTRACTION ──────────────────────────────

export function extractPhone(messages: any[]): string | null {
  const userMessages = messages
    .filter((m: any) => m.role === "user")
    .map((m: any) => m.content);

  for (const text of userMessages) {
    // International: +92XXXXXXXXXX
    const intl = text.match(/\+\d{10,14}(?!\d)/);
    if (intl) return intl[0].trim();

    // Local: 10-11 contiguous digits
    const local = text.match(/\b\d{10,11}\b/);
    if (local) return local[0].trim();
  }

  return null;
}