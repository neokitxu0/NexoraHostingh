import { Router } from "express";
import { db, paymentGatewaysTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

const DEFAULT_GATEWAYS = [
  { name: "Stripe", slug: "stripe", icon: "stripe" },
  { name: "PayPal", slug: "paypal", icon: "paypal" },
  { name: "Razorpay", slug: "razorpay", icon: "razorpay" },
  { name: "Crypto (Coinbase Commerce)", slug: "crypto", icon: "bitcoin" },
];

// GET /api/admin/payment-gateways
router.get("/", requireAdmin, async (_req, res) => {
  try {
    const gateways = await db.select().from(paymentGatewaysTable).orderBy(paymentGatewaysTable.id);
    const maskedConfig: Record<string, string[]> = {
      stripe: ["secret_key"],
      paypal: ["client_secret"],
      razorpay: ["key_secret"],
      crypto: ["api_secret"],
    };
    res.json(gateways.map(gw => {
      const config = JSON.parse(gw.configJson ?? "{}");
      const masked = maskedConfig[gw.slug] ?? [];
      for (const k of masked) {
        if (config[k]) config[k] = "••••••••";
      }
      return { ...gw, config, webhookSecret: gw.webhookSecret ? "••••••••" : null };
    }));
  } catch (err) {
    logger.error({ err }, "List gateways error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/payment-gateways/seed
router.post("/seed", requireAdmin, async (_req, res) => {
  try {
    for (const gw of DEFAULT_GATEWAYS) {
      await db.insert(paymentGatewaysTable)
        .values({ name: gw.name, slug: gw.slug, configJson: "{}" })
        .onConflictDoNothing();
    }
    const gateways = await db.select().from(paymentGatewaysTable);
    res.json(gateways);
  } catch (err) {
    logger.error({ err }, "Seed gateways error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/payment-gateways/:id
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { enabled, testMode, config, webhookSecret } = req.body;
    const id = Number(req.params.id);
    const [existing] = await db.select().from(paymentGatewaysTable).where(eq(paymentGatewaysTable.id, id));
    if (!existing) { res.status(404).json({ error: "Gateway not found" }); return; }

    const existingConfig = JSON.parse(existing.configJson ?? "{}");
    const newConfig = { ...existingConfig };
    if (config) {
      for (const [k, v] of Object.entries(config)) {
        if (v !== "••••••••") newConfig[k] = v;
      }
    }

    const [updated] = await db.update(paymentGatewaysTable).set({
      enabled: enabled ?? existing.enabled,
      testMode: testMode ?? existing.testMode,
      configJson: JSON.stringify(newConfig),
      webhookSecret: webhookSecret === "••••••••" ? existing.webhookSecret : (webhookSecret ?? existing.webhookSecret),
    }).where(eq(paymentGatewaysTable.id, id)).returning();

    res.json({ ...updated, config: JSON.parse(updated.configJson) });
  } catch (err) {
    logger.error({ err }, "Update gateway error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/payment-gateways/transactions
router.get("/transactions", requireAdmin, async (req, res) => {
  try {
    const { page = "1" } = req.query;
    const pageNum = Number(page);
    const txns = await db.select().from(transactionsTable)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(50).offset((pageNum - 1) * 50);
    res.json({ data: txns.map(t => ({ ...t, amount: parseFloat(t.amount) })), page: pageNum });
  } catch (err) {
    logger.error({ err }, "Gateway transactions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
