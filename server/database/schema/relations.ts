import { relations } from 'drizzle-orm';
import { users } from './users';
import { posts } from './posts';
import { images } from './images';
import { comments } from './comments';
import { commentAttachments } from './commentsAttachment';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments)
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  images: many(images),
  comments: many(comments)
}));

export const imagesRelations = relations(images, ({ one, many }) => ({
  posts: one(posts, {
    fields: [images.postId],
    references: [posts.id]
  }),
  comments: many(comments),
  attachments: many(commentAttachments),
}));

export const commentsRelations = relations(comments, ({one, many}) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  posts: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  images: one(images, {
    fields: [comments.imageId],
    references: [images.id],
  }),
  attachments: many(commentAttachments),
}));

export const commentAttachmentsRelations = relations(commentAttachments, ({ one }) => ({
  comment: one(comments, {
    fields: [commentAttachments.commentId],
    references: [comments.id],
  }),
  image: one(images, {
    fields: [commentAttachments.imageId],
    references: [images.id],
  }),
}));