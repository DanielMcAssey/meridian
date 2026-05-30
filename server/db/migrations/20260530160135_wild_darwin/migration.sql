ALTER TABLE `users` ADD `link_fail_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `link_locked_until` integer;