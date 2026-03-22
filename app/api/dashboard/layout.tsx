import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { LayoutDashboard, Users, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard",         icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/clients", icon: Users,           label: "Clients"  },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[#f8f8f6]">

      <aside className="w-60 bg-[#1a1a1a] flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2a7a5a] flex items-center justify-center text-sm">
              💬
            </div>
            <div>
              <p className="text-white font-semibold text-sm">ChatFlow AI</p>
              <p className="text-white/40 text-xs">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150 text-sm group"
            >
              <Icon className="w-4 h-4 flex-shrink-0 group-hover:text-[#2a7a5a] transition-colors" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User + sign out */}
        <div className="px-3 py-4 border-t border-white/10">
          {session.user && (
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt="avatar"
                  className="w-7 h-7 rounded-full"
                />
              )}
              <div className="min-w-0">
                <p className="text-white/80 text-xs font-medium truncate">
                  {session.user.name}
                </p>
                <p className="text-white/30 text-[10px] truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-all duration-150 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>

      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>

    </div>
  );
}