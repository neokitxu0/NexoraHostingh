import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Server, CreditCard, FileText, Ticket, Globe,
  BookOpen, Bell, Users, LogOut, Settings, Shield, Key, ChevronLeft,
  ChevronRight, Menu, X, BarChart3, Package, UserCog, ClipboardList,
  History, Wallet
} from "lucide-react";
import { useState } from "react";
import { useListNotifications } from "@workspace/api-client-react";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "Services",
    items: [
      { href: "/services", icon: Server, label: "My Services" },
      { href: "/domains", icon: Globe, label: "Domains" },
      { href: "/domains/search", icon: Globe, label: "Domain Search" },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/billing/invoices", icon: FileText, label: "Invoices" },
      { href: "/billing/transactions", icon: History, label: "Transactions" },
      { href: "/billing/credit", icon: Wallet, label: "Credit Balance" },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/tickets", icon: Ticket, label: "Support Tickets" },
      { href: "/kb", icon: BookOpen, label: "Knowledge Base" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/profile", icon: Settings, label: "Profile Settings" },
      { href: "/security", icon: Shield, label: "Security" },
      { href: "/notifications", icon: Bell, label: "Notifications" },
      { href: "/affiliate", icon: Users, label: "Affiliate Program" },
    ],
  },
];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications } = useListNotifications();
  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;

  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        logout();
        queryClient.clear();
      }
    });
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return location === href;
    return location.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 glow-primary">
          <span className="text-primary-foreground font-bold text-sm">N</span>
        </div>
        {!collapsed && (
          <span className="font-bold text-base tracking-tight text-sidebar-foreground">NexoraHosting</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <Link key={item.href} href={item.href}>
                <button
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive(item.href)
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  } ${collapsed ? "justify-center" : ""}`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                  {item.href === "/notifications" && unreadCount > 0 && !collapsed && (
                    <Badge className="ml-auto h-5 text-xs">{unreadCount}</Badge>
                  )}
                </button>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/50 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all ${collapsed ? "justify-center" : ""}`}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%-1px)] z-10 w-5 h-10 bg-sidebar border border-sidebar-border rounded-r-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          style={{ marginLeft: collapsed ? "4rem" : "15rem" }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur shrink-0">
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-muted-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm">
                <Wallet className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary font-medium">${(user.creditBalance ?? 0).toFixed(2)}</span>
              </div>
            )}
            <Link href="/notifications">
              <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            </Link>
            <Link href="/profile">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all" data-testid="avatar-user">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
