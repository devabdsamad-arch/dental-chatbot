import { NextRequest, NextResponse } from "next/server";
import { getClientConfig } from "@/lib/getClientConfig";
import { bookAppointment } from "@/lib/googleCalendar";
import { saveSessionStat } from "@/lib/db";
import { sendBookingConfirmation } from "@/lib/sms";
import { scheduleReminders } from "@/lib/reminderQueue";
import { formatInTimeZone } from "date-fns-tz";
import { parseISO } from "date-fns";

// ================================================
// BOOK APPOINTMENT ROUTE
// ------------------------------------------------
// 1. Creates event in clinic's Google Calendar
// 2. Sends SMS confirmation to patient
// 3. Queues 24hr reminder, 1hr reminder, review request
// ================================================

export async function POST(req: NextRequest) {
  try {
    const {
      clientId,
      sessionId,
      patientName,
      patientPhone,
      service,
      isoStart,
      isoEnd,
    } = await req.json();

    if (!clientId || !patientName || !patientPhone || !isoStart || !isoEnd) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const config = getClientConfig(clientId);
    if (!config) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const timezone      = config.timezone ?? "Australia/Melbourne";
    const dateFormatted = formatInTimeZone(parseISO(isoStart), timezone, "EEEE d MMM");
    const timeFormatted = formatInTimeZone(parseISO(isoStart), timezone, "h:mm a");

    // ── 1. BOOK IN GOOGLE CALENDAR ───────────────
    const calendarResult = await bookAppointment({
      config,
      patientName,
      patientPhone,
      service,
      isoStart,
      isoEnd,
    });

    // ── 2. SEND CONFIRMATION SMS ─────────────────
    const smsSent = await sendBookingConfirmation({
      to:          patientPhone,
      patientName,
      clinicName:  config.name,
      clinicPhone: config.phone,
      service,
      date:        dateFormatted,
      time:        timeFormatted,
    });

    // ── 3. QUEUE REMINDERS ───────────────────────
    await scheduleReminders({
      clientId,
      patientName,
      patientPhone,
      service,
      appointmentIso: isoStart,
      reviewLink: `https://g.page/r/${clientId}/review`,
      // ⚠️ Replace with the clinic's actual Google review link
      // Add reviewLink to ClientConfig once you have it per client
    });

    // ── 4. UPDATE SESSION STAT ───────────────────
    if (sessionId) {
      await saveSessionStat({
        clientId,
        sessionId,
        urgency:           "routine",
        intent:            "booking",
        messageCount:      0,
        bookedAppointment: true,
      });
    }

    return NextResponse.json({
      success:          true,
      confirmationCode: `CF-${Date.now().toString(36).toUpperCase()}`,
      calendarLink:     calendarResult?.htmlLink ?? null,
      smsSent,
      remindersQueued:  true,
    });

  } catch (error) {
    console.error("Book route error:", error);
    return NextResponse.json(
      { error: "Failed to book appointment" },
      { status: 500 }
    );
  }
}