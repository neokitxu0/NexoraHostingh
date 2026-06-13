import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { History, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function TxnType({ type }: { type: string }) {
  const isCredit = ["credit", "refund"].includes(type);
  return (
    <div className={`flex items-center gap-1.5 ${isCredit ? "text-green-400" : "text-muted-foreground"}`}>
      {isCredit ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      <span className="text-xs capitalize">{type}</span>
    </div>
  );
}

export default function BillingTransactions() {
  const { data: txns, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => apiFetch<any[]>("/billing/transactions"),
  });

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">Complete history of your payments and credits</p>
        </div>

        <Card className="border-card-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (txns?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-1">No transactions yet</h3>
                <p className="text-sm text-muted-foreground">Your transaction history will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-4 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Description</span>
                  <span>Type</span>
                  <span>Date</span>
                  <span>Amount</span>
                </div>
                {txns?.map((t: any) => (
                  <div key={t.id} className="grid grid-cols-4 gap-4 px-5 py-4 items-center">
                    <span className="text-sm">{t.description}</span>
                    <TxnType type={t.type} />
                    <span className="text-sm text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</span>
                    <span className={`text-sm font-semibold ${["credit", "refund"].includes(t.type) ? "text-green-400" : ""}`}>
                      {["credit", "refund"].includes(t.type) ? "+" : "-"}${Math.abs(t.amount)?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
