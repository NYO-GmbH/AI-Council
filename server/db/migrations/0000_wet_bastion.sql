CREATE TABLE `council_meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`state` text DEFAULT '{"queue":[],"rounds":0,"maxRounds":2}' NOT NULL,
	`last_spoke_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `council_members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`personality` text NOT NULL,
	`objective` text NOT NULL,
	`accent_color` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `council_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`member_id` text,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `council_meetings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `council_members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `council_messages_meeting_id_idx` ON `council_messages` (`meeting_id`);--> statement-breakpoint
CREATE INDEX `council_messages_member_id_idx` ON `council_messages` (`member_id`);