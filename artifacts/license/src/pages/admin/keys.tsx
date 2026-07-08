import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Plus, Copy, Ban, Trash2, Loader2, Key, Check } from "lucide-react";
import { Sidebar } from "./dashboard";

export default function AdminKeys() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [count, setCount] = useState("1");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const { data: keys } = useQuery({ queryKey: ["lic-keys", filter], queryFn: () => apiFetch(`/admin/keys${filter !== "all" ? `?status=${filter}` : ""}`) });
  const { data: products } = useQuery({ queryKey: ["lic-products"], queryFn: () => apiFetch("/admin/products") });
  const { data: customers } = useQuery({ queryKey: ["lic-customers"], queryFn: () => apiFetch("/admin/customers") });

  const createMut = useMutation({
    mutationFn: () => apiFetch("/admin/keys", { method: "POST", body: JSON.stringify({ productId: Number(productId), customerId: customerId ? Number(customerId) : undefined, count: Number(count), note }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lic-keys"] }); setOpen(false); setErr(""); },
    onError: (e: any) => setErr(e.message),
  });

  const suspendMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/keys/${id}/suspend`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lic-keys"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/keys/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lic-keys"] }),
  });

  const copyKey = (k: string) => { navigator.clipboard.writeText(k); setCopied(k); setTimeout(() => setCopied(null), 1500); };

  return (
    <div className="flex min-h-screen bg-[#080c14] text-white">
      <Sidebar current="/admin/keys" />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold">License Keys</h1><p className="text-gray-500 text-sm mt-1">Generate and manage keys</p></div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" /> Generate Keys
          </button>
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {["all", "active", "suspended", "expired"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${filter === s ? "bg-violet-600 text-white border-violet-600" : "border-white/10 text-gray-400 hover:border-violet-500/40"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="bg-white/3 rounded-xl border border-white/8 overflow-hidden">
          <div className="grid grid-cols-6 gap-3 px-5 py-3 text-xs text-gray-500 uppercase tracking-wide border-b border-white/8">
            <span className="col-span-2">Key</span><span>Product</span><span>Customer</span><span>Status</span><span>Actions</span>
          </div>
          {(keys?.data ?? []).length === 0 && <div className="text-center py-12 text-gray-600"><Key className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No keys.</p></div>}
          {(keys?.data ?? []).map((k: any) => (
            <div key={k.id} className="grid grid-cols-6 gap-3 px-5 py-3 border-b border-white/5 last:border-0 items-center hover:bg-white/2">
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-xs font-mono text-gray-300 truncate">{k.keyString}</span>
                <button onClick={() => copyKey(k.keyString)} className="shrink-0 p-1 rounded text-gray-600 hover:text-violet-400 transition-colors">
                  {copied === k.keyString ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <span className="text-xs text-gray-400 truncate">{k.productName}</span>
              <span className="text-xs text-gray-500 truncate">{k.customerEmail ?? <span className="italic text-gray-700">Unassigned</span>}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border w-fit ${k.status === "active" ? "bg-green-500/15 text-green-400 border-green-500/25" : k.status === "suspended" ? "bg-red-500/15 text-red-400 border-red-500/25" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"}`}>
                {k.status}
              </span>
              <div className="flex gap-1">
                <button onClick={() => suspendMut.mutate(k.id)} title="Suspend/Unsuspend" className="p-1.5 rounded text-gray-500 hover:bg-amber-500/15 hover:text-amber-400"><Ban className="h-3.5 w-3.5" /></button>
                <button onClick={() => deleteMut.mutate(k.id)} className="p-1.5 rounded text-gray-500 hover:bg-red-500/15 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Generate Keys</h2>
            {err && <div className="text-red-400 text-sm mb-3 bg-red-500/10 rounded-lg px-3 py-2">{err}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Product <span className="text-red-400">*</span></label>
                <select className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none" value={productId} onChange={e => setProductId(e.target.value)}>
                  <option value="">Select product…</option>
                  {(products?.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Assign to Customer <span className="text-gray-600">(optional)</span></label>
                <select className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {(customers?.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.email}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-400 block mb-1">Quantity</label><input type="number" min="1" max="100" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none" value={count} onChange={e => setCount(e.target.value)} /></div>
                <div><label className="text-xs text-gray-400 block mb-1">Note</label><input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note" /></div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:bg-white/5">Cancel</button>
              <button onClick={() => createMut.mutate()} disabled={createMut.isPending || !productId} className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-2">
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
