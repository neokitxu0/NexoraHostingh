import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Plus, Users, Loader2 } from "lucide-react";
import { Sidebar } from "./dashboard";

export default function AdminCustomers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [err, setErr] = useState("");

  const { data } = useQuery({ queryKey: ["lic-customers"], queryFn: () => apiFetch("/admin/customers") });

  const createMut = useMutation({
    mutationFn: () => apiFetch("/admin/customers", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lic-customers"] }); setOpen(false); setForm({ email: "", password: "", name: "" }); setErr(""); },
    onError: (e: any) => setErr(e.message),
  });

  return (
    <div className="flex min-h-screen bg-[#080c14] text-white">
      <Sidebar current="/admin/customers" />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-2xl font-bold">Customers</h1><p className="text-gray-500 text-sm mt-1">Manage license customers</p></div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium">
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        </div>
        <div className="bg-white/3 rounded-xl border border-white/8 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-5 py-3 text-xs text-gray-500 uppercase tracking-wide border-b border-white/8">
            <span className="col-span-2">Email</span><span>Name</span><span>Keys</span>
          </div>
          {(data?.data ?? []).length === 0 && <div className="text-center py-12 text-gray-600"><Users className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No customers yet.</p></div>}
          {(data?.data ?? []).map((c: any) => (
            <div key={c.id} className="grid grid-cols-4 gap-4 px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/2 items-center">
              <span className="col-span-2 text-sm text-gray-300">{c.email}</span>
              <span className="text-sm text-gray-400">{c.name ?? <span className="text-gray-700 italic">—</span>}</span>
              <span className="text-sm text-gray-400">{c.keyCount ?? 0}</span>
            </div>
          ))}
        </div>
      </main>
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">Add Customer</h2>
            {err && <div className="text-red-400 text-sm mb-3 bg-red-500/10 rounded-lg px-3 py-2">{err}</div>}
            <div className="space-y-3">
              {(["email", "name", "password"] as const).map(k => (
                <div key={k}>
                  <label className="text-xs text-gray-400 block mb-1 capitalize">{k}{k === "password" ? " (for portal login)" : ""}</label>
                  <input type={k === "password" ? "password" : "text"} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:bg-white/5">Cancel</button>
              <button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-2">
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
