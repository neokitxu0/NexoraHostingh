import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredEmail: text("referred_email").notNull(),
  referredUserId: integer("referred_user_id"),
  status: text("status").notNull().default("pending"),
  earnings: numeric("earnings", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReferralSchema = createInsertSchema(referralsTable).omit({ id: true, createdAt: true });
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referralsTable.$inferSelect;
