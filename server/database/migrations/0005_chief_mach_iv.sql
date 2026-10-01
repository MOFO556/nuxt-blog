CREATE TABLE `PostTag` (
	`post_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`post_id`, `tag_id`),
	FOREIGN KEY (`post_id`) REFERENCES `Post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `Tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_tag_tagId_idx` ON `PostTag` (`tag_id`);--> statement-breakpoint
CREATE TABLE `Tag` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(50) NOT NULL,
	`slug` text(50) NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Tag_id_unique` ON `Tag` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `Tag_name_unique` ON `Tag` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `Tag_slug_unique` ON `Tag` (`slug`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text(255),
	`title` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	`userId` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_Post`("id", "url", "title", "content", "created_at", "updated_at", "userId") SELECT "id", "url", "title", "content", "created_at", "updated_at", "userId" FROM `Post`;--> statement-breakpoint
DROP TABLE `Post`;--> statement-breakpoint
ALTER TABLE `__new_Post` RENAME TO `Post`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `Post_id_unique` ON `Post` (`id`);--> statement-breakpoint
CREATE INDEX `post_userId_idx` ON `Post` (`userId`);