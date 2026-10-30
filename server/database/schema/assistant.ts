import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './auth/users';
import { posts } from './posts';

export const assistantThreads = sqliteTable('AssistantThread', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull().default('New chat'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (t) => [
  index('assistant_thread_user_id_idx').on(t.userId),
]);

export const assistantMessages = sqliteTable('AssistantMessage', {
  id: text('id').primaryKey(),
  threadId: text('thread_id')
    .references(() => assistantThreads.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  partsJson: text('parts_json').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (t) => [
  index('assistant_message_thread_id_idx').on(t.threadId),
]);

export const postChunks = sqliteTable('PostChunk', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  metadataJson: text('metadata_json').notNull().default('{}'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (t) => [
  index('post_chunk_post_id_idx').on(t.postId),
]);

export type AssistantThread = typeof assistantThreads.$inferSelect;
export type AssistantMessage = typeof assistantMessages.$inferSelect;
export type PostChunkRow = typeof postChunks.$inferSelect;