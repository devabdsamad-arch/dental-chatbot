import { AvailableSlot } from "./googleCalendar";

// ================================================
// SLOT VALIDATOR
// ------------------------------------------------
// Validates requested times against real slots
// BEFORE the AI generates a response.
// ================================================

export function extractRequestedTime(message: string): string | null {
  const match = message.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return null;

  let hour   = parseInt(match[1]);
  const mins = match[2] ? parseInt(match[2]) : 0;
  const ampm = match[3]?.toLowerCase();

  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  // If no am/pm given and hour is between 7-11, assume AM
  // If between 1-6, assume PM (clinic hours context)
  if (!ampm) {
    if (hour >= 1 && hour <= 6) hour += 12;
  }

  return `${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Normalize slot time "9:00 AM" -> "09:00"
function normalizeSlotTime(time: string): string {
  const m = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return "";
  let h = parseInt(m[1]);
  const mins = m[2];
  if (m[3].toLowerCase() === "pm" && h < 12) h += 12;
  if (m[3].toLowerCase() === "am" && h === 12) h = 0;
  return `${String(h).padStart(2,"0")}:${mins}`;
}

export function findMatchingSlot(
  requestedTime: string,
  slots: AvailableSlot[]
): AvailableSlot | null {
  for (const slot of slots) {
    const normalized = normalizeSlotTime(slot.time);
    if (normalized === requestedTime) return slot;
  }
  return null;
}

// Check if a requested time falls within an available slot window
// e.g. if 9:00 and 9:15 are both free, and patient asks for 9:00 — it's valid
export function isTimeWithinAvailableWindow(
  requestedTime: string,
  slots: AvailableSlot[]
): boolean {
  const [reqH, reqM] = requestedTime.split(":").map(Number);
  const reqMins = reqH * 60 + reqM;

  return slots.some(slot => {
    const norm = normalizeSlotTime(slot.time);
    if (!norm) return false;
    const [slotH, slotM] = norm.split(":").map(Number);
    const slotMins = slotH * 60 + slotM;
    // Within 30 minutes of an available slot = that window is free
    return Math.abs(slotMins - reqMins) <= 30;
  });
}

export function getClosestSlots(
  requestedTime: string,
  slots: AvailableSlot[]
): AvailableSlot[] {
  const [reqH, reqM] = requestedTime.split(":").map(Number);
  const reqMins = reqH * 60 + reqM;

  return slots
    .map(slot => {
      const norm = normalizeSlotTime(slot.time);
      if (!norm) return { slot, diff: 9999 };
      const [h, m] = norm.split(":").map(Number);
      return { slot, diff: Math.abs(h * 60 + m - reqMins) };
    })
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 2)
    .map(x => x.slot);
}