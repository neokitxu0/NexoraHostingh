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
import { motion } from "framer-motion";

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
    { label: "Active Services", value: dash?.activeServices ?? 0, icon: Server, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    { label: "Open Tickets", value: dash?.openTickets ?? 0, icon: Ticket, color: "text-accent", bg: "bg-accent/10", border: "border-accent/20" },
    { label: "Unpaid Invoices", value: dash?.pendingInvoices ?? 0, icon: FileText, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
    { label: "Credit Balance", value: `₹${(dash?.creditBalance ?? 0).toFixed(2)}`, icon: Wallet, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
  ];

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
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
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <Card className={`border-card-border hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg ${stat.bg} border ${stat.border} flex items-center justify-center`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stat.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Services */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-card-border h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" /> Services
                  </CardTitle>
                  <Link href="/services">
                    <Button variant="ghost" size="sm" className="text-xs h-7">View all <ArrowRight className="h-3 w-3 ml-1" /></Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />) :
                  (dash?.recentServices?.length ?? 0) === 0 ? (
                    <div className="text-center py-8">
                      <Server className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No services yet</p>
                      <Link href="/order"><Button size="sm" variant="outline" className="mt-2 text-xs">Order now</Button></Link>
                    </div>
                  ) : dash?.recentServices?.map((s: any) => (
                    <Link key={s.id} href={`/services/${s.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group">
                        <div>
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">{s.productName}</p>
                          <p className="text-xs text-muted-foreground">{s.domain ?? s.ipAddress ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={s.status} />
                          <span className="text-xs font-medium">₹{parseFloat(s.price).toFixed(2)}/mo</span>
                        </div>
                      </div>
                    </Link>
                  ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Invoices */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-card-border h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Recent Invoices
                  </CardTitle>
                  <Link href="/billing/invoices">
                    <Button variant="ghost" size="sm" className="text-xs h-7">View all <ArrowRight className="h-3 w-3 ml-1" /></Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />) :
                  (dash?.recentInvoices?.length ?? 0) === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No invoices yet</p>
                    </div>
                  ) : dash?.recentInvoices?.map((inv: any) => (
                    <Link key={inv.id} href={`/billing/invoices/${inv.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group">
                        <div>
                          <p className="text-sm font-medium text-primary group-hover:underline">{inv.number}</p>
                          <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString("en-IN")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={inv.status} />
                          <span className="text-xs font-medium">₹{parseFloat(inv.total).toFixed(2)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Tickets */}
        {(dash?.recentTickets?.length ?? 0) > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="border-card-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-primary" /> Support Tickets
                  </CardTitle>
                  <Link href="/tickets">
                    <Button variant="ghost" size="sm" className="text-xs h-7">View all <ArrowRight className="h-3 w-3 ml-1" /></Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {dash?.recentTickets?.map((t: any) => (
                  <Link key={t.id} href={`/tickets/${t.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group">
                      <div>
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">{t.subject}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("en-IN")}</p>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </ClientLayout>
  );
}
