CREATE TABLE `mail_oauth` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`verifier` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
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
