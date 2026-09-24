CREATE TABLE `User` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`login` text NOT NULL,
	`password` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_id_unique` ON `User` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `User_login_unique` ON `User` (`login`);--> statement-breakpoint
CREATE TABLE `Post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text(255) NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	`userId` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Post_id_unique` ON `Post` (`id`);--> statement-breakpoint
CREATE INDEX `post_userId_idx` ON `Post` (`userId`);--> statement-breakpoint
CREATE TABLE `Image` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(247) NOT NULL,
	`path` text(255) NOT NULL,
	`description` text(255),
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Image_id_unique` ON `Image` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `Image_path_unique` ON `Image` (`path`);--> statement-breakpoint
CREATE TABLE `Comment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	`userId` integer NOT NULL,
	`post_id` integer,
	`image_id` integer,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `Post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`image_id`) REFERENCES `Image`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "comment_entity_check" CHECK((post_id IS NOT NULL AND image_id IS NULL) OR (post_id IS NULL AND image_id IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Comment_id_unique` ON `Comment` (`id`);--> statement-breakpoint
CREATE INDEX `comment_userId_idx` ON `Comment` (`userId`);--> statement-breakpoint
CREATE INDEX `comment_postId_idx` ON `Comment` (`post_id`);--> statement-breakpoint
CREATE INDEX `comment_imageId_idx` ON `Comment` (`image_id`);--> statement-breakpoint
CREATE TABLE `CommentAttachment` (
	`comment_id` integer NOT NULL,
	`image_id` integer NOT NULL,
	PRIMARY KEY(`comment_id`, `image_id`),
	FOREIGN KEY (`comment_id`) REFERENCES `Comment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`image_id`) REFERENCES `Image`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `commentAttachment_commentId_idx` ON `CommentAttachment` (`comment_id`);--> statement-breakpoint
CREATE INDEX `commentAttachment_imageId_idx` ON `CommentAttachment` (`image_id`);--> statement-breakpoint
CREATE TABLE `PostAttachment` (
	`post_id` integer NOT NULL,
	`post_cover` integer,
	`image_id` integer NOT NULL,
	PRIMARY KEY(`post_id`, `image_id`),
	FOREIGN KEY (`post_id`) REFERENCES `Post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`image_id`) REFERENCES `Image`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `postAttachment_postId_idx` ON `PostAttachment` (`post_id`);--> statement-breakpoint
CREATE INDEX `postAttachment_imageId_idx` ON `PostAttachment` (`image_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `image_post_cover_unique` ON `PostAttachment` (`post_id`) WHERE "PostAttachment"."post_cover" = 1;