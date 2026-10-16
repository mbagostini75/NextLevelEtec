CREATE TABLE `account_tokens` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `group_members` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`requested_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `study_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `mail_oauth` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`verifier` text NOT NULL,
	`expires_at` integer NOT NULL
);
CREATE TABLE `mail_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`client_secret` text NOT NULL,
	`refresh_token` text,
	`sender` text,
	`updated_at` integer NOT NULL,
	`last_attempt_at` integer,
	`last_test_at` integer,
	`last_message_id` text
);
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
CREATE TABLE `sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `study_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`subject` text,
	`topic` text,
	`question_ids` text NOT NULL,
	`created_at` integer NOT NULL,
	`submitted` integer DEFAULT 0 NOT NULL,
	`result` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `study_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`invite_hash` text NOT NULL,
	`invite_secret` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `user_public_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`nick` text COLLATE NOCASE NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`birth_date` text NOT NULL,
	`school` text NOT NULL,
	`grade` text NOT NULL,
	`address` text NOT NULL,
	`password_hash` text NOT NULL,
	`verified` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`saved_state` text DEFAULT '{}' NOT NULL,
	`completed` text DEFAULT '{}' NOT NULL
);
CREATE TABLE `xp_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`activity_key` text NOT NULL,
	`xp` integer NOT NULL,
	`earned_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `idx_group_members_group_status` ON `group_members` (`group_id`,`status`);
CREATE INDEX `idx_group_members_user` ON `group_members` (`user_id`);
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);
CREATE INDEX `idx_xp_ledger_user` ON `xp_ledger` (`user_id`);
CREATE UNIQUE INDEX `study_groups_invite_hash_unique` ON `study_groups` (`invite_hash`);
CREATE UNIQUE INDEX `user_public_profiles_nick_unique` ON `user_public_profiles` (`nick` COLLATE NOCASE);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
