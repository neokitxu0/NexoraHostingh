import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useParams } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Server, FileText, Ticket, Save, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function AdminCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () => apiFetch<any>(`/admin/customers/${id}`),
  });

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", company: "", phone: "", creditBalance: 0 });

  useEffect(() => {
    if (customer) {
      setForm({
        firstName: customer.firstName ?? "",
        lastName: customer.lastName ?? "",
        email: customer.email ?? "",
        company: customer.company ?? "",
        phone: customer.phone ?? "",
        creditBalance: customer.creditBalance ?? 0,
      });
    }
  }, [customer]);

  const saveMutation = useMutation({
    mutationFn: () => apiFetch(`/admin/customers/${id}`, { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => { toast({ title: "Customer updated" }); qc.invalidateQueries({ queryKey: ["admin-customer", id] }); qc.invalidateQueries({ queryKey: ["admin-customers"] }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <AdminLayout><Skeleton className="h-96" /></AdminLayout>;
  if (!customer) return <AdminLayout><div className="text-center py-20 text-muted-foreground">Customer not found.</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Customers</Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{customer.firstName} {customer.lastName}</h1>
            <p className="text-muted-foreground text-sm">{customer.email} · ID #{customer.id}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: "Services", value: customer.services?.length ?? 0, icon: Server },
            { label: "Invoices", value: customer.invoices?.length ?? 0, icon: FileText },
            { label: "Tickets", value: customer.tickets?.length ?? 0, icon: Ticket },
          ].map(s => (
            <Card key={s.label} className="border-card-border">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><s.icon className="h-5 w-5 text-primary" /></div>
                <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-card-border">
            <CardHeader><CardTitle className="text-base">Edit Customer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>First Name</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Last Name</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
              </div>
              <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Company</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div className="space-y-1.5"><Label>Credit Balance ($)</Label><Input type="number" step="0.01" value={form.creditBalance} onChange={e => setForm(f => ({ ...f, creditBalance: Number(e.target.value) }))} /></div>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-customer">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-card-border">
              <CardHeader><CardTitle className="text-base">Recent Services</CardTitle></CardHeader>
              <CardContent>
                {(customer.services?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">No services.</p> :
                  customer.services?.slice(0, 4).map((s: any) => (
                    <div key={s.id} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
                      <span>{s.productName ?? `Service #${s.id}`}</span>
                      <span className={s.status === "active" ? "text-green-400" : "text-muted-foreground"}>{s.status}</span>
                    </div>
                  ))
                }
              </CardContent>
            </Card>
            <Card className="border-card-border">
              <CardHeader><CardTitle className="text-base">Recent Invoices</CardTitle></CardHeader>
              <CardContent>
                {(customer.invoices?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">No invoices.</p> :
                  customer.invoices?.slice(0, 4).map((inv: any) => (
                    <div key={inv.id} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
                      <span>{inv.number}</span>
                      <div className="flex items-center gap-2">
                        <span>${inv.total?.toFixed(2)}</span>
                        <span className={inv.status === "paid" ? "text-green-400" : "text-yellow-400"}>{inv.status}</span>
                      </div>
                    </div>
                  ))
                }
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
