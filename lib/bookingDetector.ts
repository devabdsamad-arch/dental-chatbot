import { AvailableSlot } from "./googleCalendar";

export function isBookingConfirmation(reply: string): boolean {
  const patterns = [
    /your .+ is (set|confirmed|booked|all yours)/i,
    /booked you (in|for)/i,
    /appointment is confirmed/i,
    /i['']?ve booked you/i,
    /see you (on|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /we['']?ll (see you|send you a reminder)/i,
    /looking forward to seeing you/i,
    /you['']?re (all set|booked in)/i,
  ];
  return patterns.some(p => p.test(reply));
}

export function detectSlotSelection(
  userMessage: string,
  offeredSlots: AvailableSlot[]
): AvailableSlot | null {
  const lower = userMessage.toLowerCase().trim();

  // Direct time match — covers "9:00 AM", "9am", "9", "10", "11" etc
  for (const slot of offeredSlots) {
    const timeLower  = slot.time.toLowerCase();
    const timeClean  = timeLower.replace(/\s/g, "");
    const dateLower  = slot.date.toLowerCase();

    // Extract just the hour number from the slot time e.g. "9:00 AM" -> "9"
    const hourMatch  = slot.time.match(/^(\d{1,2})/);
    const hourOnly   = hourMatch ? hourMatch[1] : null;

    if (
      lower.includes(timeLower)  ||
      lower.includes(timeClean)  ||
      lower.includes(dateLower)  ||
      // Match bare hour: user types "9" and slot is "9:00 AM"
      (hourOnly && new RegExp(`\b${hourOnly}\b`).test(userMessage) && 
       !offeredSlots.some(s => s !== slot && s.time.startsWith(hourOnly + ":")))
    ) {
      return slot;
    }
  }

  // If only one slot starts with the typed hour (handles ambiguity)
  const hourTyped = userMessage.trim().match(/^(\d{1,2})$/);
  if (hourTyped) {
    const matched = offeredSlots.filter(s => s.time.startsWith(hourTyped[1] + ":"));
    if (matched.length === 1) return matched[0];
  }

  // Positional selection
  if (/\b(first|1st|option\s*1|\b1\b|earliest|soonest)\b/i.test(userMessage)) {
    return offeredSlots[0] ?? null;
  }
  if (/\b(second|2nd|option\s*2|\b2\b)\b/i.test(userMessage)) {
    return offeredSlots[1] ?? null;
  }
  if (/\b(third|3rd|option\s*3|\b3\b)\b/i.test(userMessage)) {
    return offeredSlots[2] ?? null;
  }

  // Simple acceptance when only one slot was offered or context is clear
  if (/^\s*(ok|okay|yes|sure|that works|perfect|great|fine|works for me|sounds good|yep|yeah|yup)\s*$/i.test(userMessage)) {
    return offeredSlots[0] ?? null;
  }

  return null;
}

export function extractService(messages: any[]): string {
  const serviceMap: Record<string, string> = {
    "checkup":     "general checkup",
    "check-up":    "general checkup",
    "check up":    "general checkup",
    "cleaning":    "teeth cleaning",
    "clean":       "teeth cleaning",
    "whitening":   "teeth whitening",
    "whiten":      "teeth whitening",
    "filling":     "filling",
    "root canal":  "root canal",
    "implant":     "dental implant",
    "orthodontic": "orthodontic consultation",
    "braces":      "orthodontic consultation",
    "align":       "orthodontic consultation",
    "emergency":   "emergency consultation",
    "children":    "children's dentistry",
    "kid":         "children's dentistry",
    "child":       "children's dentistry",
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

export function extractPatientName(messages: any[]): string | null {
  const userMessages = messages.filter((m: any) => m.role === "user");

  for (const msg of userMessages) {
    const text = msg.content.trim();

    // "my name is X" / "i'm X" / "it's X" / "this is X"
    const explicit = text.match(
      /(?:my name is|i['']?m|it['']?s|this is|call me)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i
    );
    if (explicit) return explicit[1].trim();

    // "hi i'm X" / "hey it's X"
    const intro = text.match(
      /^(?:hi|hello|hey)[,!\s]+(?:i['']?m|it['']?s|this is)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i
    );
    if (intro) return intro[1].trim();

    // "hi X here" / "X speaking"
    const nameFirst = text.match(
      /^(?:hi|hello|hey)[,!\s]+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:here|speaking)/i
    );
    if (nameFirst) return nameFirst[1].trim();
  }

  // Bot asked for name — next user message is the name
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (
      prev.role === "assistant" &&
      /your name|name to hold|name please|what['']?s your name/i.test(prev.content) &&
      curr.role === "user" &&
      curr.content.trim().split(/\s+/).length <= 5 &&
      !/\d/.test(curr.content) &&
      curr.content.trim().length > 1
    ) {
      return curr.content.trim();
    }
  }

  return null;
}

export function extractPhone(messages: any[]): string | null {
  const userMessages = messages
    .filter((m: any) => m.role === "user")
    .map((m: any) => m.content);

  for (const text of userMessages) {
    // Match international format: +92XXXXXXXXXX (exact digits, no trailing chars)
    const intl = text.match(/\+\d{10,14}(?!\d)/);
    if (intl) return intl[0].trim();

    // Match local format: 10-11 digit number
    const local = text.match(/\d{10,11}/);
    if (local) return local[0].trim();
  }

  return null;
}
