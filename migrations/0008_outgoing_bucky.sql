ALTER TABLE "ranking_item_attributes" DROP CONSTRAINT "ranking_item_attributes_item_id_ranking_items_id_fk";
--> statement-breakpoint
ALTER TABLE "rankings" DROP CONSTRAINT "rankings_item_id_ranking_items_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ranking_item_attributes" ADD CONSTRAINT "ranking_item_attributes_item_id_ranking_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."ranking_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rankings" ADD CONSTRAINT "rankings_item_id_ranking_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."ranking_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
