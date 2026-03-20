import { NextResponse } from "next/server";

// ================================================
// APPOINTMENTS ROUTE
// ------------------------------------------------
// Appointment details belong to the clinic.
// Once Google Calendar is connected, bookings go
// directly into the clinic's own calendar.
// We only track a boolean (was appointment booked?)
// in our anonymous session stats — no details.
// ================================================

export async function GET() {
  return NextResponse.json({
    message: "Appointments are booked directly into the clinic's Google Calendar.",
  });
}