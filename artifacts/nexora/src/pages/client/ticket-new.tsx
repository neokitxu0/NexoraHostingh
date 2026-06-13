import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function TicketNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ subject: "", category: "general", priority: "medium", message: "" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const createMutation = useMutation({
    mutationFn: () => apiFetch("/tickets", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: (data: any) => {
      toast({ title: "Ticket created!", description: "Our team will respond within 24 hours." });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      navigate(`/tickets/${data.id}`);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Link href="/tickets">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Tickets</Button>
          </Link>
          <h1 className="text-2xl font-bold">Open New Ticket</h1>
        </div>

        <Card className="border-card-border">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input placeholder="Brief description of your issue" value={form.subject} onChange={set("subject")} required data-testid="input-subject" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.category} onChange={set("category")} data-testid="select-category">
                  {["general", "billing", "technical", "sales", "abuse"].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <select className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.priority} onChange={set("priority")} data-testid="select-priority">
                  {["low", "medium", "high", "urgent"].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <textarea
                className="w-full h-36 px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Describe your issue in detail..."
                value={form.message}
                onChange={set("message") as any}
                required
                data-testid="textarea-message"
              />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.subject || !form.message}
                data-testid="button-submit-ticket"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {createMutation.isPending ? "Submitting..." : "Submit Ticket"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
