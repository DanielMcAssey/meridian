CREATE TABLE `user_stats` (
	`user_id` text NOT NULL PRIMARY KEY,
	`total_games` integer NOT NULL DEFAULT 0,
	`total_correct` integer NOT NULL DEFAULT 0,
	`total_rounds` integer NOT NULL DEFAULT 0,
	`best_score` integer NOT NULL DEFAULT 0,
	`favorite_mode` text,
	`favorite_difficulty` text,
	`updated_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
