ALTER TABLE "match_scores" ADD COLUMN "archetype" text;--> statement-breakpoint
ALTER TABLE "match_scores" ADD COLUMN "compensation_score" real;--> statement-breakpoint
ALTER TABLE "match_scores" ADD COLUMN "culture_score" real;--> statement-breakpoint
ALTER TABLE "match_scores" ADD COLUMN "red_flag_score" real;--> statement-breakpoint
ALTER TABLE "match_scores" ADD COLUMN "north_star_score" real;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "score_weights" jsonb;--> statement-breakpoint
ALTER TABLE "yc_companies" ADD COLUMN "archetype" text;