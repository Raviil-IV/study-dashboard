CREATE TABLE "ranepa_imports" (
	"user_id" uuid NOT NULL,
	"url" text NOT NULL,
	"group_name" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ranepa_imports_user_id_url_pk" PRIMARY KEY("user_id","url")
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "ranepa_imports" ADD CONSTRAINT "ranepa_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;