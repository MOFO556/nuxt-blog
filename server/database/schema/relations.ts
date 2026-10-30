import { relations } from 'drizzle-orm';
import { credentials } from './auth/credentials';
import { users } from './auth/users';
import { sessions } from './auth/sessions';
import { posts } from './posts';
import { images } from './images';
import { comments } from './comments';
import { commentAttachments } from './commentsAttachment';
import { postAttachments } from './postsAttachment';
import { postTags, tags } from './tags';
import { assistantMessages, assistantThreads, postChunks } from './assistant';

export const usersRelations = relations(users, ({ one, many }) => ({
  posts: many(posts),
  comments: many(comments),
  credentials: many(credentials),
  sessions: many(sessions),
  assistantThreads: many(assistantThreads),
  avatar: one(images, {
    fields: [users.avatar],
    references: [images.id]
  })
}));

export const credentialsRelations = relations(credentials, ({ one, many }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),
  sessions: many(sessions),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  comments: many(comments),
  attachments: many(postAttachments),
  postTags: many(postTags),
  chunks: many(postChunks),
}));

export const imagesRelations = relations(images, ({ many, one }) => ({
  comments: many(comments),
  commentAttachments: many(commentAttachments),
  postAttachments: many(postAttachments),
  users: many(users),
  uploader: one(users, {
    fields: [images.uploadedBy],
    references: [users.id],
  }),
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
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'commentReplies',
  }),
  replies: many(comments, {
    relationName: 'commentReplies',
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

export const postAttachmentsRelations = relations(postAttachments, ({ one }) => ({
  post: one(posts, {
    fields: [postAttachments.postId],
    references: [posts.id],
  }),
  image: one(images, {
    fields: [postAttachments.imageId],
    references: [images.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  }),
  credentials: one(credentials, {
    fields: [sessions.credentialId],
    references: [credentials.id]
  }),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag:  one(tags,  { fields: [postTags.tagId],  references: [tags.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}));

export const assistantThreadsRelations = relations(assistantThreads, ({ one, many }) => ({
  user: one(users, {
    fields: [assistantThreads.userId],
    references: [users.id],
  }),
  messages: many(assistantMessages),
}));

export const assistantMessagesRelations = relations(assistantMessages, ({ one }) => ({
  thread: one(assistantThreads, {
    fields: [assistantMessages.threadId],
    references: [assistantThreads.id],
  }),
}));

export const postChunksRelations = relations(postChunks, ({ one }) => ({
  post: one(posts, {
    fields: [postChunks.postId],
    references: [posts.id],
  }),
}));