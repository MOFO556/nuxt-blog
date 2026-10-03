ALTER TABLE `Comment` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `Comment` ADD `parent_id` integer REFERENCES Comment(id);--> statement-breakpoint
CREATE INDEX `comment_parentId_idx` ON `Comment` (`parent_id`);