import { Router } from "express";
import { db, kbCategoriesTable, kbArticlesTable } from "@workspace/db";
import { eq, ilike, count } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function formatArticle(a: typeof kbArticlesTable.$inferSelect) {
  return { ...a, tags: JSON.parse(a.tagsJson ?? "[]") };
}

// GET /api/kb/categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await db.select().from(kbCategoriesTable);
    const result = await Promise.all(categories.map(async cat => {
      const [{ count: articleCount }] = await db.select({ count: count() }).from(kbArticlesTable)
        .where(eq(kbArticlesTable.categoryId, cat.id));
      return { ...cat, articleCount: Number(articleCount) };
    }));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "KB categories error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/kb/articles
router.get("/articles", async (req, res) => {
  try {
    const { categoryId, q } = req.query;
    let articles;
    if (categoryId) {
      articles = await db.select().from(kbArticlesTable).where(eq(kbArticlesTable.categoryId, Number(categoryId)));
    } else if (q) {
      articles = await db.select().from(kbArticlesTable).where(ilike(kbArticlesTable.title, `%${q}%`));
    } else {
      articles = await db.select().from(kbArticlesTable);
    }

    const categoriesAll = await db.select().from(kbCategoriesTable);
    const catMap = Object.fromEntries(categoriesAll.map(c => [c.id, c.name]));

    res.json(articles.map(a => ({
      ...formatArticle(a),
      categoryName: catMap[a.categoryId] ?? "General",
      content: null,
    })));
  } catch (err) {
    logger.error({ err }, "KB articles error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/kb/articles/:id
router.get("/articles/:id", async (req, res) => {
  try {
    const [article] = await db.select().from(kbArticlesTable).where(eq(kbArticlesTable.id, Number(req.params.id)));
    if (!article) { res.status(404).json({ error: "Article not found" }); return; }
    const [cat] = await db.select().from(kbCategoriesTable).where(eq(kbCategoriesTable.id, article.categoryId));
    await db.update(kbArticlesTable).set({ viewCount: article.viewCount + 1 }).where(eq(kbArticlesTable.id, article.id));
    res.json({ ...formatArticle(article), categoryName: cat?.name ?? "General" });
  } catch (err) {
    logger.error({ err }, "KB article error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
