CREATE INDEX `idx_xp_ledger_user` ON `xp_ledger` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_group_members_user` ON `group_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_group_members_group_status` ON `group_members` (`group_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);