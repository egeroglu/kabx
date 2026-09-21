CREATE TABLE "app_config" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" varchar(128) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX "app_config_public_idx" ON "app_config" USING btree ("is_public");