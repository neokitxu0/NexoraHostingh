import { pgTable, text, serial, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const licenseProductsTable = pgTable("license_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  durationDays: integer("duration_days"),
  maxDomains: integer("max_domains").notNull().default(1),
  available: boolean("available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const licenseAdminsTable = pgTable("license_admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default("Admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const licenseCustomersTable = pgTable("license_customers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const licenseKeysTable = pgTable("license_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  productId: integer("product_id").notNull(),
  customerId: integer("customer_id"),
  status: text("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  maxDomains: integer("max_domains").notNull().default(1),
  activatedDomains: text("activated_domains").notNull().default("[]"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const licenseVerificationsTable = pgTable("license_verifications", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  domain: text("domain"),
  ipAddress: text("ip_address"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const licenseOrdersTable = pgTable("license_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  productId: integer("product_id").notNull(),
  keyId: integer("key_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LicenseProduct = typeof licenseProductsTable.$inferSelect;
export type LicenseKey = typeof licenseKeysTable.$inferSelect;
export type LicenseCustomer = typeof licenseCustomersTable.$inferSelect;
export type LicenseAdmin = typeof licenseAdminsTable.$inferSelect;
export type LicenseOrder = typeof licenseOrdersTable.$inferSelect;
export type LicenseVerification = typeof licenseVerificationsTable.$inferSelect;
