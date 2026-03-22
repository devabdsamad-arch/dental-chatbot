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
import {
  extractRequestedTime,
  findMatchingSlot,
  getClosestSlots,
} from "@/lib/slotValidator";
import { sendLeadNotification } from "@/lib/email";

const bookedSessions = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { clientId, messages, sessionId, offeredSlots: previousSlots = [] } = await req.json();

    const config = getClientConfig(clientId);
    if (!config) {
      return NextResponse.json({ error: "Client not found or inactive" }, { status: 404 });
    }

    const lastUserMessage = messages
      .filter((m: any) => m.role === "user")
      .at(-1)?.content ?? "";

    const urgency = detectUrgency(lastUserMessage);
    const intent  = detectIntent(lastUserMessage);

    // Scan full conversation for booking intent
    const allUserText = messages
      .filter((m: any) => m.role === "user")
      .map((m: any) => m.content)
      .join(" ");

    const isBookingConversation =
      /book|appointment|schedule|available|slot|when can|come in|next available|saturday|sunday|monday|tuesday|wednesday|thursday|friday|morning|afternoon|evening|[0-9]{1,2}\s*(am|pm)/i.test(allUserText) ||
      previousSlots.length > 0;

    let systemPrompt   = buildSystemPrompt(config);
    let currentSlots: AvailableSlot[] = previousSlots;

    // ── FETCH REAL SLOTS ──────────────────────────
    if (isBookingConversation) {
      const freshSlots = await getAvailableSlots(config);
      currentSlots     = freshSlots;
    }

    // ── PRE-VALIDATE REQUESTED TIME ───────────────
    // Do this BEFORE calling OpenAI so the AI never
    // makes availability decisions — we do it for them
    let availabilityOverride: string | null = null;

    if (currentSlots.length > 0) {
      const requestedTime = extractRequestedTime(lastUserMessage);

      if (requestedTime) {
        const matchingSlot = findMatchingSlot(requestedTime, currentSlots);

        if (matchingSlot) {
          // Time is available — tell AI to offer exactly this slot
          availabilityOverride =
            `The patient requested ${matchingSlot.time} and it IS available. ` +
            `Offer them ${matchingSlot.date} at ${matchingSlot.time}. Do not offer other times unless they ask.`;
        } else {
          // Time is NOT available — tell AI to reject and give alternatives
          const alternatives = getClosestSlots(requestedTime, currentSlots);
          const altText      = alternatives.map(s => `${s.date} at ${s.time}`).join(" or ");
          availabilityOverride =
            `The patient requested a time that is NOT available. ` +
            `Tell them that time is unavailable. ` +
            `The closest available alternatives are: ${altText}. ` +
            `Only offer these alternatives.`;
        }
      }

      // Always inject full slot list so AI knows what exists
      const slotLines = currentSlots.map(s => `${s.date} at ${s.time}`).join("\n");
      systemPrompt +=
        `\n\nAVAILABLE SLOTS:\n${slotLines}` +
        (availabilityOverride ? `\n\nAVAILABILITY INSTRUCTION: ${availabilityOverride}` : "");
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

    // ── BOOKING DETECTION ─────────────────────────
    let bookingTriggered = false;
    const isConfirmation = isBookingConfirmation(reply);

    if (sessionId && isConfirmation && currentSlots.length > 0 && !bookedSessions.has(sessionId)) {
      let selectedSlot: AvailableSlot | null = null;

      for (const msg of [...messages].reverse().filter((m: any) => m.role === "user")) {
        const found = detectSlotSelection(msg.content, currentSlots);
        if (found) { selectedSlot = found; break; }
      }

      const patientName  = extractPatientName(messages);
      const patientPhone = extractPhone(messages);
      const service      = extractService(messages);

      console.log(
        `[Debug] confirmation detected | ` +
        `slot: ${selectedSlot?.time ?? "null"} | ` +
        `name: ${patientName ?? "null"} | ` +
        `phone: ${patientPhone ?? "null"}`
      );

      if (selectedSlot && patientName && patientPhone) {
        bookedSessions.add(sessionId);
        try {
          const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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

          const bookData   = await bookRes.json();
          bookingTriggered = bookData.success === true;

          console.log(
            `[Booking] ${config.name} — ${patientName}, ${service}, ` +
            `${selectedSlot.date} ${selectedSlot.time} | ` +
            `calendar: ${bookData.eventId ? "✓" : "✗"} | ` +
            `sms: ${bookData.smsSent ? "✓" : "✗"}`
          );
        } catch (err) {
          console.error("[Booking failed]", err);
        }
      } else {
        console.log(
          `[Booking incomplete] ` +
          `slot: ${selectedSlot ? "✓" : "✗"} ` +
          `name: ${patientName ? "✓" : "✗"} ` +
          `phone: ${patientPhone ? "✓" : "✗"}`
        );
      }
    }

    // ── SAVE SESSION STAT ─────────────────────────
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

    return NextResponse.json({
      reply,
      urgency,
      booked:       bookingTriggered,
      offeredSlots: currentSlots,
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}