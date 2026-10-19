import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { WebAuthnCredential } from "#auth-utils";
import { users } from "./users";

export const credentials = sqliteTable( "Credentials", {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").default(0).notNull(),
    backedUp: integer("backed_up", { mode: "boolean" }).default(false).notNull(),
    transports: text("transports", { mode: "json" })
      .notNull()
      .$type<WebAuthnCredential["transports"]>(),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: text("updated_at"),
    deviceType: text("device_type", { enum: ["singleDevice", "multiDevice"] }),
    city: text("city"),
    country: text("country"),
    userAgent: text("user_agent"),
  },
  (table) => [index("credentials_user_id_idx").on(table.userId)],
);

export type Credentials = typeof credentials.$inferSelect;
export type InsertCredentials = typeof credentials.$inferInsert;