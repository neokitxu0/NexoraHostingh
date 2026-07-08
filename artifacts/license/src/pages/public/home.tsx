import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Key, Shield, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PublicHome() {
  const [keyInput, setKeyInput] = useState("");
  const [domain, setDomain] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true); setResult(null);
    try {
      const data = await apiFetch("/verify", { method: "POST", body: JSON.stringify({ key: keyInput, domain: domain || undefined }) });
      setResult({ ok: true, data });
    } catch (err: any) {
      setResult({ ok: false, message: err.message });
    } finally { setVerifying(false); }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      <header className="border-b border-white/8 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center"><Key className="h-4 w-4 text-violet-400" /></div>
          <span className="font-bold">LicenseManager</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/portal/login" className="text-sm text-gray-400 hover:text-white">Customer Portal</a>
          <a href="/admin/login" className="text-sm px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors">Admin Panel</a>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-6">
          <Shield className="h-8 w-8 text-violet-400" />
        </div>
        <h1 className="text-4xl font-extrabold mb-4">License Key Verification</h1>
        <p className="text-gray-400 mb-12">Verify the authenticity of your license key. Enter the key below to check its validity.</p>
        <form onSubmit={verify} className="bg-white/3 border border-white/8 rounded-2xl p-8 text-left">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">License Key <span className="text-red-400">*</span></label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-violet-500/60 placeholder-gray-600"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Domain / App <span className="text-gray-600 font-normal">(optional)</span></label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60 placeholder-gray-600"
                placeholder="myapp.com"
                value={domain}
                onChange={e => setDomain(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" disabled={verifying} className="w-full mt-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
            {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
            {verifying ? "Verifying…" : "Verify Key"}
          </button>
        </form>
        {result && (
          <div className={`mt-6 p-5 rounded-xl border text-left ${result.ok ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            {result.ok ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-400">Valid License</p>
                  <p className="text-sm text-gray-400 mt-1">Product: <span className="text-white">{result.data?.productName}</span></p>
                  {result.data?.expiresAt && <p className="text-sm text-gray-400">Expires: <span className="text-white">{new Date(result.data.expiresAt).toLocaleDateString()}</span></p>}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-400">Invalid License</p>
                  <p className="text-sm text-gray-500 mt-1">{result.message}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
