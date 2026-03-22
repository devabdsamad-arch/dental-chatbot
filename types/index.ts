// ================================================
// CORE TYPES — used across the entire app
// ================================================

export type ConversationStage =
  | "greeting"
  | "capture_issue"
  | "capture_name"
  | "capture_phone"
  | "show_slots"
  | "confirm_booking"
  | "booked"
  | "faq"
  | "emergency"
  | "review_request"
  | "reengagement";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  chips?: string[]; // quick reply suggestion chips
}

export interface Lead {
  id?: string;
  clientId: string;      // which dental clinic
  name: string;
  phone: string;
  contactEmail?: string;  // clinic owner — receives notifications
  email?: string;
  issue: string;         // what they came in for
  urgency: "routine" | "soon" | "emergency";
  stage: ConversationStage;
  createdAt?: Date;
}

export interface Appointment {
  id?: string;
  clientId: string;
  leadId?: string;
  patientName: string;
  patientPhone: string;
  service: string;
  date: string;          // ISO string
  timeSlot: string;      // e.g. "10:00 AM"
  status: "pending" | "confirmed" | "reminded" | "completed" | "no_show";
  reminderSent?: boolean;
  reviewRequested?: boolean;
  createdAt?: Date;
}

export interface TimeSlot {
  date: string;          // e.g. "Monday 23 Jun"
  time: string;          // e.g. "10:00 AM"
  available: boolean;
}

// ================================================
// CLIENT CONFIG TYPE
// One of these per dental clinic you onboard
// ================================================
export interface ClientConfig {
  id: string;
  name: string;
  location: string;
  phone: string;
  contactEmail?: string;  // clinic owner — receives notifications
  hours: string;
  bookingUrl?: string;
  googleCalendarId?: string;
  workingHours?: {
    monday?:    { open: string; close: string } | null;
    tuesday?:   { open: string; close: string } | null;
    wednesday?: { open: string; close: string } | null;
    thursday?:  { open: string; close: string } | null;
    friday?:    { open: string; close: string } | null;
    saturday?:  { open: string; close: string } | null;
    sunday?:    { open: string; close: string } | null;
  };
  appointmentDuration?: number;
  timezone: string;
  services: string[];
  insurance: string[];
  pricing: Record<string, string>;
  paymentPlans: boolean;
  emergency: boolean;
  tone: string;
  accentColor: string;   // hex — widget matches clinic branding
  avatar: string;        // emoji or image URL
  greeting: string;
  openingChips: string[];
  active: boolean;       // flip to false = widget goes dead instantly
}