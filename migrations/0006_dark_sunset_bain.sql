ALTER TABLE "rankings" ADD COLUMN "created_date" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "rankings" ADD COLUMN "updated_date" timestamp DEFAULT now() NOT NULL;