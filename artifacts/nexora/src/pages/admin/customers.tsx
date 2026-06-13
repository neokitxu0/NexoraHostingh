import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers", q, page],
    queryFn: () => apiFetch<any>(`/admin/customers?q=${encodeURIComponent(q)}&page=${page}`),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-muted-foreground text-sm mt-1">{data?.total ?? 0} total customers</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { setQ(search); setPage(1); } }}
              className="pl-9"
              data-testid="input-search-customers"
            />
          </div>
          <Button onClick={() => { setQ(search); setPage(1); }} data-testid="button-search">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Card className="border-card-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (data?.data?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No customers found.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  <div className="grid grid-cols-6 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span className="col-span-2">Customer</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Credit</span>
                    <span>Joined</span>
                  </div>
                  {data?.data?.map((u: any) => (
                    <Link key={u.id} href={`/admin/customers/${u.id}`}>
                      <div className="grid grid-cols-6 gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer items-center" data-testid={`customer-row-${u.id}`}>
                        <div className="col-span-2 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border w-fit ${u.role === "admin" ? "bg-red-500/15 text-red-400 border-red-500/25" : u.role === "staff" ? "bg-orange-500/15 text-orange-400 border-orange-500/25" : "bg-blue-500/15 text-blue-400 border-blue-500/25"}`}>{u.role}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border w-fit ${u.status === "active" ? "bg-green-500/15 text-green-400 border-green-500/25" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"}`}>{u.status}</span>
                        <span className="text-sm">${u.creditBalance?.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">Page {page} of {Math.ceil((data?.total ?? 0) / 20)}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil((data?.total ?? 0) / 20)}>Next</Button>
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
