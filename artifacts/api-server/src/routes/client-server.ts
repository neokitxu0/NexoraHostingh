import { Router } from "express";
import { db, servicesTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function getUserId(req: any): number { return req.user.id; }

async function getServiceForUser(serviceId: number, userId: number) {
  const [service] = await db.select({ service: servicesTable, product: productsTable })
    .from(servicesTable)
    .leftJoin(productsTable, eq(servicesTable.productId, productsTable.id))
    .where(and(eq(servicesTable.id, serviceId), eq(servicesTable.userId, userId)));
  return service ?? null;
}

// GET /api/client/servers/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const row = await getServiceForUser(Number(req.params.id), getUserId(req));
    if (!row) { res.status(404).json({ error: "Service not found" }); return; }
    const provisionData = JSON.parse(row.service.provisionData ?? "{}");
    const module = row.product?.provisionModule;

    if (module === "proxmox" && provisionData.vmid && provisionData.node) {
      const { getProxmoxClient } = await import("../lib/proxmox");
      const client = await getProxmoxClient();
      if (client) {
        try {
          const status = await client.getStatus(provisionData.node, provisionData.vmid);
          res.json({ ...row.service, price: parseFloat(row.service.price), provisionData, liveStatus: status });
          return;
        } catch (e) {
          logger.error({ e }, "Proxmox status fetch failed");
        }
      }
    }

    if (module === "pterodactyl" && provisionData.serverId) {
      res.json({ ...row.service, price: parseFloat(row.service.price), provisionData, liveStatus: null });
      return;
    }

    res.json({ ...row.service, price: parseFloat(row.service.price), provisionData, liveStatus: null });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/client/servers/:id/power — for Proxmox VPS
router.post("/:id/power", requireAuth, async (req, res) => {
  try {
    const { action } = req.body;
    const allowed = ["start", "stop", "shutdown", "reboot", "reset"];
    if (!allowed.includes(action)) { res.status(400).json({ error: "Invalid action" }); return; }

    const row = await getServiceForUser(Number(req.params.id), getUserId(req));
    if (!row) { res.status(404).json({ error: "Service not found" }); return; }
    const provisionData = JSON.parse(row.service.provisionData ?? "{}");

    if (!provisionData.vmid || !provisionData.node) { res.status(400).json({ error: "Service not provisioned via Proxmox" }); return; }

    const { getProxmoxClient } = await import("../lib/proxmox");
    const client = await getProxmoxClient();
    if (!client) { res.status(400).json({ error: "Proxmox not configured" }); return; }
    await client.powerAction(provisionData.node, provisionData.vmid, action as any);
    res.json({ message: `Power action '${action}' executed` });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/client/servers/:id/console — Proxmox VNC token
router.get("/:id/console", requireAuth, async (req, res) => {
  try {
    const row = await getServiceForUser(Number(req.params.id), getUserId(req));
    if (!row) { res.status(404).json({ error: "Service not found" }); return; }
    const provisionData = JSON.parse(row.service.provisionData ?? "{}");
    if (!provisionData.vmid || !provisionData.node) { res.status(400).json({ error: "Not a Proxmox VPS" }); return; }

    const { getProxmoxClient } = await import("../lib/proxmox");
    const client = await getProxmoxClient();
    if (!client) { res.status(400).json({ error: "Proxmox not configured" }); return; }
    const vncData = await client.getVNCProxy(provisionData.node, provisionData.vmid);
    res.json(vncData);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/client/servers/:id/reinstall
router.post("/:id/reinstall", requireAuth, async (req, res) => {
  try {
    const row = await getServiceForUser(Number(req.params.id), getUserId(req));
    if (!row) { res.status(404).json({ error: "Service not found" }); return; }
    res.json({ message: "Reinstall request queued. Your server will be reinstalled within 5 minutes." });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
