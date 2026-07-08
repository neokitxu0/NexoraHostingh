import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Check, Zap, Loader2, ShoppingCart, Server, ChevronRight, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  { id: "shared", label: "Shared Hosting", icon: "🌐" },
  { id: "vps", label: "VPS Servers", icon: "🖥️" },
  { id: "dedicated", label: "Dedicated", icon: "🏗️" },
  { id: "game", label: "Game Hosting", icon: "🎮" },
];

const GAMES = [
  { id: "minecraft", label: "Minecraft", emoji: "⛏️", bg: "from-green-500/20 border-green-500/30 hover:border-green-400" },
  { id: "terraria", label: "Terraria", emoji: "🌲", bg: "from-emerald-500/20 border-emerald-500/30 hover:border-emerald-400" },
  { id: "rust", label: "Rust", emoji: "🔥", bg: "from-orange-500/20 border-orange-500/30 hover:border-orange-400" },
  { id: "ark", label: "ARK: Survival", emoji: "🦕", bg: "from-amber-500/20 border-amber-500/30 hover:border-amber-400" },
  { id: "valheim", label: "Valheim", emoji: "⚔️", bg: "from-blue-500/20 border-blue-500/30 hover:border-blue-400" },
  { id: "fivem", label: "FiveM", emoji: "🚗", bg: "from-purple-500/20 border-purple-500/30 hover:border-purple-400" },
  { id: "cs2", label: "CS2", emoji: "🎯", bg: "from-yellow-500/20 border-yellow-500/30 hover:border-yellow-400" },
  { id: "other", label: "Other Games", emoji: "🎮", bg: "from-muted/20 border-border hover:border-primary/40" },
];

const HARDWARE = [
  {
    id: "amd-epyc", label: "AMD EPYC", badge: "Enterprise", emoji: "🔴",
    desc: "Up to 128 cores, DDR5 ECC RAM, NVMe. Ideal for large modpacks & 100+ players.",
    specs: ["DDR5 ECC RAM", "NVMe SSD", "10 Gbps Network"],
  },
  {
    id: "ryzen", label: "AMD Ryzen", badge: "Gaming", emoji: "🟠",
    desc: "High clock speeds, perfect for vanilla & lightly modded game servers.",
    specs: ["High Clock Speed", "DDR4 RAM", "1 Gbps Network"],
  },
];

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.25 } };

