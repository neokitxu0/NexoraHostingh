import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Users, Server, Ticket, FileText, TrendingUp, DollarSign, BarChart3, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data: dash, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiFetch<any>("/admin/dashboard"),
  });

  const stats = [
    { label: "Total Revenue", value: dash ? `$${dash.totalRevenue?.toFixed(2)}` : "–", icon: DollarSign, color: "text-green-400", bg: "bg-green-400/10", sub: `$${(dash?.monthlyRevenue ?? 0).toFixed(2)} this month` },
    { label: "Total Customers", value: dash?.totalCustomers ?? "–", icon: Users, color: "text-primary", bg: "bg-primary/10", sub: `${dash?.newCustomersThisMonth ?? 0} new this month` },
    { label: "Active Services", value: dash?.activeServices ?? "–", icon: Server, color: "text-accent", bg: "bg-accent/10", sub: `${(dash?.revenueGrowth ?? 0).toFixed(1)}% growth` },
    { label: "Open Tickets", value: dash?.openTickets ?? "–", icon: Ticket, color: "text-yellow-400", bg: "bg-yellow-400/10", sub: `${dash?.unpaidInvoices ?? 0} unpaid invoices` },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform overview and key metrics</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <Card key={s.label} className="border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                </div>
                {isLoading ? <Skeleton className="h-7 w-16 mb-1" /> : <p className="text-2xl font-bold">{s.value}</p>}
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                {!isLoading && <p className="text-xs text-muted-foreground/60 mt-0.5">{s.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card className="border-card-border">
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="space-y-3">
                  {dash?.topProducts?.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground w-5 text-right">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.count} orders</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-green-400">${p.revenue?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-card-border">
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Activity className="h-4 w-4 text-accent" />
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="space-y-3">
                  {dash?.recentActivity?.map((a: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm">{a.description}</p>
                        <p className="text-xs text-muted-foreground">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
