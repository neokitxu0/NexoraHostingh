import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Server } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const STATUS_TABS = ["all", "active", "pending", "suspended", "cancelled"];

export default function AdminServices() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-services", status, page],
    queryFn: () => apiFetch<any>(`/admin/services?${status !== "all" ? `status=${status}&` : ""}page=${page}`),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/services/${id}/suspend`, { method: "POST" }),
    onSuccess: () => { toast({ title: "Service suspended" }); qc.invalidateQueries({ queryKey: ["admin-services"] }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/services/${id}/unsuspend`, { method: "POST" }),
    onSuccess: () => { toast({ title: "Service unsuspended" }); qc.invalidateQueries({ queryKey: ["admin-services"] }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground text-sm mt-1">{data?.total ?? 0} total services</p>
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
              <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  <div className="grid grid-cols-6 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span className="col-span-2">Service</span><span>Client</span><span>Price</span><span>Due</span><span>Actions</span>
                  </div>
                  {(data?.data?.length ?? 0) === 0 ? (
                    <div className="text-center py-12 text-muted-foreground"><Server className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No services found.</p></div>
                  ) : (
                    data?.data?.map((s: any) => (
                      <div key={s.id} className="grid grid-cols-6 gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors" data-testid={`service-row-${s.id}`}>
                        <div className="col-span-2">
                          <p className="text-sm font-medium">{s.productName ?? `Service #${s.id}`}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${s.status === "active" ? "bg-green-500/15 text-green-400 border-green-500/25" : s.status === "suspended" ? "bg-red-500/15 text-red-400 border-red-500/25" : s.status === "pending" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"}`}>
                              {s.status}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">#{s.userId}</span>
                        <span className="text-sm">${s.price?.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">{s.nextDueDate ?? "N/A"}</span>
                        <div className="flex gap-1">
                          {s.status === "active" && (
                            <Button variant="outline" size="sm" className="h-7 text-xs text-orange-400 border-orange-500/25" onClick={() => suspendMutation.mutate(s.id)} data-testid={`button-suspend-${s.id}`}>Suspend</Button>
                          )}
                          {s.status === "suspended" && (
                            <Button variant="outline" size="sm" className="h-7 text-xs text-green-400 border-green-500/25" onClick={() => unsuspendMutation.mutate(s.id)} data-testid={`button-unsuspend-${s.id}`}>Unsuspend</Button>
                          )}
                        </div>
                      </div>
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
