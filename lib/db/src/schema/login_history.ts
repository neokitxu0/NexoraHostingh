import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const loginHistoryTable = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  country: text("country"),
  success: boolean("success").notNull().default(true),
  failReason: text("fail_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLoginHistorySchema = createInsertSchema(loginHistoryTable).omit({ id: true, createdAt: true });
export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;
export type LoginHistory = typeof loginHistoryTable.$inferSelect;
