import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const STATUS_TABS = ["all", "unpaid", "paid", "overdue", "cancelled"];

export default function AdminInvoices() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-invoices", status, page],
    queryFn: () => apiFetch<any>(`/admin/invoices?${status !== "all" ? `status=${status}&` : ""}page=${page}`),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">{data?.total ?? 0} total invoices</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all capitalize ${status === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
              data-testid={`tab-${s}`}
            >
              {s}
            </button>
          ))}
        </div>

        <Card className="border-card-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  <div className="grid grid-cols-5 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span>Invoice</span><span>Client</span><span>Amount</span><span>Due</span><span>Status</span>
                  </div>
                  {(data?.data?.length ?? 0) === 0 ? (
                    <div className="text-center py-12 text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No invoices found.</p></div>
                  ) : (
                    data?.data?.map((inv: any) => (
                      <Link key={inv.id} href={`/billing/invoices/${inv.id}`}>
                        <div className="grid grid-cols-5 gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors cursor-pointer" data-testid={`invoice-row-${inv.id}`}>
                          <span className="text-sm font-medium text-primary">{inv.number}</span>
                          <span className="text-sm text-muted-foreground">Client #{inv.userId}</span>
                          <span className="text-sm font-semibold">${inv.total?.toFixed(2)}</span>
                          <span className="text-sm text-muted-foreground">{inv.dueDate}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border w-fit ${inv.status === "paid" ? "bg-green-500/15 text-green-400 border-green-500/25" : inv.status === "unpaid" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"}`}>
                            {inv.status}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">Page {page} of {Math.ceil((data?.total ?? 0) / 20)}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil((data?.total ?? 0) / 20)}>Next</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
