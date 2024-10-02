CREATE TABLE `exitNodes` (
	`exitNodeId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`privateKey` text,
	`listenPort` integer
);
--> statement-breakpoint
CREATE TABLE `orgs` (
	`orgId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`resourceId` text(2048) PRIMARY KEY NOT NULL,
	`siteId` integer,
	`name` text NOT NULL,
	`subdomain` text,
	FOREIGN KEY (`siteId`) REFERENCES `sites`(`siteId`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`routeId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exitNodeId` integer,
	`subnet` text NOT NULL,
	FOREIGN KEY (`exitNodeId`) REFERENCES `exitNodes`(`exitNodeId`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expiresAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`siteId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orgId` integer,
	`exitNode` integer,
	`name` text NOT NULL,
	`subdomain` text,
	`pubKey` text,
	`subnet` text,
	`bytesIn` integer,
	`bytesOut` integer,
	FOREIGN KEY (`orgId`) REFERENCES `orgs`(`orgId`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exitNode`) REFERENCES `exitNodes`(`exitNodeId`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `targets` (
	`targetId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`resourceId` text,
	`ip` text NOT NULL,
	`method` text NOT NULL,
	`port` integer NOT NULL,
	`protocol` text,
	`enabled` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`resourceId`) REFERENCES `resources`(`resourceId`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`passwordHash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);