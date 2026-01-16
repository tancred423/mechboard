CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`discord_id` varchar(32) NOT NULL,
	`username` varchar(128) NOT NULL,
	`avatar` varchar(256),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_discord_id_unique` UNIQUE(`discord_id`)
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(128) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`collapsed` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encounters` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`folder_id` varchar(36),
	`name` varchar(128) NOT NULL,
	`description` text,
	`config` json NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `encounters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `presets` (
	`id` varchar(36) NOT NULL,
	`data` json NOT NULL,
	`sort_order` varchar(10) DEFAULT '0',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_sessions` (
	`id` varchar(36) NOT NULL,
	`encounter_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`state` json NOT NULL,
	`last_activity` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sync_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_folders_user_id` ON `folders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_encounters_user_id` ON `encounters` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_encounters_folder_id` ON `encounters` (`folder_id`);--> statement-breakpoint
CREATE INDEX `idx_sync_sessions_encounter_id` ON `sync_sessions` (`encounter_id`);--> statement-breakpoint
CREATE INDEX `idx_sync_sessions_user_id` ON `sync_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sync_sessions_last_activity` ON `sync_sessions` (`last_activity`);--> statement-breakpoint
ALTER TABLE `folders` ADD CONSTRAINT `folders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounters` ADD CONSTRAINT `encounters_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounters` ADD CONSTRAINT `encounters_folder_id_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_sessions` ADD CONSTRAINT `sync_sessions_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_sessions` ADD CONSTRAINT `sync_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
