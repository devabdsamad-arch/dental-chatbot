// ================================================
// YOUR SAAS BUSINESS DATA
// This is what YOU care about — clients, MRR, usage
// Nothing patient-related here
// ================================================

export type SubscriptionPlan = "starter" | "growth" | "pro";
export type ClientStatus = "active" | "trial" | "suspended" | "churned";

export interface ClientRecord {
  id: string;
  clinicName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  country: "AU" | "UK" | "US";
  city: string;
  plan: SubscriptionPlan;
  status: ClientStatus;
  mrr: number;
  joinedAt: Date;
  nextBillingDate: Date;
  widgetInstalled: boolean;
  conversationsThisMonth: number;
  conversationsLastMonth: number;
  appointmentsBookedThisMonth: number;
  lastActive: Date;
}

export const mockClients: ClientRecord[] = [
  {
    id: "brightsmile-dental",
    clinicName: "BrightSmile Dental",
    contactName: "Dr. Rachel Howe",
    contactEmail: "rachel@brightsmile.com.au",
    contactPhone: "+61 3 9123 4567",
    country: "AU",
    city: "Melbourne",
    plan: "growth",
    status: "active",
    mrr: 299,
    joinedAt: new Date("2026-01-15"),
    nextBillingDate: new Date("2026-04-15"),
    widgetInstalled: true,
    conversationsThisMonth: 143,
    conversationsLastMonth: 112,
    appointmentsBookedThisMonth: 38,
    lastActive: new Date(Date.now() - 1000 * 60 * 14),
  },
  {
    id: "sydney-smiles",
    clinicName: "Sydney Smiles Clinic",
    contactName: "Dr. Mark Chen",
    contactEmail: "mark@sydneysmiles.com.au",
    contactPhone: "+61 2 8765 4321",
    country: "AU",
    city: "Sydney",
    plan: "starter",
    status: "trial",
    mrr: 0,
    joinedAt: new Date("2026-03-10"),
    nextBillingDate: new Date("2026-04-10"),
    widgetInstalled: true,
    conversationsThisMonth: 27,
    conversationsLastMonth: 0,
    appointmentsBookedThisMonth: 9,
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    id: "london-dental",
    clinicName: "Kensington Dental Practice",
    contactName: "Dr. Amara Osei",
    contactEmail: "amara@kensingtondental.co.uk",
    contactPhone: "+44 20 7123 4567",
    country: "UK",
    city: "London",
    plan: "pro",
    status: "active",
    mrr: 499,
    joinedAt: new Date("2025-11-20"),
    nextBillingDate: new Date("2026-04-20"),
    widgetInstalled: true,
    conversationsThisMonth: 289,
    conversationsLastMonth: 241,
    appointmentsBookedThisMonth: 74,
    lastActive: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "chicago-dental",
    clinicName: "Lakeview Family Dentistry",
    contactName: "Dr. James Kowalski",
    contactEmail: "james@lakeviewdental.com",
    contactPhone: "+1 312 555 0182",
    country: "US",
    city: "Chicago",
    plan: "growth",
    status: "active",
    mrr: 299,
    joinedAt: new Date("2026-02-01"),
    nextBillingDate: new Date("2026-04-01"),
    widgetInstalled: true,
    conversationsThisMonth: 98,
    conversationsLastMonth: 76,
    appointmentsBookedThisMonth: 31,
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 6),
  },
  {
    id: "perth-dental",
    clinicName: "Perth City Dental",
    contactName: "Dr. Lisa Nguyen",
    contactEmail: "lisa@perthcitydental.com.au",
    contactPhone: "+61 8 9321 5678",
    country: "AU",
    city: "Perth",
    plan: "starter",
    status: "suspended",
    mrr: 149,
    joinedAt: new Date("2025-12-05"),
    nextBillingDate: new Date("2026-04-05"),
    widgetInstalled: false,
    conversationsThisMonth: 0,
    conversationsLastMonth: 44,
    appointmentsBookedThisMonth: 0,
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
  },
];

export const mockMRRData = [
  { month: "Oct", mrr: 0    },
  { month: "Nov", mrr: 499  },
  { month: "Dec", mrr: 499  },
  { month: "Jan", mrr: 798  },
  { month: "Feb", mrr: 1097 },
  { month: "Mar", mrr: 1246 },
];

export const mockUsageData = [
  { month: "Oct", conversations: 0   },
  { month: "Nov", conversations: 241 },
  { month: "Dec", conversations: 198 },
  { month: "Jan", conversations: 354 },
  { month: "Feb", conversations: 428 },
  { month: "Mar", conversations: 557 },
];

export const planConfig: Record<string, { label: string; price: number; color: string }> = {
  starter: { label: "Starter", price: 149, color: "#6b7280" },
  growth:  { label: "Growth",  price: 299, color: "#2a7a5a" },
  pro:     { label: "Pro",     price: 499, color: "#7c3aed" },
};