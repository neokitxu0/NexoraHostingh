import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const EMPTY = { firstName: "", lastName: "", email: "", password: "" };

export default function AdminStaff() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: staff, isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => apiFetch<any[]>("/admin/staff"),
  });

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const createMutation = useMutation({
    mutationFn: () => apiFetch("/admin/staff", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast({ title: "Staff member created" });
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Staff</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage admin and support team members</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-staff"><Plus className="h-4 w-4 mr-2" /> Add Staff</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>First Name</Label><Input value={form.firstName} onChange={set("firstName")} data-testid="input-staff-first-name" /></div>
                  <div className="space-y-1.5"><Label>Last Name</Label><Input value={form.lastName} onChange={set("lastName")} /></div>
                </div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={set("email")} data-testid="input-staff-email" /></div>
                <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={form.password} onChange={set("password")} data-testid="input-staff-password" /></div>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="w-full" data-testid="button-create-staff">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Staff Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-card-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (staff?.length ?? 0) === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No staff members yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-4 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span className="col-span-2">Staff Member</span><span>Role</span><span>Status</span>
                </div>
                {staff?.map((s: any) => (
                  <div key={s.id} className="grid grid-cols-4 gap-4 px-5 py-4 items-center" data-testid={`staff-row-${s.id}`}>
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">{s.firstName?.[0]}{s.lastName?.[0]}</div>
                      <div>
                        <p className="text-sm font-medium">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-orange-500/15 text-orange-400 border-orange-500/25 w-fit">{s.role}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-green-500/15 text-green-400 border-green-500/25 w-fit">active</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
