import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  invoiceId: integer("invoice_id"),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("completed"),
  paymentMethod: text("payment_method"),
  gateway: text("gateway"),
  gatewayRef: text("gateway_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
