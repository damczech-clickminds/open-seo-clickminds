CREATE TABLE `agent_learning_patterns` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`mechanism` text NOT NULL,
	`applicability` text NOT NULL,
	`exceptions` text NOT NULL,
	`market` text NOT NULL,
	`industry` text NOT NULL,
	`reviewed_by` text NOT NULL,
	`reviewed_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_pattern_org_idx` ON `agent_learning_patterns` (`organization_id`,`reviewed_at`);--> statement-breakpoint
CREATE TABLE `agent_pattern_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`mechanism` text NOT NULL,
	`applicability` text NOT NULL,
	`exceptions` text NOT NULL,
	`market` text NOT NULL,
	`industry` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_candidate_project_idx` ON `agent_pattern_candidates` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `agent_work_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`run_id` text NOT NULL,
	`source` text NOT NULL,
	`content` text NOT NULL,
	`observed_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `agent_work_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_evidence_run_idx` ON `agent_work_evidence` (`project_id`,`run_id`);--> statement-breakpoint
CREATE TABLE `agent_work_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`request_key` text NOT NULL,
	`goal` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`checkpoint` text DEFAULT '' NOT NULL,
	`context_chars` integer DEFAULT 12000 NOT NULL,
	`output_tokens` integer DEFAULT 2000 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_work_request_idx` ON `agent_work_runs` (`project_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `agent_work_project_idx` ON `agent_work_runs` (`project_id`,`updated_at`);