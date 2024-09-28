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
	`resourceId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`siteId` integer,
	`name` text NOT NULL,
	`subdomain` text,
	FOREIGN KEY (`siteId`) REFERENCES `sites`(`siteId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`routeId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exitNodeId` integer,
	`subnet` text NOT NULL,
	FOREIGN KEY (`exitNodeId`) REFERENCES `exitNodes`(`exitNodeId`) ON UPDATE no action ON DELETE no action
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
	FOREIGN KEY (`orgId`) REFERENCES `orgs`(`orgId`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exitNode`) REFERENCES `exitNodes`(`exitNodeId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `targets` (
	`targetId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`resourceId` integer,
	`ip` text NOT NULL,
	`method` text,
	`port` integer,
	`protocol` text,
	FOREIGN KEY (`resourceId`) REFERENCES `resources`(`resourceId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`userId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orgId` integer,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`groups` text,
	FOREIGN KEY (`orgId`) REFERENCES `orgs`(`orgId`) ON UPDATE no action ON DELETE no action
);
