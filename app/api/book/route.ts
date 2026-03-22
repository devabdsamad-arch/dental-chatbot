import { NextRequest, NextResponse } from "next/server";
import { getClientConfig } from "@/lib/getClientConfig";
import { bookAppointment } from "@/lib/googleCalendar";
import { saveSessionStat, scheduleReminder } from "@/lib/db";
import { sendBookingConfirmation } from "@/lib/sms";
import { sendBookingNotification } from "@/lib/email";
import { parseISO, subHours, addHours, format } from "date-fns";

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

    const appointmentStart = parseISO(isoStart);
    const dateLabel        = format(appointmentStart, "EEEE d MMM");
    const timeLabel        = format(appointmentStart, "h:mm a");

    // 1. Create Google Calendar event
    const calResult = await bookAppointment({
      config,
      patientName,
      patientPhone,
      service,
      isoStart,
      isoEnd,
    });

    // 2. Send immediate SMS confirmation to patient
    await sendBookingConfirmation({
      to:          patientPhone,
      patientName,
      clinicName:  config.name,
      clinicPhone: config.phone,
      service,
      date:        dateLabel,
      time:        timeLabel,
    });

    // 2b. Send email notification to clinic owner
    if (config.contactEmail) {
      await sendBookingNotification({
        to:           config.contactEmail,
        clinicName:   config.name,
        patientName,
        patientPhone,
        service,
        date:         dateLabel,
        time:         timeLabel,
      });
    }

    // 3. Schedule 24hr reminder
    const reminderTime = subHours(appointmentStart, 24);
    if (reminderTime > new Date()) {
      await scheduleReminder({
        clientId,
        phone:  patientPhone,
        type:   "24hr_reminder",
        sendAt: reminderTime,
        payload: {
          patientName,
          clinicName:  config.name,
          clinicPhone: config.phone,
          service,
          time:        timeLabel,
        },
      });
    }

    // 4. Schedule post-visit review request (2hrs after appointment ends)
    const reviewTime = addHours(parseISO(isoEnd), 2);
    await scheduleReminder({
      clientId,
      phone:  patientPhone,
      type:   "review",
      sendAt: reviewTime,
      payload: {
        patientName,
        clinicName: config.name,
        reviewUrl:  config.bookingUrl ?? `https://search.google.com/search?q=${encodeURIComponent(config.name)}`,
      },
    });

    // 5. Update anonymous session stat
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
      eventId:          calResult?.eventId  ?? null,
      calendarLink:     calResult?.htmlLink ?? null,
      confirmationCode: `CF-${Date.now().toString(36).toUpperCase()}`,
      smsSent:          true,
    });

  } catch (error) {
    console.error("Book route error:", error);
    return NextResponse.json(
      { error: "Failed to book appointment" },
      { status: 500 }
    );
  }
}