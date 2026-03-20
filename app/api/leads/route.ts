import { NextResponse } from "next/server";

// ================================================
// LEADS ROUTE
// ------------------------------------------------
// We don't store patient personal data.
// Lead capture is handled by notifying the clinic
// directly via email from the chat route.
// This endpoint is kept as a placeholder for when
// the clinic portal is built — clinics will manage
// their own leads in their own portal.
// ================================================

export async function GET() {
  return NextResponse.json({
    message: "Patient data is sent directly to the clinic. We do not store personal data.",
  });
}