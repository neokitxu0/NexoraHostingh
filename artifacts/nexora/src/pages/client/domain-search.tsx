import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Search, CheckCircle2, XCircle, ShoppingCart, Loader2 } from "lucide-react";
import { useState } from "react";

export default function DomainSearch() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["domain-search", query],
    queryFn: () => apiFetch<any>(`/domains/search?q=${encodeURIComponent(query)}`),
    enabled: !!query,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) setQuery(search.trim());
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Domain Search</h1>
          <p className="text-muted-foreground text-sm mt-1">Find and register your perfect domain name</p>
        </div>

        <Card className="border-card-border bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <Input
                placeholder="yourdomain.com"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 h-12 text-base"
                data-testid="input-domain-search"
              />
              <Button type="submit" size="lg" disabled={isLoading || !search.trim()} data-testid="button-domain-search">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {data && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Results for "{data.domain}"</h2>
            <div className="grid gap-3">
              {data.results?.map((r: any) => (
                <Card key={r.tld} className={`border-card-border transition-all ${r.available ? "hover:border-green-500/40" : "opacity-60"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {r.available
                          ? <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                          : <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                        }
                        <div>
                          <span className="font-semibold text-lg">{data.domain.replace(/\..+$/, "")}{r.tld}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.available ? `Renews at $${r.renewalPrice}/yr` : "Not available"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {r.available && (
                          <>
                            <div className="text-right">
                              <p className="font-bold text-lg">${r.price}<span className="text-sm font-normal text-muted-foreground">/yr</span></p>
                            </div>
                            <Button size="sm" data-testid={`button-add-domain-${r.tld}`}>
                              <ShoppingCart className="h-4 w-4 mr-1" /> Add
                            </Button>
                          </>
                        )}
                        {!r.available && (
                          <span className="text-sm text-muted-foreground">Taken</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!data && !isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            {[".com", ".net", ".org", ".io", ".co", ".dev", ".app", ".cloud"].map(tld => (
              <div key={tld} className="flex items-center justify-center p-4 rounded-xl bg-card border border-card-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-all cursor-pointer font-mono text-sm">
                {tld}
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
