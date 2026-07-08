import { useQuery } from "@tanstack/react-query";
import { apiFetch, setToken } from "@/lib/api";
import { useLocation } from "wouter";
import { Key, Package, Users, Shield, LogOut, LayoutDashboard, ChevronRight } from "lucide-react";

function Sidebar({ current }: { current: string }) {
  const [, navigate] = useLocation();
  const nav = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/products", label: "Products", icon: Package },
    { path: "/admin/keys", label: "License Keys", icon: Key },
    { path: "/admin/customers", label: "Customers", icon: Users },
  ];
  return (
    <aside className="w-56 shrink-0 bg-white/3 border-r border-white/8 flex flex-col min-h-screen">
      <div className="p-5 border-b border-white/8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center"><Key className="h-4 w-4 text-violet-400" /></div>
        <span className="font-semibold text-sm text-white">LicenseManager</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ path, label, icon: Icon }) => (
          <button key={path} onClick={() => navigate(path)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${current === path ? "bg-violet-600/20 text-violet-300" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-white/8">
        <button onClick={() => { setToken(null); navigate("/admin/login"); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
          <LogOut className="h-4 w-4" />Logout
        </button>
      </div>
    </aside>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white/3 rounded-xl border border-white/8 p-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats } = useQuery({ queryKey: ["lic-stats"], queryFn: () => apiFetch("/admin/stats") });
  const { data: keys } = useQuery({ queryKey: ["lic-keys-recent"], queryFn: () => apiFetch("/admin/keys?limit=5") });

  return (
    <div className="flex min-h-screen bg-[#080c14] text-white">
      <Sidebar current="/admin" />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-500 text-sm mb-8">License system overview</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Keys" value={stats?.totalKeys ?? "—"} icon={Key} color="bg-violet-600/20 text-violet-400" />
          <StatCard label="Active Keys" value={stats?.activeKeys ?? "—"} icon={Shield} color="bg-green-600/20 text-green-400" />
          <StatCard label="Products" value={stats?.totalProducts ?? "—"} icon={Package} color="bg-blue-600/20 text-blue-400" />
          <StatCard label="Customers" value={stats?.totalCustomers ?? "—"} icon={Users} color="bg-amber-600/20 text-amber-400" />
        </div>
        <div className="bg-white/3 rounded-xl border border-white/8 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Recent Keys</h2>
            <a href="/admin/keys" className="text-xs text-violet-400 hover:underline flex items-center gap-1">View all <ChevronRight className="h-3 w-3" /></a>
          </div>
          <div className="space-y-2">
            {(keys?.data ?? []).slice(0, 5).map((k: any) => (
              <div key={k.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-mono text-gray-300">{k.keyString}</p>
                  <p className="text-xs text-gray-600">{k.productName} • {k.customerEmail ?? "Unassigned"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${k.status === "active" ? "bg-green-500/15 text-green-400 border-green-500/25" : k.status === "suspended" ? "bg-red-500/15 text-red-400 border-red-500/25" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"}`}>
                  {k.status}
                </span>
              </div>
            ))}
            {!keys?.data?.length && <p className="text-gray-600 text-sm">No keys yet.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}

export { Sidebar };
