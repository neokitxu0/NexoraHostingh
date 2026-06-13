import { useState } from "react";
import { ClientLayout } from "@/components/layout/client-layout";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Plus, Clock, CheckCircle, XCircle, RefreshCw, Wallet } from "lucide-react";

interface Withdrawal {
  id: number; amount: number; method: string; accountDetails: string | null;
  status: string; adminNotes: string | null; createdAt: string; processedAt: string | null;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { icon: Clock, color: "text-yellow-400", variant: "outline" },
  approved: { icon: CheckCircle, color: "text-green-400", variant: "default" },
  rejected: { icon: XCircle, color: "text-destructive", variant: "destructive" },
  paid: { icon: CheckCircle, color: "text-green-400", variant: "default" },
};

const METHODS = [
  { value: "bank", label: "Bank Transfer" },
  { value: "paypal", label: "PayPal" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "wise", label: "Wise" },
];

export default function AffiliateWithdrawals() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ amount: "", method: "bank", accountDetails: "" });

  const { data: withdrawals = [], isLoading } = useQuery<Withdrawal[]>({
    queryKey: ["affiliate-withdrawals"],
    queryFn: () => apiFetch("/affiliate/withdrawals"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/affiliate/withdrawals", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-withdrawals"] });
      setShowNew(false);
      setForm({ amount: "", method: "bank", accountDetails: "" });
      toast({ title: "Withdrawal requested", description: "Your request is pending admin review" });
    },
    onError: (e: any) => toast({ title: "Request failed", description: e.message, variant: "destructive" }),
  });

  const total = withdrawals.reduce((s, w) => s + (w.status === "paid" ? w.amount : 0), 0);
  const pending = withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + w.amount, 0);

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Withdrawal Requests</h1>
            <p className="text-muted-foreground text-sm">Request payouts of your affiliate earnings</p>
          </div>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Withdrawal
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid Out</p>
                  <p className="text-xl font-bold">${total.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">${pending.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-card animate-pulse" />)
          ) : withdrawals.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No withdrawal requests yet</p>
              <p className="text-xs text-muted-foreground mt-1">Minimum withdrawal is $10</p>
            </CardContent></Card>
          ) : (
            withdrawals.map(w => {
              const cfg = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <Card key={w.id} className="border-border">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-muted shrink-0`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">${w.amount.toFixed(2)}</p>
                        <Badge variant={cfg.variant} className="text-xs capitalize">{w.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        {w.method.replace(/_/g, " ")} · Requested {new Date(w.createdAt).toLocaleDateString()}
                        {w.processedAt && ` · Processed ${new Date(w.processedAt).toLocaleDateString()}`}
                      </p>
                      {w.adminNotes && <p className="text-xs text-muted-foreground mt-1">Note: {w.adminNotes}</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {showNew && (
        <Dialog open onOpenChange={setShowNew}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Withdrawal Request</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Amount (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number" min="10" step="0.01"
                    className="pl-9"
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="10.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Minimum withdrawal: $10.00</p>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}>
                  {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Account Details</Label>
                <Textarea
                  value={form.accountDetails}
                  onChange={e => setForm(p => ({ ...p, accountDetails: e.target.value }))}
                  placeholder={form.method === "bank" ? "Bank name, account number, routing number, account holder name" : form.method === "paypal" ? "PayPal email address" : form.method === "crypto" ? "Wallet address and network (e.g. USDT TRC20: T...)" : "Account details"}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button
                  className="flex-1"
                  disabled={createMutation.isPending || !form.amount || Number(form.amount) < 10}
                  onClick={() => createMutation.mutate({ amount: Number(form.amount), method: form.method, accountDetails: form.accountDetails })}
                >
                  {createMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </ClientLayout>
  );
}
