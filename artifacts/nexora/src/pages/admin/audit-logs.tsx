import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function AdminAuditLogs() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", page],
    queryFn: () => apiFetch<any>(`/admin/audit-logs?page=${page}`),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">System activity and admin actions</p>
        </div>

        <Card className="border-card-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (data?.data?.length ?? 0) === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No audit logs yet.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  <div className="grid grid-cols-5 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span>Action</span><span>Target</span><span>User</span><span>IP</span><span>Time</span>
                  </div>
                  {data?.data?.map((log: any) => (
                    <div key={log.id} className="grid grid-cols-5 gap-4 px-5 py-3 items-center hover:bg-muted/20 transition-colors" data-testid={`log-row-${log.id}`}>
                      <span className="text-sm font-medium">{log.action}</span>
                      <span className="text-sm text-muted-foreground truncate">{log.target}</span>
                      <span className="text-xs text-muted-foreground">{log.userEmail ?? "System"}</span>
                      <span className="text-xs font-mono text-muted-foreground">{log.ip}</span>
                      <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">Page {page} of {Math.ceil((data?.total ?? 0) / 50)}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil((data?.total ?? 0) / 50)}>Next</Button>
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
