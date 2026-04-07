ALTER TABLE "users" ADD COLUMN "session_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "prep_chat_session_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "draft_to_send_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_prep_chat_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_message_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_tone_check_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_re_engagement_at" timestamp;