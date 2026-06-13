import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const EMPTY_FORM = {
  name: "", category: "shared", description: "", price: "", setupFee: "0",
  billingCycle: "monthly", diskSpace: "", bandwidth: "", ram: "", cpu: "", features: "", featured: false, available: true,
};

export default function AdminProducts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => apiFetch<any[]>("/admin/products"),
  });

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        price: Number(form.price),
        setupFee: Number(form.setupFee),
        features: form.features.split("\n").filter(Boolean),
      };
      if (editing) return apiFetch(`/admin/products/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      return apiFetch("/admin/products", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast({ title: editing ? "Product updated" : "Product created" });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
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
    setForm({
      name: p.name, category: p.category, description: p.description ?? "",
      price: String(p.price), setupFee: String(p.setupFee), billingCycle: p.billingCycle,
      diskSpace: p.diskSpace ?? "", bandwidth: p.bandwidth ?? "", ram: p.ram ?? "", cpu: p.cpu ?? "",
      features: p.features?.join("\n") ?? "", featured: p.featured, available: p.available,
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
              <Button data-testid="button-add-product"><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={set("name")} placeholder="Starter Plan" data-testid="input-product-name" /></div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <select className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm" value={form.category} onChange={set("category") as any}>
                      {["shared", "vps", "dedicated", "game", "domain"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Price ($/month)</Label><Input type="number" step="0.01" value={form.price} onChange={set("price")} data-testid="input-product-price" /></div>
                  <div className="space-y-1.5"><Label>Setup Fee ($)</Label><Input type="number" step="0.01" value={form.setupFee} onChange={set("setupFee")} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Disk Space</Label><Input value={form.diskSpace} onChange={set("diskSpace")} placeholder="50 GB SSD" /></div>
                  <div className="space-y-1.5"><Label>Bandwidth</Label><Input value={form.bandwidth} onChange={set("bandwidth")} placeholder="Unlimited" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>RAM</Label><Input value={form.ram} onChange={set("ram")} placeholder="2 GB" /></div>
                  <div className="space-y-1.5"><Label>CPU</Label><Input value={form.cpu} onChange={set("cpu")} placeholder="2 vCPU" /></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Features (one per line)</Label>
                  <textarea className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-input text-sm resize-none" value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} placeholder="Free SSL&#10;Daily Backups&#10;cPanel" data-testid="textarea-features" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.featured as boolean} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="rounded" />
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.available as boolean} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))} className="rounded" />
                    Available
                  </label>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full" data-testid="button-save-product">
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
                <div className="grid grid-cols-6 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span className="col-span-2">Name</span><span>Category</span><span>Price</span><span>Status</span><span>Actions</span>
                </div>
                {(products?.length ?? 0) === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No products yet.</p></div>
                ) : (
                  products?.map((p: any) => (
                    <div key={p.id} className="grid grid-cols-6 gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors" data-testid={`product-row-${p.id}`}>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{p.name}</p>
                          {p.featured && <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded">Featured</span>}
                        </div>
                      </div>
                      <span className="text-sm capitalize text-muted-foreground">{p.category}</span>
                      <span className="text-sm font-medium">${p.price}/{p.billingCycle}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border w-fit ${p.available ? "bg-green-500/15 text-green-400 border-green-500/25" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"}`}>
                        {p.available ? "Active" : "Hidden"}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(p)} data-testid={`button-edit-product-${p.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(p.id)} data-testid={`button-delete-product-${p.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
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
