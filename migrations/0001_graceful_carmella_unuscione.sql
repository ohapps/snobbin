CREATE TABLE IF NOT EXISTS "snob_group_invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"email" text NOT NULL,
	"status" text NOT NULL
);
