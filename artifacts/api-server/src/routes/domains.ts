import { Router } from "express";
import { db, domainsTable, dnsRecordsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function formatDomain(d: typeof domainsTable.$inferSelect) {
  return { ...d, nameservers: JSON.parse(d.nameserversJson ?? "[]") };
}

// GET /api/domains
router.get("/", requireAuth, async (req, res) => {
  try {
    const domains = await db.select().from(domainsTable).where(eq(domainsTable.userId, req.user!.id));
    res.json(domains.map(formatDomain));
  } catch (err) {
    logger.error({ err }, "List domains error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/domains/search
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query as { q: string };
    const tlds = [".com", ".net", ".org", ".io", ".co", ".dev", ".app"];
    const baseName = q.replace(/\..+$/, "");
    const results = tlds.map(tld => ({
      tld,
      available: Math.random() > 0.3,
      price: tld === ".com" ? 12.99 : tld === ".io" ? 39.99 : tld === ".dev" ? 14.99 : 9.99,
      renewalPrice: tld === ".com" ? 14.99 : tld === ".io" ? 44.99 : 11.99,
    }));
    res.json({ domain: q, results });
  } catch (err) {
    logger.error({ err }, "Domain search error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/domains/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const [domain] = await db.select().from(domainsTable)
      .where(and(eq(domainsTable.id, Number(req.params.id)), eq(domainsTable.userId, req.user!.id)));
    if (!domain) { res.status(404).json({ error: "Domain not found" }); return; }
    res.json(formatDomain(domain));
  } catch (err) {
    logger.error({ err }, "Get domain error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/domains/:id/dns
router.get("/:id/dns", requireAuth, async (req, res) => {
  try {
    const records = await db.select().from(dnsRecordsTable).where(eq(dnsRecordsTable.domainId, Number(req.params.id)));
    res.json(records);
  } catch (err) {
    logger.error({ err }, "DNS records error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/domains/:id/dns
router.post("/:id/dns", requireAuth, async (req, res) => {
  try {
    const { type, name, content, ttl, priority } = req.body;
    const [record] = await db.insert(dnsRecordsTable).values({
      domainId: Number(req.params.id),
      type, name, content, ttl, priority: priority ?? null,
    }).returning();
    res.status(201).json(record);
  } catch (err) {
    logger.error({ err }, "Add DNS record error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
