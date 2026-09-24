import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const images = sqliteTable("Image", {
  id: integer("id").primaryKey({ autoIncrement: true }).unique(),
  name: text("name", { length: 247 }).notNull(),
  path: text("path", { length: 255 }).notNull().unique(),
  description: text("description", { length: 255 }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at"),
});

export type Image = typeof images.$inferSelect;
export type InsertImage = typeof images.$inferInsert;