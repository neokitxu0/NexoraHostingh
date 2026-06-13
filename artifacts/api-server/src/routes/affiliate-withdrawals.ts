import { Router } from "express";
import { db, affiliateWithdrawalsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/affiliate/withdrawals
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const withdrawals = await db.select().from(affiliateWithdrawalsTable)
      .where(eq(affiliateWithdrawalsTable.userId, userId))
      .orderBy(desc(affiliateWithdrawalsTable.createdAt));
    res.json(withdrawals.map(w => ({ ...w, amount: parseFloat(w.amount) })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/affiliate/withdrawals
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { amount, method, accountDetails } = req.body;
    if (!amount || amount < 10) { res.status(400).json({ error: "Minimum withdrawal is $10" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const affiliateBalance = parseFloat(user?.creditBalance ?? "0");
    if (affiliateBalance < amount) { res.status(400).json({ error: "Insufficient balance" }); return; }

    const [withdrawal] = await db.insert(affiliateWithdrawalsTable).values({
      userId, amount: String(amount), method: method ?? "bank", accountDetails, status: "pending",
    }).returning();
    res.status(201).json({ ...withdrawal, amount: parseFloat(withdrawal.amount) });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin routes
// GET /api/affiliate/withdrawals/admin
router.get("/admin", requireAdmin, async (_req, res) => {
  try {
    const withdrawals = await db.select({
      id: affiliateWithdrawalsTable.id,
      userId: affiliateWithdrawalsTable.userId,
      amount: affiliateWithdrawalsTable.amount,
      method: affiliateWithdrawalsTable.method,
      accountDetails: affiliateWithdrawalsTable.accountDetails,
      status: affiliateWithdrawalsTable.status,
      adminNotes: affiliateWithdrawalsTable.adminNotes,
      processedAt: affiliateWithdrawalsTable.processedAt,
      createdAt: affiliateWithdrawalsTable.createdAt,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(affiliateWithdrawalsTable)
    .leftJoin(usersTable, eq(affiliateWithdrawalsTable.userId, usersTable.id))
    .orderBy(desc(affiliateWithdrawalsTable.createdAt));
    res.json(withdrawals.map(w => ({ ...w, amount: parseFloat(w.amount) })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/affiliate/withdrawals/:id — admin approve/reject
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const [updated] = await db.update(affiliateWithdrawalsTable).set({
      status, adminNotes,
      processedAt: status !== "pending" ? new Date() : undefined,
    }).where(eq(affiliateWithdrawalsTable.id, Number(req.params.id))).returning();
    res.json({ ...updated, amount: parseFloat(updated.amount) });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
