ALTER TABLE "ranking_items" ADD COLUMN "created_date" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_items" ADD COLUMN "updated_date" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_items" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "ranking_items" ADD COLUMN "updated_by" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ranking_items" ADD CONSTRAINT "ranking_items_created_by_snobs_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."snobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ranking_items" ADD CONSTRAINT "ranking_items_updated_by_snobs_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."snobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
