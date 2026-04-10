CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_roles" text[] DEFAULT '{}' NOT NULL,
	"target_archetypes" text[] DEFAULT '{}' NOT NULL,
	"professional_narrative" text,
	"exit_narrative" text,
	"compensation_target" integer,
	"compensation_minimum" integer,
	"compensation_currency" text DEFAULT 'USD' NOT NULL,
	"location_preference" text,
	"remote_preference" text,
	"visa_status" text,
	"timezone" text,
	"signature_strengths" text[] DEFAULT '{}' NOT NULL,
	"portfolio_urls" text[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id");