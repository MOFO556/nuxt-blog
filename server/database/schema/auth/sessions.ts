import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { credentials } from './credentials';

export const sessions = sqliteTable('Session', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  loginMethod: text('login_method', { enum: ["password", "passkey"] }).notNull(),
  credentialId: text('credential_id').references(() => credentials.id, { onDelete: 'set null' }),
  passwordSnapshot: text('password_snapshot'),
  ip: text('ip'),
  city: text('city'),
  country: text('country'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  lastSeenAt: text('last_seen_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: integer('expires_at').notNull(),
  revoked: integer('revoked', { mode: 'boolean' }).default(false).notNull(),
  invalidated: integer('invalidated', { mode: 'boolean' }).default(false).notNull(),
  invalidReason: text('invalid_reason', { enum: ["passkey removed", "password changed"] }),
}, (t) => [
  index('session_user_id_idx').on(t.userId),
  index('session_credential_id_idx').on(t.credentialId),
]);

export type Session = typeof sessions.$inferSelect;