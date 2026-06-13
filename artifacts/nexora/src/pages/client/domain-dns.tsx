import { useState } from "react";
import { useParams, Link } from "wouter";
import { ClientLayout } from "@/components/layout/client-layout";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, ChevronLeft, Globe, RefreshCw } from "lucide-react";

interface DnsRecord {
  id: number; type: string; name: string; content: string; ttl: number; priority: number | null;
}

const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"];
const TYPE_COLORS: Record<string, string> = {
  A: "bg-blue-500/15 text-blue-400", AAAA: "bg-purple-500/15 text-purple-400",
  CNAME: "bg-yellow-500/15 text-yellow-400", MX: "bg-green-500/15 text-green-400",
  TXT: "bg-gray-500/15 text-gray-400", NS: "bg-orange-500/15 text-orange-400",
  SRV: "bg-pink-500/15 text-pink-400", CAA: "bg-red-500/15 text-red-400",
};

function RecordDialog({ record, domainId, onClose, onSave }: {
  record?: DnsRecord; domainId: string; onClose: () => void; onSave: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    type: record?.type ?? "A", name: record?.name ?? "@",
    content: record?.content ?? "", ttl: record?.ttl ?? 3600, priority: record?.priority ?? 10,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  const needsPriority = form.type === "MX" || form.type === "SRV";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{record ? "Edit DNS Record" : "Add DNS Record"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Record Type</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {RECORD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>TTL (seconds)</Label>
              <Input type="number" value={form.ttl} onChange={e => setForm(p => ({ ...p, ttl: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Name / Host</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="@ for root, or subdomain" />
          </div>
          <div className="space-y-1.5">
            <Label>Value / Content</Label>
            <Input
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder={
                form.type === "A" ? "1.2.3.4" : form.type === "CNAME" ? "target.domain.com" :
                form.type === "MX" ? "mail.domain.com" : form.type === "TXT" ? "v=spf1 ..." : "Record value"
              }
            />
          </div>
          {needsPriority && (
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Input type="number" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))} />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !form.content}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {record ? "Update Record" : "Add Record"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DomainDNS() {
  const { id } = useParams();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editRecord, setEditRecord] = useState<DnsRecord | null>(null);

  const { data: records = [], isLoading } = useQuery<DnsRecord[]>({
    queryKey: ["dns-records", id],
    queryFn: () => apiFetch(`/dns/${id}/records`),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/dns/${id}/records`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dns-records", id] }); toast({ title: "DNS record added" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ recId, ...data }: any) => apiFetch(`/dns/${id}/records/${recId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dns-records", id] }); toast({ title: "DNS record updated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (recId: number) => apiFetch(`/dns/${id}/records/${recId}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dns-records", id] }); toast({ title: "DNS record deleted" }); },
  });

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/domains">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Globe className="h-5 w-5 text-primary" />DNS Manager</h1>
            <p className="text-sm text-muted-foreground">Manage DNS records for domain #{id}</p>
          </div>
          <Button className="ml-auto" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Record
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Type", "Name", "Value", "TTL", "Priority", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>)
                ) : records.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16">
                    <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">No DNS records yet</p>
                    <p className="text-xs text-muted-foreground">Add your first record above</p>
                  </td></tr>
                ) : (
                  records.map(r => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${TYPE_COLORS[r.type] ?? "bg-muted text-foreground"}`}>{r.type}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate" title={r.content}>{r.content}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.ttl}s</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.priority ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditRecord(r)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(r.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader><CardTitle className="text-sm">Common DNS Record Examples</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
            {[
              { type: "A", example: "@ → 1.2.3.4 (point domain to IP)" },
              { type: "CNAME", example: "www → yourdomain.com (alias)" },
              { type: "MX", example: "@ → mail.yourdomain.com (email)" },
              { type: "TXT", example: "@ → v=spf1 include:... (SPF)" },
            ].map(e => (
              <div key={e.type} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                <span className={`text-xs font-bold px-1 py-0.5 rounded ${TYPE_COLORS[e.type] ?? ""}`}>{e.type}</span>
                <span>{e.example}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {showNew && (
        <RecordDialog
          domainId={id!}
          onClose={() => setShowNew(false)}
          onSave={createMutation.mutateAsync}
        />
      )}
      {editRecord && (
        <RecordDialog
          record={editRecord}
          domainId={id!}
          onClose={() => setEditRecord(null)}
          onSave={data => updateMutation.mutateAsync({ recId: editRecord.id, ...data })}
        />
      )}
    </ClientLayout>
  );
}
