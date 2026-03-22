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

  // Normalise user input — "8.15", "8:15", "8 15" all become "8:15"
  const normalised = lower
    .replace(/(\d{1,2})[.\s](\d{2})/g, "$1:$2")  // 8.15 -> 8:15
    .replace(/(\d{1,2})(am|pm)/g, "$1:00 $2");    // 8am -> 8:00 am

  // Normalise each slot time for comparison
  const normaliseSlot = (t: string) =>
    t.toLowerCase().replace(/\s/g, "").replace(/^(\d):/, "0$1:");

  for (const slot of offeredSlots) {
    const slotNorm  = normaliseSlot(slot.time);
    const timeLower = slot.time.toLowerCase();
    const timeClean = timeLower.replace(/\s/g, "");
    const dateLower = slot.date.toLowerCase();

    // Check normalised input against normalised slot
    const normClean = normalised.replace(/\s/g, "");

    if (
      normalised.includes(slotNorm)  ||
      normClean.includes(timeClean)  ||
      lower.includes(timeLower)      ||
      lower.includes(dateLower)
    ) {
      return slot;
    }
  }

  // Bare hour match — only if unambiguous (one slot for that hour)
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
  // Strip phone numbers first so "Abdul Samad +923165743196" still works
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (
      prev.role === "assistant" &&
      /your name|name to hold|name please|what['']?s your name|name and.*phone|phone.*name/i.test(prev.content) &&
      curr.role === "user"
    ) {
      // Strip phone number from message before extracting name
      const stripped = curr.content
        .replace(/\+?[\d\s\-().]{9,20}/g, "")
        .trim();

      if (stripped.length > 1 && stripped.split(/\s+/).length <= 5) {
        return stripped.trim();
      }
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