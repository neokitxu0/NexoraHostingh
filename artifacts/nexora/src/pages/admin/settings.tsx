import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Mail, MessageSquare, Palette, Building2, FileText, Percent, DollarSign, RefreshCw, CheckCircle } from "lucide-react";

type Settings = Record<string, string>;

function SettingsSection({ title, description, fields, values, onChange }: {
  title: string; description?: string;
  fields: Array<{ key: string; label: string; type?: string; placeholder?: string; hint?: string }>;
  values: Settings; onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {fields.map(f => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-sm">{f.label}</Label>
          {f.type === "textarea" ? (
            <Textarea value={values[f.key] ?? ""} onChange={e => onChange(f.key, e.target.value)} placeholder={f.placeholder} rows={3} />
          ) : (
            <Input
              type={f.type === "password" ? "password" : "text"}
              value={values[f.key] ?? ""}
              onChange={e => onChange(f.key, e.target.value)}
              placeholder={f.placeholder}
            />
          )}
          {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
        </div>
      ))}
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({});
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [discordTesting, setDiscordTesting] = useState(false);

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ["admin-settings"],
    queryFn: () => apiFetch("/admin/settings"),
  });

  useEffect(() => { if (data) setSettings(data); }, [data]);

  const saveMutation = useMutation({
    mutationFn: (s: Settings) => apiFetch("/admin/settings", { method: "PUT", body: JSON.stringify(s) }),
    onSuccess: () => toast({ title: "Settings saved successfully" }),
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const set = (key: string, value: string) => setSettings(p => ({ ...p, [key]: value }));

  const testSmtp = async () => {
    setTesting(true);
    try {
      const res = await apiFetch("/admin/settings/test-smtp", { method: "POST", body: JSON.stringify({ to: testEmail }) });
      toast({ title: "Test email sent!", description: `Sent to ${testEmail}` });
    } catch (e: any) {
      toast({ title: "SMTP test failed", description: e.message, variant: "destructive" });
    } finally { setTesting(false); }
  };

  const testDiscord = async () => {
    setDiscordTesting(true);
    try {
      await apiFetch("/admin/settings/test-discord", { method: "POST" });
      toast({ title: "Discord notification sent!" });
    } catch (e: any) {
      toast({ title: "Discord test failed", description: e.message, variant: "destructive" });
    } finally { setDiscordTesting(false); }
  };

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center h-64"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Settings</h1>
            <p className="text-muted-foreground text-sm">Configure platform-wide settings</p>
          </div>
          <Button onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save All Settings
          </Button>
        </div>

        <Tabs defaultValue="company">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="company"><Building2 className="h-3.5 w-3.5 mr-1.5" />Company</TabsTrigger>
            <TabsTrigger value="smtp"><Mail className="h-3.5 w-3.5 mr-1.5" />SMTP</TabsTrigger>
            <TabsTrigger value="discord"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Discord</TabsTrigger>
            <TabsTrigger value="branding"><Palette className="h-3.5 w-3.5 mr-1.5" />Branding</TabsTrigger>
            <TabsTrigger value="invoice"><FileText className="h-3.5 w-3.5 mr-1.5" />Invoice</TabsTrigger>
            <TabsTrigger value="tax"><Percent className="h-3.5 w-3.5 mr-1.5" />Tax</TabsTrigger>
            <TabsTrigger value="currency"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Currency</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="mt-4">
            <Card><CardHeader><CardTitle>Company Information</CardTitle><CardDescription>Your business details shown on invoices and emails</CardDescription></CardHeader>
              <CardContent>
                <SettingsSection title="" fields={[
                  { key: "company_name", label: "Company Name", placeholder: "NexoraHosting Ltd" },
                  { key: "company_email", label: "Support Email", placeholder: "support@nexorahosting.com" },
                  { key: "company_phone", label: "Phone Number", placeholder: "+1 234 567 8900" },
                  { key: "company_address", label: "Address", type: "textarea", placeholder: "123 Server Street, Cloud City, CC 00000" },
                  { key: "company_website", label: "Website URL", placeholder: "https://nexorahosting.com" },
                  { key: "company_vat_number", label: "VAT/Tax ID", placeholder: "GB123456789" },
                ]} values={settings} onChange={set} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="smtp" className="mt-4">
            <Card><CardHeader><CardTitle>SMTP Configuration</CardTitle><CardDescription>Configure outbound email sending</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <SettingsSection title="" fields={[
                  { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
                  { key: "smtp_port", label: "SMTP Port", placeholder: "587", hint: "Use 465 for SSL, 587 for TLS" },
                  { key: "smtp_user", label: "SMTP Username", placeholder: "user@gmail.com" },
                  { key: "smtp_password", label: "SMTP Password", type: "password", placeholder: "Your SMTP password or app password" },
                  { key: "smtp_from", label: "From Address", placeholder: "noreply@nexorahosting.com" },
                  { key: "smtp_from_name", label: "From Name", placeholder: "NexoraHosting" },
                ]} values={settings} onChange={set} />
                <div className="border-t border-border pt-4 space-y-3">
                  <Label>Send Test Email</Label>
                  <div className="flex gap-2">
                    <Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" className="flex-1" />
                    <Button onClick={testSmtp} disabled={testing || !testEmail} variant="outline">
                      {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                      {testing ? "" : "Send Test"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discord" className="mt-4">
            <Card><CardHeader><CardTitle>Discord Notifications</CardTitle><CardDescription>Get real-time alerts in your Discord server</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <SettingsSection title="" fields={[
                  { key: "discord_webhook_url", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/...", hint: "Create a webhook in your Discord server settings → Integrations → Webhooks" },
                ]} values={settings} onChange={set} />
                <div className="space-y-3">
                  <Label>Notification Events</Label>
                  {[
                    { key: "discord_notify_new_order", label: "New Orders" },
                    { key: "discord_notify_new_ticket", label: "New Support Tickets" },
                    { key: "discord_notify_payment", label: "Payments Received" },
                    { key: "discord_notify_suspension", label: "Service Suspensions" },
                    { key: "discord_notify_new_user", label: "New User Registrations" },
                  ].map(n => (
                    <div key={n.key} className="flex items-center justify-between">
                      <Label className="font-normal">{n.label}</Label>
                      <Switch checked={(settings[n.key] ?? "true") === "true"} onCheckedChange={v => set(n.key, v ? "true" : "false")} />
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={testDiscord} disabled={discordTesting || !settings.discord_webhook_url}>
                  {discordTesting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                  {discordTesting ? "Sending..." : "Send Test Notification"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="mt-4">
            <Card><CardHeader><CardTitle>Branding & Theme</CardTitle><CardDescription>Customize the platform's look and feel</CardDescription></CardHeader>
              <CardContent>
                <SettingsSection title="" fields={[
                  { key: "brand_name", label: "Brand Name", placeholder: "NexoraHosting" },
                  { key: "brand_logo_url", label: "Logo URL", placeholder: "https://example.com/logo.png" },
                  { key: "brand_favicon_url", label: "Favicon URL", placeholder: "https://example.com/favicon.ico" },
                  { key: "brand_primary_color", label: "Primary Color (hex)", placeholder: "#6366f1" },
                  { key: "brand_accent_color", label: "Accent Color (hex)", placeholder: "#a855f7" },
                  { key: "brand_support_url", label: "Support URL", placeholder: "https://nexorahosting.com/support" },
                  { key: "brand_tos_url", label: "Terms of Service URL", placeholder: "https://nexorahosting.com/tos" },
                  { key: "brand_privacy_url", label: "Privacy Policy URL", placeholder: "https://nexorahosting.com/privacy" },
                ]} values={settings} onChange={set} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice" className="mt-4">
            <Card><CardHeader><CardTitle>Invoice Settings</CardTitle><CardDescription>Configure invoice generation and numbering</CardDescription></CardHeader>
              <CardContent>
                <SettingsSection title="" fields={[
                  { key: "invoice_prefix", label: "Invoice Number Prefix", placeholder: "INV-", hint: "e.g. INV-2024-001" },
                  { key: "invoice_due_days", label: "Payment Due Days", placeholder: "7", hint: "Days after invoice creation before it's overdue" },
                  { key: "invoice_currency_symbol", label: "Currency Symbol", placeholder: "$" },
                  { key: "invoice_footer", label: "Invoice Footer Text", type: "textarea", placeholder: "Thank you for your business!" },
                  { key: "invoice_terms", label: "Payment Terms", type: "textarea", placeholder: "Payment due within 7 days of invoice date." },
                ]} values={settings} onChange={set} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax" className="mt-4">
            <Card><CardHeader><CardTitle>Tax Settings</CardTitle><CardDescription>Configure tax rates applied to invoices</CardDescription></CardHeader>
              <CardContent>
                <SettingsSection title="" fields={[
                  { key: "tax_enabled", label: "Enable Tax", type: "text", placeholder: "true or false" },
                  { key: "tax_rate", label: "Tax Rate (%)", placeholder: "20", hint: "VAT/GST/Sales Tax percentage" },
                  { key: "tax_name", label: "Tax Name", placeholder: "VAT" },
                  { key: "tax_number", label: "Tax Registration Number", placeholder: "GB123456789" },
                  { key: "tax_country", label: "Country Code", placeholder: "GB", hint: "ISO 2-letter country code for tax applicability" },
                ]} values={settings} onChange={set} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="currency" className="mt-4">
            <Card><CardHeader><CardTitle>Currency Settings</CardTitle><CardDescription>Set the default currency for the platform</CardDescription></CardHeader>
              <CardContent>
                <SettingsSection title="" fields={[
                  { key: "currency_code", label: "Currency Code", placeholder: "USD", hint: "ISO 4217 code, e.g. USD, EUR, GBP" },
                  { key: "currency_symbol", label: "Currency Symbol", placeholder: "$" },
                  { key: "currency_position", label: "Symbol Position", placeholder: "before", hint: "before or after the amount" },
                  { key: "currency_decimals", label: "Decimal Places", placeholder: "2" },
                  { key: "currency_thousands_sep", label: "Thousands Separator", placeholder: "," },
                  { key: "currency_decimal_sep", label: "Decimal Separator", placeholder: "." },
                ]} values={settings} onChange={set} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
