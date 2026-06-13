import { Router } from "express";
import { db, ticketsTable, ticketRepliesTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/tickets
router.get("/", requireAuth, async (req, res) => {
  try {
    const tickets = await db.select().from(ticketsTable)
      .where(eq(ticketsTable.userId, req.user!.id))
      .orderBy(desc(ticketsTable.updatedAt));
    res.json(tickets);
  } catch (err) {
    logger.error({ err }, "List tickets error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tickets
router.post("/", requireAuth, async (req, res) => {
  try {
    const { subject, category, priority, message, serviceId } = req.body;
    const [ticket] = await db.insert(ticketsTable).values({
      userId: req.user!.id,
      subject,
      category,
      priority,
      status: "open",
      serviceId: serviceId ?? null,
    }).returning();

    const [user] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable).where(eq(usersTable.id, req.user!.id));

    await db.insert(ticketRepliesTable).values({
      ticketId: ticket.id,
      userId: req.user!.id,
      senderType: "client",
      senderName: `${user.firstName} ${user.lastName}`,
      message,
      attachmentsJson: "[]",
    });

    res.status(201).json(ticket);
  } catch (err) {
    logger.error({ err }, "Create ticket error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tickets/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const [ticket] = await db.select().from(ticketsTable)
      .where(and(eq(ticketsTable.id, Number(req.params.id)), eq(ticketsTable.userId, req.user!.id)));
    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
    const replies = await db.select().from(ticketRepliesTable)
      .where(eq(ticketRepliesTable.ticketId, ticket.id))
      .orderBy(ticketRepliesTable.createdAt);
    res.json({ ...ticket, replies: replies.map(r => ({ ...r, attachments: JSON.parse(r.attachmentsJson ?? "[]") })) });
  } catch (err) {
    logger.error({ err }, "Get ticket error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tickets/:id/reply
router.post("/:id/reply", requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const [user] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable).where(eq(usersTable.id, req.user!.id));

    const [reply] = await db.insert(ticketRepliesTable).values({
      ticketId: Number(req.params.id),
      userId: req.user!.id,
      senderType: "client",
      senderName: `${user.firstName} ${user.lastName}`,
      message,
      attachmentsJson: "[]",
    }).returning();

    await db.update(ticketsTable).set({ status: "pending", updatedAt: new Date() })
      .where(eq(ticketsTable.id, Number(req.params.id)));

    res.status(201).json({ ...reply, attachments: [] });
  } catch (err) {
    logger.error({ err }, "Reply ticket error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tickets/:id/close
router.post("/:id/close", requireAuth, async (req, res) => {
  try {
    await db.update(ticketsTable).set({ status: "closed" })
      .where(and(eq(ticketsTable.id, Number(req.params.id)), eq(ticketsTable.userId, req.user!.id)));
    res.json({ message: "Ticket closed" });
  } catch (err) {
    logger.error({ err }, "Close ticket error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
