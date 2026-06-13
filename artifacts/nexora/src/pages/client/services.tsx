import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Server, Plus, ArrowRight, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-500/15 text-green-400 border-green-500/25",
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    suspended: "bg-red-500/15 text-red-400 border-red-500/25",
    cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

export default function Services() {
  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => apiFetch<any[]>("/services"),
  });

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Services</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage all your hosting services</p>
          </div>
          <Link href="/order">
            <Button data-testid="button-order-service">
              <Plus className="h-4 w-4 mr-2" /> Order New Service
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (services?.length ?? 0) === 0 ? (
          <Card className="border-card-border">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Server className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold mb-2">No services yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                You haven't ordered any services yet. Browse our plans to get started.
              </p>
              <Link href="/order">
                <Button>View Plans <ArrowRight className="h-4 w-4 ml-2" /></Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {services?.map((svc: any) => (
              <Card key={svc.id} className="border-card-border hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Server className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{svc.productName}</h3>
                          <StatusPill status={svc.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {svc.domain ?? "No domain"} {svc.ipAddress ? `· ${svc.ipAddress}` : ""}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {svc.nextDueDate ?? "N/A"}
                          </span>
                          <span className="capitalize">{svc.billingCycle}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">${svc.price?.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground capitalize">/{svc.billingCycle}</p>
                      </div>
                      <Link href={`/services/${svc.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-manage-service-${svc.id}`}>
                          Manage <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
