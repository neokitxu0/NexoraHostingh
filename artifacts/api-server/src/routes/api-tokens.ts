import { Router } from "express";
import { db, apiTokensTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/api-tokens
router.get("/", requireAuth, async (req, res) => {
  try {
    const tokens = await db.select().from(apiTokensTable).where(eq(apiTokensTable.userId, req.user!.id));
    res.json(tokens.map(t => ({
      id: t.id,
      name: t.name,
      prefix: t.prefix,
      permissions: JSON.parse(t.permissionsJson ?? "[]"),
      lastUsed: t.lastUsed,
      expiresAt: t.expiresAt,
      createdAt: t.createdAt,
    })));
  } catch (err) {
    logger.error({ err }, "List API tokens error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/api-tokens
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, permissions, expiresAt } = req.body;
    const rawToken = `nxr_${crypto.randomBytes(32).toString("hex")}`;
    const prefix = rawToken.slice(0, 12);
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const [token] = await db.insert(apiTokensTable).values({
      userId: req.user!.id,
      name,
      tokenHash,
      prefix,
      permissionsJson: JSON.stringify(permissions ?? []),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();

    res.status(201).json({
      id: token.id,
      name: token.name,
      token: rawToken,
      prefix: token.prefix,
      createdAt: token.createdAt,
    });
  } catch (err) {
    logger.error({ err }, "Create API token error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/api-tokens/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(apiTokensTable)
      .where(and(eq(apiTokensTable.id, Number(req.params.id)), eq(apiTokensTable.userId, req.user!.id)));
    res.json({ message: "API token deleted" });
  } catch (err) {
    logger.error({ err }, "Delete API token error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
