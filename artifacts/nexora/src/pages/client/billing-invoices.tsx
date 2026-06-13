import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    paid: "bg-green-500/15 text-green-400 border-green-500/25",
    unpaid: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    overdue: "bg-red-500/15 text-red-400 border-red-500/25",
    cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
    refunded: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[s] ?? "bg-muted text-muted-foreground"}`}>{s}</span>;
}

export default function BillingInvoices() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => apiFetch<any[]>("/billing/invoices"),
  });

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">View and pay your billing invoices</p>
        </div>

        <Card className="border-card-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (invoices?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-1">No invoices yet</h3>
                <p className="text-sm text-muted-foreground">Invoices will appear here once you order a service.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-5 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Invoice</span>
                  <span>Date</span>
                  <span>Due Date</span>
                  <span>Amount</span>
                  <span>Status</span>
                </div>
                {invoices?.map((inv: any) => (
                  <Link key={inv.id} href={`/billing/invoices/${inv.id}`}>
                    <div className="grid grid-cols-5 gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer items-center" data-testid={`invoice-row-${inv.id}`}>
                      <span className="text-sm font-medium text-primary">{inv.number}</span>
                      <span className="text-sm text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</span>
                      <span className="text-sm text-muted-foreground">{inv.dueDate}</span>
                      <span className="text-sm font-semibold">${inv.total?.toFixed(2)}</span>
                      <StatusPill s={inv.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
