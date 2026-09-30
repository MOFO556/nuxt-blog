ALTER TABLE `Credentials` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `Credentials` ADD `device_type` text;--> statement-breakpoint
ALTER TABLE `Credentials` ADD `city` text;--> statement-breakpoint
ALTER TABLE `Credentials` ADD `country` text;--> statement-breakpoint
ALTER TABLE `Credentials` ADD `user_agent` text;--> statement-breakpoint
ALTER TABLE `WebauthnAttempt` ADD `pending` text;