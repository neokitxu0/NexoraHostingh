import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Loader2, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => apiFetch<any>(`/tickets/${id}`),
  });

  const replyMutation = useMutation({
    mutationFn: () => apiFetch(`/tickets/${id}/reply`, { method: "POST", body: JSON.stringify({ message: reply }) }),
    onSuccess: () => {
      setReply("");
      toast({ title: "Reply sent!" });
      qc.invalidateQueries({ queryKey: ["ticket", id] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeMutation = useMutation({
    mutationFn: () => apiFetch(`/tickets/${id}/close`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Ticket closed" });
      qc.invalidateQueries({ queryKey: ["ticket", id] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <ClientLayout><Skeleton className="h-96" /></ClientLayout>;
  if (!ticket) return <ClientLayout><div className="text-center py-20 text-muted-foreground">Ticket not found.</div></ClientLayout>;

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tickets"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Tickets</Button></Link>
            <div>
              <h1 className="text-xl font-bold">{ticket.subject}</h1>
              <p className="text-sm text-muted-foreground">#{ticket.id} · {ticket.category} · {ticket.priority}</p>
            </div>
          </div>
          {ticket.status !== "closed" && (
            <Button variant="outline" size="sm" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending} data-testid="button-close-ticket">
              <Lock className="h-4 w-4 mr-1" /> Close Ticket
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {ticket.replies?.map((r: any) => {
            const isStaff = r.senderType === "staff" || r.senderType === "admin";
            return (
              <div key={r.id} className={`flex gap-3 ${isStaff ? "" : "flex-row-reverse"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isStaff ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"}`}>
                  {r.senderName?.slice(0, 2).toUpperCase()}
                </div>
                <div className={`flex-1 max-w-[85%]`}>
                  <div className={`p-4 rounded-2xl ${isStaff ? "bg-muted/50 rounded-tl-sm" : "bg-primary/10 border border-primary/20 rounded-tr-sm"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">{r.senderName}</span>
                      <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{r.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {ticket.status !== "closed" && (
          <Card className="border-card-border">
            <CardContent className="p-4 space-y-3">
              <textarea
                className="w-full h-28 px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Type your reply..."
                value={reply}
                onChange={e => setReply(e.target.value)}
                data-testid="textarea-reply"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => replyMutation.mutate()}
                  disabled={replyMutation.isPending || !reply.trim()}
                  data-testid="button-send-reply"
                >
                  {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Reply
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
