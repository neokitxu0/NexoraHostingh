import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

async function getSetting(key: string): Promise<string | null> {
  const row = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row[0]?.value ?? null;
}

export interface PterodactylUser {
  id: number;
  uuid: string;
  username: string;
  email: string;
  password?: string;
}

export interface PterodactylServer {
  id: number;
  uuid: string;
  identifier: string;
  name: string;
  node: number;
  status: string | null;
}

export class PterodactylClient {
  private baseUrl: string;
  private appKey: string;

  constructor(baseUrl: string, appKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.appKey = appKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/application${path}`, {
      method,
      headers: {
        "Authorization": `Bearer ${this.appKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pterodactyl API ${method} ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async listNodes(): Promise<Array<{ id: number; name: string; fqdn: string }>> {
    const data = await this.request<{ data: Array<{ attributes: { id: number; name: string; fqdn: string } }> }>("GET", "/nodes?per_page=100");
    return data.data.map(n => n.attributes);
  }

  async listNests(): Promise<Array<{ id: number; name: string }>> {
    const data = await this.request<{ data: Array<{ attributes: { id: number; name: string } }> }>("GET", "/nests?per_page=100");
    return data.data.map(n => n.attributes);
  }

  async listEggs(nestId: number): Promise<Array<{ id: number; name: string }>> {
    const data = await this.request<{ data: Array<{ attributes: { id: number; name: string } }> }>("GET", `/nests/${nestId}/eggs?per_page=100`);
    return data.data.map(e => e.attributes);
  }

  async listAllocations(nodeId: number): Promise<Array<{ id: number; ip: string; port: number; assigned: boolean }>> {
    const data = await this.request<{ data: Array<{ attributes: { id: number; ip: string; port: number; assigned: boolean } }> }>("GET", `/nodes/${nodeId}/allocations?per_page=100`);
    return data.data.map(a => a.attributes);
  }

  async createUser(email: string, username: string, firstName: string, lastName: string): Promise<PterodactylUser> {
    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + "!1";
    const data = await this.request<{ attributes: PterodactylUser & { password: string } }>("POST", "/users", {
      email, username, first_name: firstName, last_name: lastName, password,
    });
    return { ...data.attributes, password };
  }

  async getUserByEmail(email: string): Promise<PterodactylUser | null> {
    try {
      const data = await this.request<{ data: Array<{ attributes: PterodactylUser }> }>("GET", `/users?filter[email]=${encodeURIComponent(email)}&per_page=1`);
      return data.data[0]?.attributes ?? null;
    } catch {
      return null;
    }
  }

  async createServer(params: {
    name: string;
    userId: number;
    eggId: number;
    nestId: number;
    nodeId: number;
    allocationId: number;
    ram: number;
    disk: number;
    cpu: number;
    databases?: number;
    backups?: number;
    env?: Record<string, string>;
    startup?: string;
    image?: string;
  }): Promise<PterodactylServer> {
    const egg = await this.request<{ attributes: { startup: string; docker_image: string; config: { eggs: { startup: string } } } }>("GET", `/nests/${params.nestId}/eggs/${params.eggId}?include=variables`);
    const data = await this.request<{ attributes: PterodactylServer }>("POST", "/servers", {
      name: params.name,
      user: params.userId,
      egg: params.eggId,
      docker_image: params.image ?? egg.attributes.docker_image,
      startup: params.startup ?? egg.attributes.startup,
      environment: params.env ?? {},
      limits: { memory: params.ram, swap: 0, disk: params.disk, io: 500, cpu: params.cpu },
      feature_limits: { databases: params.databases ?? 1, backups: params.backups ?? 2 },
      allocation: { default: params.allocationId },
    });
    return data.attributes;
  }

  async suspendServer(serverId: number): Promise<void> {
    await this.request("POST", `/servers/${serverId}/suspend`);
  }

  async unsuspendServer(serverId: number): Promise<void> {
    await this.request("POST", `/servers/${serverId}/unsuspend`);
  }

  async deleteServer(serverId: number): Promise<void> {
    await this.request("DELETE", `/servers/${serverId}`);
  }
}

export async function getPterodactylClient(): Promise<PterodactylClient | null> {
  try {
    const url = await getSetting("pterodactyl_url");
    const key = await getSetting("pterodactyl_app_key");
    if (!url || !key) return null;
    return new PterodactylClient(url, key);
  } catch (err) {
    logger.error({ err }, "Failed to init Pterodactyl client");
    return null;
  }
}
