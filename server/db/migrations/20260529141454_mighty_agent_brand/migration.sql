PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`score` integer NOT NULL,
	`correct` integer NOT NULL,
	`total` integer NOT NULL,
	`mode` text NOT NULL,
	`difficulty` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` text NOT NULL,
	`game_token` text UNIQUE,
	CONSTRAINT `fk_scores_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_scores`(`id`, `name`, `score`, `correct`, `total`, `mode`, `difficulty`, `created_at`, `user_id`, `game_token`) SELECT `id`, `name`, `score`, `correct`, `total`, `mode`, `difficulty`, `created_at`, `user_id`, `game_token` FROM `scores`;--> statement-breakpoint
DROP TABLE `scores`;--> statement-breakpoint
ALTER TABLE `__new_scores` RENAME TO `scores`;--> statement-breakpoint
PRAGMA foreign_keys=ON;