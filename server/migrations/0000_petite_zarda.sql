CREATE TABLE `proxyTargets` (
	`id` text PRIMARY KEY NOT NULL,
	`target` text NOT NULL,
	`rule` text NOT NULL,
	`entryPoint` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proxyTargets_id_unique` ON `proxyTargets` (`id`);