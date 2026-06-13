import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

interface Withdrawal {
  id: number; userId: number; amount: number; method: string;
  accountDetails: string | null; status: string; adminNotes: string | null;
  createdAt: string; processedAt: string | null;
  email: string | null; firstName: string | null; lastName: string | null;
}

export default function AdminAffiliateWithdrawals() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reviewing, setReviewing] = useState<Withdrawal | null>(null);
  const [notes, setNotes] = useState("");

  const { data: withdrawals = [], isLoading } = useQuery<Withdrawal[]>({
    queryKey: ["admin-withdrawals"],
    queryFn: () => apiFetch("/affiliate/withdrawals/admin"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, adminNotes }: any) =>
      apiFetch(`/affiliate/withdrawals/${id}`, { method: "PATCH", body: JSON.stringify({ status, adminNotes }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      setReviewing(null);
      toast({ title: "Withdrawal updated" });
    },
  });

  const pending = withdrawals.filter(w => w.status === "pending");
  const processed = withdrawals.filter(w => w.status !== "pending");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Affiliate Withdrawals</h1>
          <p className="text-muted-foreground text-sm">Review and process affiliate payout requests</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending", value: pending.length, color: "text-yellow-400", icon: Clock },
            { label: "Total Paid", value: `$${withdrawals.filter(w => w.status === "paid").reduce((s, w) => s + w.amount, 0).toFixed(2)}`, color: "text-green-400", icon: CheckCircle },
            { label: "Total Requests", value: withdrawals.length, color: "text-foreground", icon: DollarSign },
          ].map(s => (
            <Card key={s.label} className="border-border">
              <CardContent className="flex items-center gap-3 p-4">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {pending.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-1.5"><Clock className="h-4 w-4" />Pending Review ({pending.length})</h2>
            <div className="space-y-2">
              {pending.map(w => (
                <Card key={w.id} className="border-yellow-500/20 bg-yellow-500/5">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-yellow-400">${w.amount.toFixed(2)}</p>
                        <Badge variant="outline" className="text-xs capitalize border-yellow-500/30 text-yellow-400">{w.method}</Badge>
                        <span className="text-xs text-muted-foreground">{w.firstName} {w.lastName} · {w.email}</span>
                      </div>
                      {w.accountDetails && <p className="text-xs text-muted-foreground mt-1 font-mono truncate">{w.accountDetails}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-400 border-green-400/30 hover:bg-green-400/10" onClick={() => { setReviewing(w); setNotes(""); }}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">History</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  {["User", "Amount", "Method", "Status", "Date"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {isLoading ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>)
                  : processed.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No processed withdrawals</td></tr>
                  : processed.map(w => (
                    <tr key={w.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="text-sm">{w.firstName} {w.lastName}</p>
                        <p className="text-xs text-muted-foreground">{w.email}</p>
                      </td>
                      <td className="px-4 py-3 font-bold">${w.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize text-sm">{w.method}</td>
                      <td className="px-4 py-3">
                        <Badge variant={w.status === "paid" ? "default" : w.status === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">{w.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{w.processedAt ? new Date(w.processedAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {reviewing && (
        <Dialog open onOpenChange={() => setReviewing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Review Withdrawal #{reviewing.id}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">User</span><span>{reviewing.firstName} {reviewing.lastName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold text-yellow-400">${reviewing.amount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="capitalize">{reviewing.method}</span></div>
              </div>
              {reviewing.accountDetails && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Account Details</p>
                  <p className="text-xs font-mono bg-muted/30 rounded p-3">{reviewing.accountDetails}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Admin Notes (optional)</p>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Transaction ID, notes, etc." rows={2} />
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" onClick={() => updateMutation.mutate({ id: reviewing.id, status: "rejected", adminNotes: notes })} disabled={updateMutation.isPending}>
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => updateMutation.mutate({ id: reviewing.id, status: "paid", adminNotes: notes })} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Mark as Paid
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
