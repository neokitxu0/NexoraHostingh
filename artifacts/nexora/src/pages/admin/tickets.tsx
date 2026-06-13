import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Ticket, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const STATUS_TABS = ["all", "open", "pending", "closed"];
const PRIORITY_COLOR: Record<string, string> = {
  low: "text-zinc-400", medium: "text-yellow-400", high: "text-orange-400", urgent: "text-red-400",
};

export default function AdminTickets() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", status, page],
    queryFn: () => apiFetch<any>(`/admin/tickets?${status !== "all" ? `status=${status}&` : ""}page=${page}`),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground text-sm mt-1">{data?.total ?? 0} total tickets</p>
        </div>

        <div className="flex gap-2">
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
              <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  <div className="grid grid-cols-6 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span className="col-span-2">Subject</span><span>Category</span><span>Priority</span><span>Status</span><span>Updated</span>
                  </div>
                  {(data?.data?.length ?? 0) === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Ticket className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No tickets found.</p>
                    </div>
                  ) : (
                    data?.data?.map((t: any) => (
                      <Link key={t.id} href={`/tickets/${t.id}`}>
                        <div className="grid grid-cols-6 gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors cursor-pointer" data-testid={`ticket-row-${t.id}`}>
                          <div className="col-span-2">
                            <p className="text-sm font-medium truncate">{t.subject}</p>
                            <p className="text-xs text-muted-foreground">#{t.id} · Client #{t.userId}</p>
                          </div>
                          <span className="text-sm capitalize text-muted-foreground">{t.category}</span>
                          <span className={`text-xs font-medium capitalize ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border w-fit ${t.status === "open" ? "bg-green-500/15 text-green-400 border-green-500/25" : t.status === "pending" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"}`}>
                            {t.status}
                          </span>
                          <span className="text-xs text-muted-foreground">{new Date(t.updatedAt).toLocaleDateString()}</span>
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
