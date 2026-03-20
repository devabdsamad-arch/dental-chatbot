import { NextRequest, NextResponse } from "next/server";
import { getDueReminders, markReminderSentById } from "@/lib/db";
import { getClientConfig } from "@/lib/getClientConfig";
import { send24HourReminder, sendReviewRequest } from "@/lib/sms";

// ================================================
// CRON JOB — PROCESS DUE REMINDERS
// ------------------------------------------------
// Called every hour by Vercel Cron (see vercel.json)
// Reads due reminders from Supabase and sends SMS.
//
// Protected by CRON_SECRET so only Vercel can call it.
// Add to .env.local: CRON_SECRET=any-random-string
// ================================================

export async function GET(req: NextRequest) {

  // Verify this is called by Vercel cron, not random people
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reminders = await getDueReminders();
    console.log(`[Cron] Processing ${reminders.length} due reminders`);

    const results = await Promise.allSettled(
      reminders.map(async (reminder) => {
        const config  = getClientConfig(reminder.client_id);
        const payload = reminder.payload as Record<string, string>;

        let sent = false;

        if (reminder.type === "24hr_reminder") {
          sent = await send24HourReminder({
            to:          reminder.phone,
            patientName: payload.patientName,
            clinicName:  payload.clinicName,
            clinicPhone: payload.clinicPhone,
            service:     payload.service,
            time:        payload.time,
          });
        }

        if (reminder.type === "review") {
          sent = await sendReviewRequest({
            to:          reminder.phone,
            patientName: payload.patientName,
            clinicName:  payload.clinicName,
            reviewLink: payload.reviewUrl,
          });
        }

        if (sent) {
          await markReminderSentById(reminder.id);
        }

        return { id: reminder.id, type: reminder.type, sent };
      })
    );

    const succeeded = results.filter(r => r.status === "fulfilled").length;
    const failed    = results.filter(r => r.status === "rejected").length;

    return NextResponse.json({
      processed: reminders.length,
      succeeded,
      failed,
    });

  } catch (error) {
    console.error("[Cron] Reminder processing failed:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}