CREATE TABLE `exitNodes` (
	`exitNodeId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`address` integer
);
--> statement-breakpoint
CREATE TABLE `org` (
	`orgId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`resourceId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`siteId` integer,
	`name` text,
	`targetIp` text,
	`method` text,
	`port` integer,
	`proto` text,
	FOREIGN KEY (`siteId`) REFERENCES `sites`(`siteId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`routeId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subnet` integer,
	`exitNodeId` integer,
	FOREIGN KEY (`exitNodeId`) REFERENCES `exitNodes`(`exitNodeId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`siteId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orgId` integer,
	`name` text,
	`autoSubdomain` text,
	`pubKey` integer,
	`subnet` text,
	`exitNode` integer,
	FOREIGN KEY (`orgId`) REFERENCES `org`(`orgId`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exitNode`) REFERENCES `exitNodes`(`exitNodeId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`uid` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orgId` integer,
	`name` text,
	`email` text,
	`groups` text,
	FOREIGN KEY (`orgId`) REFERENCES `org`(`orgId`) ON UPDATE no action ON DELETE no action
);
