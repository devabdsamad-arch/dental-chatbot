import { NextRequest, NextResponse } from "next/server";
import { getClientConfig } from "@/lib/getClientConfig";
import { buildSystemPrompt } from "@/lib/buildSystemPrompt";
import { detectUrgency, detectIntent } from "@/lib/utils";
import { getAvailableSlots, bookAppointment } from "@/lib/googleCalendar";
import { saveSessionStat } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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

    // ── REAL CALENDAR SLOTS ──────────────────────
    if (isBookingRequest) {
      const slots = await getAvailableSlots(config);

      if (slots.length === 0) {
        systemPrompt += `\n\nNo slots available in the next 5 working days. Apologise warmly and ask if they'd like to be added to a waitlist or try a different week.`;
      } else {
        const slotLines = slots
          .map(s => `${s.date} at ${s.time} [${s.isoStart}|${s.isoEnd}]`)
          .join("\n");
        systemPrompt += `\n\nREAL AVAILABLE SLOTS (the ISO times in brackets are for the BOOK tag only — never show them to the patient):\n${slotLines}`;
      }
    }

    // ── CALL OPENAI ──────────────────────────────
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

    let reply = completion.choices[0].message.content ?? "";

    // ── PROCESS BOOKING TAG ──────────────────────
    // If the bot included a [BOOK:...] tag, extract it,
    // create the calendar event, then strip the tag from
    // the reply so the patient never sees it
    let bookingResult = null;
    const bookTagMatch = reply.match(
      /\[BOOK:slot=([^|]+)\|end=([^|]+)\|service=([^|]+)\|name=([^|]+)\|phone=([^\]]+)\]/
    );

    if (bookTagMatch) {
      const [fullTag, isoStart, isoEnd, service, patientName, patientPhone] = bookTagMatch;

      // Strip tag from reply immediately — patient never sees it
      reply = reply.replace(fullTag, "").trim();

      // Call the book route internally to handle:
      // calendar event + SMS confirmation + scheduled reminders
      try {
        const bookRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/book`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId,
              sessionId,
              patientName:  patientName.trim(),
              patientPhone: patientPhone.trim(),
              service:      service.trim(),
              isoStart:     isoStart.trim(),
              isoEnd:       isoEnd.trim(),
            }),
          }
        );
        const bookData = await bookRes.json();
        bookingResult  = bookData;
        console.log(`[Booking] ${config.name} — ${patientName}, ${service}`);
      } catch (bookErr) {
        console.error("Booking failed:", bookErr);
      }
    } else {
      // Non-booking message — just save stat
      if (sessionId) {
        await saveSessionStat({
          clientId,
          sessionId,
          urgency,
          intent,
          messageCount:      messages.length + 1,
          bookedAppointment: false,
        });
      }
    }

    // ── NOTIFY CLINIC IF LEAD CAPTURED ───────────
    const allUserText = messages
      .filter((m: any) => m.role === "user")
      .map((m: any) => m.content)
      .join(" ");

    const phoneMatch = allUserText.match(/(\+?[\d\s\-().]{9,15})/);
    const nameMatch  = extractName(messages);

    if (phoneMatch && nameMatch) {
      // ⚠️ Email notification to clinic (Resend — next integration)
      console.log(`[Lead] ${config.name} — ${nameMatch}, ${phoneMatch[0]}`);
    }

    return NextResponse.json({
      reply,
      urgency,
      booked: bookingResult !== null,
      calendarLink: bookingResult?.htmlLink ?? null,
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

function extractName(messages: any[]): string | null {
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (
      prev.role === "assistant" &&
      /your name|name please/i.test(prev.content) &&
      curr.role === "user" &&
      curr.content.trim().split(" ").length <= 4 &&
      !/\d/.test(curr.content)
    ) {
      return curr.content.trim();
    }
  }
  return null;
}