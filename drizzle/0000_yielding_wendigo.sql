CREATE TABLE `project_media` (
	`object_key` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_media_project_idx` ON `project_media` (`project_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`author` text NOT NULL,
	`maker` text NOT NULL,
	`category` text DEFAULT 'Project' NOT NULL,
	`card_animation` text DEFAULT 'liquid' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`stack` text NOT NULL,
	`links` text NOT NULL,
	`media` text NOT NULL,
	`hero_image_url` text,
	`metrics` text NOT NULL,
	`artifact` text,
	`project_markdown` text,
	`story_thread_count` integer DEFAULT 0 NOT NULL,
	`story_turn_count` integer DEFAULT 0 NOT NULL,
	`story_excerpt` text NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`published_at` text,
	`owner_clerk_id` text NOT NULL,
	`owner_name` text,
	`owner_email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE INDEX `projects_published_idx` ON `projects` (`published`,`published_at`);--> statement-breakpoint
CREATE INDEX `projects_owner_idx` ON `projects` (`owner_clerk_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `projects_category_idx` ON `projects` (`category`);