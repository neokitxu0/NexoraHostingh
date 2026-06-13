import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const kbCategoriesTable = pgTable("kb_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kbArticlesTable = pgTable("kb_articles", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  tagsJson: text("tags_json").notNull().default("[]"),
  viewCount: integer("view_count").notNull().default(0),
  published: text("published").notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertKbArticleSchema = createInsertSchema(kbArticlesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKbArticle = z.infer<typeof insertKbArticleSchema>;
export type KbArticle = typeof kbArticlesTable.$inferSelect;
