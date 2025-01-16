CREATE TABLE IF NOT EXISTS "ranking_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"description" text NOT NULL,
	"ranked" boolean NOT NULL,
	"averageRanking" numeric,
	"image_id" text,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rankings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"item_id" uuid NOT NULL,
	"group_member_id" uuid NOT NULL,
	"ranking" numeric NOT NULL,
	"notes" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ranking_items" ADD CONSTRAINT "ranking_items_group_id_snob_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."snob_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rankings" ADD CONSTRAINT "rankings_item_id_ranking_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."ranking_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rankings" ADD CONSTRAINT "rankings_group_member_id_snob_group_members_id_fk" FOREIGN KEY ("group_member_id") REFERENCES "public"."snob_group_members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
