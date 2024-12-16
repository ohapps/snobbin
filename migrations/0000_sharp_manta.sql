CREATE TABLE IF NOT EXISTS "snob_group_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"snob_id" text NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snob_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"min_ranking" numeric NOT NULL,
	"max_ranking" numeric NOT NULL,
	"increments" numeric NOT NULL,
	"rank_icon" text NOT NULL,
	"rankings_required" numeric NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snobs" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"picture_url" text,
	CONSTRAINT "snobs_email_unique" UNIQUE("email")
);
