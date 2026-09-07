CREATE TABLE `status_history` (
	`id` text PRIMARY KEY NOT NULL,
	`router_id` text NOT NULL,
	`commission` integer NOT NULL,
	`handover` integer NOT NULL,
	`action` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `router_status` (
	`id` text PRIMARY KEY NOT NULL,
	`commission` integer NOT NULL,
	`handover` integer NOT NULL,
	`updated_at` text NOT NULL
);
