import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Save, Loader2 } from "lucide-react";

export default function Profile() {
  const { user, login, token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    company: (user as any)?.company ?? "",
    phone: (user as any)?.phone ?? "",
    address1: (user as any)?.address1 ?? "",
    address2: (user as any)?.address2 ?? "",
    city: (user as any)?.city ?? "",
    state: (user as any)?.state ?? "",
    postcode: (user as any)?.postcode ?? "",
    country: (user as any)?.country ?? "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const saveMutation = useMutation({
    mutationFn: () => apiFetch("/user/profile", { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: (data: any) => {
      if (token && data) {
        login(token, data);
      }
      toast({ title: "Profile updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your personal information</p>
        </div>

        <Card className="border-card-border">
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={set("firstName")} data-testid="input-first-name" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={set("lastName")} data-testid="input-last-name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input value={user?.email ?? ""} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Contact support to change your email address.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={form.company} onChange={set("company")} placeholder="Optional" data-testid="input-company" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={set("phone")} placeholder="+1 555 0100" data-testid="input-phone" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Address Line 1</Label>
              <Input value={form.address1} onChange={set("address1")} placeholder="123 Main St" data-testid="input-address1" />
            </div>
            <div className="space-y-1.5">
              <Label>Address Line 2</Label>
              <Input value={form.address2} onChange={set("address2")} placeholder="Apt 4B" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={set("city")} placeholder="New York" />
              </div>
              <div className="space-y-1.5">
                <Label>State/Region</Label>
                <Input value={form.state} onChange={set("state")} placeholder="NY" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Postcode</Label>
                <Input value={form.postcode} onChange={set("postcode")} placeholder="10001" />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={form.country} onChange={set("country")} placeholder="US" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-profile">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </ClientLayout>
  );
}
