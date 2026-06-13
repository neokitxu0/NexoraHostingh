import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const domainsTable = pgTable("domains", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  tld: text("tld").notNull(),
  status: text("status").notNull().default("active"),
  registeredDate: date("registered_date", { mode: "string" }),
  expiryDate: date("expiry_date", { mode: "string" }).notNull(),
  autoRenew: boolean("auto_renew").notNull().default(true),
  privacyProtection: boolean("privacy_protection").notNull().default(false),
  nameserversJson: text("nameservers_json").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const dnsRecordsTable = pgTable("dns_records", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  ttl: integer("ttl").notNull().default(3600),
  priority: integer("priority"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDomainSchema = createInsertSchema(domainsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDomain = z.infer<typeof insertDomainSchema>;
export type Domain = typeof domainsTable.$inferSelect;
export type DnsRecord = typeof dnsRecordsTable.$inferSelect;
