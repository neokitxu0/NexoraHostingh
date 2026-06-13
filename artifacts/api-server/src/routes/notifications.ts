import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    const notifications = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, req.user!.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    res.json(notifications);
  } catch (err) {
    logger.error({ err }, "List notifications error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notifications/:id/read
router.post("/:id/read", requireAuth, async (req, res) => {
  try {
    await db.update(notificationsTable)
      .set({ read: true })
      .where(and(eq(notificationsTable.id, Number(req.params.id)), eq(notificationsTable.userId, req.user!.id)));
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    logger.error({ err }, "Mark notification read error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notifications/read-all
router.post("/read-all", requireAuth, async (req, res) => {
  try {
    await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.userId, req.user!.id));
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    logger.error({ err }, "Mark all read error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
