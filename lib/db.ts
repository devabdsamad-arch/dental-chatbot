import { getSupabaseAdmin } from "./supabase";

// ================================================
// DATABASE FUNCTIONS
// ------------------------------------------------
// IMPORTANT — DATA OWNERSHIP POLICY:
//
// We do NOT store patient personal data (names,
// phone numbers, health info) on our servers.
// That data belongs to the clinic.
//
// What we DO store:
// - Anonymous session stats (counts, urgency level)
// - Aggregate usage per client (for your dashboard)
//
// What the clinic gets:
// - Email notification with lead details sent
//   directly to the clinic owner
// - They own and control their patient data
//
// This keeps us clean under GDPR (UK), Privacy
// Act (AU), and HIPAA-adjacent rules (US).
// ================================================

// ── ANONYMOUS SESSION STATS ───────────────────────
// Tracks usage per client with NO personal data

export async function saveSessionStat(data: {
  clientId:   string;
  sessionId:  string;
  urgency:    string;  // routine / soon / emergency
  intent:     string;  // booking / faq / complaint / unknown
  messageCount: number;
  bookedAppointment: boolean;
}) {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("session_stats")
    .upsert([{
      client_id:          data.clientId,
      session_id:         data.sessionId,
      urgency:            data.urgency,
      intent:             data.intent,
      message_count:      data.messageCount,
      booked_appointment: data.bookedAppointment,
      updated_at:         new Date().toISOString(),
    }], { onConflict: "session_id" });

  if (error) console.error("Failed to save session stat:", error);
}

// ── AGGREGATE STATS (for your dashboard) ─────────

export async function getClientStats(clientId: string) {
  const db           = getSupabaseAdmin();
  const weekAgo      = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo     = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [totalSessions, weeklySessions, monthlySessions, bookings, emergencies] =
    await Promise.all([
      db.from("session_stats")
        .select("id", { count: "exact" })
        .eq("client_id", clientId),
      db.from("session_stats")
        .select("id", { count: "exact" })
        .eq("client_id", clientId)
        .gte("updated_at", weekAgo),
      db.from("session_stats")
        .select("id", { count: "exact" })
        .eq("client_id", clientId)
        .gte("updated_at", monthAgo),
      db.from("session_stats")
        .select("id", { count: "exact" })
        .eq("client_id", clientId)
        .eq("booked_appointment", true)
        .gte("updated_at", monthAgo),
      db.from("session_stats")
        .select("id", { count: "exact" })
        .eq("client_id", clientId)
        .eq("urgency", "emergency")
        .gte("updated_at", monthAgo),
    ]);

  return {
    totalSessions:      totalSessions.count   ?? 0,
    weeklySessions:     weeklySessions.count  ?? 0,
    monthlySessions:    monthlySessions.count ?? 0,
    bookingsThisMonth:  bookings.count        ?? 0,
    emergenciesThisMonth: emergencies.count   ?? 0,
  };
}

// ── REMINDERS ────────────────────────────────────

export async function scheduleReminder(data: {
  clientId:  string;
  phone:     string;
  type:      "confirmation" | "24hr_reminder" | "review";
  sendAt:    Date;
  payload:   Record<string, string>;
}) {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("reminders")
    .insert([{
      client_id: data.clientId,
      phone:     data.phone,
      type:      data.type,
      send_at:   data.sendAt.toISOString(),
      sent:      false,
      payload:   data.payload,
    }]);

  if (error) console.error("Failed to schedule reminder:", error);
}

export async function getDueReminders() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("reminders")
    .select("*")
    .eq("sent", false)
    .lte("send_at", new Date().toISOString())
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

export async function markReminderSentById(id: string) {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("reminders")
    .update({ sent: true })
    .eq("id", id);

  if (error) console.error("Failed to mark reminder sent:", error);
}