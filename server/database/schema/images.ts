import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { posts } from "./posts";

export const images = sqliteTable("Image", {
  id: integer("id").primaryKey({ autoIncrement: true }).unique(),
  name: text("name", { length: 247 }).notNull(),
  path: text("path", { length: 255 }).notNull().unique(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at"),
  postCover: integer('post_cover', { mode: 'boolean' }),
  postId: integer().references(() => posts.id, { onDelete: "cascade" }),
}, (column) => [
  index("image_postId_idx").on(column.postId),
  uniqueIndex("image_post_cover_unique")
    .on(column.postId)
    .where(sql`${column.postCover} = 1`),
  check("image_post_cover_check", 
    sql`(postId IS NOT NULL AND post_cover IS NOT NULL) OR (postId IS NULL AND post_cover IS NULL)`
  )
]);

export type Image = typeof images.$inferSelect;
export type InsertImage = typeof images.$inferInsert;