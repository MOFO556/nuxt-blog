import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./auth/users";

export const posts = sqliteTable("Post", {
  id: integer("id").primaryKey({ autoIncrement: true }).unique(),
  url: text("url", { length: 255 }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at"),
	userId: integer().references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (column) => [
  index("post_userId_idx").on(column.userId)
]);

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;