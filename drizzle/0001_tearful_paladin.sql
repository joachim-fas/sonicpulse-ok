CREATE TABLE `artists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spotifyId` varchar(64) NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`spotifyName` varchar(255) NOT NULL,
	`directLink` varchar(512) NOT NULL,
	`imageUrl` text,
	`genres` text,
	`followers` int,
	`popularity` int,
	`discogsId` varchar(64),
	`discogsBio` text,
	`cachedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `artists_id` PRIMARY KEY(`id`),
	CONSTRAINT `artists_spotifyId_unique` UNIQUE(`spotifyId`)
);
--> statement-breakpoint
CREATE TABLE `search_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`query` varchar(255) NOT NULL,
	`resultCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `search_history_id` PRIMARY KEY(`id`)
);
