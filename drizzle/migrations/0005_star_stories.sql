CREATE TABLE "star_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"match_id" uuid,
	"archetype" text,
	"jd_requirement" text NOT NULL,
	"situation" text NOT NULL,
	"task" text NOT NULL,
	"action" text NOT NULL,
	"result" text NOT NULL,
	"reflection" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "star_stories_user_id_idx" ON "star_stories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "star_stories_match_id_idx" ON "star_stories" USING btree ("match_id");