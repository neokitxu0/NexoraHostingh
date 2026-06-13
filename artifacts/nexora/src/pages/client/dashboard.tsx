import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Server, FileText, Ticket, Wallet, ArrowRight,
  Clock, CheckCircle2, AlertCircle, TrendingUp, Plus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-500/15 text-green-400 border-green-500/25",
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    suspended: "bg-red-500/15 text-red-400 border-red-500/25",
    cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
    paid: "bg-green-500/15 text-green-400 border-green-500/25",
    unpaid: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    open: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    closed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: dash, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<any>("/user/dashboard"),
  });

  const stats = [
    { label: "Active Services", value: dash?.activeServices ?? 0, icon: Server, color: "text-primary", bg: "bg-primary/10" },
    { label: "Open Tickets", value: dash?.openTickets ?? 0, icon: Ticket, color: "text-accent", bg: "bg-accent/10" },
    { label: "Unpaid Invoices", value: dash?.pendingInvoices ?? 0, icon: FileText, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { label: "Credit Balance", value: `$${(dash?.creditBalance ?? 0).toFixed(2)}`, icon: Wallet, color: "text-green-400", bg: "bg-green-400/10" },
  ];

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Here's what's happening with your account today.</p>
          </div>
          <Link href="/order">
            <Button className="glow-primary" data-testid="button-order-new">
              <Plus className="h-4 w-4 mr-2" />
              Order New Service
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mb-1" />
                ) : (
                  <p className="text-2xl font-bold">{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Invoices + Tickets */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-card-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
              <Link href="/billing/invoices">
                <Button variant="ghost" size="sm" className="text-xs">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)
              ) : (dash?.recentInvoices?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No invoices yet
                </div>
              ) : (
                dash?.recentInvoices?.map((inv: any) => (
                  <Link key={inv.id} href={`/billing/invoices/${inv.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div>
                        <p className="text-sm font-medium">{inv.number}</p>
                        <p className="text-xs text-muted-foreground">Due {inv.dueDate}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">${inv.total?.toFixed(2)}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Recent Tickets</CardTitle>
              <Link href="/tickets">
                <Button variant="ghost" size="sm" className="text-xs">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)
              ) : (dash?.recentTickets?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Ticket className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No support tickets yet
                </div>
              ) : (
                dash?.recentTickets?.map((t: any) => (
                  <Link key={t.id} href={`/tickets/${t.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">{t.subject}</p>
                        <p className="text-xs text-muted-foreground capitalize">{t.category} · {t.priority}</p>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <Card className="border-card-border bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: "/order", label: "New Service", icon: Plus },
                { href: "/tickets/new", label: "Open Ticket", icon: Ticket },
                { href: "/billing/credit", label: "Add Credit", icon: Wallet },
                { href: "/domains/search", label: "Find Domain", icon: Server },
              ].map(action => (
                <Link key={action.href} href={action.href}>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/60 border border-card-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer text-center">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <action.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
