import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Check, Zap, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const CATEGORIES = ["shared", "vps", "dedicated", "game"];

export default function Pricing() {
  const [activeTab, setActiveTab] = useState("shared");

  const { data: products, isLoading } = useQuery({
    queryKey: ["public-plans", activeTab],
    queryFn: () => apiFetch<any[]>(`/public/plans?type=${activeTab}`),
  });

  return (
    <PublicLayout>
      <div className="py-24 px-4">
        <div className="container mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              Simple, transparent <span className="gradient-text">pricing</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Choose the plan that fits your needs. Scale up anytime.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${
                  activeTab === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
                data-testid={`tab-${cat}`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)} Hosting
              </button>
            ))}
          </div>

          {/* Plans Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96" />)}
            </div>
          ) : (products?.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>No plans available in this category yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {products?.map((p: any) => (
                <div
                  key={p.id}
                  className={`relative rounded-2xl border p-7 flex flex-col transition-all hover:-translate-y-1 ${
                    p.featured
                      ? "border-primary/60 bg-gradient-to-b from-primary/10 to-card shadow-xl shadow-primary/10 glow-primary"
                      : "border-card-border bg-card"
                  }`}
                  data-testid={`plan-card-${p.id}`}
                >
                  {p.featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      <Star className="h-3 w-3 fill-current" /> Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold">${p.price}</span>
                    <span className="text-muted-foreground text-sm">/{p.billingCycle}</span>
                    {p.setupFee > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">+${p.setupFee} setup fee</p>
                    )}
                  </div>
                  <div className="space-y-3 mb-8 flex-1">
                    {p.diskSpace && <FeatureRow label={`${p.diskSpace} Storage`} />}
                    {p.bandwidth && <FeatureRow label={`${p.bandwidth} Bandwidth`} />}
                    {p.ram && <FeatureRow label={`${p.ram} RAM`} />}
                    {p.cpu && <FeatureRow label={`${p.cpu} CPU`} />}
                    {p.features?.map((f: string) => <FeatureRow key={f} label={f} />)}
                  </div>
                  <Link href={`/order?product=${p.id}`}>
                    <Button
                      className={`w-full ${p.featured ? "glow-primary" : ""}`}
                      variant={p.featured ? "default" : "outline"}
                      data-testid={`button-order-${p.id}`}
                    >
                      <Zap className="h-4 w-4 mr-2" /> Get Started
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

function FeatureRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <Check className="h-2.5 w-2.5 text-primary" />
      </div>
      <span>{label}</span>
    </div>
  );
}
