import { Router } from "express";
import { db, settingsTable, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { ProxmoxClient, getProxmoxClient } from "../lib/proxmox";

const router = Router();

// GET /api/admin/proxmox/settings
router.get("/settings", requireAdmin, async (_req, res) => {
  try {
    const keys = ["proxmox_url", "proxmox_token_id", "proxmox_token_secret"];
    const result: Record<string, string> = {};
    for (const key of keys) {
      const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
      result[key] = (key === "proxmox_token_secret" && row?.value) ? "••••••••" : (row?.value ?? "");
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/admin/proxmox/settings
router.put("/settings", requireAdmin, async (req, res) => {
  try {
    const settings: Record<string, string> = req.body;
    for (const [key, value] of Object.entries(settings)) {
      if (value === "••••••••") continue;
      await db.insert(settingsTable).values({ key, value, group: "proxmox" })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
    }
    res.json({ message: "Proxmox settings saved" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/admin/proxmox/test
router.post("/test", requireAdmin, async (req, res) => {
  try {
    const { url, tokenId, tokenSecret } = req.body;
    const client = new ProxmoxClient(url, tokenId, tokenSecret);
    const nodes = await client.listNodes();
    res.json({ success: true, message: `Connected! Found ${nodes.length} node(s).`, nodes });
  } catch (err) {
    res.json({ success: false, message: String(err) });
  }
});

// GET /api/admin/proxmox/nodes
router.get("/nodes", requireAdmin, async (_req, res) => {
  try {
    const client = await getProxmoxClient();
    if (!client) { res.status(400).json({ error: "Proxmox not configured" }); return; }
    res.json(await client.listNodes());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/admin/proxmox/nodes/:node/templates
router.get("/nodes/:node/templates", requireAdmin, async (req, res) => {
  try {
    const client = await getProxmoxClient();
    if (!client) { res.status(400).json({ error: "Proxmox not configured" }); return; }
    res.json(await client.listTemplates(req.params.node));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/admin/proxmox/nodes/:node/storages
router.get("/nodes/:node/storages", requireAdmin, async (req, res) => {
  try {
    const client = await getProxmoxClient();
    if (!client) { res.status(400).json({ error: "Proxmox not configured" }); return; }
    res.json(await client.listStorages(req.params.node));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/admin/proxmox/provision/:serviceId
router.post("/provision/:serviceId", requireAdmin, async (req, res) => {
  try {
    const { provisionService } = await import("../lib/automation");
    const result = await provisionService(Number(req.params.serviceId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/admin/proxmox/services/:serviceId/power
router.post("/services/:serviceId/power", requireAdmin, async (req, res) => {
  try {
    const { action } = req.body;
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, Number(req.params.serviceId)));
    if (!service) { res.status(404).json({ error: "Service not found" }); return; }
    const provData = JSON.parse(service.provisionData ?? "{}");
    if (!provData.vmid || !provData.node) { res.status(400).json({ error: "Service not provisioned via Proxmox" }); return; }
    const client = await getProxmoxClient();
    if (!client) { res.status(400).json({ error: "Proxmox not configured" }); return; }
    await client.powerAction(provData.node, provData.vmid, action);
    res.json({ message: `Power action '${action}' sent` });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
