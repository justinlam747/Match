CREATE TABLE "company_research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"signals" jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "company_research_company_id_unique" UNIQUE("company_id"),
	CONSTRAINT "company_research_company_id_yc_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."yc_companies"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "company_research_company_id_idx" ON "company_research" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_research_expires_at_idx" ON "company_research" USING btree ("expires_at");
