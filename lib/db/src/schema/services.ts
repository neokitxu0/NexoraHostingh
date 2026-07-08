import { pgTable, text, serial, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  status: text("status").notNull().default("pending"),
  domain: text("domain"),
  ipAddress: text("ip_address"),
  username: text("username"),
  password: text("password"),
  dedicatedIp: text("dedicated_ip"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  nextDueDate: date("next_due_date", { mode: "string" }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
  serverName: text("server_name"),
  serverDesc: text("server_desc"),
  notes: text("notes"),
  provisionData: text("provision_data").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertServiceSchema = createInsertSchema(servicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof servicesTable.$inferSelect;
