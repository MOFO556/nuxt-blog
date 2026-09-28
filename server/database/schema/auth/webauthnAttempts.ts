import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const webauthnAttempts = sqliteTable('WebauthnAttempt', {
  id: text('id').primaryKey(),
  challenge: text('challenge').notNull(),
  userId: integer('user_id'),
  type: text('type', { enum: ['register', 'authenticate'] }).notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})