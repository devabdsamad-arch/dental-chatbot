import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, addDays, isWeekend, setHours, setMinutes } from "date-fns";
import { TimeSlot } from "@/types";

// ================================================
// TAILWIND CLASS MERGER
// ================================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ================================================
// GENERATE MOCK AVAILABLE SLOTS
// ------------------------------------------------
// Used until a real calendar integration (Google
// Calendar / Calendly) is connected.
// Generates realistic slots for the next 5 weekdays.
// ================================================
export function getMockAvailableSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const morningTimes = ["9:00 AM", "10:00 AM", "11:00 AM"];
  const afternoonTimes = ["1:00 PM", "2:30 PM", "4:00 PM"];

  let day = addDays(new Date(), 1);
  let slotsAdded = 0;

  while (slotsAdded < 6) {
    if (!isWeekend(day)) {
      const times = slotsAdded < 3 ? morningTimes : afternoonTimes;
      const time = times[slotsAdded % 3];
      slots.push({
        date: format(day, "EEEE d MMM"),
        time,
        available: true,
      });
      slotsAdded++;
    }
    day = addDays(day, 1);
  }

  return slots;
}

// ================================================
// FORMAT SLOTS FOR CHAT DISPLAY
// ================================================
export function formatSlotsForChat(slots: TimeSlot[]): string {
  return slots
    .map((s, i) => `${i + 1}. ${s.date} at ${s.time}`)
    .join("\n");
}

// ================================================
// GENERATE UNIQUE ID
// ================================================
export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

// ================================================
// DETECT URGENCY FROM MESSAGE
// ================================================
export function detectUrgency(
  message: string
): "emergency" | "soon" | "routine" {
  const emergencyWords = [
    "emergency",
    "severe pain",
    "knocked out",
    "bleeding",
    "swollen",
    "unbearable",
    "can't sleep",
    "broken tooth",
    "abscess",
    "urgent",
  ];
  const soonWords = [
    "pain",
    "ache",
    "hurts",
    "sore",
    "sensitive",
    "discomfort",
    "crack",
    "filling fell",
  ];

  const lower = message.toLowerCase();
  if (emergencyWords.some((w) => lower.includes(w))) return "emergency";
  if (soonWords.some((w) => lower.includes(w))) return "soon";
  return "routine";
}

// ================================================
// DETECT INTENT FROM MESSAGE
// ================================================
export function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  if (/book|appointment|schedule|slot|come in/i.test(lower))  return "booking";
  if (/price|cost|fee|charge|how much|insurance|cover/i.test(lower)) return "pricing";
  if (/cancel|reschedule|change my/i.test(lower))             return "cancellation";
  if (/pain|hurt|ache|bleed|broke|emergency/i.test(lower))    return "emergency";
  if (/hour|open|location|where|park/i.test(lower))           return "faq";
  return "unknown";
}