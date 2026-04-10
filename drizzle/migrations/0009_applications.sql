CREATE TYPE "public"."application_status" AS ENUM('discovered', 'evaluating', 'ready', 'applied', 'phone-screen', 'technical', 'onsite', 'offer', 'accepted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"match_id" uuid,
	"portal_job_id" uuid,
	"status" "application_status" DEFAULT 'discovered' NOT NULL,
	"applied_at" timestamp,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"next_step" text,
	"next_step_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "applications_user_id_idx" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "applications_match_id_idx" ON "applications" USING btree ("match_id");