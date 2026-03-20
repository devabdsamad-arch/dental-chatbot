import { NextRequest, NextResponse } from "next/server";
import { getClientConfig } from "@/lib/getClientConfig";
import { buildSystemPrompt } from "@/lib/buildSystemPrompt";
import { detectUrgency, detectIntent } from "@/lib/utils";
import { getAvailableSlots, AvailableSlot } from "@/lib/googleCalendar";
import { saveSessionStat } from "@/lib/db";
import {
  isBookingConfirmation,
  detectSlotSelection,
  extractService,
  extractPatientName,
  extractPhone,
} from "@/lib/bookingDetector";

// Session slot cache — stores offered slots per session
// so we know which slots were presented to the patient
const sessionSlotCache = new Map<string, AvailableSlot[]>();

export async function POST(req: NextRequest) {
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { clientId, messages, sessionId } = await req.json();

    const config = getClientConfig(clientId);
    if (!config) {
      return NextResponse.json(
        { error: "Client not found or inactive" },
        { status: 404 }
      );
    }

    const lastUserMessage = messages
      .filter((m: any) => m.role === "user")
      .at(-1)?.content ?? "";

    const urgency = detectUrgency(lastUserMessage);
    const intent  = detectIntent(lastUserMessage);

    const isBookingRequest =
      /book|appointment|schedule|available|slot|when can|come in|next available/i.test(lastUserMessage);

    let systemPrompt = buildSystemPrompt(config);

    // ── FETCH REAL CALENDAR SLOTS ─────────────────
    let currentSlots: AvailableSlot[] = [];

    if (isBookingRequest) {
      currentSlots = await getAvailableSlots(config);

      // Cache slots for this session
      if (sessionId) {
        sessionSlotCache.set(sessionId, currentSlots);
      }

      if (currentSlots.length === 0) {
        systemPrompt += `\n\nNo slots available in the next 5 working days. Apologise warmly and ask if they'd like to try a different week.`;
      } else {
        const slotLines = currentSlots
          .map(s => `${s.date} at ${s.time}`)
          .join("\n");
        systemPrompt += `\n\nREAL AVAILABLE SLOTS from the clinic calendar:\n${slotLines}\n\nPresent 2-3 of these conversationally. Do not list them all.`;
      }
    }

    // ── CALL OPENAI ───────────────────────────────
    const completion = await openai.chat.completions.create({
      model:       "gpt-4o-mini",
      max_tokens:  500,
      temperature: 0.65,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
          role:    m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const reply = completion.choices[0].message.content ?? "";

    // ── SMART BOOKING DETECTION ───────────────────
    // We detect booking confirmation from conversation
    // state — no AI tag needed, far more reliable
    let bookingTriggered = false;

    if (sessionId && isBookingConfirmation(reply)) {
      // Get cached slots for this session
      const offeredSlots = sessionSlotCache.get(sessionId) ?? [];

      // Find which slot was selected across all user messages
      let selectedSlot: AvailableSlot | null = null;
      for (const msg of messages.filter((m: any) => m.role === "user")) {
        const found = detectSlotSelection(msg.content, offeredSlots);
        if (found) { selectedSlot = found; break; }
      }

      // Also check last user message directly
      if (!selectedSlot) {
        selectedSlot = detectSlotSelection(lastUserMessage, offeredSlots);
      }

      const patientName  = extractPatientName(messages);
      const patientPhone = extractPhone(messages);
      const service      = extractService(messages);

      if (selectedSlot && patientName && patientPhone) {
        // Fire booking — calendar event + SMS + reminders
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
          const bookRes = await fetch(`${appUrl}/api/book`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId,
              sessionId,
              patientName,
              patientPhone,
              service,
              isoStart: selectedSlot.isoStart,
              isoEnd:   selectedSlot.isoEnd,
            }),
          });

          const bookData = await bookRes.json();
          bookingTriggered = bookData.success === true;

          console.log(
            `[Booking] ${config.name} — ${patientName}, ${service}, ` +
            `${selectedSlot.date} ${selectedSlot.time}, ` +
            `calendar: ${bookData.eventId ? "✓" : "✗"}, ` +
            `sms: ${bookData.smsSent ? "✓" : "✗"}`
          );

          // Clear slot cache after successful booking
          sessionSlotCache.delete(sessionId);

        } catch (bookErr) {
          console.error("[Booking failed]", bookErr);
        }
      } else {
        // Log what's missing so we can debug
        console.log(
          `[Booking attempted but incomplete] ` +
          `slot: ${selectedSlot ? "✓" : "✗"} ` +
          `name: ${patientName ? "✓" : "✗"} ` +
          `phone: ${patientPhone ? "✓" : "✗"}`
        );
      }
    }

    // ── SAVE ANONYMOUS SESSION STAT ───────────────
    if (sessionId) {
      await saveSessionStat({
        clientId,
        sessionId,
        urgency,
        intent,
        messageCount:      messages.length + 1,
        bookedAppointment: bookingTriggered,
      });
    }

    return NextResponse.json({ reply, urgency, booked: bookingTriggered });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}