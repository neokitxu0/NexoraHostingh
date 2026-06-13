import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Globe, Plus, ArrowRight, Calendar, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    active: "bg-green-500/15 text-green-400 border-green-500/25",
    expired: "bg-red-500/15 text-red-400 border-red-500/25",
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    transferred: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[s] ?? "bg-muted text-muted-foreground"}`}>{s}</span>;
}

export default function Domains() {
  const { data: domains, isLoading } = useQuery({
    queryKey: ["domains"],
    queryFn: () => apiFetch<any[]>("/domains"),
  });

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Domains</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your domain registrations</p>
          </div>
          <div className="flex gap-2">
            <Link href="/domains/search">
              <Button variant="outline" data-testid="button-search-domain">
                <Globe className="h-4 w-4 mr-2" /> Find Domain
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : (domains?.length ?? 0) === 0 ? (
          <Card className="border-card-border">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold mb-2">No domains yet</h3>
              <p className="text-sm text-muted-foreground mb-6">Register a domain or transfer an existing one to us.</p>
              <Link href="/domains/search">
                <Button>Search Domains <ArrowRight className="h-4 w-4 ml-2" /></Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {domains?.map((d: any) => (
              <Card key={d.id} className="border-card-border hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <Globe className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{d.name}</h3>
                          <StatusPill s={d.status} />
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Expires: {d.expiryDate}</span>
                          <span className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" />
                            Auto-renew: {d.autoRenew ? "On" : "Off"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/domains/${d.id}`}>
                      <Button variant="outline" size="sm" data-testid={`button-manage-domain-${d.id}`}>
                        Manage <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
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
