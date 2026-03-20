import { mockAppointments } from "@/lib/mock/data";
import { format, parseISO } from "date-fns";
import { Bell, CheckCircle, Clock, Star } from "lucide-react";

// ================================================
// APPOINTMENTS PAGE
// All booked appointments with status tracking,
// reminder status, and review request status
// ================================================

const statusConfig: Record<string, { label: string; class: string }> = {
  pending:   { label: "Pending",   class: "bg-gray-100 text-gray-600" },
  confirmed: { label: "Confirmed", class: "bg-blue-50 text-blue-600 border border-blue-200" },
  reminded:  { label: "Reminded",  class: "bg-purple-50 text-purple-600 border border-purple-200" },
  completed: { label: "Completed", class: "bg-green-50 text-green-700 border border-green-200" },
  no_show:   { label: "No show",   class: "bg-red-50 text-red-600 border border-red-200" },
};

export default function AppointmentsPage() {
  const upcoming  = mockAppointments.filter(a => a.status !== "completed" && a.status !== "no_show");
  const completed = mockAppointments.filter(a => a.status === "completed" || a.status === "no_show");

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-sm mt-1">Booked via your chatbot</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-blue-50 text-blue-600 font-medium px-3 py-1.5 rounded-full border border-blue-200">
            {upcoming.length} upcoming
          </span>
          <span className="bg-green-50 text-green-700 font-medium px-3 py-1.5 rounded-full border border-green-200">
            {completed.length} completed
          </span>
        </div>
      </div>

      {/* ── UPCOMING ─────────────────────────────── */}
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Upcoming</h2>
      <div className="space-y-3 mb-8">
        {upcoming.map((apt) => (
          <AppointmentCard key={apt.id} apt={apt} />
        ))}
      </div>

      {/* ── COMPLETED ────────────────────────────── */}
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Completed</h2>
      <div className="space-y-3">
        {completed.map((apt) => (
          <AppointmentCard key={apt.id} apt={apt} />
        ))}
      </div>

    </div>
  );
}

function AppointmentCard({ apt }: { apt: any }) {
  const status = statusConfig[apt.status] ?? statusConfig.pending;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-6 py-4 flex items-center gap-6">

      {/* Date block */}
      <div className="w-14 text-center flex-shrink-0">
        <p className="text-2xl font-semibold text-gray-900 leading-none">
          {format(parseISO(apt.date), "d")}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {format(parseISO(apt.date), "MMM")}
        </p>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-gray-100 flex-shrink-0" />

      {/* Time */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 w-24 flex-shrink-0">
        <Clock className="w-4 h-4" />
        {apt.timeSlot}
      </div>

      {/* Patient + service */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{apt.patientName}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{apt.service}</p>
      </div>

      {/* Status */}
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.class}`}>
        {status.label}
      </span>

      {/* Reminder status */}
      <div className="flex items-center gap-1.5 text-xs">
        <Bell className={`w-3.5 h-3.5 ${apt.reminderSent ? "text-[#2a7a5a]" : "text-gray-300"}`} />
        <span className={apt.reminderSent ? "text-[#2a7a5a]" : "text-gray-300"}>
          {apt.reminderSent ? "Reminded" : "Pending"}
        </span>
      </div>

      {/* Review status */}
      <div className="flex items-center gap-1.5 text-xs">
        <Star className={`w-3.5 h-3.5 ${apt.reviewRequested ? "text-amber-500" : "text-gray-300"}`} />
        <span className={apt.reviewRequested ? "text-amber-600" : "text-gray-300"}>
          {apt.reviewRequested ? "Review sent" : "Not yet"}
        </span>
      </div>

    </div>
  );
}
