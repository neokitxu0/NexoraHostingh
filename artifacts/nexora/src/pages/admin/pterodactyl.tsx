import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Server, Key, RefreshCw, CheckCircle, XCircle, Zap, Globe, Cpu, HardDrive } from "lucide-react";

export default function AdminPterodactyl() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ pterodactyl_url: "", pterodactyl_app_key: "", pterodactyl_client_key: "" });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; nodes?: any[] } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["ptero-settings"],
    queryFn: async () => {
      const d = await apiFetch("/admin/pterodactyl/settings");
      setForm(d);
      return d;
    },
  });

  const { data: nodes = [] } = useQuery({
    queryKey: ["ptero-nodes"],
    queryFn: () => apiFetch("/admin/pterodactyl/nodes"),
    enabled: testResult?.success === true,
    retry: false,
  });

  const { data: nests = [] } = useQuery({
    queryKey: ["ptero-nests"],
    queryFn: () => apiFetch("/admin/pterodactyl/nests"),
    enabled: testResult?.success === true,
    retry: false,
  });

  const set = (key: string, value: string) => setForm(p => ({ ...p, [key]: value }));

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await apiFetch("/admin/pterodactyl/test", {
        method: "POST",
        body: JSON.stringify({ url: form.pterodactyl_url, appKey: form.pterodactyl_app_key }),
      });
      setTestResult(r);
      if (r.success) toast({ title: "Connected!", description: r.message });
      else toast({ title: "Connection failed", description: r.message, variant: "destructive" });
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    } finally { setTesting(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await apiFetch("/admin/pterodactyl/settings", { method: "PUT", body: JSON.stringify(form) });
      toast({ title: "Settings saved" });
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center"><Server className="h-4 w-4 text-green-400" /></div>
            Pterodactyl Integration
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Connect your Pterodactyl panel for automatic game server provisioning</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Panel Connection</CardTitle><CardDescription>Enter your Pterodactyl panel credentials</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label><Globe className="h-3.5 w-3.5 inline mr-1.5" />Panel URL</Label>
                <Input value={form.pterodactyl_url} onChange={e => set("pterodactyl_url", e.target.value)} placeholder="https://panel.yourdomain.com" />
              </div>
              <div className="space-y-1.5">
                <Label><Key className="h-3.5 w-3.5 inline mr-1.5" />Application API Key</Label>
                <Input type="password" value={form.pterodactyl_app_key} onChange={e => set("pterodactyl_app_key", e.target.value)} placeholder="ptla_••••••••" />
                <p className="text-xs text-muted-foreground">Panel Admin → Application API → Create key with all read/write permissions</p>
              </div>
              <div className="space-y-1.5">
                <Label><Key className="h-3.5 w-3.5 inline mr-1.5" />Client API Key</Label>
                <Input type="password" value={form.pterodactyl_client_key} onChange={e => set("pterodactyl_client_key", e.target.value)} placeholder="ptlc_••••••••" />
                <p className="text-xs text-muted-foreground">Your personal account API key (optional)</p>
              </div>
              {testResult && (
                <div className={`rounded-lg px-3 py-2 flex items-center gap-2 text-sm ${testResult.success ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-destructive/10 border border-destructive/20 text-destructive"}`}>
                  {testResult.success ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                  {testResult.message}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={testConnection} disabled={testing || !form.pterodactyl_url}>
                  {testing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  {testing ? "Testing..." : "Test Connection"}
                </Button>
                <Button className="flex-1" onClick={saveSettings} disabled={saving}>
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Nodes</CardTitle></CardHeader>
              <CardContent>
                {nodes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Connect and test to see nodes</p>
                ) : (
                  <div className="space-y-2">
                    {nodes.map((n: any) => (
                      <div key={n.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <Cpu className="h-4 w-4 text-green-400" />
                        <div>
                          <p className="text-sm font-medium">{n.name}</p>
                          <p className="text-xs text-muted-foreground">{n.fqdn}</p>
                        </div>
                        <Badge variant="outline" className="ml-auto text-xs">Node #{n.id}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Nests</CardTitle></CardHeader>
              <CardContent>
                {nests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Connect and test to see nests</p>
                ) : (
                  <div className="space-y-2">
                    {nests.map((n: any) => (
                      <div key={n.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <HardDrive className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">{n.name}</p>
                        <Badge variant="outline" className="ml-auto text-xs">Nest #{n.id}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>How Auto-Provisioning Works</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Customer purchases a Minecraft/game hosting plan</li>
              <li>Invoice is generated and customer pays</li>
              <li>System creates (or reuses) a Pterodactyl account for the customer</li>
              <li>Server is created automatically with the configured Nest/Egg/Node</li>
              <li>Login credentials are emailed to the customer</li>
              <li>On unpaid invoice: server is automatically suspended via Pterodactyl API</li>
              <li>On payment: server is automatically unsuspended</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
