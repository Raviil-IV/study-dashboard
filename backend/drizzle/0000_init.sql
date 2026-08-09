CREATE TABLE "deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"subject" text,
	"date" date NOT NULL,
	"time" varchar(5),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text,
	"subject" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_minutes" smallint NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game" text NOT NULL,
	"difficulty" text NOT NULL,
	"best_value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"date" date,
	"location" text,
	"note" text,
	"color" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subject" text,
	"content" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"pomodoro_work_minutes" smallint DEFAULT 25 NOT NULL,
	"pomodoro_short_break_minutes" smallint DEFAULT 5 NOT NULL,
	"pomodoro_long_break_minutes" smallint DEFAULT 15 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subject" text,
	"description" text,
	"due_date" date,
	"priority" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_records" ADD CONSTRAINT "game_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deadlines_user_idx" ON "deadlines" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "focus_sessions_user_idx" ON "focus_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_records_user_game_difficulty_idx" ON "game_records" USING btree ("user_id","game","difficulty");--> statement-breakpoint
CREATE INDEX "lessons_user_idx" ON "lessons" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notes_user_idx" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_user_idx" ON "tasks" USING btree ("user_id");