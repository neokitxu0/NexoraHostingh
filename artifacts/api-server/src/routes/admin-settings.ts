import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

const SETTING_GROUPS = ["smtp", "discord", "branding", "company", "invoice", "tax", "currency", "general", "pterodactyl", "proxmox"];

// GET /api/admin/settings?group=smtp
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { group } = req.query;
    let rows;
    if (group) {
      rows = await db.select().from(settingsTable).where(eq(settingsTable.group, group as string));
    } else {
      rows = await db.select().from(settingsTable);
    }
    const result: Record<string, string | null> = {};
    for (const row of rows) {
      const masked = ["smtp_password", "pterodactyl_app_key", "pterodactyl_client_key", "proxmox_token_secret", "stripe_secret_key", "paypal_secret", "razorpay_key_secret"];
      result[row.key] = masked.includes(row.key) && row.value ? "••••••••" : row.value;
    }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Get settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/settings — bulk upsert
router.put("/", requireAdmin, async (req, res) => {
  try {
    const settings = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(settings)) {
      if (value === "••••••••") continue;
      const group = key.split("_")[0];
      const validGroup = SETTING_GROUPS.includes(group) ? group : "general";
      await db.insert(settingsTable)
        .values({ key, value: String(value), group: validGroup })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value: String(value), updatedAt: new Date() } });
    }
    res.json({ message: "Settings saved" });
  } catch (err) {
    logger.error({ err }, "Save settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/settings/test-smtp
router.post("/test-smtp", requireAdmin, async (req, res) => {
  try {
    const { to } = req.body;
    const { sendEmail } = await import("../lib/mailer");
    const ok = await sendEmail(to, "SMTP Test — NexoraHosting", "<p>Your SMTP configuration is working correctly.</p>");
    if (ok) {
      res.json({ message: `Test email sent to ${to}` });
    } else {
      res.status(400).json({ error: "SMTP not configured or send failed" });
    }
  } catch (err) {
    logger.error({ err }, "Test SMTP error");
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/admin/settings/test-discord
router.post("/test-discord", requireAdmin, async (req, res) => {
  try {
    const { sendDiscordNotification } = await import("../lib/discord");
    await sendDiscordNotification("Discord Test", "NexoraHosting Discord integration is working!", "success");
    res.json({ message: "Discord test notification sent" });
  } catch (err) {
    logger.error({ err }, "Test Discord error");
    res.status(500).json({ error: String(err) });
  }
});

export default router;
