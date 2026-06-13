import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const automationJobsTable = pgTable("automation_jobs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  targetId: integer("target_id"),
  targetType: text("target_type"),
  payload: text("payload"),
  result: text("result"),
  error: text("error"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAutomationJobSchema = createInsertSchema(automationJobsTable).omit({ id: true, createdAt: true });
export type InsertAutomationJob = z.infer<typeof insertAutomationJobSchema>;
export type AutomationJob = typeof automationJobsTable.$inferSelect;
