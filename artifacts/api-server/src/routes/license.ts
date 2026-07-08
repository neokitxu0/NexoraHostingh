import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, licenseAdminsTable, licenseProductsTable, licenseKeysTable, licenseCustomersTable, licenseOrdersTable, licenseVerificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();
const LIC_JWT_SECRET = process.env.JWT_SECRET ?? "nexora-secret-key-change-in-production";

function licenseToken(payload: { id: number; email: string; role: "admin" | "customer" }) {
  return jwt.sign(payload, LIC_JWT_SECRET, { expiresIn: "7d" });
}

function requireLicAdmin(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const p = jwt.verify(auth.slice(7), LIC_JWT_SECRET) as any;
    if (p.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    req.licUser = p;
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
}

function requireLicCustomer(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const p = jwt.verify(auth.slice(7), LIC_JWT_SECRET) as any;
    req.licUser = p;
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
}

function generateKey(): string {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NXLIC-${seg()}-${seg()}-${seg()}-${seg()}`;
}

function parseFeatures(raw: string | null | undefined): string[] {
  try { return JSON.parse(raw ?? "[]"); } catch { return []; }
}

function keyShape(k: any, productMap: Record<number, any>, customerMap: Record<number, any>) {
  return {
    ...k,
    keyString: k.key,
    productName: productMap[k.productId]?.name ?? "Unknown",
    customerEmail: k.customerId ? customerMap[k.customerId]?.email ?? null : null,
    maxInstances: k.maxDomains,
    instanceCount: parseFeatures(k.activatedDomains).length,
    activatedDomains: parseFeatures(k.activatedDomains),
  };
}

// Auto-seed admin on startup
async function ensureAdmin() {
  try {
    const existing = await db.select().from(licenseAdminsTable).limit(1);
    if (existing.length === 0) {
      const hash = await bcrypt.hash("nexora", 12);
      await db.insert(licenseAdminsTable).values({ email: "nexora@localhost.com", passwordHash: hash, name: "Nexora Admin" });
      logger.info("License admin seeded: nexora@localhost.com / nexora");
    }
  } catch (err) { logger.error({ err }, "License admin seed failed"); }
}
ensureAdmin();

// ─── AUTH ──────────────────────────────────────────────────────

// POST /api/lic/admin/login
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [admin] = await db.select().from(licenseAdminsTable).where(eq(licenseAdminsTable.email, (email ?? "").toLowerCase()));
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" }); return;
    }
    res.json({ token: licenseToken({ id: admin.id, email: admin.email, role: "admin" }), name: admin.name });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// POST /api/lic/portal/login
router.post("/portal/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [cust] = await db.select().from(licenseCustomersTable).where(eq(licenseCustomersTable.email, (email ?? "").toLowerCase()));
    if (!cust || !(await bcrypt.compare(password, cust.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" }); return;
    }
    res.json({ token: licenseToken({ id: cust.id, email: cust.email, role: "customer" }), name: cust.name });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// POST /api/lic/verify (public)
router.post("/verify", async (req, res) => {
  try {
    const { key, domain } = req.body;
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.socket.remoteAddress ?? "unknown";
    const [lic] = await db.select().from(licenseKeysTable).where(eq(licenseKeysTable.key, key));
    const products = await db.select().from(licenseProductsTable);
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));
    let status: string;
    if (!lic) status = "invalid";
    else if (lic.status === "suspended") status = "suspended";
    else if (lic.expiresAt && new Date() > lic.expiresAt) status = "expired";
    else status = "valid";
    if (lic) {
      await db.insert(licenseVerificationsTable).values({ key, domain: domain ?? null, ipAddress: ip, status });
    }
    res.json({
      valid: status === "valid",
      status,
      key,
      productName: lic ? productMap[lic.productId]?.name : undefined,
      expiresAt: lic?.expiresAt ?? null,
    });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// ─── ADMIN: STATS ──────────────────────────────────────────────

// GET /api/lic/admin/stats
router.get("/admin/stats", requireLicAdmin, async (req, res) => {
  try {
    const products = await db.select().from(licenseProductsTable);
    const keys = await db.select().from(licenseKeysTable);
    const customers = await db.select().from(licenseCustomersTable);
    res.json({
      totalProducts: products.length,
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.status === "active").length,
      totalCustomers: customers.length,
    });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// ─── ADMIN: PRODUCTS ───────────────────────────────────────────

// GET /api/lic/admin/products
router.get("/admin/products", requireLicAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(licenseProductsTable).orderBy(desc(licenseProductsTable.createdAt));
    res.json({ data: rows.map(r => ({ ...r, price: parseFloat(r.price), maxInstances: r.maxDomains, features: parseFeatures((r as any).features) })) });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// POST /api/lic/admin/products
router.post("/admin/products", requireLicAdmin, async (req, res) => {
  try {
    const { name, description, price, maxInstances, durationDays, features } = req.body;
    const [row] = await (db.insert(licenseProductsTable) as any).values({
      name, description, price: String(price ?? 0),
      durationDays: durationDays ?? null,
      maxDomains: maxInstances ?? 1,
      available: true,
      features: JSON.stringify(features ?? []),
    }).returning();
    res.status(201).json({ ...row, price: parseFloat(row.price), maxInstances: row.maxDomains, features: parseFeatures(row.features) });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// PATCH /api/lic/admin/products/:id
router.patch("/admin/products/:id", requireLicAdmin, async (req, res) => {
  try {
    const { name, description, price, maxInstances, durationDays, features, available } = req.body;
    const update: Record<string, any> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = String(price);
    if (maxInstances !== undefined) update.maxDomains = maxInstances;
    if (durationDays !== undefined) update.durationDays = durationDays;
    if (features !== undefined) update.features = JSON.stringify(features);
    if (available !== undefined) update.available = available;
    const [row] = await (db.update(licenseProductsTable) as any).set(update).where(eq(licenseProductsTable.id, Number(req.params.id))).returning();
    res.json({ ...row, price: parseFloat(row.price), maxInstances: row.maxDomains, features: parseFeatures(row.features) });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// DELETE /api/lic/admin/products/:id
router.delete("/admin/products/:id", requireLicAdmin, async (req, res) => {
  try {
    await db.delete(licenseProductsTable).where(eq(licenseProductsTable.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// ─── ADMIN: KEYS ───────────────────────────────────────────────

// GET /api/lic/admin/keys
router.get("/admin/keys", requireLicAdmin, async (req, res) => {
  try {
    const { status, limit } = req.query as Record<string, string>;
    const allKeys = await db.select().from(licenseKeysTable).orderBy(desc(licenseKeysTable.createdAt));
    const products = await db.select().from(licenseProductsTable);
    const customers = await db.select().from(licenseCustomersTable);
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));
    const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));
    let filtered = status && status !== "all" ? allKeys.filter(k => k.status === status) : allKeys;
    if (limit) filtered = filtered.slice(0, Number(limit));
    res.json({ data: filtered.map(k => keyShape(k, productMap, customerMap)) });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// POST /api/lic/admin/keys
router.post("/admin/keys", requireLicAdmin, async (req, res) => {
  try {
    const { productId, customerId, count = 1, note, durationDays } = req.body;
    if (!productId) { res.status(400).json({ error: "productId required" }); return; }
    let expiresAt: Date | null = null;
    if (durationDays) { expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + durationDays); }
    const created = [];
    for (let i = 0; i < Math.min(Number(count), 100); i++) {
      const [row] = await db.insert(licenseKeysTable).values({
        key: generateKey(),
        productId,
        customerId: customerId ?? null,
        maxDomains: 1,
        expiresAt,
        notes: note ?? null,
        status: "active",
      }).returning();
      created.push(row);
    }
    res.status(201).json({ data: created.map(k => ({ ...k, keyString: k.key })) });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// POST /api/lic/admin/keys/:id/suspend
router.post("/admin/keys/:id/suspend", requireLicAdmin, async (req, res) => {
  try {
    const [current] = await db.select().from(licenseKeysTable).where(eq(licenseKeysTable.id, Number(req.params.id)));
    if (!current) { res.status(404).json({ error: "Key not found" }); return; }
    const newStatus = current.status === "suspended" ? "active" : "suspended";
    const [row] = await db.update(licenseKeysTable).set({ status: newStatus }).where(eq(licenseKeysTable.id, current.id)).returning();
    res.json({ ...row, keyString: row.key });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// DELETE /api/lic/admin/keys/:id
router.delete("/admin/keys/:id", requireLicAdmin, async (req, res) => {
  try {
    await db.delete(licenseKeysTable).where(eq(licenseKeysTable.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// ─── ADMIN: CUSTOMERS ──────────────────────────────────────────

// GET /api/lic/admin/customers
router.get("/admin/customers", requireLicAdmin, async (req, res) => {
  try {
    const customers = await db.select({ id: licenseCustomersTable.id, email: licenseCustomersTable.email, name: licenseCustomersTable.name, createdAt: licenseCustomersTable.createdAt }).from(licenseCustomersTable).orderBy(desc(licenseCustomersTable.createdAt));
    const keys = await db.select().from(licenseKeysTable);
    const keyCount: Record<number, number> = {};
    for (const k of keys) { if (k.customerId) keyCount[k.customerId] = (keyCount[k.customerId] ?? 0) + 1; }
    res.json({ data: customers.map(c => ({ ...c, keyCount: keyCount[c.id] ?? 0 })) });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// POST /api/lic/admin/customers
router.post("/admin/customers", requireLicAdmin, async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }
    const existing = await db.select().from(licenseCustomersTable).where(eq(licenseCustomersTable.email, email.toLowerCase()));
    if (existing.length > 0) { res.status(409).json({ error: "Email already registered" }); return; }
    const [row] = await db.insert(licenseCustomersTable).values({ email: email.toLowerCase(), name: name ?? email, passwordHash: await bcrypt.hash(password, 12) }).returning();
    res.status(201).json({ id: row.id, email: row.email, name: row.name, createdAt: row.createdAt });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// ─── PORTAL: CUSTOMER SELF-SERVICE ────────────────────────────

// GET /api/lic/portal/keys
router.get("/portal/keys", requireLicCustomer, async (req: any, res) => {
  try {
    const keys = await db.select().from(licenseKeysTable).where(eq(licenseKeysTable.customerId, req.licUser.id));
    const products = await db.select().from(licenseProductsTable);
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));
    res.json({ data: keys.map(k => ({
      ...k,
      keyString: k.key,
      productName: productMap[k.productId]?.name ?? "Unknown",
      maxInstances: k.maxDomains,
      instanceCount: parseFeatures(k.activatedDomains).length,
      activatedDomains: parseFeatures(k.activatedDomains),
    })) });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// ─── PUBLIC ────────────────────────────────────────────────────

// GET /api/lic/products (public)
router.get("/products", async (req, res) => {
  try {
    const rows = await db.select().from(licenseProductsTable).where(eq(licenseProductsTable.available, true));
    res.json({ data: rows.map(r => ({ ...r, price: parseFloat(r.price), maxInstances: r.maxDomains, features: parseFeatures((r as any).features) })) });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// GET /api/lic/admin/verifications
router.get("/admin/verifications", requireLicAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(licenseVerificationsTable).orderBy(desc(licenseVerificationsTable.createdAt)).limit(200);
    res.json({ data: rows });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

// GET /api/lic/admin/orders
router.get("/admin/orders", requireLicAdmin, async (req, res) => {
  try {
    const orders = await db.select().from(licenseOrdersTable).orderBy(desc(licenseOrdersTable.createdAt));
    res.json({ data: orders.map(o => ({ ...o, amount: parseFloat(o.amount) })) });
  } catch (err) { logger.error({ err }); res.status(500).json({ error: "Server error" }); }
});

export default router;
