import { Router } from "express";
import { db, dnsRecordsTable, domainsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function getUserId(req: any): number { return req.user.id; }

// GET /api/dns/:domainId/records
router.get("/:domainId/records", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const domainId = Number(req.params.domainId);
    const [domain] = await db.select().from(domainsTable).where(and(eq(domainsTable.id, domainId), eq(domainsTable.userId, userId)));
    if (!domain) { res.status(404).json({ error: "Domain not found" }); return; }
    const records = await db.select().from(dnsRecordsTable).where(eq(dnsRecordsTable.domainId, domainId));
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/dns/:domainId/records
router.post("/:domainId/records", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const domainId = Number(req.params.domainId);
    const [domain] = await db.select().from(domainsTable).where(and(eq(domainsTable.id, domainId), eq(domainsTable.userId, userId)));
    if (!domain) { res.status(404).json({ error: "Domain not found" }); return; }

    const { type, name, content, ttl, priority } = req.body;
    const allowed = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"];
    if (!allowed.includes(type)) { res.status(400).json({ error: "Invalid record type" }); return; }

    const [record] = await db.insert(dnsRecordsTable).values({
      domainId, userId, type, name, content, ttl: ttl ?? 3600, priority,
    }).returning();
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/dns/:domainId/records/:id
router.patch("/:domainId/records/:id", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { type, name, content, ttl, priority } = req.body;
    const [record] = await db.update(dnsRecordsTable)
      .set({ type, name, content, ttl, priority })
      .where(and(eq(dnsRecordsTable.id, Number(req.params.id)), eq(dnsRecordsTable.userId, userId)))
      .returning();
    if (!record) { res.status(404).json({ error: "Record not found" }); return; }
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/dns/:domainId/records/:id
router.delete("/:domainId/records/:id", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    await db.delete(dnsRecordsTable)
      .where(and(eq(dnsRecordsTable.id, Number(req.params.id)), eq(dnsRecordsTable.userId, userId)));
    res.json({ message: "Record deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
