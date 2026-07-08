import { Route, Switch, Redirect, Router as WouterRouter } from "wouter";
import { getTokenPayload } from "@/lib/api";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminKeys from "@/pages/admin/keys";
import AdminCustomers from "@/pages/admin/customers";
import PortalLogin from "@/pages/portal/login";
import PortalKeys from "@/pages/portal/keys";
import PublicHome from "@/pages/public/home";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function GuardAdmin({ children }: { children: React.ReactNode }) {
  const p = getTokenPayload();
  if (!p || p.role !== "admin") return <Redirect to={`${BASE}/admin/login`} />;
  return <>{children}</>;
}
function GuardPortal({ children }: { children: React.ReactNode }) {
  const p = getTokenPayload();
  if (!p) return <Redirect to={`${BASE}/portal/login`} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <WouterRouter base={BASE}>
      <Switch>
        <Route path="/" component={PublicHome} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin"><GuardAdmin><AdminDashboard /></GuardAdmin></Route>
        <Route path="/admin/products"><GuardAdmin><AdminProducts /></GuardAdmin></Route>
        <Route path="/admin/keys"><GuardAdmin><AdminKeys /></GuardAdmin></Route>
        <Route path="/admin/customers"><GuardAdmin><AdminCustomers /></GuardAdmin></Route>
        <Route path="/portal/login" component={PortalLogin} />
        <Route path="/portal"><GuardPortal><PortalKeys /></GuardPortal></Route>
        <Route><Redirect to="/" /></Route>
      </Switch>
    </WouterRouter>
  );
}
