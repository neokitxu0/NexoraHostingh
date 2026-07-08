import { useState } from "react";
import { useLocation } from "wouter";
import { apiFetch, setToken } from "@/lib/api";
import { Loader2, Key } from "lucide-react";

export default function PortalLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await apiFetch<{ token: string }>("/portal/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      navigate("/portal");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c14] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4">
            <Key className="h-7 w-7 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Customer Portal</h1>
          <p className="text-gray-500 text-sm mt-1">View your license keys</p>
        </div>
        <form onSubmit={submit} className="space-y-4 bg-white/4 rounded-2xl border border-white/8 p-7">
          {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-lg py-2 px-3 text-center">{error}</div>}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium block">Email</label>
            <input className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium block">Password</label>
            <input className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="text-center text-xs text-gray-600 mt-4">Admin? <a href="/admin/login" className="text-violet-400 hover:underline">Admin Panel</a></p>
      </div>
    </div>
  );
}
