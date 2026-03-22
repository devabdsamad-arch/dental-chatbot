import { ClientConfig } from "@/types";

const brightsmile: ClientConfig = {
  id:           "brightsmile-dental",
  name:         "BrightSmile Dental Clinic",
  location:     "Level 2, 120 Collins St, Melbourne VIC 3000",
  phone:        "(03) 9123 4567",
  contactEmail: "dev.abdsamad@gmail.com",
  hours:        "Monday–Friday 8am–6pm, Saturday 9am–2pm, closed Sunday",
  bookingUrl:   "https://brightsmile.com.au/book",

  googleCalendarId: "dev.abdsamad@gmail.com",
  timezone:         "Australia/Melbourne",

  workingHours: {
    monday:    { open: "08:00", close: "18:00" },
    tuesday:   { open: "08:00", close: "18:00" },
    wednesday: { open: "08:00", close: "18:00" },
    thursday:  { open: "08:00", close: "18:00" },
    friday:    { open: "08:00", close: "18:00" },
    saturday:  { open: "09:00", close: "14:00" },
    sunday:    null,
  },

  appointmentDuration: 45, // default slot size for availability display

  serviceDurations: {
    "general checkup":          45,
    "teeth cleaning":           45,
    "teeth whitening":          60,
    "filling":                  60,
    "root canal":               90,
    "dental implant":           60,
    "orthodontic consultation": 60,
    "emergency consultation":   30,
    "children's dentistry":     45,
    "appointment":              60,
  },

  services: [
    "general checkup",
    "teeth cleaning",
    "teeth whitening",
    "fillings",
    "root canal",
    "dental implants",
    "orthodontics",
    "emergency dental",
    "children's dentistry",
  ],

  insurance: [
    "Medibank", "BUPA", "HCF", "NIB", "AHM",
    "most major Australian health funds",
  ],

  pricing: {
    "general checkup": "from AUD $85 with gap cover, $180 without insurance",
    "teeth cleaning":  "from AUD $120",
    "teeth whitening": "from AUD $350",
    "filling":         "from AUD $150 depending on size",
    "root canal":      "from AUD $900 — interest-free payment plans available",
    "dental implant":  "from AUD $3,000 — payment plans available",
  },

  paymentPlans: true,
  emergency:    true,
  accentColor:  "#2a7a5a",
  avatar:       "🦷",
  tone:         "warm, professional, and reassuring — many patients are anxious about dental visits. Be empathetic and never make them feel rushed.",
  greeting:     "Hi there! 👋 Welcome to BrightSmile Dental. What can I help you with today?",
  openingChips: [],
  active:       true,
};

export default brightsmile;