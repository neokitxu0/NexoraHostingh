import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Server, ArrowLeft, Globe, Cpu, HardDrive, Wifi, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

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

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");

  const { data: svc, isLoading } = useQuery({
    queryKey: ["service", id],
    queryFn: () => apiFetch<any>(`/services/${id}`),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => apiFetch(`/services/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason, cancelType: "end-of-billing" }),
    }),
    onSuccess: () => {
      toast({ title: "Cancellation requested", description: "Your service will be cancelled at the end of the billing cycle." });
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return (
    <ClientLayout>
      <Skeleton className="h-96" />
    </ClientLayout>
  );

  if (!svc) return (
    <ClientLayout>
      <div className="text-center py-20">
        <p className="text-muted-foreground">Service not found.</p>
        <Link href="/services"><Button className="mt-4" variant="outline">Back to Services</Button></Link>
      </div>
    </ClientLayout>
  );

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/services">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Services</Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{svc.productName}</h1>
              <StatusPill status={svc.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Service #{svc.id}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: "Domain", value: svc.domain ?? "Not assigned", icon: Globe },
            { label: "IP Address", value: svc.ipAddress ?? "Not assigned", icon: Wifi },
            { label: "Username", value: svc.username ?? "N/A", icon: Cpu },
          ].map(item => (
            <Card key={item.label} className="border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-card-border">
            <CardHeader><CardTitle className="text-base">Billing Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Price", value: `$${svc.price?.toFixed(2)} / ${svc.billingCycle}` },
                { label: "Billing Cycle", value: svc.billingCycle },
                { label: "Next Due Date", value: svc.nextDueDate ?? "N/A" },
                { label: "Registration Date", value: new Date(svc.createdAt).toLocaleDateString() },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-card-border border-destructive/20">
            <CardHeader><CardTitle className="text-base text-destructive">Danger Zone</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Actions here cannot easily be undone. Please proceed with caution.</p>
              {svc.status !== "cancelled" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" data-testid="button-cancel-service">
                      <AlertTriangle className="h-4 w-4 mr-2" /> Request Cancellation
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Service</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel your service at the end of the current billing cycle. All data will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <textarea
                      className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-border bg-input focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Reason for cancellation (optional)"
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Service</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => cancelMutation.mutate(cancelReason)}
                        data-testid="button-confirm-cancel"
                      >
                        Confirm Cancellation
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientLayout>
  );
}
