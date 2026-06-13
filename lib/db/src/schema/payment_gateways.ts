import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentGatewaysTable = pgTable("payment_gateways", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  testMode: boolean("test_mode").notNull().default(true),
  configJson: text("config_json").notNull().default("{}"),
  webhookSecret: text("webhook_secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPaymentGatewaySchema = createInsertSchema(paymentGatewaysTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPaymentGateway = z.infer<typeof insertPaymentGatewaySchema>;
export type PaymentGateway = typeof paymentGatewaysTable.$inferSelect;
