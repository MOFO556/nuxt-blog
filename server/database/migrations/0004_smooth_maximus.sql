ALTER TABLE `Credentials` RENAME COLUMN "user_agent" TO "user_agent";--> statement-breakpoint
CREATE TABLE `Session` (
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
	FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `Session` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_credential_id_idx` ON `Session` (`credential_id`);