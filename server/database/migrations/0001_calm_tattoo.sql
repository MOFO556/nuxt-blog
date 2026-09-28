CREATE TABLE `Credentials` (
	`id` text NOT NULL,
	`user_id` integer NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`backed_up` integer DEFAULT false NOT NULL,
	`transports` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Credentials_id_unique` ON `Credentials` (`id`);--> statement-breakpoint
CREATE INDEX `credentials_user_id_idx` ON `Credentials` (`user_id`);--> statement-breakpoint
CREATE TABLE `WebauthnAttempt` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge` text NOT NULL,
	`user_id` integer,
	`type` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS `User_id_unique`; --> statement-breakpoint
DROP INDEX IF EXISTS `User_login_unique`; --> statement-breakpoint
CREATE TABLE `__new_User` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`login` text NOT NULL,
	`password` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	`auth_method` text NOT NULL,
	CONSTRAINT "user_auth_method" CHECK(auth_method IN ('password','passkey','both')),
	CONSTRAINT "user_password_required" CHECK(
      (auth_method IN ('password','both') AND password IS NOT NULL) OR
      (auth_method = 'passkey' AND password IS NULL)
    )
);--> statement-breakpoint
INSERT INTO `__new_User`("id", "login", "password", "created_at", "updated_at", "auth_method")
SELECT "id", "login", "password", "created_at", "updated_at", 'password' FROM `User`;--> statement-breakpoint
DROP TABLE `User`;--> statement-breakpoint
ALTER TABLE `__new_User` RENAME TO `User`;--> statement-breakpoint
CREATE UNIQUE INDEX `User_id_unique` ON `User` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `User_login_unique` ON `User` (`login`);