import { AdminLayout } from "@/components/layout/admin-layout";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, CheckCircle, XCircle, Monitor, Globe } from "lucide-react";

interface LoginRecord {
  id: number; userId: number; ipAddress: string | null; userAgent: string | null;
  country: string | null; success: boolean; failReason: string | null;
  createdAt: string; email: string | null; firstName: string | null; lastName: string | null;
}

export default function AdminLoginHistory() {
  const { data, isLoading } = useQuery<LoginRecord[]>({
    queryKey: ["login-history"],
    queryFn: async () => { const d = await apiFetch("/admin/login-history"); return d.data ?? []; },
    refetchInterval: 30_000,
  });

  const records = data ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Login History</h1>
          <p className="text-muted-foreground text-sm">Track all authentication attempts across the platform</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Logins", value: records.length, color: "text-foreground" },
            { label: "Successful", value: records.filter(r => r.success).length, color: "text-green-400" },
            { label: "Failed Attempts", value: records.filter(r => !r.success).length, color: "text-destructive" },
          ].map(s => (
            <Card key={s.label} className="border-border">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Status", "User", "IP Address", "Browser / OS", "Location", "Time"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
                  ))
                ) : records.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16 text-muted-foreground">No login history yet</td></tr>
                ) : (
                  records.map(r => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {r.success
                          ? <span className="flex items-center gap-1.5 text-green-400 text-xs"><CheckCircle className="h-3.5 w-3.5" />Success</span>
                          : <span className="flex items-center gap-1.5 text-destructive text-xs"><XCircle className="h-3.5 w-3.5" />Failed</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{r.firstName} {r.lastName}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.ipAddress ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Monitor className="h-3.5 w-3.5" />
                          <span className="max-w-[160px] truncate" title={r.userAgent ?? ""}>{r.userAgent?.split("(")[0]?.trim() ?? "—"}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{r.country ?? "Unknown"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
