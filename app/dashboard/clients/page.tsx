import { mockClients, planConfig } from "@/lib/mock/data";
import { format } from "date-fns";
import { ExternalLink, Copy, ToggleLeft, Mail, Phone } from "lucide-react";

export default function ClientsPage() {
  const active    = mockClients.filter(c => c.status === "active").length;
  const trial     = mockClients.filter(c => c.status === "trial").length;
  const suspended = mockClients.filter(c => c.status === "suspended").length;
  const totalMRR  = mockClients.filter(c => c.status === "active").reduce((s, c) => s + c.mrr, 0);

  return (
    <div className="p-8">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-1">
            {active} active · {trial} trial · {suspended} suspended · ${totalMRR}/mo MRR
          </p>
        </div>
        <button className="bg-[#2a7a5a] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#1f5e44] transition-colors">
          + Onboard new client
        </button>
      </div>

      <div className="space-y-4">
        {mockClients.map(client => {
          const plan = planConfig[client.plan];
          return (
            <div key={client.id} className="bg-white rounded-2xl border border-gray-100 p-6">

              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-white text-sm"
                    style={{ backgroundColor: plan.color }}>
                    {client.clinicName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{client.clinicName}</h3>
                      <span className="text-xs text-gray-400">{client.city}, {client.country}</span>
                      <StatusBadge status={client.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" />{client.contactEmail}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />{client.contactPhone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/widget/${client.id}`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Preview widget
                  </a>
                  <button className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    client.status === "active"
                      ? "text-red-600 bg-red-50 hover:bg-red-100"
                      : "text-green-700 bg-green-50 hover:bg-green-100"
                  }`}>
                    <ToggleLeft className="w-3 h-3" />
                    {client.status === "active" ? "Suspend" : "Activate"}
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-5 gap-4 py-4 border-t border-b border-gray-50 mb-4">
                <Stat label="Plan" value={`${plan.label} · $${plan.price}/mo`} />
                <Stat label="Joined" value={format(client.joinedAt, "d MMM yyyy")} />
                <Stat label="Next billing" value={format(client.nextBillingDate, "d MMM yyyy")} />
                <Stat label="Convos this month" value={client.conversationsThisMonth.toString()} />
                <Stat label="Appts booked" value={client.appointmentsBookedThisMonth.toString()} />
              </div>

              {/* Widget installed status + embed code */}
              <div>
                {!client.widgetInstalled ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 mb-3">
                    Widget not installed yet — follow up with {client.contactName}
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-xs text-green-700 mb-3">
                    Widget active on client site
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-50 border border-gray-200 text-xs text-gray-600 px-4 py-2.5 rounded-xl font-mono truncate">
                    {`<script src="https://yourapp.com/widget/${client.id}/embed.js"></script>`}
                  </code>
                  <button className="flex items-center gap-1.5 text-xs font-medium text-[#2a7a5a] bg-[#2a7a5a]/10 hover:bg-[#2a7a5a]/20 px-3 py-2.5 rounded-xl transition-colors whitespace-nowrap">
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
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