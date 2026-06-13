import { useState } from "react";
import { useParams, Link } from "wouter";
import { ClientLayout } from "@/components/layout/client-layout";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, RotateCcw, Power, Terminal, RefreshCw, ChevronLeft, Cpu, HardDrive, Activity, Wifi, AlertTriangle } from "lucide-react";

interface ServiceDetail {
  id: number; domain: string | null; status: string; ipAddress: string | null;
  username: string | null; password: string | null; provisionData: Record<string, any>;
  liveStatus: { status: string; cpu: number; mem: number; disk: number; uptime: number } | null;
}

const POWER_ACTIONS = [
  { action: "start", icon: Play, label: "Start", variant: "default" as const, color: "text-green-400" },
  { action: "stop", icon: Square, label: "Stop", variant: "destructive" as const, color: "text-destructive" },
  { action: "reboot", icon: RotateCcw, label: "Reboot", variant: "outline" as const, color: "text-yellow-400" },
  { action: "shutdown", icon: Power, label: "Shutdown", variant: "outline" as const, color: "text-muted-foreground" },
  { action: "reset", icon: RefreshCw, label: "Hard Reset", variant: "outline" as const, color: "text-orange-400" },
];

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function VPSControl() {
  const { id } = useParams();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reinstalling, setReinstalling] = useState(false);

  const { data: service, isLoading, refetch } = useQuery<ServiceDetail>({
    queryKey: ["vps-detail", id],
    queryFn: async () => {
      const d = await apiFetch(`/client/servers/${id}`);
      return { ...d, provisionData: typeof d.provisionData === "string" ? JSON.parse(d.provisionData) : (d.provisionData ?? {}) };
    },
    refetchInterval: 15_000,
  });

  const powerAction = async (action: string) => {
    setActionLoading(action);
    try {
      await apiFetch(`/client/servers/${id}/power`, { method: "POST", body: JSON.stringify({ action }) });
      toast({ title: `Power action: ${action}`, description: "Command sent to server" });
      setTimeout(() => { qc.invalidateQueries({ queryKey: ["vps-detail", id] }); }, 3000);
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally { setActionLoading(null); }
  };

  const reinstall = async () => {
    setReinstalling(true);
    try {
      await apiFetch(`/client/servers/${id}/reinstall`, { method: "POST" });
      toast({ title: "Reinstall queued", description: "Your VPS will be reinstalled within 5 minutes" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setReinstalling(false); }
  };

  const live = service?.liveStatus;
  const prov = service?.provisionData ?? {};
  const isProxmox = prov.module === "proxmox";
  const isRunning = live?.status === "running" || service?.status === "active";

  if (isLoading) return (
    <ClientLayout>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </ClientLayout>
  );

  if (!service) return (
    <ClientLayout>
      <div className="text-center py-16">
        <p className="text-muted-foreground">Service not found</p>
        <Link href="/services"><Button variant="outline" className="mt-4">Back to Services</Button></Link>
      </div>
    </ClientLayout>
  );

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/services/${id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">VPS Control Panel</h1>
            <p className="text-sm text-muted-foreground">{service.domain ?? `Service #${id}`} · {service.ipAddress ?? "IP Pending"}</p>
          </div>
          <Badge className="ml-auto" variant={isRunning ? "default" : "secondary"}>
            <span className={`w-2 h-2 rounded-full mr-1.5 ${isRunning ? "bg-green-400" : "bg-muted-foreground"}`} />
            {live?.status ?? service.status}
          </Badge>
        </div>

        {!isProxmox && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 flex items-center gap-2 text-yellow-400 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            VPS power controls require Proxmox integration. Contact support to configure.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground"><Cpu className="h-3.5 w-3.5" /><span className="text-xs">CPU</span></div>
              <p className="text-xl font-bold">{live ? `${(live.cpu * 100).toFixed(1)}%` : "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground"><Activity className="h-3.5 w-3.5" /><span className="text-xs">RAM</span></div>
              <p className="text-xl font-bold">{live ? `${Math.round(live.mem / 1024 / 1024)}MB` : "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground"><HardDrive className="h-3.5 w-3.5" /><span className="text-xs">Disk</span></div>
              <p className="text-xl font-bold">{live ? `${Math.round(live.disk / 1024 / 1024 / 1024)}GB` : "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground"><Wifi className="h-3.5 w-3.5" /><span className="text-xs">Uptime</span></div>
              <p className="text-xl font-bold">{live?.uptime ? formatUptime(live.uptime) : "—"}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Power Controls</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {POWER_ACTIONS.map(({ action, icon: Icon, label, variant }) => (
                <Button
                  key={action}
                  variant={variant}
                  size="sm"
                  className="justify-start"
                  disabled={!isProxmox || !!actionLoading}
                  onClick={() => powerAction(action)}
                >
                  {actionLoading === action
                    ? <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                    : <Icon className="h-3.5 w-3.5 mr-2" />
                  }
                  {label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="justify-start col-span-2 text-orange-400 border-orange-400/30 hover:bg-orange-400/10"
                disabled={reinstalling || !isProxmox}
                onClick={reinstall}
              >
                {reinstalling ? <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                Reinstall OS
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Server Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "IP Address", value: service.ipAddress ?? "Pending" },
                { label: "Username", value: service.username ?? "root" },
                { label: "Node", value: prov.node ?? "—" },
                { label: "VMID", value: prov.vmid ? `#${prov.vmid}` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono text-xs">{value}</span>
                </div>
              ))}
              {service.password && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Root Password</span>
                  <span className="font-mono text-xs">••••••••</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Terminal className="h-4 w-4" />Console / VNC Access</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isProxmox ? (
              <div className="rounded-lg bg-black border border-border p-6 text-center">
                <Terminal className="h-10 w-10 mx-auto mb-3 text-green-400" />
                <p className="text-green-400 text-sm mb-4">VNC Console requires Proxmox VE 7+ and a configured noVNC proxy</p>
                <Button size="sm" variant="outline" onClick={async () => {
                  try {
                    const r = await apiFetch(`/client/servers/${id}/console`);
                    toast({ title: "VNC Token Generated", description: `Connect to ${r.host}:${r.port}` });
                  } catch (e: any) {
                    toast({ title: "Console unavailable", description: e.message, variant: "destructive" });
                  }
                }}>
                  <Terminal className="h-3.5 w-3.5 mr-2" /> Request Console Token
                </Button>
              </div>
            ) : (
              <div className="rounded-lg bg-muted/30 p-6 text-center">
                <p className="text-muted-foreground text-sm">Console access requires Proxmox integration</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
