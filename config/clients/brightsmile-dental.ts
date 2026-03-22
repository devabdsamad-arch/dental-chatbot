import { ClientConfig } from "@/types";

const brightsmile: ClientConfig = {
  id: "brightsmile-dental",
  name: "BrightSmile Dental Clinic",
  location: "Level 2, 120 Collins St, Melbourne VIC 3000",
  phone: "(03) 9123 4567",
  contactEmail: "dev.abdsamad@gmail.com", // ⚠️ clinic owner email — receives booking + lead notifications
  hours: "Monday–Friday 8am–6pm, Saturday 9am–2pm, closed Sunday",
  bookingUrl: "https://brightsmile.com.au/book",
  timezone: "Australia/Melbourne",
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
    "teeth cleaning": "from AUD $120",
    "teeth whitening": "from AUD $350",
    "filling": "from AUD $150 depending on size",
    "root canal": "from AUD $900 — interest-free payment plans available",
    "dental implant": "from AUD $3,000 — payment plans available",
  },
  paymentPlans: true,
  emergency: true,
  accentColor: "#2a7a5a",
  avatar: "🦷",
  tone: "warm, professional, and reassuring — many patients are anxious about dental visits. Be empathetic and never make them feel rushed.",
  greeting: "Hi there! 👋 Welcome to BrightSmile Dental. What can I help you with today?",
  openingChips: [
    "Book an appointment",
    "What does a checkup cost?",
    "Do you accept my insurance?",
    "I have a toothache",
  ],
  active: true,
};

export default brightsmile;
