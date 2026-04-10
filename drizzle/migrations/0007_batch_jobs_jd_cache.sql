CREATE TABLE "batch_job_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"match_id" uuid,
	"jd_cache_key" text,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "batch_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"completed_items" integer DEFAULT 0 NOT NULL,
	"failed_items" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "jd_cache" (
	"url_hash" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"company" text,
	"description" text NOT NULL,
	"requirements" text[] DEFAULT '{}' NOT NULL,
	"location" text,
	"remote_policy" text,
	"compensation_text" text,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "batch_job_items" ADD CONSTRAINT "batch_job_items_batch_id_batch_jobs_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "batch_job_items_batch_id_idx" ON "batch_job_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "batch_job_items_status_idx" ON "batch_job_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "batch_jobs_user_id_idx" ON "batch_jobs" USING btree ("user_id");