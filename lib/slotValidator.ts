import { AvailableSlot } from "./googleCalendar";

// ================================================
// SLOT VALIDATOR
// ------------------------------------------------
// Validates requested times against real slots
// BEFORE the AI generates a response.
// The AI never makes availability decisions.
// ================================================

// Extract a requested time from the user's message
export function extractRequestedTime(message: string): string | null {
  // Match patterns like "10am", "10:00am", "10:00 AM", "10 am", "10"
  const match = message.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return null;

  let hour   = parseInt(match[1]);
  const mins = match[2] ? parseInt(match[2]) : 0;
  const ampm = match[3]?.toLowerCase();

  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;

  return `${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Check if a requested time (HH:MM) matches any available slot
export function findMatchingSlot(
  requestedTime: string,
  slots: AvailableSlot[]
): AvailableSlot | null {
  for (const slot of slots) {
    // Normalize slot time to HH:MM 24hr
    const slotMatch = slot.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!slotMatch) continue;

    let slotHour = parseInt(slotMatch[1]);
    const slotMins = parseInt(slotMatch[2]);
    const slotAmpm = slotMatch[3].toLowerCase();

    if (slotAmpm === "pm" && slotHour < 12) slotHour += 12;
    if (slotAmpm === "am" && slotHour === 12) slotHour = 0;

    const slotNormalized = `${String(slotHour).padStart(2, "0")}:${String(slotMins).padStart(2, "0")}`;

    if (slotNormalized === requestedTime) return slot;
  }
  return null;
}

// Get 2 closest available slots to a requested time for suggesting alternatives
export function getClosestSlots(
  requestedTime: string,
  slots: AvailableSlot[]
): AvailableSlot[] {
  const [reqH, reqM] = requestedTime.split(":").map(Number);
  const reqMins = reqH * 60 + reqM;

  return slots
    .map(slot => {
      const m = slot.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!m) return { slot, diff: 9999 };
      let h = parseInt(m[1]);
      if (m[3].toLowerCase() === "pm" && h < 12) h += 12;
      if (m[3].toLowerCase() === "am" && h === 12) h = 0;
      const slotMins = h * 60 + parseInt(m[2]);
      return { slot, diff: Math.abs(slotMins - reqMins) };
    })
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 2)
    .map(x => x.slot);
}
