import { Router } from "express";
import { db, settingsTable, servicesTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { PterodactylClient, getPterodactylClient } from "../lib/pterodactyl";

const router = Router();

// GET /api/admin/pterodactyl/settings
router.get("/settings", requireAdmin, async (_req, res) => {
  try {
    const keys = ["pterodactyl_url", "pterodactyl_app_key", "pterodactyl_client_key"];
    const rows = await Promise.all(keys.map(k => db.select().from(settingsTable).where(eq(settingsTable.key, k)).limit(1)));
    const result: Record<string, string> = {};
    for (let i = 0; i < keys.length; i++) {
      const val = rows[i][0]?.value;
      result[keys[i]] = (keys[i].includes("key") && val) ? "••••••••" : (val ?? "");
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/admin/pterodactyl/settings
router.put("/settings", requireAdmin, async (req, res) => {
  try {
    const settings: Record<string, string> = req.body;
    for (const [key, value] of Object.entries(settings)) {
      if (value === "••••••••") continue;
      await db.insert(settingsTable).values({ key, value, group: "pterodactyl" })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
    }
    res.json({ message: "Pterodactyl settings saved" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/admin/pterodactyl/test
router.post("/test", requireAdmin, async (req, res) => {
  try {
    const { url, appKey } = req.body;
    const client = new PterodactylClient(url, appKey);
    const nodes = await client.listNodes();
    res.json({ success: true, message: `Connected! Found ${nodes.length} node(s).`, nodes });
  } catch (err) {
    res.json({ success: false, message: String(err) });
  }
});

// GET /api/admin/pterodactyl/nodes
router.get("/nodes", requireAdmin, async (_req, res) => {
  try {
    const client = await getPterodactylClient();
    if (!client) { res.status(400).json({ error: "Pterodactyl not configured" }); return; }
    res.json(await client.listNodes());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/admin/pterodactyl/nests
router.get("/nests", requireAdmin, async (_req, res) => {
  try {
    const client = await getPterodactylClient();
    if (!client) { res.status(400).json({ error: "Pterodactyl not configured" }); return; }
    res.json(await client.listNests());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/admin/pterodactyl/nests/:nestId/eggs
router.get("/nests/:nestId/eggs", requireAdmin, async (req, res) => {
  try {
    const client = await getPterodactylClient();
    if (!client) { res.status(400).json({ error: "Pterodactyl not configured" }); return; }
    res.json(await client.listEggs(Number(req.params.nestId)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/admin/pterodactyl/nodes/:nodeId/allocations
router.get("/nodes/:nodeId/allocations", requireAdmin, async (req, res) => {
  try {
    const client = await getPterodactylClient();
    if (!client) { res.status(400).json({ error: "Pterodactyl not configured" }); return; }
    res.json(await client.listAllocations(Number(req.params.nodeId)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/admin/pterodactyl/provision/:serviceId
router.post("/provision/:serviceId", requireAdmin, async (req, res) => {
  try {
    const { provisionService } = await import("../lib/automation");
    const result = await provisionService(Number(req.params.serviceId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
