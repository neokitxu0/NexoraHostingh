import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Check, Zap, Loader2, ShoppingCart, Server } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const CATEGORIES = ["shared", "vps", "dedicated", "game"];

export default function Order() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselected = params.get("product");

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("shared");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(preselected ? Number(preselected) : null);
  const [billing, setBilling] = useState("monthly");
  const [domain, setDomain] = useState("");
  const [serverName, setServerName] = useState("");
  const [serverDesc, setServerDesc] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["public-plans", activeTab],
    queryFn: () => apiFetch<any[]>(`/public/plans?type=${activeTab}`),
  });

  const orderMutation = useMutation({
    mutationFn: () => apiFetch("/services/order", {
      method: "POST",
      body: JSON.stringify({ productId: selectedProduct, billingCycle: billing, domain, serverName, serverDesc }),
    }),
    onSuccess: (data: any) => {
      toast({ title: "Order placed!", description: "Check your invoices to complete payment." });
      qc.invalidateQueries({ queryKey: ["services"] });
      navigate(`/billing/invoices/${data.invoiceId}`);
    },
    onError: (e: any) => toast({ title: "Order failed", description: e.message, variant: "destructive" }),
  });

  const selected = products?.find((p: any) => p.id === selectedProduct);
  const needsServerInfo = selected && ["vps", "dedicated", "game"].includes(selected.category);

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Order New Service</h1>
          <p className="text-muted-foreground text-sm mt-1">Choose a plan and get started in minutes</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => { setActiveTab(cat); setSelectedProduct(null); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${activeTab === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />) :
              (products?.length ?? 0) === 0 ? <p className="text-muted-foreground col-span-2 text-center py-12">No plans available.</p> :
              products?.map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p.id)}
                  className={`relative p-5 rounded-xl border cursor-pointer transition-all ${selectedProduct === p.id ? "border-primary bg-primary/10" : "border-card-border bg-card hover:border-primary/40"}`}
                >
                  {selectedProduct === p.id && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  {p.featured && <span className="text-xs text-primary font-semibold">⭐ Popular</span>}
                  <h3 className="font-semibold mt-1">{p.name}</h3>
                  <p className="text-2xl font-bold mt-2">${p.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {p.diskSpace && <li>💾 {p.diskSpace}</li>}
                    {p.bandwidth && <li>🌐 {p.bandwidth}</li>}
                    {p.ram && <li>🔧 {p.ram} RAM</li>}
                    {p.features?.slice(0, 2).map((f: string) => <li key={f}>✓ {f}</li>)}
                  </ul>
                </div>
              ))
            }
          </div>

          <div>
            <Card className="border-card-border sticky top-4">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold">Order Summary</h3>
                {selected ? (
                  <>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="font-medium text-sm">{selected.name}</p>
                      <p className="text-2xl font-bold mt-1">${selected.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                    </div>

                    {needsServerInfo && (
                      <div className="space-y-3 p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          <Server className="h-3.5 w-3.5" />
                          Server Details
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Server Name <span className="text-destructive">*</span></Label>
                          <Input
                            placeholder="e.g. MyMinecraftServer"
                            value={serverName}
                            onChange={e => setServerName(e.target.value)}
                            className="text-sm h-8"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
                          <Textarea
                            placeholder="Brief description of your server..."
                            value={serverDesc}
                            onChange={e => setServerDesc(e.target.value)}
                            className="text-sm resize-none h-16"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="mb-1.5 block text-xs">Billing Cycle</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {["monthly", "annual"].map(b => (
                          <button key={b} onClick={() => setBilling(b)}
                            className={`py-2 rounded-lg border text-xs font-medium transition-all ${billing === b ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                          >
                            {b === "monthly" ? "Monthly" : "Annual (2 months free)"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs">Domain (optional)</Label>
                      <Input placeholder="yoursite.com" value={domain} onChange={e => setDomain(e.target.value)} className="text-sm" />
                    </div>
                    <Button
                      className="w-full glow-primary" size="lg"
                      onClick={() => orderMutation.mutate()}
                      disabled={orderMutation.isPending || (needsServerInfo && !serverName.trim())}
                    >
                      {orderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                      {orderMutation.isPending ? "Placing Order..." : "Place Order"}
                    </Button>
                    {needsServerInfo && !serverName.trim() && (
                      <p className="text-xs text-muted-foreground text-center">Enter a server name to continue</p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    Select a plan to continue
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
