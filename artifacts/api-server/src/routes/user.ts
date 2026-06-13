import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, invoicesTable, ticketsTable, servicesTable, loginHistoryTable, notificationsTable } from "@workspace/db";
import { eq, desc, count, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/user/profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    logger.error({ err }, "Get profile error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/user/profile
router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, company, phone, address1, address2, city, state, postcode, country } = req.body;
    const [updated] = await db.update(usersTable)
      .set({ firstName, lastName, company, phone, address1, address2, city, state, postcode, country })
      .where(eq(usersTable.id, req.user!.id))
      .returning();
    const { passwordHash: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    logger.error({ err }, "Update profile error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/user/change-password
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, req.user!.id));
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    logger.error({ err }, "Change password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/user/dashboard
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const [activeServices] = await db.select({ count: count() }).from(servicesTable)
      .where(eq(servicesTable.userId, userId));
    const [pendingInvoices] = await db.select({ count: count() }).from(invoicesTable)
      .where(eq(invoicesTable.userId, userId));
    const [openTickets] = await db.select({ count: count() }).from(ticketsTable)
      .where(eq(ticketsTable.userId, userId));
    const [userRow] = await db.select({ creditBalance: usersTable.creditBalance }).from(usersTable)
      .where(eq(usersTable.id, userId));

    const recentInvoices = await db.select().from(invoicesTable)
      .where(eq(invoicesTable.userId, userId))
      .orderBy(desc(invoicesTable.createdAt))
      .limit(5);

    const recentTickets = await db.select().from(ticketsTable)
      .where(eq(ticketsTable.userId, userId))
      .orderBy(desc(ticketsTable.createdAt))
      .limit(5);

    res.json({
      activeServices: activeServices.count,
      pendingInvoices: pendingInvoices.count,
      openTickets: openTickets.count,
      creditBalance: parseFloat(userRow?.creditBalance ?? "0"),
      totalSpend: 0,
      recentInvoices: recentInvoices.map(inv => ({
        ...inv,
        subtotal: parseFloat(inv.subtotal ?? "0"),
        tax: parseFloat(inv.tax ?? "0"),
        total: parseFloat(inv.total),
        items: [],
      })),
      recentTickets,
    });
  } catch (err) {
    logger.error({ err }, "Dashboard error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/user/login-history
router.get("/login-history", requireAuth, async (req, res) => {
  try {
    const history = await db.select().from(loginHistoryTable)
      .where(eq(loginHistoryTable.userId, req.user!.id))
      .orderBy(desc(loginHistoryTable.createdAt))
      .limit(20);
    res.json(history);
  } catch (err) {
    logger.error({ err }, "Login history error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
