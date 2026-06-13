import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const apiTokensTable = pgTable("api_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull(),
  prefix: text("prefix").notNull(),
  permissionsJson: text("permissions_json").notNull().default("[]"),
  lastUsed: timestamp("last_used", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertApiTokenSchema = createInsertSchema(apiTokensTable).omit({ id: true, createdAt: true });
export type InsertApiToken = z.infer<typeof insertApiTokenSchema>;
export type ApiToken = typeof apiTokensTable.$inferSelect;
