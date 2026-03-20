// ================================================
// BOOKING DETECTOR
// ------------------------------------------------
// Instead of relying on GPT to generate a
// [BOOK:...] tag, we detect booking confirmation
// from the conversation ourselves.
//
// We track:
// 1. Has the bot offered specific slots?
// 2. Did the user accept one?
// 3. Do we have name + phone?
// 4. Did the bot just confirm the booking?
//
// When all 4 are true — fire the booking.
// ================================================

import { AvailableSlot } from "./googleCalendar";

export interface BookingState {
  offeredSlots:   AvailableSlot[];
  selectedSlot:   AvailableSlot | null;
  patientName:    string | null;
  patientPhone:   string | null;
  service:        string | null;
  bookingFired:   boolean;
}

// Detect if the bot's reply is a booking confirmation
export function isBookingConfirmation(reply: string): boolean {
  const patterns = [
    /your .+ is (set|confirmed|booked|all yours)/i,
    /booked you (in|for)/i,
    /appointment is confirmed/i,
    /see you (on|monday|tuesday|wednesday|thursday|friday|saturday)/i,
    /we'll (see you|send you a reminder)/i,
    /looking forward to seeing you/i,
  ];
  return patterns.some(p => p.test(reply));
}

// Extract which slot the user selected from their message
export function detectSlotSelection(
  userMessage: string,
  offeredSlots: AvailableSlot[]
): AvailableSlot | null {
  const lower = userMessage.toLowerCase();

  // Direct time mention — "1 works", "2:30", "the first one"
  for (const slot of offeredSlots) {
    const timeClean = slot.time.toLowerCase().replace(/\s/g, "");
    const timeLower = slot.time.toLowerCase();

    if (
      lower.includes(timeLower) ||
      lower.includes(timeClean) ||
      lower.includes(slot.date.toLowerCase())
    ) {
      return slot;
    }
  }

  // Positional — "first", "second", "1", "2"
  if (/\b(first|1st|number one|the first|option 1|\b1\b)\b/i.test(userMessage)) {
    return offeredSlots[0] ?? null;
  }
  if (/\b(second|2nd|number two|the second|option 2|\b2\b)\b/i.test(userMessage)) {
    return offeredSlots[1] ?? null;
  }
  if (/\b(third|3rd|\b3\b)\b/i.test(userMessage)) {
    return offeredSlots[2] ?? null;
  }

  // Acceptance words when only one slot was offered
  if (offeredSlots.length === 1 &&
    /\b(ok|okay|yes|sure|that works|perfect|great|fine|works for me)\b/i.test(userMessage)) {
    return offeredSlots[0];
  }

  return null;
}

// Extract service from conversation history
export function extractService(messages: any[]): string {
  const serviceKeywords: Record<string, string> = {
    "checkup":      "general checkup",
    "check-up":     "general checkup",
    "check up":     "general checkup",
    "cleaning":     "teeth cleaning",
    "clean":        "teeth cleaning",
    "whitening":    "teeth whitening",
    "whiten":       "teeth whitening",
    "filling":      "filling",
    "root canal":   "root canal",
    "implant":      "dental implant",
    "orthodontic":  "orthodontic consultation",
    "braces":       "orthodontic consultation",
    "align":        "orthodontic consultation",
    "emergency":    "emergency consultation",
    "pain":         "emergency consultation",
    "children":     "children's dentistry",
    "kid":          "children's dentistry",
    "child":        "children's dentistry",
  };

  const allText = messages
    .filter((m: any) => m.role === "user")
    .map((m: any) => m.content.toLowerCase())
    .join(" ");

  for (const [keyword, service] of Object.entries(serviceKeywords)) {
    if (allText.includes(keyword)) return service;
  }

  return "general checkup"; // safe default
}

// Extract patient name from conversation
export function extractPatientName(messages: any[]): string | null {
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (
      prev.role === "assistant" &&
      /your name|name to hold|name please/i.test(prev.content) &&
      curr.role === "user" &&
      curr.content.trim().split(" ").length <= 5 &&
      !/\d/.test(curr.content) &&
      curr.content.trim().length > 1
    ) {
      return curr.content.trim();
    }
  }

  // Also check if they introduced themselves at the start
  const firstUserMsg = messages.find((m: any) => m.role === "user")?.content ?? "";
  const introMatch   = firstUserMsg.match(/^(hi|hello|hey)[,\s]+i['']?m\s+([a-zA-Z\s]+)/i);
  if (introMatch) return introMatch[2].trim();

  // "it's John" / "this is John"
  const nameMatch = firstUserMsg.match(/(?:it'?s|this is|my name is|i'?m)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (nameMatch) return nameMatch[1].trim();

  return null;
}

// Extract phone number from conversation
export function extractPhone(messages: any[]): string | null {
  const allText = messages
    .filter((m: any) => m.role === "user")
    .map((m: any) => m.content)
    .join(" ");

  const match = allText.match(/(\+?[\d\s\-().]{9,20})/);
  return match ? match[0].replace(/\s+/g, "").trim() : null;
}