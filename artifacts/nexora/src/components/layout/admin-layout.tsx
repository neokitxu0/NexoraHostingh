import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Users, Server, Package, Ticket, FileText,
  Shield, Settings, ClipboardList, LogOut, ChevronLeft, Menu, X,
  CreditCard, Tag, Cpu, Zap, History, DollarSign, Bot, ChevronDown, ChevronRight
} from "lucide-react";
import { useState } from "react";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  children?: NavItem[];
};

const adminNav: NavItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/customers", icon: Users, label: "Customers" },
  {
    href: "/admin/products", icon: Package, label: "Products",
    children: [
      { href: "/admin/products", icon: Package, label: "Products" },
      { href: "/admin/categories", icon: Tag, label: "Categories" },
    ],
  },
  { href: "/admin/services", icon: Server, label: "Services" },
  { href: "/admin/tickets", icon: Ticket, label: "Tickets" },
  { href: "/admin/invoices", icon: FileText, label: "Invoices" },
  { href: "/admin/payment-gateways", icon: CreditCard, label: "Gateways" },
  {
    href: "/admin/pterodactyl", icon: Bot, label: "Integrations",
    children: [
      { href: "/admin/pterodactyl", icon: Bot, label: "Pterodactyl" },
      { href: "/admin/proxmox", icon: Cpu, label: "Proxmox" },
    ],
  },
  { href: "/admin/automation", icon: Zap, label: "Automation" },
  { href: "/admin/affiliate-withdrawals", icon: DollarSign, label: "Withdrawals" },
  { href: "/admin/staff", icon: Shield, label: "Staff" },
  { href: "/admin/login-history", icon: History, label: "Login History" },
  { href: "/admin/audit-logs", icon: ClipboardList, label: "Audit Logs" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

function NavGroup({ item, isActive }: { item: NavItem; isActive: (href: string) => boolean }) {
  const hasChildren = item.children && item.children.length > 0;
  const isGroupActive = hasChildren && item.children!.some(c => isActive(c.href));
  const [open, setOpen] = useState(isGroupActive);

  if (!hasChildren) {
    return (
      <Link href={item.href}>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            isActive(item.href)
              ? "bg-primary/15 text-primary border border-primary/20"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }`}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
        </button>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isGroupActive
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        }`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
          {item.children!.map(child => (
            <Link key={child.href} href={child.href}>
              <button
                className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  isActive(child.href)
                    ? "bg-primary/15 text-primary"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <child.icon className="h-3.5 w-3.5 shrink-0" />
                <span>{child.label}</span>
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSettled: () => { logout(); queryClient.clear(); } });
  };

  const isActive = (href: string) => href === "/admin" ? location === href : location.startsWith(href);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-destructive flex items-center justify-center shrink-0">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-sm text-sidebar-foreground">Admin Panel</span>
          <p className="text-xs text-muted-foreground">NexoraHosting</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {adminNav.map((item) => (
          <NavGroup key={item.href} item={item} isActive={isActive} />
        ))}
        <div className="pt-4 border-t border-sidebar-border mt-3">
          <Link href="/dashboard">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all">
              <ChevronLeft className="h-4 w-4" />
              <span>Client Area</span>
            </button>
          </Link>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/50 mb-2">
          <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center text-destructive font-semibold text-xs shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden md:flex flex-col w-56 bg-sidebar border-r border-sidebar-border shrink-0">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 bg-sidebar border-r border-sidebar-border flex flex-col">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur shrink-0">
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-muted-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <div className="px-3 py-1 rounded-full bg-destructive/15 border border-destructive/25 text-xs text-destructive font-medium">
              Admin Mode
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
