CREATE TABLE IF NOT EXISTS "ranking_item_attributes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"item_id" uuid NOT NULL,
	"attribute_id" uuid NOT NULL,
	"attribute_value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snob_group_attributes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ranking_item_attributes" ADD CONSTRAINT "ranking_item_attributes_item_id_ranking_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."ranking_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ranking_item_attributes" ADD CONSTRAINT "ranking_item_attributes_attribute_id_snob_group_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."snob_group_attributes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "snob_group_attributes" ADD CONSTRAINT "snob_group_attributes_group_id_snob_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."snob_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
