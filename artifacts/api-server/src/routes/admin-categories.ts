import { Router } from "express";
import { db, productCategoriesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/admin/categories
router.get("/", requireAdmin, async (_req, res) => {
  try {
    const cats = await db.select().from(productCategoriesTable).orderBy(asc(productCategoriesTable.sortOrder));
    res.json(cats);
  } catch (err) {
    logger.error({ err }, "List categories error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/categories
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, icon, sortOrder, visible } = req.body;
    const [cat] = await db.insert(productCategoriesTable).values({
      name, slug: slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description, icon, sortOrder: sortOrder ?? 0, visible: visible ?? true,
    }).returning();
    res.status(201).json(cat);
  } catch (err) {
    logger.error({ err }, "Create category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/categories/:id
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, icon, sortOrder, visible } = req.body;
    const [cat] = await db.update(productCategoriesTable)
      .set({ name, slug, description, icon, sortOrder, visible })
      .where(eq(productCategoriesTable.id, Number(req.params.id)))
      .returning();
    res.json(cat);
  } catch (err) {
    logger.error({ err }, "Update category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/categories/:id
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(productCategoriesTable).where(eq(productCategoriesTable.id, Number(req.params.id)));
    res.json({ message: "Category deleted" });
  } catch (err) {
    logger.error({ err }, "Delete category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
