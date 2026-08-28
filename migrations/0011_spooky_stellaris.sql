ALTER TABLE "ranking_item_attributes" DROP CONSTRAINT "ranking_item_attributes_attribute_id_snob_group_attributes_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ranking_item_attributes" ADD CONSTRAINT "ranking_item_attributes_attribute_id_snob_group_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."snob_group_attributes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
