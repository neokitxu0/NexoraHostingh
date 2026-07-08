import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Save, Loader2, Globe, FileText, Shield, RefreshCw, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const PAGE_ICONS: Record<string, React.ReactNode> = {
  terms: <FileText className="h-4 w-4" />,
  privacy: <Shield className="h-4 w-4" />,
  refund: <RefreshCw className="h-4 w-4" />,
  sla: <Globe className="h-4 w-4" />,
};

export default function AdminTerms() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [newPage, setNewPage] = useState(false);
  const [newForm, setNewForm] = useState({ slug: "", title: "", content: "" });

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: () => apiFetch<any[]>("/admin/pages"),
  });

  const updateMutation = useMutation({
    mutationFn: (p: any) => apiFetch(`/admin/pages/${p.slug}`, { method: "PUT", body: JSON.stringify(p) }),
    onSuccess: () => { toast({ title: "Page saved" }); qc.invalidateQueries({ queryKey: ["admin-pages"] }); setEditing(null); },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: () => apiFetch("/admin/pages", { method: "POST", body: JSON.stringify(newForm) }),
    onSuccess: () => {
      toast({ title: "Page created" });
      qc.invalidateQueries({ queryKey: ["admin-pages"] });
      setNewPage(false);
      setNewForm({ slug: "", title: "", content: "" });
    },
    onError: (e: any) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => apiFetch(`/admin/pages/${slug}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Page deleted" }); qc.invalidateQueries({ queryKey: ["admin-pages"] }); },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const togglePublished = (page: any) => {
    updateMutation.mutate({ ...page, published: !page.published });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" /> Pages & Legal Documents
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Manage Terms of Service, Privacy Policy, and other legal pages</p>
          </div>
          <Button onClick={() => setNewPage(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Page
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : (
          <div className="grid gap-4">
            {pages?.map((page: any) => (
              <Card key={page.slug} className="border-card-border hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        {PAGE_ICONS[page.slug] ?? <FileText className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{page.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${page.published ? "bg-green-500/15 text-green-400 border-green-500/25" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"}`}>
                            {page.published ? "Published" : "Draft"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Slug: <code className="bg-muted px-1 rounded">/page/{page.slug}</code>
                          {" · "}Last updated: {new Date(page.updatedAt).toLocaleDateString("en-IN")}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {page.content.replace(/^#+\s*/mg, "").slice(0, 120)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {page.published ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                        <Switch checked={page.published} onCheckedChange={() => togglePublished(page)} />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setEditing({ ...page })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`Delete "${page.title}"?`)) deleteMutation.mutate(page.slug); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editing} onOpenChange={o => { if (!o) setEditing(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit: {editing?.title}</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Page Title</Label>
                    <Input value={editing.title} onChange={e => setEditing((p: any) => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Slug (URL)</Label>
                    <Input value={editing.slug} disabled className="opacity-60" />
                  </div>
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label>Content (Markdown supported)</Label>
                  <textarea
                    className="w-full h-80 px-3 py-2 rounded-lg border border-border bg-input text-sm resize-none font-mono"
                    value={editing.content}
                    onChange={e => setEditing((p: any) => ({ ...p, content: e.target.value }))}
                    placeholder="# Page Title&#10;&#10;Content goes here..."
                  />
                  <p className="text-xs text-muted-foreground">Markdown supported: # Headings, **bold**, *italic*, bullet lists</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={editing.published} onCheckedChange={v => setEditing((p: any) => ({ ...p, published: v }))} />
                  <Label>Published (visible to public)</Label>
                </div>
                <Button onClick={() => updateMutation.mutate(editing)} disabled={updateMutation.isPending} className="w-full">
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* New Page Dialog */}
        <Dialog open={newPage} onOpenChange={setNewPage}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create New Page</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Page Title</Label>
                  <Input value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} placeholder="Terms of Service" />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={newForm.slug} onChange={e => setNewForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} placeholder="terms" />
                  <p className="text-xs text-muted-foreground">URL: /page/{newForm.slug || "slug"}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Content (Markdown)</Label>
                <textarea
                  className="w-full h-48 px-3 py-2 rounded-lg border border-border bg-input text-sm resize-none font-mono"
                  value={newForm.content}
                  onChange={e => setNewForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="# Page Title&#10;&#10;Write your content here..."
                />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newForm.slug || !newForm.title} className="w-full">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Page
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
