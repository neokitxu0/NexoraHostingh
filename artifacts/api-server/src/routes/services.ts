import { Router } from "express";
import { db, servicesTable, productsTable, invoicesTable, invoiceItemsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function formatService(s: any, productName?: string) {
  return {
    ...s,
    price: parseFloat(s.price),
    productName: productName ?? s.productName ?? "Unknown",
  };
}

// GET /api/services
router.get("/", requireAuth, async (req, res) => {
  try {
    const services = await db
      .select({
        id: servicesTable.id,
        productId: servicesTable.productId,
        productName: productsTable.name,
        category: productsTable.category,
        status: servicesTable.status,
        domain: servicesTable.domain,
        ipAddress: servicesTable.ipAddress,
        username: servicesTable.username,
        billingCycle: servicesTable.billingCycle,
        price: servicesTable.price,
        nextDueDate: servicesTable.nextDueDate,
        createdAt: servicesTable.createdAt,
      })
      .from(servicesTable)
      .leftJoin(productsTable, eq(servicesTable.productId, productsTable.id))
      .where(eq(servicesTable.userId, req.user!.id))
      .orderBy(desc(servicesTable.createdAt));

    res.json(services.map(s => ({ ...s, price: parseFloat(s.price ?? "0") })));
  } catch (err) {
    logger.error({ err }, "List services error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/services/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const [service] = await db
      .select({
        id: servicesTable.id,
        productId: servicesTable.productId,
        productName: productsTable.name,
        category: productsTable.category,
        status: servicesTable.status,
        domain: servicesTable.domain,
        ipAddress: servicesTable.ipAddress,
        username: servicesTable.username,
        billingCycle: servicesTable.billingCycle,
        price: servicesTable.price,
        nextDueDate: servicesTable.nextDueDate,
        createdAt: servicesTable.createdAt,
      })
      .from(servicesTable)
      .leftJoin(productsTable, eq(servicesTable.productId, productsTable.id))
      .where(and(eq(servicesTable.id, Number(req.params.id)), eq(servicesTable.userId, req.user!.id)));

    if (!service) { res.status(404).json({ error: "Service not found" }); return; }
    res.json({ ...service, price: parseFloat(service.price ?? "0") });
  } catch (err) {
    logger.error({ err }, "Get service error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/services/:id/cancel
router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const { reason, cancelType } = req.body;
    await db.update(servicesTable)
      .set({ status: cancelType === "immediate" ? "cancelled" : "cancelled", cancelReason: reason, cancelledAt: new Date() })
      .where(and(eq(servicesTable.id, Number(req.params.id)), eq(servicesTable.userId, req.user!.id)));
    res.json({ message: "Service cancellation request submitted" });
  } catch (err) {
    logger.error({ err }, "Cancel service error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/services/order
router.post("/order", requireAuth, async (req, res) => {
  try {
    const { productId, billingCycle, domain, couponCode, paymentMethod, serverName, serverDesc } = req.body;
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }

    // Create service
    const dueDate = new Date();
    if (billingCycle === "monthly") dueDate.setMonth(dueDate.getMonth() + 1);
    else if (billingCycle === "annual") dueDate.setFullYear(dueDate.getFullYear() + 1);
    else dueDate.setMonth(dueDate.getMonth() + 1);

    const [service] = await db.insert(servicesTable).values({
      userId: req.user!.id,
      productId,
      status: "pending",
      domain: domain ?? null,
      serverName: serverName ?? null,
      serverDesc: serverDesc ?? null,
      billingCycle,
      price: product.price,
      nextDueDate: dueDate.toISOString().split("T")[0],
    }).returning();

    // Create invoice
    const invoiceNumber = `INV-${Date.now()}`;
    const [invoice] = await db.insert(invoicesTable).values({
      userId: req.user!.id,
      number: invoiceNumber,
      status: "unpaid",
      subtotal: product.price,
      tax: "0",
      total: product.price,
      dueDate: dueDate.toISOString().split("T")[0],
    }).returning();

    await db.insert(invoiceItemsTable).values({
      invoiceId: invoice.id,
      description: `${product.name} (${billingCycle})`,
      amount: product.price,
      quantity: 1,
    });

    res.status(201).json({
      orderId: service.id,
      invoiceId: invoice.id,
      totalAmount: parseFloat(product.price),
      status: "pending",
      paymentUrl: null,
    });
  } catch (err) {
    logger.error({ err }, "Order service error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
