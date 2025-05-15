ALTER TABLE "snobs" ADD COLUMN "last_group_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "snobs" ADD CONSTRAINT "snobs_last_group_id_snob_groups_id_fk" FOREIGN KEY ("last_group_id") REFERENCES "public"."snob_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
