import { index, integer, sqliteTable, primaryKey } from "drizzle-orm/sqlite-core";
import { comments } from "./comments";
import { images } from "./images";

export const commentAttachments = sqliteTable("CommentAttachment", {
  commentId: integer("comment_id").notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  imageId: integer("image_id").notNull()
    .references(() => images.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.commentId, table.imageId] }),
  index("commentAttachment_commentId_idx").on(table.commentId),
  index("commentAttachment_imageId_idx").on(table.imageId),
]);

export type CommentAttachment = typeof commentAttachments.$inferSelect;
export type InsertCommentAttachment = typeof commentAttachments.$inferInsert;