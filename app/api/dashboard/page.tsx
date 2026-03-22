import { mockClients, mockMRRData, mockUsageData, planConfig } from "@/lib/mock/data";
import { getClientStats } from "@/lib/db";
import { MRRChart } from "@/components/dashboard/RevenueChart";
import { format } from "date-fns";
import { DollarSign, Users, MessageSquare, TrendingUp, AlertCircle, Clock } from "lucide-react";

// ================================================
// DASHBOARD OVERVIEW
// ------------------------------------------------
// Business metrics use mock data for now.
// Per-client stats are pulled from real Supabase.
// ================================================

export default async function DashboardPage() {
  const activeClients    = mockClients.filter(c => c.status === "active");
  const trialClients     = mockClients.filter(c => c.status === "trial");
  const suspendedClients = mockClients.filter(c => c.status === "suspended");
  const totalMRR         = activeClients.reduce((sum, c) => sum + c.mrr, 0);

  // Fetch real stats from Supabase for each active client
  const clientStatsResults = await Promise.allSettled(
    mockClients.map(async (client) => {
      const stats = await getClientStats(client.id);
      return { clientId: client.id, stats };
    })
  );

  const clientStats: Record<string, any> = {};
  clientStatsResults.forEach(result => {
    if (result.status === "fulfilled") {
      clientStats[result.value.clientId] = result.value.stats;
    }
  });

  const totalRealConvos = Object.values(clientStats)
    .reduce((sum: number, s: any) => sum + (s?.monthlySessions ?? 0), 0);

  const totalRealBookings = Object.values(clientStats)
    .reduce((sum: number, s: any) => sum + (s?.bookingsThisMonth ?? 0), 0);

  const notInstalled = mockClients.filter(c => c.status !== "suspended" && !c.widgetInstalled);
  const billingSoon  = mockClients.filter(c => {
    const days = Math.ceil((c.nextBillingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return c.status === "active" && days <= 7;
  });

  return (
    <div className="p-8">

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Your business</h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </div>

      {/* ── STAT CARDS ─────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Monthly recurring revenue"
          value={`$${totalMRR.toLocaleString()}`}
          sub={`${activeClients.length} paying clients`}
          color="#2a7a5a"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total clients"
          value={mockClients.length}
          sub={`${trialClients.length} trial · ${suspendedClients.length} suspended`}
          color="#3b82f6"
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="Conversations this month"
          value={totalRealConvos > 0 ? totalRealConvos.toLocaleString() : "—"}
          sub="from Supabase"
          color="#7c3aed"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Bookings this month"
          value={totalRealBookings > 0 ? totalRealBookings : "—"}
          sub="confirmed via chatbot"
          color="#f59e0b"
        />
      </div>

      {/* ── CHARTS ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-1">MRR growth</h2>
          <p className="text-xs text-gray-400 mb-5">Monthly recurring revenue</p>
          <MRRChart data={mockMRRData} color="#2a7a5a" dataKey="mrr" prefix="$" />
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-1">Conversations</h2>
          <p className="text-xs text-gray-400 mb-5">Across all clients</p>
          <MRRChart data={mockUsageData} color="#7c3aed" dataKey="conversations" />
        </div>
      </div>

      {/* ── ALERTS ─────────────────────────────── */}
      {(notInstalled.length > 0 || billingSoon.length > 0) && (
        <div className="grid grid-cols-2 gap-6 mb-6">
          {notInstalled.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-amber-800 text-sm">Widget not installed</h3>
              </div>
              {notInstalled.map(c => (
                <div key={c.id} className="flex justify-between text-sm mb-1">
                  <span className="text-amber-700">{c.clinicName}</span>
                  <span className="text-amber-500 text-xs">{c.contactEmail}</span>
                </div>
              ))}
              <p className="text-xs text-amber-600 mt-2">Follow up — not live yet</p>
            </div>
          )}
          {billingSoon.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-blue-800 text-sm">Billing due soon</h3>
              </div>
              {billingSoon.map(c => (
                <div key={c.id} className="flex justify-between text-sm mb-1">
                  <span className="text-blue-700">{c.clinicName}</span>
                  <span className="text-blue-500 text-xs">{format(c.nextBillingDate, "d MMM")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CLIENT TABLE WITH REAL STATS ─────────── */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All clients</h2>
          <a href="/dashboard/clients" className="text-xs text-[#2a7a5a] font-medium hover:underline">
            Manage →
          </a>
        </div>
        <div className="divide-y divide-gray-50">
          {mockClients.map(client => {
            const plan  = planConfig[client.plan];
            const stats = clientStats[client.id];

            return (
              <div key={client.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{client.clinicName}</p>
                    <span className="text-[10px] text-gray-400">{client.city}, {client.country}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{client.contactEmail}</p>
                </div>

                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${plan.color}15`, color: plan.color }}
                >
                  {plan.label} · ${plan.price}/mo
                </span>

                {/* Real stats from Supabase */}
                <div className="text-right w-36">
                  <p className="text-sm font-medium text-gray-900">
                    {stats ? `${stats.monthlySessions} sessions` : "No data yet"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {stats ? `${stats.bookingsThisMonth} bookings` : ""}
                  </p>
                </div>

                <StatusBadge status={client.status} />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}18`, color }}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:    "bg-green-50 text-green-700 border border-green-200",
    trial:     "bg-blue-50 text-blue-600 border border-blue-200",
    suspended: "bg-red-50 text-red-600 border border-red-200",
    churned:   "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${styles[status] ?? styles.churned}`}>
      {status}
    </span>
  );
}