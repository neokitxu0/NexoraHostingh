import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [payMethod, setPayMethod] = useState("credit_card");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => apiFetch<any>(`/billing/invoices/${id}`),
  });

  const payMutation = useMutation({
    mutationFn: () => apiFetch(`/billing/invoices/${id}/pay`, { method: "POST", body: JSON.stringify({ paymentMethod: payMethod }) }),
    onSuccess: () => {
      toast({ title: "Payment successful!", description: "Invoice marked as paid." });
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast({ title: "Payment failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <ClientLayout><Skeleton className="h-96" /></ClientLayout>;
  if (!invoice) return <ClientLayout><div className="text-center py-20 text-muted-foreground">Invoice not found.</div></ClientLayout>;

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Link href="/billing/invoices">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Invoices</Button>
          </Link>
          <h1 className="text-2xl font-bold">{invoice.number}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${invoice.status === "paid" ? "bg-green-500/15 text-green-400 border-green-500/25" : "bg-yellow-500/15 text-yellow-400 border-yellow-500/25"}`}>
            {invoice.status}
          </span>
        </div>

        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">Invoice Details</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Due: {invoice.dueDate}</p>
              </div>
              {invoice.paidAt && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Paid {new Date(invoice.paidAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items */}
            <div className="space-y-2">
              {invoice.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm">{item.description} × {item.quantity}</span>
                  <span className="text-sm font-medium">${item.amount?.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span><span>${invoice.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax</span><span>${invoice.tax?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-border pt-2 mt-2">
                <span>Total</span><span>${invoice.total?.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {invoice.status === "unpaid" && (
          <Card className="border-card-border">
            <CardHeader><CardTitle className="text-base">Pay Invoice</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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
              <Button
                className="w-full"
                size="lg"
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending}
                data-testid="button-pay-invoice"
              >
                {payMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                {payMutation.isPending ? "Processing..." : `Pay $${invoice.total?.toFixed(2)}`}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
