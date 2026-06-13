import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Zap, RefreshCw, DollarSign, Shield, Settings, Activity } from "lucide-react";

interface Gateway {
  id: number; name: string; slug: string; enabled: boolean; testMode: boolean;
  config: Record<string, string>; webhookSecret: string | null;
}

const GATEWAY_ICONS: Record<string, React.ElementType> = {
  stripe: CreditCard, paypal: DollarSign, razorpay: Zap, crypto: Shield,
};

const GATEWAY_FIELDS: Record<string, Array<{ key: string; label: string; type?: string }>> = {
  stripe: [
    { key: "publishable_key", label: "Publishable Key" },
    { key: "secret_key", label: "Secret Key", type: "password" },
    { key: "webhook_endpoint_secret", label: "Webhook Endpoint Secret", type: "password" },
  ],
  paypal: [
    { key: "client_id", label: "Client ID" },
    { key: "client_secret", label: "Client Secret", type: "password" },
    { key: "webhook_id", label: "Webhook ID" },
  ],
  razorpay: [
    { key: "key_id", label: "Key ID" },
    { key: "key_secret", label: "Key Secret", type: "password" },
    { key: "webhook_secret", label: "Webhook Secret", type: "password" },
  ],
  crypto: [
    { key: "api_key", label: "Coinbase Commerce API Key" },
    { key: "webhook_secret", label: "Webhook Shared Secret", type: "password" },
  ],
};

function GatewayCard({ gw, onSave }: { gw: Gateway; onSave: (id: number, data: any) => void }) {
  const [config, setConfig] = useState<Record<string, string>>(gw.config ?? {});
  const [enabled, setEnabled] = useState(gw.enabled);
  const [testMode, setTestMode] = useState(gw.testMode);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const Icon = GATEWAY_ICONS[gw.slug] ?? CreditCard;
  const fields = GATEWAY_FIELDS[gw.slug] ?? [];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(gw.id, { enabled, testMode, config });
      toast({ title: "Saved", description: `${gw.name} settings updated` });
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{gw.name}</CardTitle>
              <CardDescription className="text-xs">Payment Gateway</CardDescription>
            </div>
          </div>
          <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Active" : "Inactive"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Enable Gateway</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Test Mode</Label>
            <p className="text-xs text-muted-foreground">Use sandbox credentials</p>
          </div>
          <Switch checked={testMode} onCheckedChange={setTestMode} />
        </div>
        {testMode && <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-400">⚠️ Test mode active — no real payments will be processed</div>}
        {fields.map(f => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-xs">{f.label}</Label>
            <Input
              type={f.type === "password" ? "password" : "text"}
              value={config[f.key] ?? ""}
              onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.type === "password" ? "••••••••" : `Enter ${f.label.toLowerCase()}`}
              className="h-8 text-sm font-mono"
            />
          </div>
        ))}
        <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
          {saving ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : <Settings className="h-3 w-3 mr-2" />}
          Save {gw.name} Settings
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminPaymentGateways() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: gateways = [], isLoading } = useQuery<Gateway[]>({
    queryKey: ["admin-gateways"],
    queryFn: async () => apiFetch("/admin/payment-gateways"),
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery<any[]>({
    queryKey: ["admin-gateway-txns"],
    queryFn: async () => {
      const d = await apiFetch("/admin/payment-gateways/transactions");
      return d.data ?? [];
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => apiFetch("/admin/payment-gateways/seed", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gateways"] }),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/admin/payment-gateways/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gateways"] }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Payment Gateways</h1>
            <p className="text-muted-foreground text-sm">Configure payment processors and view transaction logs</p>
          </div>
          {gateways.length === 0 && (
            <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              <Zap className="h-4 w-4 mr-2" /> Initialize Gateways
            </Button>
          )}
        </div>

        <Tabs defaultValue="gateways">
          <TabsList>
            <TabsTrigger value="gateways"><CreditCard className="h-3.5 w-3.5 mr-1.5" />Gateways</TabsTrigger>
            <TabsTrigger value="transactions"><Activity className="h-3.5 w-3.5 mr-1.5" />Transaction Log</TabsTrigger>
          </TabsList>

          <TabsContent value="gateways" className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-64 rounded-xl bg-card animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gateways.map(gw => (
                  <GatewayCard key={gw.id} gw={gw} onSave={(id, data) => saveMutation.mutateAsync({ id, data })} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["ID", "User", "Amount", "Gateway", "Status", "Date"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
                      ))
                    ) : transactions.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No transactions yet</td></tr>
                    ) : (
                      transactions.map((t: any) => (
                        <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-xs">#{t.id}</td>
                          <td className="px-4 py-3">{t.userId}</td>
                          <td className="px-4 py-3 font-semibold">${parseFloat(t.amount).toFixed(2)}</td>
                          <td className="px-4 py-3 capitalize">{t.gateway ?? "—"}</td>
                          <td className="px-4 py-3">
                            <Badge variant={t.status === "completed" ? "default" : "secondary"} className="text-xs">{t.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
