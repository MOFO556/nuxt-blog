import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { posts } from "./posts";
import { images } from "./images";

export const comments = sqliteTable("Comment", {
  id: integer("id").primaryKey({ autoIncrement: true }).unique(),
  text: text("text").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at"),
  userId: integer().references(() => users.id, { onDelete: "cascade" }).notNull(),
  postId: integer().references(() => posts.id, { onDelete: "cascade" }),
  imageId: integer().references(() => images.id, { onDelete: "cascade" })
}, (column) => [
  index("comment_userId_idx").on(column.userId),
  index("comment_postId_idx").on(column.postId),
  index("comment_imageId_idx").on(column.imageId),
  check("comment_entity_check", 
    sql`(postId IS NOT NULL AND imageId IS NULL) OR (postId IS NULL AND imageId IS NOT NULL)`
  )
]);

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;