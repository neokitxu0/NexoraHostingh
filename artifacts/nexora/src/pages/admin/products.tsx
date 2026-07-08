import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Pencil, Trash2, Loader2, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const GAME_SUBCATEGORIES = [
  { id: "", label: "All / Any Game" },
  { id: "minecraft", label: "⛏️ Minecraft" },
  { id: "terraria", label: "🌲 Terraria" },
  { id: "rust", label: "🔥 Rust" },
  { id: "ark", label: "🦕 ARK: Survival" },
  { id: "valheim", label: "⚔️ Valheim" },
  { id: "fivem", label: "🚗 FiveM" },
  { id: "cs2", label: "🎯 CS2" },
  { id: "other", label: "🎮 Other Games" },
];

const HARDWARE_TYPES = [
  { id: "", label: "Any Hardware" },
  { id: "amd-epyc", label: "🔴 AMD EPYC (Enterprise)" },
  { id: "ryzen", label: "🟠 AMD Ryzen (Gaming)" },
  { id: "intel-xeon", label: "🔵 Intel Xeon (Dedicated)" },
];

const EMPTY_FORM = {
  name: "", category: "shared", description: "", price: "", setupFee: "0",
  billingCycle: "monthly", diskSpace: "", bandwidth: "", ram: "", cpu: "", features: "",
  featured: false, available: true,
  subcategory: "", hardwareType: "",
  autoProvision: false, provisionModule: "",
  pteroNodeId: "", pteroNestId: "", pteroEggId: "", pteroRamMb: "", pteroDiskMb: "", pteroCpuPct: "",
  pteroDatabases: "1", pteroBackups: "2",
  pveNode: "", pveStorage: "", pveTemplateVmid: "",
};

type FormT = typeof EMPTY_FORM;

