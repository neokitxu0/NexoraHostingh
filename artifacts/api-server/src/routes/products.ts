import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdminOnly } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
    ...p,
    price: parseFloat(p.price),
    setupFee: parseFloat(p.setupFee ?? "0"),
    features: JSON.parse(p.featuresJson ?? "[]"),
  };
}

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    let products;
    if (category) {
      products = await db.select().from(productsTable)
        .where(and(eq(productsTable.available, true), eq(productsTable.category, category as string)));
    } else {
      products = await db.select().from(productsTable).where(eq(productsTable.available, true));
    }
    res.json(products.map(formatProduct));
  } catch (err) {
    logger.error({ err }, "List products error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, Number(req.params.id)));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(formatProduct(product));
  } catch (err) {
    logger.error({ err }, "Get product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/public/plans
router.get("/public/plans", async (req, res) => {
  try {
    const { type } = req.query;
    let products;
    if (type) {
      products = await db.select().from(productsTable)
        .where(and(eq(productsTable.available, true), eq(productsTable.category, type as string)));
    } else {
      products = await db.select().from(productsTable).where(eq(productsTable.available, true));
    }
    res.json(products.map(formatProduct));
  } catch (err) {
    logger.error({ err }, "Public plans error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: POST /api/admin/products
router.post("/admin", requireAdminOnly, async (req, res) => {
  try {
    const { name, category, description, price, setupFee, billingCycle, features, diskSpace, bandwidth, ram, cpu, featured, available } = req.body;
    const [product] = await db.insert(productsTable).values({
      name, category, description,
      price: String(price), setupFee: String(setupFee ?? 0),
      billingCycle, diskSpace, bandwidth, ram, cpu,
      featuresJson: JSON.stringify(features ?? []),
      featured: featured ?? false,
      available: available ?? true,
    }).returning();
    res.status(201).json(formatProduct(product));
  } catch (err) {
    logger.error({ err }, "Create product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: PATCH /api/admin/products/:id
router.patch("/admin/:id", requireAdminOnly, async (req, res) => {
  try {
    const { name, category, description, price, setupFee, billingCycle, features, diskSpace, bandwidth, ram, cpu, featured, available } = req.body;
    const [updated] = await db.update(productsTable).set({
      name, category, description,
      price: String(price), setupFee: String(setupFee ?? 0),
      billingCycle, diskSpace, bandwidth, ram, cpu,
      featuresJson: JSON.stringify(features ?? []),
      featured, available,
    }).where(eq(productsTable.id, Number(req.params.id))).returning();
    res.json(formatProduct(updated));
  } catch (err) {
    logger.error({ err }, "Update product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: DELETE /api/admin/products/:id
router.delete("/admin/:id", requireAdminOnly, async (req, res) => {
  try {
    await db.delete(productsTable).where(eq(productsTable.id, Number(req.params.id)));
    res.json({ message: "Product deleted" });
  } catch (err) {
    logger.error({ err }, "Delete product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
