import { NextRequest, NextResponse } from "next/server";
import { getClientConfig } from "@/lib/getClientConfig";
import { cancelAppointment } from "@/lib/googleCalendar";
import { sendSMS } from "@/lib/sms";

// ================================================
// CANCEL APPOINTMENT ROUTE
// ------------------------------------------------
// Called when the bot detects a cancellation intent
// and has confirmed the patient's name.
// Deletes the event from Google Calendar and sends
// a cancellation confirmation SMS.
// ================================================

export async function POST(req: NextRequest) {
  try {
    const { clientId, patientName, patientPhone, isoStart } = await req.json();

    if (!clientId || !patientName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const config = getClientConfig(clientId);
    if (!config) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Delete from Google Calendar
    const cancelled = await cancelAppointment({
      config,
      patientName,
      isoStart,
    });

    // Send cancellation SMS to patient
    if (cancelled && patientPhone) {
      await sendSMS(
        patientPhone,
        `Hi ${patientName}, your appointment at ${config.name} has been cancelled. ` +
        `If you'd like to rebook, visit our website or call us on ${config.phone}. Reply STOP to opt out.`
      );
    }

    return NextResponse.json({ success: true, cancelled });

  } catch (error) {
    console.error("Cancel route error:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}