import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Server, Key, RefreshCw, CheckCircle, XCircle, Zap, Globe, Cpu, Database } from "lucide-react";

export default function AdminProxmox() {
  const { toast } = useToast();
  const [form, setForm] = useState({ proxmox_url: "", proxmox_token_id: "", proxmox_token_secret: "" });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; nodes?: any[] } | null>(null);
  const [saving, setSaving] = useState(false);

  useQuery({
    queryKey: ["proxmox-settings"],
    queryFn: async () => {
      const d = await apiFetch("/admin/proxmox/settings");
      setForm(d);
      return d;
    },
  });

  const { data: nodes = [] } = useQuery({
    queryKey: ["proxmox-nodes"],
    queryFn: () => apiFetch("/admin/proxmox/nodes"),
    enabled: testResult?.success === true,
    retry: false,
  });

  const set = (key: string, value: string) => setForm(p => ({ ...p, [key]: value }));

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await apiFetch("/admin/proxmox/test", {
        method: "POST",
        body: JSON.stringify({ url: form.proxmox_url, tokenId: form.proxmox_token_id, tokenSecret: form.proxmox_token_secret }),
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
      await apiFetch("/admin/proxmox/settings", { method: "PUT", body: JSON.stringify(form) });
      toast({ title: "Settings saved" });
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center"><Cpu className="h-4 w-4 text-orange-400" /></div>
            Proxmox Integration
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Connect Proxmox VE for automatic VPS provisioning with power controls</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Proxmox Connection</CardTitle><CardDescription>Configure your Proxmox VE API credentials</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label><Globe className="h-3.5 w-3.5 inline mr-1.5" />Proxmox URL</Label>
                <Input value={form.proxmox_url} onChange={e => set("proxmox_url", e.target.value)} placeholder="https://pve.yourdomain.com:8006" />
              </div>
              <div className="space-y-1.5">
                <Label><Key className="h-3.5 w-3.5 inline mr-1.5" />API Token ID</Label>
                <Input value={form.proxmox_token_id} onChange={e => set("proxmox_token_id", e.target.value)} placeholder="root@pam!nexora" />
                <p className="text-xs text-muted-foreground">Format: user@realm!tokenname — create in Datacenter → Permissions → API Tokens</p>
              </div>
              <div className="space-y-1.5">
                <Label><Key className="h-3.5 w-3.5 inline mr-1.5" />API Token Secret</Label>
                <Input type="password" value={form.proxmox_token_secret} onChange={e => set("proxmox_token_secret", e.target.value)} placeholder="••••••••" />
                <p className="text-xs text-muted-foreground">The UUID secret shown once when the token is created</p>
              </div>

              {testResult && (
                <div className={`rounded-lg px-3 py-2 flex items-center gap-2 text-sm ${testResult.success ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-destructive/10 border border-destructive/20 text-destructive"}`}>
                  {testResult.success ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                  {testResult.message}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={testConnection} disabled={testing || !form.proxmox_url}>
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

          <Card>
            <CardHeader><CardTitle>Nodes</CardTitle></CardHeader>
            <CardContent>
              {nodes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Connect and test to see Proxmox nodes</p>
              ) : (
                <div className="space-y-2">
                  {nodes.map((n: any) => (
                    <div key={n.node} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <Server className="h-4 w-4 text-orange-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{n.node}</p>
                        <p className="text-xs text-muted-foreground">
                          CPU: {n.maxcpu} cores · RAM: {Math.round(n.maxmem / 1024 / 1024 / 1024)}GB · Disk: {Math.round(n.maxdisk / 1024 / 1024 / 1024)}GB
                        </p>
                      </div>
                      <Badge variant={n.status === "online" ? "default" : "secondary"} className="text-xs">{n.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>VPS Features Available to Customers</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: "⚡", label: "Start / Stop / Reboot" },
                { icon: "🖥️", label: "VNC Console Access" },
                { icon: "🔄", label: "OS Reinstall" },
                { icon: "📊", label: "Resource Usage Graphs" },
                { icon: "🌐", label: "Reverse DNS" },
                { icon: "💾", label: "Backup & Restore" },
                { icon: "🔌", label: "ISO Mounting" },
                { icon: "🛡️", label: "DDoS Protection" },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm">
                  <span>{f.icon}</span>
                  <span className="text-muted-foreground">{f.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
