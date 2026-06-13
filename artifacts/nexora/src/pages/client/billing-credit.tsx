import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, Plus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const PRESET_AMOUNTS = [10, 25, 50, 100, 250];

export default function BillingCredit() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [amount, setAmount] = useState<number>(25);
  const [payMethod, setPayMethod] = useState("credit_card");

  const { data: credit, isLoading } = useQuery({
    queryKey: ["credit"],
    queryFn: () => apiFetch<{ balance: number; currency: string }>("/billing/credit"),
  });

  const addMutation = useMutation({
    mutationFn: () => apiFetch("/billing/add-credit", { method: "POST", body: JSON.stringify({ amount, paymentMethod: payMethod }) }),
    onSuccess: () => {
      toast({ title: "Credit added!", description: `$${amount.toFixed(2)} has been added to your account.` });
      qc.invalidateQueries({ queryKey: ["credit"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-2xl font-bold">Credit Balance</h1>
          <p className="text-muted-foreground text-sm mt-1">Add funds to your account for faster payments</p>
        </div>

        <Card className="border-card-border bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Wallet className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Available Credit</p>
              {isLoading ? <Skeleton className="h-8 w-32" /> : (
                <p className="text-3xl font-extrabold">${credit?.balance?.toFixed(2)}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">USD · Applies to next invoice automatically</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader><CardTitle className="text-base">Add Credit</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="mb-2 block">Select Amount</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map(a => (
                  <button
                    key={a}
                    onClick={() => setAmount(a)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${amount === a ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                    data-testid={`preset-amount-${a}`}
                  >
                    ${a}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Custom:</span>
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-28"
                  data-testid="input-custom-amount"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {["credit_card", "paypal", "crypto"].map(m => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${payMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                    data-testid={`pay-method-${m}`}
                  >
                    {m === "credit_card" ? "Credit Card" : m === "paypal" ? "PayPal" : "Crypto"}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || amount < 1}
              data-testid="button-add-credit"
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {addMutation.isPending ? "Processing..." : `Add $${amount?.toFixed(2)} Credit`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
