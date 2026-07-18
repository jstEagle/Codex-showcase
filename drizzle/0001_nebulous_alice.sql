CREATE TABLE `allowed_users` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `allowed_users` (`email`)
SELECT DISTINCT lower(trim(`owner_email`))
FROM `projects`
WHERE trim(`owner_email`) <> '';
