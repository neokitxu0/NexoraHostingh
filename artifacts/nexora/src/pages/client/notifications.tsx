import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Notifications() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<any[]>("/notifications"),
  });

  const readAllMutation = useMutation({
    mutationFn: () => apiFetch("/notifications/read-all", { method: "POST" }),
    onSuccess: () => { toast({ title: "All notifications marked as read" }); qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  const readOneMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-1">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => readAllMutation.mutate()} disabled={readAllMutation.isPending} data-testid="button-mark-all-read">
              {readAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCheck className="h-4 w-4 mr-1" />}
              Mark all read
            </Button>
          )}
        </div>

        <Card className="border-card-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : (notifications?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-1">All caught up!</h3>
                <p className="text-sm text-muted-foreground">No notifications to show.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications?.map((n: any) => (
                  <div
                    key={n.id}
                    className={`flex gap-4 px-5 py-4 transition-colors cursor-pointer hover:bg-muted/20 ${!n.read ? "bg-primary/5" : ""}`}
                    onClick={() => !n.read && readOneMutation.mutate(n.id)}
                    data-testid={`notification-${n.id}`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                        <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
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
