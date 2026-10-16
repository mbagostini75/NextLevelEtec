CREATE TABLE IF NOT EXISTS `user_public_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`nick` text COLLATE NOCASE NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_public_profiles_nick_unique` ON `user_public_profiles` (`nick` COLLATE NOCASE);
--> statement-breakpoint
INSERT OR IGNORE INTO `user_public_profiles` (`user_id`, `nick`)
SELECT `id`, 'Aluno' || substr(lower(hex(randomblob(6))), 1, 10) FROM `users`;
