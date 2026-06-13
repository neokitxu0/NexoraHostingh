import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, Tag, Server, Cpu, Gamepad2, Globe, Share2, HardDrive } from "lucide-react";

interface Category {
  id: number; name: string; slug: string; description: string | null;
  icon: string | null; sortOrder: number; visible: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  server: Server, cpu: Cpu, gamepad2: Gamepad2, globe: Globe, share2: Share2,
  harddrive: HardDrive, tag: Tag,
};

const DEFAULT_CATEGORIES = [
  { name: "Shared Hosting", slug: "shared", description: "Budget-friendly web hosting", icon: "server" },
  { name: "VPS Hosting", slug: "vps", description: "Virtual Private Servers", icon: "cpu" },
  { name: "VDS Hosting", slug: "vds", description: "Virtual Dedicated Servers", icon: "cpu" },
  { name: "Dedicated Servers", slug: "dedicated", description: "Full dedicated hardware", icon: "server" },
  { name: "Minecraft Hosting", slug: "minecraft", description: "Game server hosting", icon: "gamepad2" },
  { name: "Discord Bot Hosting", slug: "discord-bots", description: "Host your Discord bots 24/7", icon: "share2" },
  { name: "Reseller Hosting", slug: "reseller", description: "Resell hosting to clients", icon: "harddrive" },
  { name: "Domain Services", slug: "domains", description: "Domain registration & management", icon: "globe" },
];

function CategoryDialog({ cat, onClose, onSave }: { cat?: Category; onClose: () => void; onSave: (data: Partial<Category>) => Promise<void> }) {
  const [form, setForm] = useState({
    name: cat?.name ?? "", slug: cat?.slug ?? "", description: cat?.description ?? "",
    icon: cat?.icon ?? "server", sortOrder: cat?.sortOrder ?? 0, visible: cat?.visible ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{cat ? "Edit" : "New"} Category</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: p.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}>
                {Object.keys(ICON_MAP).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Visible to customers</Label>
            <Switch checked={form.visible} onCheckedChange={v => setForm(p => ({ ...p, visible: v }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving..." : "Save Category"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCategories() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch("/admin/categories"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/admin/categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-categories"] }); toast({ title: "Category created" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-categories"] }); toast({ title: "Category updated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-categories"] }); toast({ title: "Category deleted" }); },
  });

  const seedDefaults = async () => {
    for (const cat of DEFAULT_CATEGORIES) {
      await createMutation.mutateAsync(cat).catch(() => {});
    }
    toast({ title: "Default categories seeded" });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Categories Manager</h1>
            <p className="text-muted-foreground text-sm">Organize products into categories</p>
          </div>
          <div className="flex gap-2">
            {categories.length === 0 && (
              <Button variant="outline" onClick={seedDefaults}>
                <Tag className="h-4 w-4 mr-2" /> Seed Defaults
              </Button>
            )}
            <Button onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Category
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-card animate-pulse" />)}
          </div>
        ) : categories.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Tag className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No categories yet. Click "Seed Defaults" to add common hosting categories.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {categories.map(cat => {
              const Icon = ICON_MAP[cat.icon ?? ""] ?? Tag;
              return (
                <Card key={cat.id} className="border-border">
                  <CardContent className="flex items-center gap-4 p-4">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{cat.name}</p>
                        <Badge variant={cat.visible ? "default" : "secondary"} className="text-xs">{cat.visible ? "Visible" : "Hidden"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{cat.description ?? "—"} · /{cat.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditCat(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(cat.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showNew && (
        <CategoryDialog
          onClose={() => setShowNew(false)}
          onSave={createMutation.mutateAsync}
        />
      )}
      {editCat && (
        <CategoryDialog
          cat={editCat}
          onClose={() => setEditCat(null)}
          onSave={data => updateMutation.mutateAsync({ id: editCat.id, ...data })}
        />
      )}
    </AdminLayout>
  );
}
