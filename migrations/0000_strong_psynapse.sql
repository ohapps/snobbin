CREATE TABLE IF NOT EXISTS "snobs" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"picture_url" text,
	CONSTRAINT "snobs_email_unique" UNIQUE("email")
);
