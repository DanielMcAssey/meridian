CREATE TABLE `user_achievements` (
	`user_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`unlocked_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `user_achievements_pk` PRIMARY KEY(`user_id`, `achievement_id`),
	CONSTRAINT `fk_user_achievements_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
