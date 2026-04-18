CREATE TABLE `groups` (
  `id`         integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name`       text NOT NULL,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pages` (
  `id`         integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name`       text NOT NULL,
  `slug`       text NOT NULL UNIQUE,
  `is_public`  integer NOT NULL DEFAULT 1,
  `show_apps`  integer NOT NULL DEFAULT 1,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `page_groups` (
  `page_id`  integer NOT NULL REFERENCES `pages`(`id`) ON DELETE CASCADE,
  `group_id` integer NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
  PRIMARY KEY (`page_id`, `group_id`)
);
--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `group_id` integer REFERENCES `groups`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
INSERT INTO `pages` (`name`, `slug`, `is_public`, `show_apps`, `sort_order`, `created_at`, `updated_at`)
VALUES ('Home', 'home', 1, 1, 0, datetime('now'), datetime('now'));
