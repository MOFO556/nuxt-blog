import { sql } from "drizzle-orm";
import { integer, sqliteTable, text,  } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("User", {
  id: integer("id").primaryKey({ autoIncrement: true }).unique(),
  login: text("login").notNull().unique(),
  password: text("password").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at'),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const publicUserColumns = {
  id: true,
  login: true,
};