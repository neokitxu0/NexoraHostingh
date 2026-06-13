import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dnsRecordsTable = pgTable("dns_records", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").notNull(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  ttl: integer("ttl").notNull().default(3600),
  priority: integer("priority"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDnsRecordSchema = createInsertSchema(dnsRecordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDnsRecord = z.infer<typeof insertDnsRecordSchema>;
export type DnsRecord = typeof dnsRecordsTable.$inferSelect;
