import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Zap, Mail, Play, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Pencil } from "lucide-react";

interface AutomationJob { id: number; type: string; status: string; targetId: number | null; result: string | null; error: string | null; createdAt: string; }
interface EmailTemplate { id: number; slug: string; name: string; subject: string; body: string; enabled: boolean; }

const STATUS_ICONS: Record<string, React.ElementType> = {
  completed: CheckCircle, failed: XCircle, pending: Clock, running: RefreshCw,
};
const STATUS_COLORS: Record<string, string> = {
  completed: "text-green-400", failed: "text-destructive", pending: "text-yellow-400", running: "text-primary",
};

function EmailTemplateEditor({ tmpl, onClose, onSave }: { tmpl: EmailTemplate; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [form, setForm] = useState({ name: tmpl.name, subject: tmpl.subject, body: tmpl.body, enabled: tmpl.enabled });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Edit Email Template: {tmpl.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enabled</Label>
            <Switch checked={form.enabled} onCheckedChange={v => setForm(p => ({ ...p, enabled: v }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Template Name</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Subject Line</Label>
            <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Body (HTML)</Label>
            <Textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={8} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">Use &#123;&#123;variableName&#125;&#125; for dynamic content. Available: firstName, serviceName, invoiceId, amount, dueDate, username, password, panelUrl</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null} Save Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAutomation() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editTmpl, setEditTmpl] = useState<EmailTemplate | null>(null);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<AutomationJob[]>({
    queryKey: ["automation-jobs"],
    queryFn: async () => { const d = await apiFetch("/admin/automation/jobs"); return d.data ?? []; },
    refetchInterval: 10_000,
  });

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["email-templates"],
    queryFn: () => apiFetch("/admin/automation/email-templates"),
  });

  const runSuspensionCheck = useMutation({
    mutationFn: () => apiFetch("/admin/automation/run-suspension-check", { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-jobs"] }); toast({ title: "Suspension check completed" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const runRenewalReminders = useMutation({
    mutationFn: () => apiFetch("/admin/automation/run-renewal-reminders", { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-jobs"] }); toast({ title: "Renewal reminders sent" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const seedTemplates = useMutation({
    mutationFn: () => apiFetch("/admin/automation/email-templates/seed", { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-templates"] }); toast({ title: "Email templates seeded" }); },
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/admin/automation/email-templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-templates"] }); },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Automation</h1>
          <p className="text-muted-foreground text-sm">Manage automated jobs, email templates, and system tasks</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-red-400" /></div>
                <div>
                  <p className="font-semibold text-sm">Suspension Check</p>
                  <p className="text-xs text-muted-foreground">Runs hourly automatically</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Checks for overdue invoices and suspends services via Pterodactyl/Proxmox API.</p>
              <Button size="sm" className="w-full" variant="outline" onClick={() => runSuspensionCheck.mutate()} disabled={runSuspensionCheck.isPending}>
                {runSuspensionCheck.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" /> : <Play className="h-3.5 w-3.5 mr-2" />}
                Run Now
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center"><Mail className="h-4 w-4 text-blue-400" /></div>
                <div>
                  <p className="font-semibold text-sm">Renewal Reminders</p>
                  <p className="text-xs text-muted-foreground">7 days before due date</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Sends renewal reminder emails to clients with services due in 7 days.</p>
              <Button size="sm" className="w-full" variant="outline" onClick={() => runRenewalReminders.mutate()} disabled={runRenewalReminders.isPending}>
                {runRenewalReminders.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" /> : <Play className="h-3.5 w-3.5 mr-2" />}
                Run Now
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center"><Zap className="h-4 w-4 text-primary" /></div>
                <div>
                  <p className="font-semibold text-sm">Scheduler Status</p>
                  <p className="text-xs text-muted-foreground">Running in background</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-green-400 text-xs mb-3">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Automation scheduler active
              </div>
              <p className="text-xs text-muted-foreground">Suspension check and renewal reminders run every hour automatically.</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs"><Clock className="h-3.5 w-3.5 mr-1.5" />Job History</TabsTrigger>
            <TabsTrigger value="templates"><Mail className="h-3.5 w-3.5 mr-1.5" />Email Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    {["Type", "Target", "Status", "Result", "Date"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {jobsLoading ? (
                      [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>)
                    ) : jobs.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No automation jobs yet</td></tr>
                    ) : (
                      jobs.map(job => {
                        const Icon = STATUS_ICONS[job.status] ?? Clock;
                        return (
                          <tr key={job.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="px-4 py-3 font-mono text-xs">{job.type}</td>
                            <td className="px-4 py-3 text-muted-foreground">{job.targetId ? `#${job.targetId}` : "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`flex items-center gap-1 text-xs ${STATUS_COLORS[job.status] ?? ""}`}>
                                <Icon className="h-3.5 w-3.5" />
                                {job.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{job.result ?? job.error ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(job.createdAt).toLocaleString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className="flex justify-end mb-3">
              {templates.length === 0 && (
                <Button variant="outline" onClick={() => seedTemplates.mutate()} disabled={seedTemplates.isPending}>
                  <Mail className="h-4 w-4 mr-2" /> Seed Default Templates
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {templates.map(tmpl => (
                <Card key={tmpl.id} className="border-border">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{tmpl.name}</p>
                        <Badge variant={tmpl.enabled ? "default" : "secondary"} className="text-xs">{tmpl.enabled ? "Active" : "Disabled"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{tmpl.slug} · {tmpl.subject}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTmpl(tmpl)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {editTmpl && (
        <EmailTemplateEditor
          tmpl={editTmpl}
          onClose={() => setEditTmpl(null)}
          onSave={data => updateTemplate.mutateAsync({ id: editTmpl.id, ...data })}
        />
      )}
    </AdminLayout>
  );
}
