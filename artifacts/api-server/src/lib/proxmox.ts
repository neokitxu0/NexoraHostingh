import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

async function getSetting(key: string): Promise<string | null> {
  const row = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row[0]?.value ?? null;
}

export interface ProxmoxNode {
  node: string;
  status: string;
  maxcpu: number;
  maxmem: number;
  maxdisk: number;
}

export interface ProxmoxVM {
  vmid: number;
  name: string;
  status: string;
  node: string;
  cpu?: number;
  mem?: number;
  disk?: number;
  uptime?: number;
  ipAddress?: string;
}

export class ProxmoxClient {
  private baseUrl: string;
  private tokenId: string;
  private tokenSecret: string;

  constructor(baseUrl: string, tokenId: string, tokenSecret: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.tokenId = tokenId;
    this.tokenSecret = tokenSecret;
  }

  private async request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/api2/json${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        "Authorization": `PVEAPIToken=${this.tokenId}=${this.tokenSecret}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Proxmox API ${method} ${path} → ${res.status}: ${text}`);
    }
    const json = await res.json() as { data: T };
    return json.data;
  }

  async listNodes(): Promise<ProxmoxNode[]> {
    return this.request<ProxmoxNode[]>("GET", "/nodes");
  }

  async listTemplates(node: string): Promise<Array<{ vmid: number; name: string; template: boolean }>> {
    const vms = await this.request<Array<{ vmid: number; name: string; template: number }>>("GET", `/nodes/${node}/qemu`);
    return vms.filter(v => v.template === 1).map(v => ({ ...v, template: true }));
  }

  async listStorages(node: string): Promise<Array<{ storage: string; type: string; avail: number; total: number }>> {
    return this.request<Array<{ storage: string; type: string; avail: number; total: number }>>("GET", `/nodes/${node}/storage`);
  }

  async createVM(params: {
    node: string;
    templateVmid: number;
    vmid?: number;
    name: string;
    cores: number;
    ram: number;
    disk: number;
    storage: string;
    ipAddress?: string;
  }): Promise<{ vmid: number; upid: string }> {
    const nextId = params.vmid ?? await this.request<number>("GET", "/cluster/nextid");
    await this.request<string>("POST", `/nodes/${params.node}/qemu/${params.templateVmid}/clone`, {
      newid: nextId,
      name: params.name,
      full: 1,
      storage: params.storage,
    });
    await new Promise(r => setTimeout(r, 3000));
    await this.request<string>("PUT", `/nodes/${params.node}/qemu/${nextId}/config`, {
      cores: params.cores,
      memory: params.ram,
    });
    return { vmid: nextId as number, upid: "" };
  }

  async powerAction(node: string, vmid: number, action: "start" | "stop" | "shutdown" | "reboot" | "reset"): Promise<string> {
    return this.request<string>("POST", `/nodes/${node}/qemu/${vmid}/status/${action}`);
  }

  async getStatus(node: string, vmid: number): Promise<{ status: string; cpu: number; mem: number; disk: number; uptime: number }> {
    return this.request<{ status: string; cpu: number; mem: number; disk: number; uptime: number }>("GET", `/nodes/${node}/qemu/${vmid}/status/current`);
  }

  async deleteVM(node: string, vmid: number): Promise<string> {
    return this.request<string>("DELETE", `/nodes/${node}/qemu/${vmid}`);
  }

  async getVNCProxy(node: string, vmid: number): Promise<{ ticket: string; port: number; host: string }> {
    return this.request<{ ticket: string; port: number; host: string }>("POST", `/nodes/${node}/qemu/${vmid}/vncproxy`, { websocket: 1 });
  }
}

export async function getProxmoxClient(): Promise<ProxmoxClient | null> {
  try {
    const url = await getSetting("proxmox_url");
    const tokenId = await getSetting("proxmox_token_id");
    const tokenSecret = await getSetting("proxmox_token_secret");
    if (!url || !tokenId || !tokenSecret) return null;
    return new ProxmoxClient(url, tokenId, tokenSecret);
  } catch (err) {
    logger.error({ err }, "Failed to init Proxmox client");
    return null;
  }
}
