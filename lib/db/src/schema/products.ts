import { pgTable, text, serial, boolean, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  categoryId: integer("category_id"),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quarterlyPrice: numeric("quarterly_price", { precision: 10, scale: 2 }),
  yearlyPrice: numeric("yearly_price", { precision: 10, scale: 2 }),
  setupFee: numeric("setup_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  diskSpace: text("disk_space"),
  bandwidth: text("bandwidth"),
  ram: text("ram"),
  cpu: text("cpu"),
  featuresJson: text("features_json").notNull().default("[]"),
  imageUrl: text("image_url"),
  featured: boolean("featured").notNull().default(false),
  available: boolean("available").notNull().default(true),
  stockEnabled: boolean("stock_enabled").notNull().default(false),
  stock: integer("stock").notNull().default(0),
  autoProvision: boolean("auto_provision").notNull().default(false),
  provisionModule: text("provision_module"),
  provisionConfigJson: text("provision_config_json").notNull().default("{}"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
