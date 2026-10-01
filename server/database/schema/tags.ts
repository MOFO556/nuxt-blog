import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { posts } from './posts';

export const tags = sqliteTable('Tag', {
  id: integer('id').primaryKey({ autoIncrement: true }).unique(),
  name: text('name', { length: 50 }).notNull().unique(),
  slug: text('slug', { length: 50 }).notNull().unique(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const postTags = sqliteTable('PostTag', {
  postId: integer('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  tagId:  integer('tag_id').references(() => tags.id,  { onDelete: 'cascade' }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.postId, t.tagId] }),
  index('post_tag_tagId_idx').on(t.tagId),
]);

export type Tag = typeof tags.$inferSelect;