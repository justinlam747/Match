CREATE TYPE "public"."ats_type" AS ENUM('greenhouse', 'ashby', 'lever', 'custom');--> statement-breakpoint
CREATE TABLE "portal_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"location" text,
	"posted_at" timestamp,
	"discovered_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "portal_jobs_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "portal_scan_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_id" uuid NOT NULL,
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"jobs_found" integer DEFAULT 0 NOT NULL,
	"new_jobs" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "portals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"careers_url" text NOT NULL,
	"api_endpoint" text,
	"ats_type" "ats_type" NOT NULL,
	"scan_method" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "title_filter_positive" text[];--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "title_filter_negative" text[];--> statement-breakpoint
ALTER TABLE "portal_jobs" ADD CONSTRAINT "portal_jobs_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_scan_history" ADD CONSTRAINT "portal_scan_history_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portals" ADD CONSTRAINT "portals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portal_jobs_portal_id_idx" ON "portal_jobs" USING btree ("portal_id");--> statement-breakpoint
CREATE INDEX "portal_jobs_discovered_at_idx" ON "portal_jobs" USING btree ("discovered_at");--> statement-breakpoint
CREATE INDEX "portal_scan_history_portal_id_idx" ON "portal_scan_history" USING btree ("portal_id");--> statement-breakpoint
CREATE INDEX "portals_user_id_idx" ON "portals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "portals_ats_type_idx" ON "portals" USING btree ("ats_type");