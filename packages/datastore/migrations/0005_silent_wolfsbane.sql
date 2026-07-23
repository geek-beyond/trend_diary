DROP INDEX `idx_skipped_articles_article_user`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_active_users` (
	`active_user_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`authentication_id` text NOT NULL,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` DATETIME NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_active_users`("active_user_id", "email", "display_name", "authentication_id", "created_at", "updated_at", "user_id") SELECT "active_user_id", "email", "display_name", "authentication_id", "created_at", "updated_at", "user_id" FROM `active_users`;--> statement-breakpoint
DROP TABLE `active_users`;--> statement-breakpoint
ALTER TABLE `__new_active_users` RENAME TO `active_users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `active_users_email_key` ON `active_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `active_users_authentication_id_key` ON `active_users` (`authentication_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `active_users_user_id_key` ON `active_users` (`user_id`);--> statement-breakpoint
DROP TRIGGER IF EXISTS "active_users_set_updated_at";--> statement-breakpoint
CREATE TRIGGER "active_users_set_updated_at"
AFTER UPDATE ON "active_users"
FOR EACH ROW
WHEN NEW."updated_at" = OLD."updated_at"
BEGIN
  UPDATE "active_users"
  SET "updated_at" = CURRENT_TIMESTAMP
  WHERE "active_user_id" = OLD."active_user_id";
END;