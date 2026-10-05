ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "workspace_id" varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "execution_id" varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "goal_id" varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "plan_id" varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "active_model" varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'IDLE';--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}';
