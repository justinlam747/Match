CREATE TABLE "evaluation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"match_id" uuid,
	"batch_item_id" uuid,
	"archetype" text,
	"grade" text,
	"blocks" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "evaluation_reports_user_id_idx" ON "evaluation_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "evaluation_reports_match_id_idx" ON "evaluation_reports" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "evaluation_reports_batch_item_id_idx" ON "evaluation_reports" USING btree ("batch_item_id");