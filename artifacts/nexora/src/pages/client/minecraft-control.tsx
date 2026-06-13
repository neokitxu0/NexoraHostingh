import { useState } from "react";
import { useParams, Link } from "wouter";
import { ClientLayout } from "@/components/layout/client-layout";
import { apiFetch } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, RotateCcw, Terminal, RefreshCw, ChevronLeft, Cpu, HardDrive, Users, Globe, Copy, ExternalLink, AlertTriangle } from "lucide-react";

export default function MinecraftControl() {
  const { id } = useParams();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: service, isLoading, refetch } = useQuery({
    queryKey: ["mc-detail", id],
    queryFn: async () => {
      const d = await apiFetch(`/client/servers/${id}`);
      return { ...d, provisionData: typeof d.provisionData === "string" ? JSON.parse(d.provisionData) : (d.provisionData ?? {}) };
    },
    refetchInterval: 10_000,
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied` }));
  };

  const prov = service?.provisionData ?? {};
  const isPterodactyl = prov.module === "pterodactyl";
  const panelUrl = prov.panelUrl;
  const identifier = prov.serverIdentifier;
  const isActive = service?.status === "active";

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
            <h1 className="text-xl font-bold">Minecraft Server Control</h1>
            <p className="text-sm text-muted-foreground">{service.domain ?? `Server #${id}`}</p>
          </div>
          <Badge className="ml-auto" variant={isActive ? "default" : "secondary"}>
            <span className={`w-2 h-2 rounded-full mr-1.5 ${isActive ? "bg-green-400" : "bg-muted-foreground"}`} />
            {service.status}
          </Badge>
        </div>

        {!isPterodactyl && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 flex items-center gap-2 text-yellow-400 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            This server uses manual provisioning. Configure Pterodactyl integration for full controls.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Connection Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Server IP", value: service.ipAddress ?? "Pending", copyable: true },
                { label: "Username", value: prov.username ?? service.username ?? "—", copyable: true },
                { label: "Panel URL", value: panelUrl ?? "Not configured", link: panelUrl },
                { label: "Server ID", value: identifier ?? "—", copyable: false },
              ].map(({ label, value, copyable, link }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs">{value}</span>
                    {copyable && value !== "Pending" && value !== "—" && (
                      <button onClick={() => copy(value, label)} className="text-muted-foreground hover:text-foreground">
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                    {link && (
                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { icon: Play, label: "Start Server", color: "text-green-400" },
                { icon: Square, label: "Stop Server", color: "text-destructive" },
                { icon: RotateCcw, label: "Restart", color: "text-yellow-400" },
                { icon: RefreshCw, label: "Kill", color: "text-orange-400" },
              ].map(({ icon: Icon, label, color }) => (
                <Button key={label} variant="outline" size="sm" className={`justify-start ${!isPterodactyl ? "opacity-50" : ""}`} disabled={!isPterodactyl || !!actionLoading}>
                  <Icon className={`h-3.5 w-3.5 mr-2 ${color}`} />
                  {label}
                </Button>
              ))}
              {panelUrl && identifier && (
                <a href={`${panelUrl}/server/${identifier}`} target="_blank" rel="noopener noreferrer" className="col-span-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open in Pterodactyl Panel
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Terminal className="h-4 w-4" />Console</CardTitle>
          </CardHeader>
          <CardContent>
            {isPterodactyl && panelUrl && identifier ? (
              <div className="rounded-lg bg-black border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  <span className="text-xs text-muted-foreground ml-2 font-mono">Minecraft Server Console</span>
                </div>
                <div className="p-4 font-mono text-xs text-green-400 min-h-[150px] space-y-1">
                  <p>[INFO] Minecraft server is running on Pterodactyl</p>
                  <p>[INFO] Server identifier: {identifier}</p>
                  <p>[INFO] For full console access, open the Pterodactyl panel</p>
                  <p className="text-muted-foreground">Full console WebSocket access is available in the Pterodactyl panel →</p>
                </div>
                <div className="px-4 pb-4">
                  <a href={`${panelUrl}/server/${identifier}/console`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="w-full">
                      <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open Full Console in Pterodactyl
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-muted/30 p-8 text-center">
                <Terminal className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">Console access requires Pterodactyl integration</p>
                <p className="text-xs text-muted-foreground mt-1">Configure Pterodactyl in the admin panel to enable full server controls</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
