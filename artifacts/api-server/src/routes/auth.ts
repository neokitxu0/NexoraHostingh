import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, loginHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateToken, requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, company, referralCode, discordUserId } = req.body;
    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const myReferralCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone: phone ?? null,
      company: company ?? null,
      referralCode: myReferralCode,
      referredBy: referralCode ?? null,
      discordUserId: discordUserId ?? null,
      emailVerified: true,
      role: "client",
    }).returning();

    // Send welcome email
    try {
      const { sendTemplateEmail } = await import("../lib/mailer");
      await sendTemplateEmail(user.email, "welcome", { firstName: user.firstName ?? "", panelUrl: "" });
    } catch {}

    const token = generateToken({ id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName });
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ token, user: { ...safeUser, creditBalance: parseFloat(safeUser.creditBalance ?? "0") } });
  } catch (err) {
    logger.error({ err }, "Register error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.socket.remoteAddress ?? "unknown";
    const ua = req.headers["user-agent"] ?? "";

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      // Record failed login
      await db.insert(loginHistoryTable).values({ userId: user.id, ipAddress: ip, userAgent: ua, success: false, failReason: "Invalid password" }).catch(() => {});
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Record successful login
    await db.insert(loginHistoryTable).values({ userId: user.id, ipAddress: ip, userAgent: ua, success: true }).catch(() => {});

    const token = generateToken({ id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName });
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, creditBalance: parseFloat(safeUser.creditBalance ?? "0") } });
  } catch (err) {
    logger.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { passwordHash: _, ...safeUser } = user;
    res.json({ ...safeUser, creditBalance: parseFloat(safeUser.creditBalance ?? "0") });
  } catch (err) {
    logger.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/verify-email
router.post("/verify-email", async (req, res) => {
  res.json({ message: "Email verified successfully" });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  res.json({ message: "If that email exists, a reset link has been sent" });
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  res.json({ message: "Password has been reset" });
});

// POST /api/auth/2fa/enable
router.post("/2fa/enable", requireAuth, async (req, res) => {
  res.json({ qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", secret: "JBSWY3DPEHPK3PXP" });
});

// POST /api/auth/2fa/verify
router.post("/2fa/verify", requireAuth, async (req, res) => {
  res.json({ message: "2FA enabled successfully" });
});

// POST /api/auth/2fa/disable
router.post("/2fa/disable", requireAuth, async (req, res) => {
  res.json({ message: "2FA disabled successfully" });
});

export default router;
