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
  id:        string;
  role:      "user" | "assistant";
  content:   string;
  timestamp: Date;
  chips?:    string[];
}

export interface Lead {
  id?:       string;
  clientId:  string;
  name:      string;
  phone:     string;
  email?:    string;
  issue:     string;
  urgency:   "routine" | "soon" | "emergency";
  stage:     ConversationStage;
  createdAt?: Date;
}

export interface Appointment {
  id?:              string;
  clientId:         string;
  leadId?:          string;
  patientName:      string;
  patientPhone:     string;
  service:          string;
  date:             string;
  timeSlot:         string;
  status:           "pending" | "confirmed" | "reminded" | "completed" | "no_show";
  reminderSent?:    boolean;
  reviewRequested?: boolean;
  createdAt?:       Date;
}

export interface TimeSlot {
  date:      string;
  time:      string;
  available: boolean;
}

export interface ClientConfig {
  id:           string;
  name:         string;
  location:     string;
  phone:        string;
  contactEmail?: string;   // clinic owner — receives booking + lead notifications
  hours:        string;
  bookingUrl?:  string;
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
  serviceDurations?:    Record<string, number>;
  timezone:     string;
  services:     string[];
  insurance:    string[];
  pricing:      Record<string, string>;
  paymentPlans: boolean;
  emergency:    boolean;
  tone:         string;
  accentColor:  string;
  avatar:       string;
  greeting:     string;
  openingChips: string[];
  active:       boolean;
}