function IntegrationSection({ form, setForm }: { form: FormT; setForm: React.Dispatch<React.SetStateAction<FormT>> }) {
  const set = (k: keyof FormT) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const { data: nests } = useQuery<any[]>({
    queryKey: ["ptero-nests"],
    queryFn: () => apiFetch("/admin/pterodactyl/nests"),
    enabled: form.provisionModule === "pterodactyl",
    retry: false,
  });

  const { data: eggs } = useQuery<any[]>({
    queryKey: ["ptero-eggs", form.pteroNestId],
    queryFn: () => apiFetch(`/admin/pterodactyl/nests/${form.pteroNestId}/eggs`),
    enabled: form.provisionModule === "pterodactyl" && !!form.pteroNestId,
    retry: false,
  });

  const { data: nodes } = useQuery<any[]>({
    queryKey: ["ptero-nodes"],
    queryFn: () => apiFetch("/admin/pterodactyl/nodes"),
    enabled: form.provisionModule === "pterodactyl",
    retry: false,
  });

  return (
    <div className="space-y-3 border border-border rounded-lg p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Auto Provisioning</p>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.autoProvision} onChange={e => setForm(f => ({ ...f, autoProvision: e.target.checked }))} className="rounded" />
        Enable auto provisioning
      </label>

      {form.autoProvision && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Integration</Label>
            <select className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm" value={form.provisionModule} onChange={set("provisionModule") as any}>
              <option value="">None (manual)</option>
              <option value="pterodactyl">🦕 Pterodactyl Panel</option>
              <option value="proxmox">🖥 Proxmox (VPS)</option>
            </select>
          </div>

          {form.provisionModule === "pterodactyl" && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-medium text-primary">Pterodactyl Config</p>

              <div className="space-y-1">
                <Label className="text-xs">Node</Label>
                {nodes && nodes.length > 0 ? (
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm" value={form.pteroNodeId} onChange={set("pteroNodeId") as any}>
                    <option value="">Select node…</option>
                    {nodes.map((n: any) => <option key={n.id} value={n.id}>{n.name} (ID: {n.id})</option>)}
                  </select>
                ) : (
                  <Input value={form.pteroNodeId} onChange={set("pteroNodeId")} placeholder="Node ID (e.g. 1)" className="h-8 text-xs" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nest</Label>
                  {nests && nests.length > 0 ? (
                    <select className="w-full px-3 py-2 rounded-lg border border-border bg-input text-xs" value={form.pteroNestId}
                      onChange={e => setForm(f => ({ ...f, pteroNestId: e.target.value, pteroEggId: "" }))}>
                      <option value="">Select nest…</option>
                      {nests.map((n: any) => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  ) : (
                    <Input value={form.pteroNestId} onChange={set("pteroNestId")} placeholder="Nest ID (e.g. 1)" className="h-8 text-xs" />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Egg</Label>
                  {eggs && eggs.length > 0 ? (
                    <select className="w-full px-3 py-2 rounded-lg border border-border bg-input text-xs" value={form.pteroEggId} onChange={set("pteroEggId") as any}>
                      <option value="">Select egg…</option>
                      {eggs.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  ) : (
                    <Input value={form.pteroEggId} onChange={set("pteroEggId")} placeholder="Egg ID (e.g. 3)" className="h-8 text-xs" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">RAM (MB)</Label>
                  <Input value={form.pteroRamMb} onChange={set("pteroRamMb")} placeholder="1024" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Disk (MB)</Label>
                  <Input value={form.pteroDiskMb} onChange={set("pteroDiskMb")} placeholder="10240" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CPU (%)</Label>
                  <Input value={form.pteroCpuPct} onChange={set("pteroCpuPct")} placeholder="100" className="h-8 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Max Databases</Label>
                  <Input value={form.pteroDatabases} onChange={set("pteroDatabases")} placeholder="1" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Backups</Label>
                  <Input value={form.pteroBackups} onChange={set("pteroBackups")} placeholder="2" className="h-8 text-xs" />
                </div>
              </div>
              {(!nests || nests.length === 0) && (
                <p className="text-xs text-muted-foreground">💡 Configure Pterodactyl in Admin → Integrations to get dropdown selectors for Nest/Egg.</p>
              )}
            </div>
          )}

          {form.provisionModule === "proxmox" && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-medium text-primary">Proxmox Config</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Node Name</Label>
                  <Input value={form.pveNode} onChange={set("pveNode")} placeholder="pve" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Storage</Label>
                  <Input value={form.pveStorage} onChange={set("pveStorage")} placeholder="local-lvm" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Template VMID</Label>
                  <Input value={form.pveTemplateVmid} onChange={set("pveTemplateVmid")} placeholder="100" className="h-8 text-xs" />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminProducts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<FormT>(EMPTY_FORM);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => apiFetch<any[]>("/admin/products"),
  });

  const setF = (k: keyof FormT) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const saveMutation = useMutation({
    mutationFn: () => {
      const config = form.provisionModule === "pterodactyl" ? {
        nodeId: Number(form.pteroNodeId) || 1,
        nestId: Number(form.pteroNestId) || 1,
        eggId: Number(form.pteroEggId) || 1,
        ramMb: Number(form.pteroRamMb) || 1024,
        diskMb: Number(form.pteroDiskMb) || 10240,
        cpuPct: Number(form.pteroCpuPct) || 100,
        databases: Number(form.pteroDatabases) || 1,
        backups: Number(form.pteroBackups) || 2,
      } : form.provisionModule === "proxmox" ? {
        node: form.pveNode || "pve",
        storage: form.pveStorage || "local-lvm",
        templateVmid: Number(form.pveTemplateVmid) || 100,
      } : {};

      const payload = {
        name: form.name,
        category: form.category,
        description: form.description,
        price: Number(form.price),
        setupFee: Number(form.setupFee),
        billingCycle: form.billingCycle,
        diskSpace: form.diskSpace,
        bandwidth: form.bandwidth,
        ram: form.ram,
        cpu: form.cpu,
        featuresJson: JSON.stringify(form.features.split("\n").filter(Boolean)),
        featured: form.featured,
        available: form.available,
        subcategory: form.subcategory || null,
        hardwareType: form.hardwareType || null,
        autoProvision: form.autoProvision,
        provisionModule: form.provisionModule || null,
        provisionConfigJson: JSON.stringify(config),
      };

      if (editing) return apiFetch(`/admin/products/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      return apiFetch("/admin/products", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast({ title: editing ? "Product updated" : "Product created" });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setOpen(false); setEditing(null); setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/products/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Product deleted" }); qc.invalidateQueries({ queryKey: ["admin-products"] }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (p: any) => {
    setEditing(p);
    const config = JSON.parse(p.provisionConfigJson ?? "{}");
    setForm({
      name: p.name, category: p.category, description: p.description ?? "",
      price: String(p.price), setupFee: String(p.setupFee ?? "0"), billingCycle: p.billingCycle,
      diskSpace: p.diskSpace ?? "", bandwidth: p.bandwidth ?? "", ram: p.ram ?? "", cpu: p.cpu ?? "",
      features: (p.features ?? []).join("\n"), featured: p.featured, available: p.available,
      subcategory: p.subcategory ?? "", hardwareType: p.hardwareType ?? "",
      autoProvision: p.autoProvision ?? false,
      provisionModule: p.provisionModule ?? "",
      pteroNodeId: String(config.nodeId ?? ""), pteroNestId: String(config.nestId ?? ""), pteroEggId: String(config.eggId ?? ""),
      pteroRamMb: String(config.ramMb ?? ""), pteroDiskMb: String(config.diskMb ?? ""), pteroCpuPct: String(config.cpuPct ?? ""),
      pteroDatabases: String(config.databases ?? "1"), pteroBackups: String(config.backups ?? "2"),
      pveNode: config.node ?? "", pveStorage: config.storage ?? "", pveTemplateVmid: String(config.templateVmid ?? ""),
    });
    setOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your hosting plans and services</p>
          </div>
          <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditing(null); setForm(EMPTY_FORM); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={setF("name")} placeholder="Starter Plan" /></div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <select className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm" value={form.category} onChange={setF("category") as any}>
                      {["shared", "vps", "dedicated", "game", "domain"].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                </div>

                {/* Subcategory (game only) */}
                {form.category === "game" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Game Subcategory</Label>
                      <select className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm" value={form.subcategory} onChange={setF("subcategory") as any}>
                        {GAME_SUBCATEGORIES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hardware Type</Label>
                      <select className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm" value={form.hardwareType} onChange={setF("hardwareType") as any}>
                        {HARDWARE_TYPES.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {form.category !== "game" && (
                  <div className="space-y-1.5">
                    <Label>Hardware Type <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <select className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm" value={form.hardwareType} onChange={setF("hardwareType") as any}>
                      {HARDWARE_TYPES.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={setF("description")} placeholder="Short description..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Price (₹/month)</Label><Input type="number" step="0.01" value={form.price} onChange={setF("price")} /></div>
                  <div className="space-y-1.5"><Label>Setup Fee (₹)</Label><Input type="number" step="0.01" value={form.setupFee} onChange={setF("setupFee")} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>RAM</Label><Input value={form.ram} onChange={setF("ram")} placeholder="4 GB" /></div>
                  <div className="space-y-1.5"><Label>CPU</Label><Input value={form.cpu} onChange={setF("cpu")} placeholder="4 vCPU" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Disk Space</Label><Input value={form.diskSpace} onChange={setF("diskSpace")} placeholder="50 GB NVMe" /></div>
                  <div className="space-y-1.5"><Label>Bandwidth</Label><Input value={form.bandwidth} onChange={setF("bandwidth")} placeholder="Unlimited" /></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Features <span className="text-muted-foreground text-xs">(one per line)</span></Label>
                  <textarea className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-input text-sm resize-none" value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} placeholder="Free SSL&#10;DDoS Protection&#10;Auto Backups&#10;24/7 Support" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="rounded" />
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))} className="rounded" />
                    Available
                  </label>
                </div>
                <IntegrationSection form={form} setForm={setForm} />
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editing ? "Save Changes" : "Create Product"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-card-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-8 gap-3 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span className="col-span-2">Name</span><span>Category</span><span>Subcategory</span><span>Hardware</span><span>Price</span><span>Status</span><span>Actions</span>
                </div>
                {(products?.length ?? 0) === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No products yet.</p></div>
                ) : (
                  products?.map((p: any) => (
                    <div key={p.id} className="grid grid-cols-8 gap-3 px-5 py-4 items-center hover:bg-muted/20 transition-colors">
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{p.name}</p>
                          {p.featured && <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded">Featured</span>}
                        </div>
                      </div>
                      <span className="text-sm capitalize text-muted-foreground">{p.category}</span>
                      <span className="text-xs text-muted-foreground capitalize">{p.subcategory || "—"}</span>
                      <span className="text-xs text-muted-foreground">{p.hardwareType || "—"}</span>
                      <span className="text-sm font-medium">₹{p.price}/{p.billingCycle?.slice(0, 2)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border w-fit ${p.available ? "bg-green-500/15 text-green-400 border-green-500/25" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"}`}>
                        {p.available ? "Active" : "Hidden"}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
