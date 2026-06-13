import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Copy, Check, DollarSign, TrendingUp, Link as LinkIcon, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Affiliate() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["affiliate"],
    queryFn: () => apiFetch<any>("/affiliate"),
  });

  const { data: referrals } = useQuery({
    queryKey: ["referrals"],
    queryFn: () => apiFetch<any[]>("/affiliate/referrals"),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => apiFetch("/affiliate/withdraw", { method: "POST" }),
    onSuccess: () => toast({ title: "Withdrawal requested!", description: "Processing within 5-7 business days." }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    }
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Affiliate Program</h1>
          <p className="text-muted-foreground text-sm mt-1">Earn 10% commission on every referral you bring</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Total Referrals", value: stats?.totalReferrals ?? 0, icon: Users, color: "text-primary", bg: "bg-primary/10" },
            { label: "Total Earnings", value: `$${(stats?.totalEarnings ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-green-400", bg: "bg-green-400/10" },
            { label: "Commission Rate", value: `${stats?.commissionRate ?? 10}%`, icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
          ].map(s => (
            <Card key={s.label} className="border-card-border">
              <CardContent className="p-5">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                {isLoading ? <Skeleton className="h-7 w-16 mb-1" /> : <p className="text-2xl font-bold">{s.value}</p>}
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-card-border bg-gradient-to-r from-primary/5 to-accent/5">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Your Referral Link</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted/50 px-3 py-2.5 rounded-lg font-mono truncate border border-border">
                {isLoading ? "Loading..." : stats?.referralLink}
              </code>
              <Button variant="outline" size="sm" onClick={copyLink} data-testid="button-copy-referral">
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link and earn <strong>10% commission</strong> for every customer who signs up and purchases a plan.
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Card className="border-card-border flex-1 mr-4">
            <CardHeader><CardTitle className="text-base">Referral History</CardTitle></CardHeader>
            <CardContent>
              {(referrals?.length ?? 0) === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No referrals yet. Share your link to get started!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {referrals?.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{r.referredEmail}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-green-400">+${r.earnings?.toFixed(2)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${r.status === "paid" ? "text-green-400 border-green-500/25 bg-green-500/15" : "text-yellow-400 border-yellow-500/25 bg-yellow-500/15"}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {(stats?.totalEarnings ?? 0) > 0 && (
            <Card className="border-card-border w-48">
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground mb-1">Available to Withdraw</p>
                <p className="text-2xl font-bold text-green-400">${stats?.pendingEarnings?.toFixed(2)}</p>
                <Button className="mt-4 w-full" size="sm" onClick={() => withdrawMutation.mutate()} disabled={withdrawMutation.isPending} data-testid="button-withdraw">
                  Withdraw <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
