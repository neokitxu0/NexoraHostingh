import { Router } from "express";
import { db, loginHistoryTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/admin/login-history
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { page = "1", userId } = req.query;
    const pageNum = Number(page);
    const pageSize = 50;
    let query = db.select({
      id: loginHistoryTable.id,
      userId: loginHistoryTable.userId,
      ipAddress: loginHistoryTable.ipAddress,
      userAgent: loginHistoryTable.userAgent,
      country: loginHistoryTable.country,
      success: loginHistoryTable.success,
      failReason: loginHistoryTable.failReason,
      createdAt: loginHistoryTable.createdAt,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(loginHistoryTable)
    .leftJoin(usersTable, eq(loginHistoryTable.userId, usersTable.id));

    const logs = await db.select({
      id: loginHistoryTable.id,
      userId: loginHistoryTable.userId,
      ipAddress: loginHistoryTable.ipAddress,
      userAgent: loginHistoryTable.userAgent,
      country: loginHistoryTable.country,
      success: loginHistoryTable.success,
      failReason: loginHistoryTable.failReason,
      createdAt: loginHistoryTable.createdAt,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(loginHistoryTable)
    .leftJoin(usersTable, eq(loginHistoryTable.userId, usersTable.id))
    .orderBy(desc(loginHistoryTable.createdAt))
    .limit(pageSize).offset((pageNum - 1) * pageSize);

    res.json({ data: logs, page: pageNum, pageSize });
  } catch (err) {
    logger.error({ err }, "Login history error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/login-history/user/:userId
router.get("/user/:userId", requireAdmin, async (req, res) => {
  try {
    const logs = await db.select()
      .from(loginHistoryTable)
      .where(eq(loginHistoryTable.userId, Number(req.params.userId)))
      .orderBy(desc(loginHistoryTable.createdAt))
      .limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
