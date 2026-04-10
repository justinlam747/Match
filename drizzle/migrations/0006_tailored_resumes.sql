CREATE TABLE "tailored_resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"match_id" uuid,
	"source_resume_id" uuid,
	"jd_language" text DEFAULT 'en' NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"coverage_percent" integer DEFAULT 0 NOT NULL,
	"tailored_data" jsonb NOT NULL,
	"pdf_url" text,
	"page_size" text DEFAULT 'LETTER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tailored_resumes_user_id_idx" ON "tailored_resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tailored_resumes_match_id_idx" ON "tailored_resumes" USING btree ("match_id");