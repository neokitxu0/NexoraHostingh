import { Router } from "express";
import { db, settingsTable, invoicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

async function getRazorpaySettings() {
  const rows = await Promise.all([
    db.select().from(settingsTable).where(eq(settingsTable.key, "razorpay_key_id")).limit(1),
    db.select().from(settingsTable).where(eq(settingsTable.key, "razorpay_key_secret")).limit(1),
  ]);
  return { keyId: rows[0][0]?.value ?? "", keySecret: rows[1][0]?.value ?? "" };
}

router.post("/create-order", requireAuth, async (req, res) => {
  try {
    const { invoiceId } = req.body;
    const { keyId, keySecret } = await getRazorpaySettings();
    if (!keyId || !keySecret) {
      res.status(400).json({ error: "Razorpay not configured. Please contact support." });
      return;
    }
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, Number(invoiceId)));
    if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
    if (invoice.status === "paid") { res.status(400).json({ error: "Invoice already paid" }); return; }

    const Razorpay = (await import("razorpay")).default;
    const rz = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await (rz.orders as any).create({
      amount: Math.round(parseFloat(invoice.total) * 100),
      currency: "INR",
      receipt: invoice.number,
    });
    res.json({ orderId: order.id, keyId, amount: order.amount, currency: order.currency, invoiceNumber: invoice.number });
  } catch (err) {
    logger.error({ err }, "Razorpay create order error");
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

router.get("/key", requireAuth, async (_req, res) => {
  try {
    const { keyId } = await getRazorpaySettings();
    res.json({ keyId: keyId || null });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
