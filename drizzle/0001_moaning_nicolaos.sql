CREATE TABLE `api_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`api_key` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `api_providers_user_id_idx` ON `api_providers` (`user_id`);--> statement-breakpoint
CREATE TABLE `model_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`keyword` text NOT NULL,
	`provider_id` text NOT NULL,
	`target_model` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`provider_id`) REFERENCES `api_providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `model_mappings_user_id_idx` ON `model_mappings` (`user_id`);--> statement-breakpoint
CREATE INDEX `model_mappings_priority_idx` ON `model_mappings` (`user_id`,`priority`);--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_sessions_session_token_unique` ON `user_sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `user_sessions_session_token_idx` ON `user_sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `user_sessions_user_id_idx` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`github_id` text NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`avatar_url` text,
	`api_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_id_unique` ON `users` (`github_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_api_key_unique` ON `users` (`api_key`);--> statement-breakpoint
CREATE INDEX `users_github_id_idx` ON `users` (`github_id`);--> statement-breakpoint
CREATE INDEX `users_api_key_idx` ON `users` (`api_key`);