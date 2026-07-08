import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Loader2, CheckCircle2, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { motion } from "framer-motion";

declare global {
  interface Window { Razorpay: any; }
}

const METHODS = [
  { id: "credit", label: "Account Credit", icon: "💳", desc: "Use your account balance" },
  { id: "razorpay", label: "Razorpay / UPI", icon: "🇮🇳", desc: "Cards, UPI, Net Banking" },
];

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [payMethod, setPayMethod] = useState("razorpay");
  const [razorpayLoading, setRazorpayLoading] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => apiFetch<any>(`/billing/invoices/${id}`),
  });

  const payMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/billing/invoices/${id}/pay`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: "Payment successful! 🎉", description: "Invoice marked as paid." });
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast({ title: "Payment failed", description: e.message, variant: "destructive" }),
  });

  const loadRazorpayScript = () =>
    new Promise<void>((resolve, reject) => {
      if (window.Razorpay) { resolve(); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
      document.head.appendChild(script);
    });

  const payWithRazorpay = async () => {
    setRazorpayLoading(true);
    try {
      await loadRazorpayScript();
      const orderData = await apiFetch<any>("/razorpay/create-order", {
        method: "POST",
        body: JSON.stringify({ invoiceId: id }),
      });
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "NexoraHosting",
          description: `Invoice ${orderData.invoiceNumber}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              await apiFetch(`/billing/invoices/${id}/pay`, {
                method: "POST",
                body: JSON.stringify({ paymentMethod: "razorpay", razorpayPaymentId: response.razorpay_payment_id }),
              });
              toast({ title: "Payment successful! 🎉", description: "Invoice marked as paid." });
              qc.invalidateQueries({ queryKey: ["invoice", id] });
              qc.invalidateQueries({ queryKey: ["invoices"] });
              qc.invalidateQueries({ queryKey: ["dashboard"] });
              resolve();
            } catch (e) { reject(e); }
          },
          prefill: { name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(), email: user?.email ?? "" },
          theme: { color: "#6366f1" },
          modal: { ondismiss: () => resolve() },
        });
        rzp.on("payment.failed", (r: any) => reject(new Error(r.error?.description ?? "Payment failed")));
        rzp.open();
      });
    } catch (e: any) {
      if (e.message && e.message !== "Payment failed") {
        toast({ title: "Payment error", description: e.message, variant: "destructive" });
      }
    } finally {
      setRazorpayLoading(false);
    }
  };

  const handlePay = () => {
    if (payMethod === "razorpay") {
      payWithRazorpay();
    } else {
      payMutation.mutate({ paymentMethod: payMethod });
    }
  };

  if (isLoading) return <ClientLayout><div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div></ClientLayout>;
  if (!invoice) return <ClientLayout><div className="text-center py-20 text-muted-foreground">Invoice not found.</div></ClientLayout>;

  return (
    <ClientLayout>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
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
                  Paid {new Date(invoice.paidAt).toLocaleDateString("en-IN")}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {invoice.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm">{item.description} × {item.quantity}</span>
                  <span className="text-sm font-medium">₹{item.amount?.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span><span>₹{invoice.subtotal?.toFixed(2)}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>GST / Tax</span><span>₹{invoice.tax?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-border pt-2 mt-2">
                <span>Total</span><span className="text-primary">₹{invoice.total?.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {invoice.status === "unpaid" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-card-border">
              <CardHeader><CardTitle className="text-base">Pay Invoice</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {METHODS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setPayMethod(m.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${payMethod === m.id ? "border-primary bg-primary/10 shadow-lg shadow-primary/15" : "border-border hover:border-primary/40"}`}
                    >
                      <div className="text-xl mb-1">{m.icon}</div>
                      <div className="text-sm font-semibold">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.desc}</div>
                    </button>
                  ))}
                </div>

                {payMethod === "razorpay" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm space-y-1">
                    <div className="flex items-center gap-2 font-medium text-primary">
                      <Zap className="h-4 w-4" /> Razorpay Secure Checkout
                    </div>
                    <p className="text-muted-foreground text-xs">Supports UPI, Credit/Debit Cards, Net Banking, Wallets. Payments are secured and encrypted.</p>
                  </motion.div>
                )}

                <Button
                  className="w-full glow-primary"
                  size="lg"
                  onClick={handlePay}
                  disabled={payMutation.isPending || razorpayLoading}
                  data-testid="button-pay-invoice"
                >
                  {(payMutation.isPending || razorpayLoading) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  {(payMutation.isPending || razorpayLoading) ? "Processing..." : `Pay ₹${invoice.total?.toFixed(2)}`}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </ClientLayout>
  );
}
