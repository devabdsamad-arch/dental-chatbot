import { NextRequest, NextResponse } from "next/server";
import { getClientConfig } from "@/lib/getClientConfig";
import { cancelAppointment } from "@/lib/googleCalendar";
import { sendSMS } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    const { clientId, patientName, patientPhone, appointmentTime } = await req.json();

    if (!clientId || !patientName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const config = getClientConfig(clientId);
    if (!config) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Cancel with both name and time for precise matching
    const cancelled = await cancelAppointment({
      config,
      patientName,
      appointmentTime, // e.g. "9am", "9:00 AM"
    });

    // Send cancellation SMS
    if (cancelled && patientPhone) {
      const timeStr = appointmentTime ? ` at ${appointmentTime}` : "";
      await sendSMS(
        patientPhone,
        `Hi ${patientName}, your appointment${timeStr} at ${config.name} has been cancelled. ` +
        `To rebook, call us on ${config.phone}. Reply STOP to opt out.`
      );
    }

    return NextResponse.json({ success: true, cancelled });

  } catch (error) {
    console.error("Cancel route error:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}