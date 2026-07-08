import { Router } from "express";
import { db } from "@workspace/db";
import { pagesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const pages = await db.select().from(pagesTable).orderBy(pagesTable.slug);
    res.json(pages);
  } catch (err) {
    logger.error({ err }, "List pages error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:slug", requireAdmin, async (req, res) => {
  try {
    const [page] = await db.select().from(pagesTable).where(eq(pagesTable.slug, req.params.slug));
    if (!page) { res.status(404).json({ error: "Page not found" }); return; }
    res.json(page);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:slug", requireAdmin, async (req, res) => {
  try {
    const { title, content, published } = req.body;
    const [existing] = await db.select().from(pagesTable).where(eq(pagesTable.slug, req.params.slug));
    if (existing) {
      const [updated] = await db.update(pagesTable)
        .set({ title: title ?? existing.title, content: content ?? existing.content, published: published ?? existing.published, updatedAt: new Date() })
        .where(eq(pagesTable.slug, req.params.slug))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(pagesTable)
        .values({ slug: req.params.slug, title: title ?? req.params.slug, content: content ?? "", published: published ?? true })
        .returning();
      res.json(created);
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const { slug, title, content } = req.body;
    const [created] = await db.insert(pagesTable).values({ slug, title, content: content ?? "" }).returning();
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/:slug", requireAdmin, async (req, res) => {
  try {
    await db.delete(pagesTable).where(eq(pagesTable.slug, req.params.slug));
    res.json({ message: "Page deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
