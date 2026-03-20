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

export async function POST(req: NextRequest) {
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // offeredSlots is passed back from the frontend on every request
    // This solves the serverless statelessness problem — slots live
    // on the client side, not in server memory
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

    const isBookingRequest =
      /book|appointment|schedule|available|slot|when can|come in|next available/i.test(lastUserMessage);

    let systemPrompt   = buildSystemPrompt(config);
    let currentSlots: AvailableSlot[] = previousSlots; // carry forward from previous turns

    // ── FETCH REAL SLOTS ──────────────────────────
    if (isBookingRequest) {
      const freshSlots = await getAvailableSlots(config);
      currentSlots     = freshSlots; // refresh

      if (freshSlots.length === 0) {
        systemPrompt += `\n\nNo slots in next 5 working days. Apologise and ask if they'd like to try a different week.`;
      } else {
        const slotLines = freshSlots
          .map(s => `${s.date} at ${s.time}`)
          .join("\n");
        systemPrompt += `\n\nREAL AVAILABLE SLOTS:\n${slotLines}\n\nPresent 2-3 naturally. Never show ISO times.`;
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

    // ── BOOKING DETECTION ─────────────────────────
    let bookingTriggered = false;

    const isConfirmation = isBookingConfirmation(reply);
    console.log(`[Debug] isConfirmation: ${isConfirmation}, slots available: ${currentSlots.length}`);

    if (sessionId && isConfirmation && currentSlots.length > 0) {
      // Search all user messages for slot selection
      let selectedSlot: AvailableSlot | null = null;
      for (const msg of [...messages].reverse().filter((m: any) => m.role === "user")) {
        const found = detectSlotSelection(msg.content, currentSlots);
        if (found) { selectedSlot = found; break; }
      }

      const patientName  = extractPatientName(messages);
      const patientPhone = extractPhone(messages);
      const service      = extractService(messages);

      console.log(
        `[Debug] slot: ${selectedSlot?.time ?? "null"} | ` +
        `name: ${patientName ?? "null"} | ` +
        `phone: ${patientPhone ?? "null"}`
      );

      if (selectedSlot && patientName && patientPhone) {
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

    // Return slots back to frontend so they persist across turns
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