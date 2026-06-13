import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Shield, Key, Plus, Trash2, Loader2, Eye, EyeOff, Copy, Check } from "lucide-react";

export default function Security() {
  const { toast } = useToast();
  const [passForm, setPassForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: apiTokens, refetch } = useQuery({
    queryKey: ["api-tokens"],
    queryFn: () => apiFetch<any[]>("/api-tokens"),
  });

  const changePwMutation = useMutation({
    mutationFn: () => apiFetch("/user/change-password", { method: "POST", body: JSON.stringify({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword }) }),
    onSuccess: () => {
      toast({ title: "Password changed successfully!" });
      setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createTokenMutation = useMutation({
    mutationFn: () => apiFetch("/api-tokens", { method: "POST", body: JSON.stringify({ name: tokenName, permissions: ["read", "write"] }) }),
    onSuccess: (data: any) => {
      setCreatedToken(data.token);
      setTokenName("");
      refetch();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTokenMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api-tokens/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Token deleted" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCopy = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Security</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account security settings</p>
        </div>

        {/* Change Password */}
        <Card className="border-card-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Change Password</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <div className="relative">
                <Input type={showCurrent ? "text" : "password"} value={passForm.currentPassword} onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))} className="pr-10" data-testid="input-current-password" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showNew ? "text" : "password"} value={passForm.newPassword} onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))} className="pr-10" data-testid="input-new-password" />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" value={passForm.confirmPassword} onChange={e => setPassForm(f => ({ ...f, confirmPassword: e.target.value }))} data-testid="input-confirm-password" />
            </div>
            <Button
              onClick={() => changePwMutation.mutate()}
              disabled={changePwMutation.isPending || !passForm.currentPassword || passForm.newPassword !== passForm.confirmPassword}
              data-testid="button-change-password"
            >
              {changePwMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* API Tokens */}
        <Card className="border-card-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4 text-accent" /> API Tokens</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {createdToken && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm font-medium text-green-400 mb-2">New token created — copy it now, it won't be shown again!</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-black/20 p-2 rounded font-mono break-all">{createdToken}</code>
                  <Button size="sm" variant="outline" onClick={handleCopy} data-testid="button-copy-token">
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Input placeholder="Token name (e.g. My App)" value={tokenName} onChange={e => setTokenName(e.target.value)} className="flex-1" data-testid="input-token-name" />
              <Button onClick={() => createTokenMutation.mutate()} disabled={createTokenMutation.isPending || !tokenName.trim()} data-testid="button-create-token">
                {createTokenMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            <div className="space-y-2">
              {(apiTokens?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No API tokens created yet.</p>
              ) : (
                apiTokens?.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{t.prefix}••••••••</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteTokenMutation.mutate(t.id)}
                      data-testid={`button-delete-token-${t.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
