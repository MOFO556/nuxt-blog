PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_User` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`login` text NOT NULL,
	`password` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	`auth_method` text NOT NULL,
	`avatar` integer,
	FOREIGN KEY (`avatar`) REFERENCES `Image`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "user_auth_method" CHECK(auth_method IN ('password','passkey','both')),
	CONSTRAINT "user_password_required" CHECK(
      (auth_method IN ('password','both') AND password IS NOT NULL) OR
      (auth_method = 'passkey' AND password IS NULL)
    )
);
--> statement-breakpoint
INSERT INTO `__new_User`("id", "login", "password", "created_at", "updated_at", "auth_method", "avatar") SELECT "id", "login", "password", "created_at", "updated_at", "auth_method", "avatar" FROM `User`;--> statement-breakpoint
DROP TABLE `User`;--> statement-breakpoint
ALTER TABLE `__new_User` RENAME TO `User`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `User_id_unique` ON `User` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `User_login_unique` ON `User` (`login`);--> statement-breakpoint
CREATE TABLE `__new_Credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`backed_up` integer DEFAULT false NOT NULL,
	`transports` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	`device_type` text,
	`city` text,
	`country` text,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_Credentials`("id", "user_id", "public_key", "counter", "backed_up", "transports", "created_at", "updated_at", "device_type", "city", "country", "user_agent") SELECT "id", "user_id", "public_key", "counter", "backed_up", "transports", "created_at", "updated_at", "device_type", "city", "country", "user_agent" FROM `Credentials`;--> statement-breakpoint
DROP TABLE `Credentials`;--> statement-breakpoint
ALTER TABLE `__new_Credentials` RENAME TO `Credentials`;--> statement-breakpoint
CREATE INDEX `credentials_user_id_idx` ON `Credentials` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_Session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`login_method` text NOT NULL,
	`credential_id` text,
	`password_snapshot` text,
	`ip` text,
	`city` text,
	`country` text,
	`user_agent` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked` integer DEFAULT false NOT NULL,
	`invalidated` integer DEFAULT false NOT NULL,
	`invalid_reason` text,
	FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`credential_id`) REFERENCES `Credentials`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_Session`("id", "user_id", "login_method", "credential_id", "password_snapshot", "ip", "city", "country", "user_agent", "created_at", "last_seen_at", "expires_at", "revoked", "invalidated", "invalid_reason") SELECT "id", "user_id", "login_method", "credential_id", "password_snapshot", "ip", "city", "country", "user_agent", "created_at", "last_seen_at", "expires_at", "revoked", "invalidated", "invalid_reason" FROM `Session`;--> statement-breakpoint
DROP TABLE `Session`;--> statement-breakpoint
ALTER TABLE `__new_Session` RENAME TO `Session`;--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `Session` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_credential_id_idx` ON `Session` (`credential_id`);