import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  serviceId: integer("service_id"),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("general"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ticketRepliesTable = pgTable("ticket_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  userId: integer("user_id"),
  senderType: text("sender_type").notNull().default("client"),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  attachmentsJson: text("attachments_json").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
export type TicketReply = typeof ticketRepliesTable.$inferSelect;
