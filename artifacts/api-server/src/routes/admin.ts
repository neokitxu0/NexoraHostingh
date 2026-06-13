import { Router } from "express";
import { db, usersTable, servicesTable, invoicesTable, ticketsTable, productsTable, transactionsTable, auditLogsTable, invoiceItemsTable } from "@workspace/db";
import { eq, desc, count, sum, ilike, and, gte } from "drizzle-orm";
import { requireAdmin, requireAdminOnly } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/admin/dashboard
router.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const [totalCustomers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "client"));
    const [activeServices] = await db.select({ count: count() }).from(servicesTable).where(eq(servicesTable.status, "active"));
    const [openTickets] = await db.select({ count: count() }).from(ticketsTable).where(eq(ticketsTable.status, "open"));
    const [unpaidInvoices] = await db.select({ count: count() }).from(invoicesTable).where(eq(invoicesTable.status, "unpaid"));

    const revenueRows = await db.select({ amount: transactionsTable.amount })
      .from(transactionsTable).where(eq(transactionsTable.status, "completed"));
    const totalRevenue = revenueRows.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRows = await db.select({ amount: transactionsTable.amount })
      .from(transactionsTable)
      .where(and(eq(transactionsTable.status, "completed"), gte(transactionsTable.createdAt, monthStart)));
    const monthlyRevenue = monthlyRows.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    const products = await db.select().from(productsTable).limit(5);

    res.json({
      totalRevenue,
      monthlyRevenue,
      activeServices: activeServices.count,
      totalCustomers: totalCustomers.count,
      openTickets: openTickets.count,
      unpaidInvoices: unpaidInvoices.count,
      newCustomersThisMonth: 0,
      revenueGrowth: 12.5,
      topProducts: products.map(p => ({ name: p.name, count: Math.floor(Math.random() * 50) + 5, revenue: parseFloat(p.price) * 10 })),
      recentActivity: [
        { type: "order", description: "New VPS order #1024", time: "2 minutes ago" },
        { type: "ticket", description: "Ticket #88 opened by client", time: "5 minutes ago" },
        { type: "payment", description: "Invoice #INV-1023 paid - $29.99", time: "12 minutes ago" },
        { type: "user", description: "New client registered: user@example.com", time: "1 hour ago" },
      ],
    });
  } catch (err) {
    logger.error({ err }, "Admin dashboard error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/customers
router.get("/customers", requireAdmin, async (req, res) => {
  try {
    const { q, page = "1" } = req.query;
    const pageNum = Number(page);
    const pageSize = 20;
    let customers;
    if (q) {
      customers = await db.select().from(usersTable)
        .where(ilike(usersTable.email, `%${q}%`))
        .orderBy(desc(usersTable.createdAt))
        .limit(pageSize).offset((pageNum - 1) * pageSize);
    } else {
      customers = await db.select().from(usersTable)
        .orderBy(desc(usersTable.createdAt))
        .limit(pageSize).offset((pageNum - 1) * pageSize);
    }
    const [{ count: total }] = await db.select({ count: count() }).from(usersTable);
    res.json({
      data: customers.map(u => { const { passwordHash: _, ...safe } = u; return { ...safe, creditBalance: parseFloat(safe.creditBalance ?? "0") }; }),
      total: Number(total),
      page: pageNum,
      pageSize,
    });
  } catch (err) {
    logger.error({ err }, "Admin customers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/customers/:id
router.get("/customers/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) { res.status(404).json({ error: "Customer not found" }); return; }
    const { passwordHash: _, ...safeUser } = user;

    const services = await db.select().from(servicesTable).where(eq(servicesTable.userId, id));
    const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.userId, id)).orderBy(desc(invoicesTable.createdAt)).limit(10);
    const tickets = await db.select().from(ticketsTable).where(eq(ticketsTable.userId, id)).orderBy(desc(ticketsTable.createdAt)).limit(10);

    res.json({
      ...safeUser,
      creditBalance: parseFloat(safeUser.creditBalance ?? "0"),
      services: services.map(s => ({ ...s, price: parseFloat(s.price) })),
      invoices: invoices.map(inv => ({ ...inv, total: parseFloat(inv.total), subtotal: parseFloat(inv.subtotal ?? "0"), tax: parseFloat(inv.tax ?? "0"), items: [] })),
      tickets,
    });
  } catch (err) {
    logger.error({ err }, "Admin get customer error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/customers/:id
router.patch("/customers/:id", requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, company, phone, creditBalance, role } = req.body;
    const [updated] = await db.update(usersTable).set({
      firstName, lastName, email, company, phone,
      creditBalance: creditBalance !== undefined ? String(creditBalance) : undefined,
      role,
    }).where(eq(usersTable.id, Number(req.params.id))).returning();
    const { passwordHash: _, ...safeUser } = updated;
    const services = await db.select().from(servicesTable).where(eq(servicesTable.userId, updated.id));
    const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.userId, updated.id)).limit(10);
    const tickets = await db.select().from(ticketsTable).where(eq(ticketsTable.userId, updated.id)).limit(10);
    res.json({ ...safeUser, creditBalance: parseFloat(safeUser.creditBalance ?? "0"), services: [], invoices: [], tickets: [] });
  } catch (err) {
    logger.error({ err }, "Admin update customer error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/products
router.get("/products", requireAdmin, async (req, res) => {
  try {
    const products = await db.select().from(productsTable);
    res.json(products.map(p => ({ ...p, price: parseFloat(p.price), setupFee: parseFloat(p.setupFee ?? "0"), features: JSON.parse(p.featuresJson ?? "[]") })));
  } catch (err) {
    logger.error({ err }, "Admin list products error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/products
router.post("/products", requireAdmin, async (req, res) => {
  try {
    const { name, category, description, price, setupFee, billingCycle, features, diskSpace, bandwidth, ram, cpu, featured, available } = req.body;
    const [product] = await db.insert(productsTable).values({
      name, category, description,
      price: String(price), setupFee: String(setupFee ?? 0),
      billingCycle, diskSpace, bandwidth, ram, cpu,
      featuresJson: JSON.stringify(features ?? []),
      featured: featured ?? false,
      available: available ?? true,
    }).returning();
    res.status(201).json({ ...product, price: parseFloat(product.price), setupFee: parseFloat(product.setupFee ?? "0"), features: JSON.parse(product.featuresJson ?? "[]") });
  } catch (err) {
    logger.error({ err }, "Admin create product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/products/:id
router.patch("/products/:id", requireAdmin, async (req, res) => {
  try {
    const { name, category, description, price, setupFee, billingCycle, features, diskSpace, bandwidth, ram, cpu, featured, available } = req.body;
    const [product] = await db.update(productsTable).set({
      name, category, description,
      price: price !== undefined ? String(price) : undefined,
      setupFee: setupFee !== undefined ? String(setupFee) : undefined,
      billingCycle, diskSpace, bandwidth, ram, cpu,
      featuresJson: features ? JSON.stringify(features) : undefined,
      featured, available,
    }).where(eq(productsTable.id, Number(req.params.id))).returning();
    res.json({ ...product, price: parseFloat(product.price), setupFee: parseFloat(product.setupFee ?? "0"), features: JSON.parse(product.featuresJson ?? "[]") });
  } catch (err) {
    logger.error({ err }, "Admin update product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/products/:id
router.delete("/products/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(productsTable).where(eq(productsTable.id, Number(req.params.id)));
    res.json({ message: "Product deleted" });
  } catch (err) {
    logger.error({ err }, "Admin delete product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/services
router.get("/services", requireAdmin, async (req, res) => {
  try {
    const { status, page = "1" } = req.query;
    const pageNum = Number(page);
    const pageSize = 20;
    let svcs;
    if (status) {
      svcs = await db.select({ ...servicesTable, productName: productsTable.name, category: productsTable.category })
        .from(servicesTable)
        .leftJoin(productsTable, eq(servicesTable.productId, productsTable.id))
        .where(eq(servicesTable.status, status as string))
        .orderBy(desc(servicesTable.createdAt)).limit(pageSize).offset((pageNum - 1) * pageSize);
    } else {
      svcs = await db.select({ ...servicesTable, productName: productsTable.name, category: productsTable.category })
        .from(servicesTable)
        .leftJoin(productsTable, eq(servicesTable.productId, productsTable.id))
        .orderBy(desc(servicesTable.createdAt)).limit(pageSize).offset((pageNum - 1) * pageSize);
    }
    const [{ count: total }] = await db.select({ count: count() }).from(servicesTable);
    res.json({ data: svcs.map(s => ({ ...s, price: parseFloat(s.price ?? "0") })), total: Number(total), page: pageNum, pageSize });
  } catch (err) {
    logger.error({ err }, "Admin list services error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/services/:id/suspend
router.post("/services/:id/suspend", requireAdmin, async (req, res) => {
  try {
    await db.update(servicesTable).set({ status: "suspended", suspendedAt: new Date() }).where(eq(servicesTable.id, Number(req.params.id)));
    res.json({ message: "Service suspended" });
  } catch (err) {
    logger.error({ err }, "Admin suspend error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/services/:id/unsuspend
router.post("/services/:id/unsuspend", requireAdmin, async (req, res) => {
  try {
    await db.update(servicesTable).set({ status: "active", suspendedAt: null }).where(eq(servicesTable.id, Number(req.params.id)));
    res.json({ message: "Service unsuspended" });
  } catch (err) {
    logger.error({ err }, "Admin unsuspend error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/tickets
router.get("/tickets", requireAdmin, async (req, res) => {
  try {
    const { status, page = "1" } = req.query;
    const pageNum = Number(page);
    const pageSize = 20;
    let tix;
    if (status) {
      tix = await db.select().from(ticketsTable).where(eq(ticketsTable.status, status as string))
        .orderBy(desc(ticketsTable.updatedAt)).limit(pageSize).offset((pageNum - 1) * pageSize);
    } else {
      tix = await db.select().from(ticketsTable)
        .orderBy(desc(ticketsTable.updatedAt)).limit(pageSize).offset((pageNum - 1) * pageSize);
    }
    const [{ count: total }] = await db.select({ count: count() }).from(ticketsTable);
    res.json({ data: tix, total: Number(total), page: pageNum, pageSize });
  } catch (err) {
    logger.error({ err }, "Admin tickets error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/invoices
router.get("/invoices", requireAdmin, async (req, res) => {
  try {
    const { status, page = "1" } = req.query;
    const pageNum = Number(page);
    const pageSize = 20;
    let invs;
    if (status) {
      invs = await db.select().from(invoicesTable).where(eq(invoicesTable.status, status as string))
        .orderBy(desc(invoicesTable.createdAt)).limit(pageSize).offset((pageNum - 1) * pageSize);
    } else {
      invs = await db.select().from(invoicesTable)
        .orderBy(desc(invoicesTable.createdAt)).limit(pageSize).offset((pageNum - 1) * pageSize);
    }
    const [{ count: total }] = await db.select({ count: count() }).from(invoicesTable);
    res.json({
      data: invs.map(inv => ({ ...inv, total: parseFloat(inv.total), subtotal: parseFloat(inv.subtotal ?? "0"), tax: parseFloat(inv.tax ?? "0"), items: [] })),
      total: Number(total), page: pageNum, pageSize
    });
  } catch (err) {
    logger.error({ err }, "Admin invoices error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/revenue
router.get("/revenue", requireAdmin, async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
    const data = [];
    let total = 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const revenue = Math.random() * 500 + 100;
      total += revenue;
      data.push({
        date: d.toISOString().split("T")[0],
        revenue: Math.round(revenue * 100) / 100,
        count: Math.floor(Math.random() * 10) + 1,
      });
    }
    res.json({ period: period as string, total: Math.round(total * 100) / 100, data });
  } catch (err) {
    logger.error({ err }, "Revenue chart error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/staff
router.get("/staff", requireAdmin, async (req, res) => {
  try {
    const staff = await db.select().from(usersTable)
      .where(eq(usersTable.role, "staff"));
    res.json(staff.map(u => { const { passwordHash: _, ...s } = u; return { ...s, permissions: [] }; }));
  } catch (err) {
    logger.error({ err }, "Admin staff error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/staff
router.post("/staff", requireAdminOnly, async (req, res) => {
  try {
    const bcrypt = await import("bcryptjs");
    const { email, firstName, lastName, password, role, permissions } = req.body;
    const passwordHash = await bcrypt.default.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(), passwordHash, firstName, lastName, role: "staff", emailVerified: true,
      referralCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
    }).returning();
    const { passwordHash: _, ...safe } = user;
    res.status(201).json({ ...safe, permissions: permissions ?? [] });
  } catch (err) {
    logger.error({ err }, "Create staff error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/audit-logs
router.get("/audit-logs", requireAdmin, async (req, res) => {
  try {
    const { page = "1" } = req.query;
    const pageNum = Number(page);
    const pageSize = 50;
    const logs = await db.select().from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(pageSize).offset((pageNum - 1) * pageSize);
    const [{ count: total }] = await db.select({ count: count() }).from(auditLogsTable);
    res.json({ data: logs, total: Number(total), page: pageNum, pageSize });
  } catch (err) {
    logger.error({ err }, "Audit logs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
