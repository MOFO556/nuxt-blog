ALTER TABLE `Post` ADD `mode` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `Post` ADD `content_html` text;--> statement-breakpoint
ALTER TABLE `Post` ADD `description` text;--> statement-breakpoint
ALTER TABLE `Post` ADD `excerpt` text;