export default function Order() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselected = params.get("product");

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeCategory, setActiveCategory] = useState("shared");
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedHardware, setSelectedHardware] = useState<string | null>(null);
  const [gameStep, setGameStep] = useState<"game" | "hardware" | "plans">("game");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(preselected ? Number(preselected) : null);
  const [billing, setBilling] = useState("monthly");
  const [domain, setDomain] = useState("");
  const [serverName, setServerName] = useState("");
  const [serverDesc, setServerDesc] = useState("");

  const isGame = activeCategory === "game";
  const showPlans = !isGame || gameStep === "plans";

  const queryParams: Record<string, string> = { type: activeCategory };
  if (isGame && selectedGame && selectedGame !== "other") queryParams.subcategory = selectedGame;
  if (isGame && selectedHardware) queryParams.hardware = selectedHardware;

  const { data: products, isLoading } = useQuery({
    queryKey: ["public-plans", activeCategory, selectedGame, selectedHardware],
    queryFn: () => {
      const qs = new URLSearchParams(queryParams).toString();
      return apiFetch<any[]>(`/public/plans?${qs}`);
    },
    enabled: showPlans,
  });

  const orderMutation = useMutation({
    mutationFn: () => apiFetch("/services/order", {
      method: "POST",
      body: JSON.stringify({ productId: selectedProduct, billingCycle: billing, domain, serverName, serverDesc }),
    }),
    onSuccess: (data: any) => {
      toast({ title: "Order placed! 🎉", description: "Check your invoices to complete payment." });
      qc.invalidateQueries({ queryKey: ["services"] });
      navigate(`/billing/invoices/${data.invoiceId}`);
    },
    onError: (e: any) => toast({ title: "Order failed", description: e.message, variant: "destructive" }),
  });

  const selected = products?.find((p: any) => p.id === selectedProduct);
  const needsServerInfo = selected && ["vps", "dedicated", "game"].includes(selected.category);
  const canOrder = selectedProduct && (!needsServerInfo || serverName.trim());

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setSelectedProduct(null);
    setSelectedGame(null);
    setSelectedHardware(null);
    setGameStep("game");
  };

  const handleGameSelect = (gameId: string) => {
    setSelectedGame(gameId);
    setGameStep("hardware");
    setSelectedProduct(null);
  };

  const handleHardwareSelect = (hwId: string) => {
    setSelectedHardware(hwId);
    setGameStep("plans");
    setSelectedProduct(null);
  };

  const price = selected ? (billing === "monthly" ? selected.price : billing === "quarterly" ? (selected.quarterlyPrice ?? selected.price * 3) : (selected.yearlyPrice ?? selected.price * 12)) : 0;

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Order New Service</h1>
          <p className="text-muted-foreground text-sm mt-1">Choose a plan and get started in minutes</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => handleCategoryChange(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${activeCategory === cat.id ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Game Picker */}
          {isGame && gameStep === "game" && (
            <motion.div key="game-picker" {...fade} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">Select Your Game</h2>
                <p className="text-sm text-muted-foreground">We'll show you the best server plans for your game</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {GAMES.map(game => (
                  <button key={game.id} onClick={() => handleGameSelect(game.id)}
                    className={`relative p-4 rounded-xl border bg-gradient-to-br ${game.bg} text-center transition-all hover:scale-105 hover:shadow-lg`}
                  >
                    <div className="text-3xl mb-2">{game.emoji}</div>
                    <div className="text-sm font-semibold">{game.label}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Hardware Picker */}
          {isGame && gameStep === "hardware" && (
            <motion.div key="hardware-picker" {...fade} className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setGameStep("game")} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-lg font-semibold">Choose Your Hardware</h2>
                  <p className="text-sm text-muted-foreground">
                    {GAMES.find(g => g.id === selectedGame)?.emoji} {GAMES.find(g => g.id === selectedGame)?.label} servers
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {HARDWARE.map(hw => (
                  <button key={hw.id} onClick={() => handleHardwareSelect(hw.id)}
                    className="relative p-6 rounded-xl border border-border bg-card hover:border-primary/60 text-left transition-all group hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.02]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-2xl mb-1">{hw.emoji}</div>
                        <div className="font-bold text-base">{hw.label}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">{hw.badge}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{hw.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {hw.specs.map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 bg-muted rounded-md">{s}</span>
                      ))}
                    </div>
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-5 w-5 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Plans */}
          {showPlans && (
            <motion.div key="plans" {...fade} className="space-y-4">
              {isGame && (
                <div className="flex items-center gap-3">
                  <button onClick={() => setGameStep("hardware")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{GAMES.find(g => g.id === selectedGame)?.emoji} {GAMES.find(g => g.id === selectedGame)?.label}</span>
                    <ChevronRight className="h-4 w-4" />
                    <span>{HARDWARE.find(h => h.id === selectedHardware)?.emoji} {HARDWARE.find(h => h.id === selectedHardware)?.label}</span>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-foreground font-medium">Plans</span>
                  </div>
                </div>
              )}

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {isLoading ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
                    </div>
                  ) : (products?.length ?? 0) === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="font-medium">No plans found</p>
                      <p className="text-sm mt-1">Try a different game or hardware selection</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {products?.map((p: any, idx: number) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.06 }}
                          onClick={() => setSelectedProduct(p.id)}
                          className={`relative p-5 rounded-xl border cursor-pointer transition-all ${selectedProduct === p.id ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" : "border-card-border bg-card hover:border-primary/40 hover:shadow-md"}`}
                        >
                          {p.featured && (
                            <div className="absolute -top-2.5 left-4">
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">Most Popular</span>
                            </div>
                          )}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-bold text-base">{p.name}</h3>
                              {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                            </div>
                            {selectedProduct === p.id && <Check className="h-5 w-5 text-primary shrink-0" />}
                          </div>
                          <div className="mb-4">
                            <span className="text-2xl font-bold">₹{p.price.toFixed(2)}</span>
                            <span className="text-muted-foreground text-sm">/mo</span>
                          </div>
                          <div className="space-y-1.5 text-xs text-muted-foreground">
                            {p.ram && <div className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> {p.ram} RAM</div>}
                            {p.cpu && <div className="flex items-center gap-1.5"><Server className="h-3 w-3" /> {p.cpu}</div>}
                            {p.diskSpace && <div className="flex items-center gap-1.5">💾 {p.diskSpace}</div>}
                          </div>
                          {p.features?.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border space-y-1">
                              {p.features.slice(0, 4).map((f: string) => (
                                <div key={f} className="flex items-center gap-1.5 text-xs">
                                  <Check className="h-3 w-3 text-primary shrink-0" />
                                  <span>{f}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order Sidebar */}
                <AnimatePresence>
                  {selected && (
                    <motion.div key="sidebar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                      <Card className="border-card-border">
                        <CardContent className="p-5 space-y-4">
                          <div>
                            <h3 className="font-bold text-sm mb-3">Billing Cycle</h3>
                            <div className="space-y-2">
                              {[
                                { id: "monthly", label: "Monthly", price: selected.price },
                                ...(selected.quarterlyPrice ? [{ id: "quarterly", label: "Quarterly", price: selected.quarterlyPrice / 3, badge: "Save 10%" }] : []),
                                ...(selected.yearlyPrice ? [{ id: "yearly", label: "Annual", price: selected.yearlyPrice / 12, badge: "Save 20%" }] : []),
                              ].map(opt => (
                                <button key={opt.id} onClick={() => setBilling(opt.id)}
                                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${billing === opt.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                                >
                                  <span className="font-medium">{opt.label}</span>
                                  <div className="flex items-center gap-2">
                                    {(opt as any).badge && <span className="text-xs bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded">{(opt as any).badge}</span>}
                                    <span className="font-bold">₹{Number(opt.price).toFixed(2)}/mo</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {!isGame && (
                            <div className="space-y-1.5">
                              <Label className="text-sm">Domain</Label>
                              <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="yourdomain.com" />
                            </div>
                          )}

                          {needsServerInfo && (
                            <div className="space-y-3">
                              <h3 className="font-bold text-sm">Server Details</h3>
                              <div className="space-y-1.5">
                                <Label className="text-sm">Server Name <span className="text-destructive">*</span></Label>
                                <Input value={serverName} onChange={e => setServerName(e.target.value)} placeholder="my-awesome-server" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm">Description</Label>
                                <Textarea value={serverDesc} onChange={e => setServerDesc(e.target.value)} placeholder="Optional description..." rows={2} />
                              </div>
                            </div>
                          )}

                          <div className="border-t border-border pt-3 space-y-1">
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>{selected.name}</span>
                              <span>₹{Number(price).toFixed(2)}/mo</span>
                            </div>
                            {selected.setupFee > 0 && (
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Setup Fee</span>
                                <span>₹{selected.setupFee.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-base pt-1 border-t border-border mt-2">
                              <span>Total Due</span>
                              <span className="text-primary">₹{(Number(price) + (selected.setupFee ?? 0)).toFixed(2)}</span>
                            </div>
                          </div>

                          <Button
                            className="w-full glow-primary"
                            size="lg"
                            onClick={() => orderMutation.mutate()}
                            disabled={orderMutation.isPending || !canOrder}
                          >
                            {orderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                            {orderMutation.isPending ? "Placing order..." : "Place Order"}
                          </Button>
                          {needsServerInfo && !serverName.trim() && (
                            <p className="text-xs text-muted-foreground text-center">Enter a server name to continue</p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ClientLayout>
  );
}
