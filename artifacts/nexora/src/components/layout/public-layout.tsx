import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">N</span>
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:inline-block">NexoraHosting</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/status" className="hover:text-foreground transition-colors">Status</Link>
              <Link href="/kb" className="hover:text-foreground transition-colors">Knowledge Base</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link href="/dashboard">
                <Button>Client Area</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors hidden sm:block">
                  Log in
                </Link>
                <Link href="/register">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-muted/40 py-12">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold mb-4">Products</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/pricing?tab=shared" className="hover:text-foreground">Shared Hosting</Link></li>
              <li><Link href="/pricing?tab=vps" className="hover:text-foreground">VPS Hosting</Link></li>
              <li><Link href="/pricing?tab=dedicated" className="hover:text-foreground">Dedicated Servers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
              <li><Link href="/careers" className="hover:text-foreground">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/kb" className="hover:text-foreground">Knowledge Base</Link></li>
              <li><Link href="/status" className="hover:text-foreground">Network Status</Link></li>
              <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} NexoraHosting. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
