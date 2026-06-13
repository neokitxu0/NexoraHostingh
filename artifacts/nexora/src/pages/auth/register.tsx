import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Check } from "lucide-react";

const perks = [
  "Free domain with annual plan",
  "99.99% uptime guarantee",
  "24/7 expert support",
  "One-click app installs",
];

export default function Register() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "", company: "", phone: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast({ title: "Password too short", description: "Must be at least 8 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ token: string; user: any }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      login(data.token, data.user);
      toast({ title: "Account created!", description: "Welcome to NexoraHosting." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="absolute inset-0 hero-grid opacity-30 pointer-events-none" />
      <div className="relative w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center">
        {/* Left - info */}
        <div className="hidden md:block">
          <Link href="/">
            <div className="inline-flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center glow-primary">
                <span className="text-primary-foreground font-bold text-lg">N</span>
              </div>
              <span className="font-bold text-2xl tracking-tight">NexoraHosting</span>
            </div>
          </Link>
          <h1 className="text-4xl font-extrabold mb-4 leading-tight">
            The hosting platform<br />
            <span className="gradient-text">built to scale</span>
          </h1>
          <p className="text-muted-foreground mb-8">Join thousands of developers and businesses who trust NexoraHosting.</p>
          <ul className="space-y-3">
            {perks.map(perk => (
              <li key={perk} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right - form */}
        <div>
          <div className="text-center mb-6 md:hidden">
            <Link href="/">
              <div className="inline-flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">N</span>
                </div>
                <span className="font-bold text-xl">NexoraHosting</span>
              </div>
            </Link>
          </div>
          <div className="glass rounded-2xl p-8 shadow-xl">
            <h2 className="text-xl font-bold mb-6">Create your account</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" placeholder="Alex" value={form.firstName} onChange={set("firstName")} required data-testid="input-first-name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" placeholder="Smith" value={form.lastName} onChange={set("lastName")} required data-testid="input-last-name" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} required data-testid="input-email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Min 8 characters" value={form.password} onChange={set("password")} required data-testid="input-password" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="company" placeholder="Acme Inc." value={form.company} onChange={set("company")} data-testid="input-company" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="phone" placeholder="+1 555 0123" value={form.phone} onChange={set("phone")} data-testid="input-phone" />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading} data-testid="button-register">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                {loading ? "Creating account..." : "Create Free Account"}
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
            <p className="text-center text-xs text-muted-foreground mt-2">
              By registering, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
