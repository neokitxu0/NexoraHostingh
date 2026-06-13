import { Router } from "express";
import { db, invoicesTable, invoiceItemsTable, transactionsTable, usersTable, couponsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function formatInvoice(inv: any, items: any[] = []) {
  return {
    ...inv,
    subtotal: parseFloat(inv.subtotal ?? "0"),
    tax: parseFloat(inv.tax ?? "0"),
    total: parseFloat(inv.total),
    items: items.map(item => ({ ...item, amount: parseFloat(item.amount) })),
  };
}

// GET /api/billing/invoices
router.get("/invoices", requireAuth, async (req, res) => {
  try {
    const invoices = await db.select().from(invoicesTable)
      .where(eq(invoicesTable.userId, req.user!.id))
      .orderBy(desc(invoicesTable.createdAt));
    const result = await Promise.all(invoices.map(async inv => {
      const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, inv.id));
      return formatInvoice(inv, items);
    }));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "List invoices error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/billing/invoices/:id
router.get("/invoices/:id", requireAuth, async (req, res) => {
  try {
    const [invoice] = await db.select().from(invoicesTable)
      .where(and(eq(invoicesTable.id, Number(req.params.id)), eq(invoicesTable.userId, req.user!.id)));
    if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
    const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoice.id));
    res.json(formatInvoice(invoice, items));
  } catch (err) {
    logger.error({ err }, "Get invoice error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/billing/invoices/:id/pay
router.post("/invoices/:id/pay", requireAuth, async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const [invoice] = await db.select().from(invoicesTable)
      .where(and(eq(invoicesTable.id, Number(req.params.id)), eq(invoicesTable.userId, req.user!.id)));
    if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
    if (invoice.status === "paid") { res.status(400).json({ error: "Invoice already paid" }); return; }

    await db.update(invoicesTable).set({ status: "paid", paidAt: new Date() }).where(eq(invoicesTable.id, invoice.id));
    await db.insert(transactionsTable).values({
      userId: req.user!.id,
      invoiceId: invoice.id,
      type: "payment",
      amount: invoice.total,
      description: `Payment for invoice ${invoice.number}`,
      status: "completed",
      paymentMethod,
      gateway: paymentMethod,
    });

    res.json({ success: true, message: "Payment processed successfully", redirectUrl: null, transactionId: `TXN-${Date.now()}` });
  } catch (err) {
    logger.error({ err }, "Pay invoice error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/billing/transactions
router.get("/transactions", requireAuth, async (req, res) => {
  try {
    const txns = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, req.user!.id))
      .orderBy(desc(transactionsTable.createdAt));
    res.json(txns.map(t => ({ ...t, amount: parseFloat(t.amount) })));
  } catch (err) {
    logger.error({ err }, "Transactions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/billing/credit
router.get("/credit", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select({ creditBalance: usersTable.creditBalance }).from(usersTable).where(eq(usersTable.id, req.user!.id));
    res.json({ balance: parseFloat(user?.creditBalance ?? "0"), currency: "USD" });
  } catch (err) {
    logger.error({ err }, "Credit balance error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/billing/add-credit
router.post("/add-credit", requireAuth, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    await db.insert(transactionsTable).values({
      userId: req.user!.id,
      type: "credit",
      amount: String(amount),
      description: `Credit added via ${paymentMethod}`,
      status: "completed",
      paymentMethod,
    });
    res.json({ success: true, message: `$${amount} credit added successfully`, redirectUrl: null, transactionId: `TXN-${Date.now()}` });
  } catch (err) {
    logger.error({ err }, "Add credit error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/billing/refund-request
router.post("/refund-request", requireAuth, async (req, res) => {
  try {
    res.status(201).json({ message: "Refund request submitted. Our team will review it within 24 hours." });
  } catch (err) {
    logger.error({ err }, "Refund request error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/billing/coupons/validate
router.post("/coupons/validate", async (req, res) => {
  try {
    const { code } = req.body;
    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase()));
    if (!coupon || !coupon.active) {
      res.json({ valid: false, code });
      return;
    }
    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: parseFloat(coupon.discountValue),
      description: coupon.description,
    });
  } catch (err) {
    logger.error({ err }, "Validate coupon error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
