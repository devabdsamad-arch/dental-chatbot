import { ClientConfig } from "@/types";

const sydneySmiles: ClientConfig = {
  id:           "sydney-smiles",
  name:         "Sydney Smiles Dental",
  location:     "Suite 5, 88 Pitt St, Sydney NSW 2000",
  phone:        "(02) 9876 5432",
  contactEmail: "dev.abdsamad@gmail.com", // ⚠️ replace with real clinic email
  hours:        "Monday–Friday 8am–5pm, Saturday 9am–1pm, closed Sunday",
  bookingUrl:   "https://sydneysmiles.com.au/book",

  googleCalendarId: "dev.abdsamad@gmail.com", // ⚠️ replace with clinic's calendar
  timezone:         "Australia/Sydney",

  workingHours: {
    monday:    { open: "08:00", close: "17:00" },
    tuesday:   { open: "08:00", close: "17:00" },
    wednesday: { open: "08:00", close: "17:00" },
    thursday:  { open: "08:00", close: "17:00" },
    friday:    { open: "08:00", close: "17:00" },
    saturday:  { open: "09:00", close: "13:00" },
    sunday:    null,
  },

  appointmentDuration: 45,

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
    "general checkup": "from AUD $90 with gap cover, $190 without insurance",
    "teeth cleaning":  "from AUD $130",
    "teeth whitening": "from AUD $380",
    "filling":         "from AUD $160 depending on size",
    "root canal":      "from AUD $950 — interest-free payment plans available",
    "dental implant":  "from AUD $3,200 — payment plans available",
  },

  paymentPlans: true,
  emergency:    true,
  accentColor:  "#1d6fa8", // blue instead of green — different branding
  avatar:       "😁",
  tone:         "friendly, warm, and efficient — Sydney Smiles prides itself on making dental visits stress-free.",
  greeting:     "Hi there! 👋 Welcome to Sydney Smiles Dental. How can I help you today?",
  openingChips: [],
  active:       true,
};

export default sydneySmiles;