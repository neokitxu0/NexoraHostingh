import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Plus, Pencil, Trash2, Loader2, Package } from "lucide-react";
import { Sidebar } from "./dashboard";

const EMPTY = { name: "", description: "", price: "", maxInstances: "1", features: "" };

export default function AdminProducts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState("");

  const { data } = useQuery({ queryKey: ["lic-products"], queryFn: () => apiFetch("/admin/products") });

  const setF = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const saveMut = useMutation({
    mutationFn: () => {
      const body = { name: form.name, description: form.description, price: Number(form.price), maxInstances: Number(form.maxInstances), features: form.features.split("\n").filter(Boolean) };
      if (editing) return apiFetch(`/admin/products/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      return apiFetch("/admin/products", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lic-products"] }); setOpen(false); setEditing(null); setForm(EMPTY); setErr(""); },
    onError: (e: any) => setErr(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/products/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lic-products"] }),
  });

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? "", price: String(p.price), maxInstances: String(p.maxInstances ?? 1), features: (p.features ?? []).join("\n") });
    setOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-[#080c14] text-white">
      <Sidebar current="/admin/products" />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-2xl font-bold">Products</h1><p className="text-gray-500 text-sm mt-1">Manage license product tiers</p></div>
          <button onClick={() => { setOpen(true); setEditing(null); setForm(EMPTY); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
        <div className="bg-white/3 rounded-xl border border-white/8 overflow-hidden">
          <div className="grid grid-cols-5 gap-4 px-5 py-3 text-xs text-gray-500 uppercase tracking-wide border-b border-white/8">
            <span className="col-span-2">Name</span><span>Price</span><span>Max Instances</span><span>Actions</span>
          </div>
          {(data?.data ?? []).length === 0 && <div className="text-center py-12 text-gray-600"><Package className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No products yet.</p></div>}
          {(data?.data ?? []).map((p: any) => (
            <div key={p.id} className="grid grid-cols-5 gap-4 px-5 py-4 border-b border-white/5 last:border-0 items-center hover:bg-white/2">
              <div className="col-span-2"><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-gray-600 truncate">{p.description}</p></div>
              <span className="text-sm">${p.price}</span>
              <span className="text-sm text-gray-400">{p.maxInstances ?? "∞"}</span>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:bg-white/8 hover:text-white"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => delMut.mutate(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-500/15 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editing ? "Edit Product" : "New Product"}</h2>
            {err && <div className="text-red-400 text-sm mb-3 bg-red-500/10 rounded-lg px-3 py-2">{err}</div>}
            <div className="space-y-3">
              <div><label className="text-xs text-gray-400 block mb-1">Name</label><input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50" value={form.name} onChange={setF("name")} /></div>
              <div><label className="text-xs text-gray-400 block mb-1">Description</label><input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50" value={form.description} onChange={setF("description")} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-400 block mb-1">Price ($)</label><input type="number" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50" value={form.price} onChange={setF("price")} /></div>
                <div><label className="text-xs text-gray-400 block mb-1">Max Instances</label><input type="number" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50" value={form.maxInstances} onChange={setF("maxInstances")} /></div>
              </div>
              <div><label className="text-xs text-gray-400 block mb-1">Features (one per line)</label><textarea rows={3} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 resize-none" value={form.features} onChange={setF("features")} placeholder="Feature 1&#10;Feature 2" /></div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:bg-white/5">Cancel</button>
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-2">
                {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
