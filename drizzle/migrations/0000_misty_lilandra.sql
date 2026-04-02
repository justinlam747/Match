CREATE TYPE "public"."agent_status" AS ENUM('pending', 'running', 'completed', 'failed', 'paused');--> statement-breakpoint
CREATE TYPE "public"."ai_provider" AS ENUM('anthropic', 'openai');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('resume', 'portfolio', 'github', 'linkedin', 'website', 'other');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('gmail', 'outlook');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('draft', 'edited', 'sent', 'opened', 'replied', 'bounced');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_type" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "agent_status" DEFAULT 'pending' NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb,
	"state" jsonb DEFAULT '{}'::jsonb,
	"output" jsonb,
	"error" text,
	"parent_run_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"encrypted_key" text NOT NULL,
	"key_hint" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"email" text,
	"email_verified" boolean DEFAULT false,
	"source" text,
	"linkedin_url" text,
	"found_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "doc_type" NOT NULL,
	"title" text NOT NULL,
	"source_url" text,
	"raw_text" text NOT NULL,
	"extracted_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "email_provider" NOT NULL,
	"email_address" text NOT NULL,
	"access_token_enc" text NOT NULL,
	"access_token_iv" text NOT NULL,
	"access_token_tag" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"refresh_token_iv" text NOT NULL,
	"refresh_token_tag" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"match_score_id" uuid,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "email_status" DEFAULT 'draft' NOT NULL,
	"sequence_position" integer DEFAULT 1,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"endpoint" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_cents" real DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"error" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"overall_score" real NOT NULL,
	"tech_score" real NOT NULL,
	"industry_score" real NOT NULL,
	"stage_score" real NOT NULL,
	"hiring_score" real NOT NULL,
	"explanation" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text DEFAULT 'Untitled Resume' NOT NULL,
	"raw_text" text NOT NULL,
	"parsed_data" jsonb,
	"file_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"emails_per_day" integer DEFAULT 20 NOT NULL,
	"api_calls_per_hour" integer DEFAULT 60 NOT NULL,
	"max_resumes" integer DEFAULT 5 NOT NULL,
	"max_matches_per_scan" integer DEFAULT 50 NOT NULL,
	"feature_flags" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_config_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"email_tone" text DEFAULT 'professional' NOT NULL,
	"min_match_score" real DEFAULT 0.5 NOT NULL,
	"notify_on_new_matches" boolean DEFAULT true NOT NULL,
	"notify_on_email_replies" boolean DEFAULT true NOT NULL,
	"preferred_provider" "ai_provider",
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text,
	"avatar_source" text,
	"avatar_options" jsonb,
	"tags" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yc_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"batch" text,
	"description" text,
	"one_liner" text,
	"long_description" text,
	"industries" text[],
	"tags" text[],
	"tech_stack" text[],
	"stage" text,
	"status" text,
	"team_size" integer,
	"website" text,
	"yc_url" text,
	"logo_url" text,
	"location" text,
	"is_hiring" boolean DEFAULT false,
	"is_top_company" boolean DEFAULT false,
	"hiring_signals" jsonb,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "yc_companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_yc_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."yc_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_match_score_id_match_scores_id_fk" FOREIGN KEY ("match_score_id") REFERENCES "public"."match_scores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_company_id_yc_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."yc_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_embeddings" ADD CONSTRAINT "resume_embeddings_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_config" ADD CONSTRAINT "user_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_runs_user_id_idx" ON "agent_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_runs_status_idx" ON "agent_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_runs_parent_run_id_idx" ON "agent_runs" USING btree ("parent_run_id");--> statement-breakpoint
CREATE INDEX "contacts_company_id_idx" ON "contacts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "emails_user_id_idx" ON "emails" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "emails_contact_id_idx" ON "emails" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "llm_logs_created_at_idx" ON "llm_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "llm_logs_user_id_idx" ON "llm_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "match_scores_resume_id_idx" ON "match_scores" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "match_scores_company_id_idx" ON "match_scores" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "resume_embeddings_resume_id_idx" ON "resume_embeddings" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "resumes_user_id_idx" ON "resumes" USING btree ("user_id");