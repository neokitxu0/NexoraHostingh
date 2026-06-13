import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const affiliateWithdrawalsTable = pgTable("affiliate_withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull().default("bank"),
  accountDetails: text("account_details"),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAffiliateWithdrawalSchema = createInsertSchema(affiliateWithdrawalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAffiliateWithdrawal = z.infer<typeof insertAffiliateWithdrawalSchema>;
export type AffiliateWithdrawal = typeof affiliateWithdrawalsTable.$inferSelect;
