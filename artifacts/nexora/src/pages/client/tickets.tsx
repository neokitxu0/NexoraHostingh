import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Ticket, Plus, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    open: "bg-green-500/15 text-green-400 border-green-500/25",
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    closed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
    resolved: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[s] ?? "bg-muted text-muted-foreground"}`}>{s}</span>;
}

const priorityColor: Record<string, string> = {
  low: "text-zinc-400", medium: "text-yellow-400", high: "text-orange-400", urgent: "text-red-400",
};

export default function Tickets() {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => apiFetch<any[]>("/tickets"),
  });

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Support Tickets</h1>
            <p className="text-muted-foreground text-sm mt-1">Get help from our expert support team</p>
          </div>
          <Link href="/tickets/new">
            <Button data-testid="button-new-ticket">
              <Plus className="h-4 w-4 mr-2" /> New Ticket
            </Button>
          </Link>
        </div>

        <Card className="border-card-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : (tickets?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Ticket className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-1">No tickets yet</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  Need help? Our support team is available 24/7.
                </p>
                <Link href="/tickets/new">
                  <Button>Open a Ticket <ArrowRight className="h-4 w-4 ml-2" /></Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-5 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span className="col-span-2">Subject</span>
                  <span>Category</span>
                  <span>Priority</span>
                  <span>Status</span>
                </div>
                {tickets?.map((t: any) => (
                  <Link key={t.id} href={`/tickets/${t.id}`}>
                    <div className="grid grid-cols-5 gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer items-center" data-testid={`ticket-row-${t.id}`}>
                      <div className="col-span-2">
                        <p className="text-sm font-medium truncate">{t.subject}</p>
                        <p className="text-xs text-muted-foreground">#{t.id} · {new Date(t.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm text-muted-foreground capitalize">{t.category}</span>
                      <span className={`text-xs font-medium capitalize ${priorityColor[t.priority]}`}>{t.priority}</span>
                      <StatusPill s={t.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
