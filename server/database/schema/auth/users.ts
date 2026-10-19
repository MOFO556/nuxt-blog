import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text,  } from "drizzle-orm/sqlite-core";
import { images } from "../images";

export const users = sqliteTable("User", {
    id: integer("id").primaryKey({ autoIncrement: true }).unique(),
    login: text("login").notNull().unique(),
    password: text("password"),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: text('updated_at'),
    authMethod: text("auth_method", { enum: ["password", "passkey", "both"] }).notNull(),
    avatar: integer("avatar").references(() => images.id, { onDelete: "set null" })
  },
  () => [
    check("user_auth_method", sql`auth_method IN ('password','passkey','both')`),
    check("user_password_required", sql`
      (auth_method IN ('password','both') AND password IS NOT NULL) OR
      (auth_method = 'passkey' AND password IS NULL)
    `),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const publicUserColumns = {
  id: true,
  login: true,
} as const;;