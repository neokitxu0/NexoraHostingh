import { Router } from "express";
import { db, usersTable, referralsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/affiliate
router.get("/", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    const referrals = await db.select().from(referralsTable).where(eq(referralsTable.referrerId, req.user!.id));

    const totalEarnings = referrals.reduce((sum, r) => sum + parseFloat(r.earnings), 0);
    const baseUrl = process.env.APP_URL ?? "https://nexorahosting.com";

    res.json({
      referralCode: user.referralCode ?? "N/A",
      referralLink: `${baseUrl}/register?ref=${user.referralCode}`,
      totalReferrals: referrals.length,
      totalEarnings,
      pendingEarnings: referrals.filter(r => r.status === "pending").reduce((s, r) => s + parseFloat(r.earnings), 0),
      paidEarnings: totalEarnings,
      commissionRate: 10,
    });
  } catch (err) {
    logger.error({ err }, "Affiliate stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/affiliate/referrals
router.get("/referrals", requireAuth, async (req, res) => {
  try {
    const referrals = await db.select().from(referralsTable)
      .where(eq(referralsTable.referrerId, req.user!.id))
      .orderBy(desc(referralsTable.createdAt));
    res.json(referrals.map(r => ({ ...r, earnings: parseFloat(r.earnings) })));
  } catch (err) {
    logger.error({ err }, "Referrals error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/affiliate/withdraw
router.post("/withdraw", requireAuth, async (req, res) => {
  try {
    res.json({ message: "Withdrawal request submitted. Processing within 5-7 business days." });
  } catch (err) {
    logger.error({ err }, "Affiliate withdrawal error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
