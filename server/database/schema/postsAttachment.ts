import { index, integer, sqliteTable, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";
import { posts } from "./posts";
import { images } from "./images";
import { sql } from "drizzle-orm";

export const postAttachments = sqliteTable("PostAttachment", {
  postId: integer("post_id").notNull()
  .references(() => posts.id, { onDelete: 'cascade' }),
  postCover: integer('post_cover', { mode: 'boolean' }),
  imageId: integer("image_id").notNull()
  .references(() => images.id, { onDelete: 'cascade' }),
}, (column) => [
  primaryKey({ columns: [column.postId, column.imageId] }),
  index("postAttachment_postId_idx").on(column.postId),
  index("postAttachment_imageId_idx").on(column.imageId),  
  uniqueIndex("image_post_cover_unique")
    .on(column.postId)
    .where(sql`${column.postCover} = 1`),
]);

export type PostAttachment = typeof postAttachments.$inferSelect;
export type InsertPostAttachment = typeof postAttachments.$inferInsert;