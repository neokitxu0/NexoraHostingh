import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

import Home from "@/pages/public/home";
import Pricing from "@/pages/public/pricing";
import Knowledgebase from "@/pages/public/knowledgebase";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/client/dashboard";
import Services from "@/pages/client/services";
import ServiceDetail from "@/pages/client/service-detail";
import BillingInvoices from "@/pages/client/billing-invoices";
import InvoiceDetail from "@/pages/client/billing-invoice-detail";
import BillingTransactions from "@/pages/client/billing-transactions";
import BillingCredit from "@/pages/client/billing-credit";
import Tickets from "@/pages/client/tickets";
import TicketNew from "@/pages/client/ticket-new";
import TicketDetail from "@/pages/client/ticket-detail";
import Domains from "@/pages/client/domains";
import DomainSearch from "@/pages/client/domain-search";
import DomainDNS from "@/pages/client/domain-dns";
import Profile from "@/pages/client/profile";
import Security from "@/pages/client/security";
import Notifications from "@/pages/client/notifications";
import Affiliate from "@/pages/client/affiliate";
import AffiliateWithdrawals from "@/pages/client/affiliate-withdrawals";
import Order from "@/pages/client/order";
import VPSControl from "@/pages/client/vps-control";
import MinecraftControl from "@/pages/client/minecraft-control";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminCustomers from "@/pages/admin/customers";
import AdminCustomerDetail from "@/pages/admin/customer-detail";
import AdminProducts from "@/pages/admin/products";
import AdminTickets from "@/pages/admin/tickets";
import AdminInvoices from "@/pages/admin/invoices";
import AdminServices from "@/pages/admin/services";
import AdminStaff from "@/pages/admin/staff";
import AdminAuditLogs from "@/pages/admin/audit-logs";
import AdminPaymentGateways from "@/pages/admin/payment-gateways";
import AdminCategories from "@/pages/admin/categories";
import AdminSettings from "@/pages/admin/settings";
import AdminPterodactyl from "@/pages/admin/pterodactyl";
import AdminProxmox from "@/pages/admin/proxmox";
import AdminAutomation from "@/pages/admin/automation";
import AdminLoginHistory from "@/pages/admin/login-history";
import AdminAffiliateWithdrawals from "@/pages/admin/affiliate-withdrawals";
import AdminTerms from "@/pages/admin/terms";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function PrivateRoute({ component: Component, adminOnly = false }: { component: any; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  if (adminOnly && user.role !== "admin" && user.role !== "staff") return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/kb" component={Knowledgebase} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Client Area */}
      <Route path="/dashboard">{() => <PrivateRoute component={Dashboard} />}</Route>
      <Route path="/services">{() => <PrivateRoute component={Services} />}</Route>
      <Route path="/services/:id/vps">{() => <PrivateRoute component={VPSControl} />}</Route>
      <Route path="/services/:id/minecraft">{() => <PrivateRoute component={MinecraftControl} />}</Route>
      <Route path="/services/:id">{() => <PrivateRoute component={ServiceDetail} />}</Route>
      <Route path="/billing/invoices">{() => <PrivateRoute component={BillingInvoices} />}</Route>
      <Route path="/billing/invoices/:id">{() => <PrivateRoute component={InvoiceDetail} />}</Route>
      <Route path="/billing/transactions">{() => <PrivateRoute component={BillingTransactions} />}</Route>
      <Route path="/billing/credit">{() => <PrivateRoute component={BillingCredit} />}</Route>
      <Route path="/tickets">{() => <PrivateRoute component={Tickets} />}</Route>
      <Route path="/tickets/new">{() => <PrivateRoute component={TicketNew} />}</Route>
      <Route path="/tickets/:id">{() => <PrivateRoute component={TicketDetail} />}</Route>
      <Route path="/domains">{() => <PrivateRoute component={Domains} />}</Route>
      <Route path="/domains/search">{() => <PrivateRoute component={DomainSearch} />}</Route>
      <Route path="/domains/:id/dns">{() => <PrivateRoute component={DomainDNS} />}</Route>
      <Route path="/profile">{() => <PrivateRoute component={Profile} />}</Route>
      <Route path="/security">{() => <PrivateRoute component={Security} />}</Route>
      <Route path="/notifications">{() => <PrivateRoute component={Notifications} />}</Route>
      <Route path="/affiliate">{() => <PrivateRoute component={Affiliate} />}</Route>
      <Route path="/affiliate/withdrawals">{() => <PrivateRoute component={AffiliateWithdrawals} />}</Route>
      <Route path="/order">{() => <PrivateRoute component={Order} />}</Route>

      {/* Admin */}
      <Route path="/admin">{() => <PrivateRoute component={AdminDashboard} adminOnly />}</Route>
      <Route path="/admin/customers">{() => <PrivateRoute component={AdminCustomers} adminOnly />}</Route>
      <Route path="/admin/customers/:id">{() => <PrivateRoute component={AdminCustomerDetail} adminOnly />}</Route>
      <Route path="/admin/products">{() => <PrivateRoute component={AdminProducts} adminOnly />}</Route>
      <Route path="/admin/tickets">{() => <PrivateRoute component={AdminTickets} adminOnly />}</Route>
      <Route path="/admin/invoices">{() => <PrivateRoute component={AdminInvoices} adminOnly />}</Route>
      <Route path="/admin/services">{() => <PrivateRoute component={AdminServices} adminOnly />}</Route>
      <Route path="/admin/staff">{() => <PrivateRoute component={AdminStaff} adminOnly />}</Route>
      <Route path="/admin/audit-logs">{() => <PrivateRoute component={AdminAuditLogs} adminOnly />}</Route>
      <Route path="/admin/payment-gateways">{() => <PrivateRoute component={AdminPaymentGateways} adminOnly />}</Route>
      <Route path="/admin/categories">{() => <PrivateRoute component={AdminCategories} adminOnly />}</Route>
      <Route path="/admin/settings">{() => <PrivateRoute component={AdminSettings} adminOnly />}</Route>
      <Route path="/admin/pterodactyl">{() => <PrivateRoute component={AdminPterodactyl} adminOnly />}</Route>
      <Route path="/admin/proxmox">{() => <PrivateRoute component={AdminProxmox} adminOnly />}</Route>
      <Route path="/admin/automation">{() => <PrivateRoute component={AdminAutomation} adminOnly />}</Route>
      <Route path="/admin/login-history">{() => <PrivateRoute component={AdminLoginHistory} adminOnly />}</Route>
      <Route path="/admin/affiliate-withdrawals">{() => <PrivateRoute component={AdminAffiliateWithdrawals} adminOnly />}</Route>
      <Route path="/admin/terms">{() => <PrivateRoute component={AdminTerms} adminOnly />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
