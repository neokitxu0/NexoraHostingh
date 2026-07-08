import { useQuery } from "@tanstack/react-query";
import { apiFetch, setToken } from "@/lib/api";
import { useLocation } from "wouter";
import { Key, Copy, LogOut, Check, Shield } from "lucide-react";
import { useState } from "react";

export default function PortalKeys() {
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["portal-keys"], queryFn: () => apiFetch("/portal/keys") });

  const copyKey = (k: string) => { navigator.clipboard.writeText(k); setCopied(k); setTimeout(() => setCopied(null), 1500); };
  const logout = () => { setToken(null); navigate("/portal/login"); };

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      <header className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center"><Key className="h-4 w-4 text-violet-400" /></div>
          <span className="font-semibold text-sm">License Portal</span>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <LogOut className="h-4 w-4" />Logout
        </button>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-2">My Licenses</h1>
        <p className="text-gray-500 text-sm mb-8">Your active license keys</p>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-white/3 animate-pulse" />)}</div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No license keys yet</p>
            <p className="text-sm mt-1">Contact support if you believe this is an error.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(data?.data ?? []).map((k: any) => (
              <div key={k.id} className="bg-white/3 border border-white/8 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-violet-400 shrink-0" />
                      <span className="font-medium text-sm">{k.productName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${k.status === "active" ? "bg-green-500/15 text-green-400 border-green-500/25" : "bg-red-500/15 text-red-400 border-red-500/25"}`}>{k.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <code className="text-sm font-mono text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg break-all">{k.keyString}</code>
                      <button onClick={() => copyKey(k.keyString)} className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-violet-600/20 text-gray-400 hover:text-violet-400 transition-colors">
                        {copied === k.keyString ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    {k.note && <p className="text-xs text-gray-600 mt-2">{k.note}</p>}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 flex gap-6 text-xs text-gray-600">
                  {k.expiresAt && <span>Expires: {new Date(k.expiresAt).toLocaleDateString()}</span>}
                  <span>Activations: {k.instanceCount ?? 0} / {k.maxInstances ?? "∞"}</span>
                  <span>Issued: {new Date(k.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
