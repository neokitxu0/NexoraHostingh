import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Server, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <section className="pt-24 pb-32 lg:pt-36 lg:pb-40 px-4 relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
          <div className="container mx-auto text-center max-w-4xl relative z-10">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
              Hosting engineered for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">performance.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Deploy your infrastructure on our global network. Lightning-fast servers, 
              enterprise-grade security, and 24/7 expert support.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/pricing">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg hover-elevate">
                  View Plans <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Why choose NexoraHosting?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We've built our platform from the ground up to provide the best possible experience for our customers.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card p-8 rounded-2xl border border-card-border shadow-sm hover-elevate transition-all">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Lightning Fast</h3>
                <p className="text-muted-foreground">
                  Our servers use the latest NVMe SSDs and top-tier processors to ensure your applications run at peak performance.
                </p>
              </div>
              <div className="bg-card p-8 rounded-2xl border border-card-border shadow-sm hover-elevate transition-all">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Secure by Design</h3>
                <p className="text-muted-foreground">
                  Enterprise-grade DDoS protection, automated backups, and advanced firewalls keep your data safe and secure.
                </p>
              </div>
              <div className="bg-card p-8 rounded-2xl border border-card-border shadow-sm hover-elevate transition-all">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                  <Server className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">99.99% Uptime</h3>
                <p className="text-muted-foreground">
                  Our globally distributed network infrastructure ensures your services stay online, backed by our SLA guarantee.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
