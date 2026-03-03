CREATE TABLE "achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"category" varchar NOT NULL,
	"tier" varchar NOT NULL,
	"requirement" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "agent_interventions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partnership_id" varchar NOT NULL,
	"triggered_by" varchar NOT NULL,
	"intervention_type" varchar NOT NULL,
	"target_user_id" varchar,
	"related_memory_ids" text[],
	"title" text NOT NULL,
	"message" text NOT NULL,
	"suggested_action" text,
	"delivery_channel" varchar,
	"delivered_at" timestamp,
	"user_response" varchar,
	"response_details" text,
	"responded_at" timestamp,
	"conflict_prevented" boolean,
	"outcome_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"enable_proactive_nudges" boolean DEFAULT true NOT NULL,
	"enable_predictive_alerts" boolean DEFAULT true NOT NULL,
	"enable_daily_summary" boolean DEFAULT false NOT NULL,
	"enable_weekly_report" boolean DEFAULT true NOT NULL,
	"enable_prep_chat_suggestions" boolean DEFAULT true NOT NULL,
	"conflict_alert_threshold" integer DEFAULT 70,
	"nudge_frequency" varchar DEFAULT 'moderate',
	"preferred_channel" varchar DEFAULT 'in_app',
	"quiet_hours_start" varchar,
	"quiet_hours_end" varchar,
	"daily_summary_time" varchar DEFAULT '20:00',
	"weekly_report_day" varchar DEFAULT 'sunday',
	"allow_pattern_learning" boolean DEFAULT true NOT NULL,
	"data_retention_months" integer DEFAULT 12,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"action_type" text NOT NULL,
	"resource_id" varchar,
	"resource_type" text,
	"details" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_events_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" varchar NOT NULL,
	"session_code" varchar(6) NOT NULL,
	"event_type" varchar NOT NULL,
	"user_id" varchar,
	"sequence_id" integer NOT NULL,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_followups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" varchar NOT NULL,
	"message_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_participants_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar DEFAULT 'participant' NOT NULL,
	"joined_at" timestamp,
	"left_at" timestamp,
	"is_muted" boolean DEFAULT false NOT NULL,
	"has_video" boolean DEFAULT false NOT NULL,
	"negotiation_role" varchar,
	"last_ice_restart" timestamp,
	"connection_state" varchar DEFAULT 'new'
);
--> statement-breakpoint
CREATE TABLE "call_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"accept_calls_start_hour" text DEFAULT '8',
	"accept_calls_end_hour" text DEFAULT '21',
	"do_not_disturb" boolean DEFAULT false NOT NULL,
	"allow_emergency_override" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "call_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "call_recordings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"recording_url" text,
	"transcript" text,
	"duration" text,
	"participants" text[],
	"recorded_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_code" varchar NOT NULL,
	"host_id" varchar NOT NULL,
	"call_type" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	CONSTRAINT "call_sessions_session_code_unique" UNIQUE("session_code")
);
--> statement-breakpoint
CREATE TABLE "call_sessions_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" varchar NOT NULL,
	"session_code" varchar(6) NOT NULL,
	"type" varchar NOT NULL,
	"status" varchar DEFAULT 'initiated' NOT NULL,
	"conch_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"end_reason" varchar,
	"partnership_id" varchar,
	"sequence_id" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "call_sessions_v2_session_code_unique" UNIQUE("session_code")
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caller_id" varchar NOT NULL,
	"receiver_id" varchar NOT NULL,
	"partnership_id" varchar,
	"session_id" varchar,
	"call_type" varchar NOT NULL,
	"status" varchar DEFAULT 'ringing' NOT NULL,
	"reason" text,
	"is_emergency" boolean DEFAULT false NOT NULL,
	"decline_reason" text,
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "child_updates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_name" text NOT NULL,
	"update" text NOT NULL,
	"location" text,
	"partnership_id" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"partnership_id" varchar,
	"name" text NOT NULL,
	"nickname" text,
	"birth_date" timestamp,
	"age" integer,
	"grade" text,
	"notes" text,
	"photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conch_session_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "conch_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partnership_id" varchar NOT NULL,
	"initiator_user_id" varchar NOT NULL,
	"call_id" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"conch_holder_user_id" varchar,
	"base_turn_duration_seconds" text DEFAULT '60' NOT NULL,
	"current_turn_ends_at" timestamp,
	"extra_time_cap_seconds" text DEFAULT '90' NOT NULL,
	"pending_extra_time_request" jsonb,
	"strike_counts" jsonb DEFAULT '{}',
	"mood_data" jsonb DEFAULT '{}',
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conch_state_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" varchar NOT NULL,
	"state" varchar DEFAULT 'idle' NOT NULL,
	"holder_user_id" varchar,
	"expires_at" timestamp,
	"cooldown_until" timestamp,
	"request_queue" jsonb DEFAULT '[]',
	"last_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conch_turns_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"duration" integer,
	"was_interrupted" boolean DEFAULT false NOT NULL,
	"end_reason" varchar
);
--> statement-breakpoint
CREATE TABLE "conflict_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partnership_id" varchar NOT NULL,
	"pattern_name" varchar NOT NULL,
	"description" text NOT NULL,
	"trigger_topics" text[],
	"trigger_phrases" text[],
	"trigger_time_of_week" text[],
	"occurrence_count" integer DEFAULT 1,
	"last_occurred_at" timestamp,
	"average_severity" integer,
	"prevention_strategies" text[],
	"successful_interventions" integer DEFAULT 0,
	"failed_interventions" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"resolved_at" timestamp,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"peer_user_id" varchar NOT NULL,
	"nickname" varchar,
	"allow_audio" boolean DEFAULT true NOT NULL,
	"allow_video" boolean DEFAULT true NOT NULL,
	"allow_sms" boolean DEFAULT false NOT NULL,
	"allow_recording" boolean DEFAULT false NOT NULL,
	"allow_ai_tone" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"type" text NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"description" text,
	"location" text,
	"child_name" text,
	"recurring" text,
	"notes" text,
	"is_urgent" boolean DEFAULT false NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"partnership_id" varchar NOT NULL,
	"owed_amount" text NOT NULL,
	"paid_amount" text DEFAULT '0' NOT NULL,
	"percentage" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"amount" text NOT NULL,
	"category" text NOT NULL,
	"paid_by" varchar NOT NULL,
	"partnership_id" varchar,
	"status" text DEFAULT 'pending' NOT NULL,
	"receipt_url" text,
	"file_name" text,
	"file_size" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"type" text NOT NULL,
	"severity" text,
	"category" text NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"device_info" text,
	"app_version" text,
	"url" text,
	"status" text DEFAULT 'new',
	"admin_notes" text,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "guest_session_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_session_id" varchar NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" varchar(36) DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"display_name" varchar,
	"last_active" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"upgraded_to_user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guest_sessions_guest_id_unique" UNIQUE("guest_id"),
	CONSTRAINT "guest_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "listening_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"enable_conch_mode_summary" boolean DEFAULT true NOT NULL,
	"enable_chat_understanding_check" boolean DEFAULT true NOT NULL,
	"emotional_message_threshold" integer DEFAULT 60,
	"show_understanding_streak" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listening_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "message_summaries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_message_id" varchar,
	"conch_session_id" varchar,
	"conch_turn_number" integer,
	"partnership_id" varchar NOT NULL,
	"summary_text" text NOT NULL,
	"original_content" text,
	"validation_score" integer,
	"captured_points" text[],
	"missed_points" text[],
	"ai_feedback" text,
	"created_by" varchar NOT NULL,
	"skipped" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"sender_id" varchar NOT NULL,
	"recipient_id" varchar,
	"conversation_id" varchar,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"tone" text,
	"tone_summary" text,
	"tone_emoji" text,
	"rewording_suggestion" text,
	"message_type" text DEFAULT 'text' NOT NULL,
	"file_url" text,
	"file_name" text,
	"file_size" text,
	"mime_type" text,
	"duration" text,
	"transcript" text,
	"is_urgent" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"shared_item_type" text,
	"shared_item_id" varchar,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"reply_to_id" varchar
);
--> statement-breakpoint
CREATE TABLE "mobile_auth_states" (
	"state" varchar(128) PRIMARY KEY NOT NULL,
	"nonce" varchar(64) NOT NULL,
	"code_verifier" varchar(256) NOT NULL,
	"hostname" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_auth_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar(64) NOT NULL,
	"session_data" text,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mobile_auth_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"partnership_id" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parenting_tips" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"category" varchar NOT NULL,
	"age_min_months" text NOT NULL,
	"age_max_months" text NOT NULL,
	"image_url" text,
	"author" text,
	"tags" text[],
	"read_time_minutes" text,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partnership_balances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partnership_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"net_balance" text DEFAULT '0' NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partnerships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user1_id" varchar NOT NULL,
	"user2_id" varchar NOT NULL,
	"invite_code" varchar(6) NOT NULL,
	"allow_audio" boolean DEFAULT true NOT NULL,
	"allow_video" boolean DEFAULT true NOT NULL,
	"allow_recording" boolean DEFAULT false NOT NULL,
	"allow_ai_tone" boolean DEFAULT true NOT NULL,
	"custody_enabled" boolean DEFAULT false NOT NULL,
	"custody_pattern" text,
	"custody_start_date" timestamp,
	"custody_primary_parent" text,
	"custody_config" jsonb,
	"user1_color" text DEFAULT '#3b82f6',
	"user2_color" text DEFAULT '#10b981',
	"user1_personality_confirmed" varchar(4),
	"user2_personality_confirmed" varchar(4),
	"user1_personality_guess" varchar(4),
	"user2_personality_guess" varchar(4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"vet_appointments" text,
	"expenses" text,
	"custody_schedule" text,
	"partnership_id" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prep_chat_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"partnership_id" varchar,
	"topic" varchar NOT NULL,
	"custom_topic" text,
	"co_parent_personality_type" varchar,
	"user_personality_type" varchar,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"drafted_message" text,
	"tone_preview" jsonb,
	"breathing_exercise_completed" boolean DEFAULT false,
	"grounding_exercise_completed" boolean DEFAULT false,
	"emotional_state_start" varchar,
	"emotional_state_end" varchar,
	"sent_to_chat" boolean DEFAULT false,
	"sent_message_id" varchar,
	"outcome" varchar,
	"outcome_notes" text,
	"duration_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"platform" text DEFAULT 'web' NOT NULL,
	"endpoint" text,
	"p256dh" text,
	"auth" text,
	"device_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint"),
	CONSTRAINT "push_subscriptions_device_token_unique" UNIQUE("device_token")
);
--> statement-breakpoint
CREATE TABLE "relationship_memories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partnership_id" varchar NOT NULL,
	"memory_type" varchar NOT NULL,
	"source_type" varchar NOT NULL,
	"source_id" varchar,
	"content" text NOT NULL,
	"embedding" jsonb,
	"emotional_tone" varchar,
	"conflict_score" integer,
	"participants" text[],
	"topics" text[],
	"occurred_at" timestamp NOT NULL,
	"week_of_year" integer,
	"day_of_week" integer,
	"time_of_day" varchar,
	"pattern_tags" text[],
	"importance_score" integer DEFAULT 50,
	"last_retrieved_at" timestamp,
	"retrieval_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"encrypted_data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"pattern" text NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_by" varchar,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_calls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheduler_id" varchar NOT NULL,
	"participant_id" varchar NOT NULL,
	"partnership_id" varchar,
	"call_type" varchar NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"title" text,
	"notes" text,
	"reason" text,
	"duration" text,
	"reminder_sent" boolean DEFAULT false NOT NULL,
	"reminder_minutes" text DEFAULT '15',
	"status" varchar DEFAULT 'pending' NOT NULL,
	"actual_call_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_mood_summaries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"participants" text[] NOT NULL,
	"emotions_timeline" jsonb DEFAULT '[]' NOT NULL,
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp DEFAULT NOW() + INTERVAL '7 days' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_id" varchar NOT NULL,
	"payer_id" varchar NOT NULL,
	"receiver_id" varchar NOT NULL,
	"partnership_id" varchar NOT NULL,
	"amount" text NOT NULL,
	"method" text NOT NULL,
	"payment_link" text,
	"status" text DEFAULT 'initiated' NOT NULL,
	"initiated_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	"rejected_at" timestamp,
	"rejected_reason" text,
	"reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" varchar NOT NULL,
	"name" text NOT NULL,
	"quantity" text,
	"checked" boolean DEFAULT false NOT NULL,
	"added_by" varchar NOT NULL,
	"checked_by" varchar,
	"checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_lists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partnership_id" varchar NOT NULL,
	"name" text NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" varchar NOT NULL,
	"page_number" integer NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storybooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partnership_id" varchar NOT NULL,
	"title" text NOT NULL,
	"cover_image_url" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"partnership_id" varchar,
	"streak_type" varchar NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_activity_date" timestamp NOT NULL,
	"streak_start_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_resources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization" text NOT NULL,
	"region" text NOT NULL,
	"country_code" text DEFAULT 'CA' NOT NULL,
	"is_nationwide" boolean DEFAULT false NOT NULL,
	"services" text[] NOT NULL,
	"phone" text,
	"email" text,
	"website" text,
	"address" text,
	"category" text NOT NULL,
	"gender_focus" text NOT NULL,
	"is_free" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT true NOT NULL,
	"latitude" text,
	"longitude" text,
	"operating_hours" text,
	"languages" text[],
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"due_date" text,
	"location" text,
	"partnership_id" varchar NOT NULL,
	"assigned_to" varchar,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "therapists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"specialty" text NOT NULL,
	"address" text NOT NULL,
	"phone" text,
	"email" text,
	"website" text,
	"latitude" text NOT NULL,
	"longitude" text NOT NULL,
	"rating" text,
	"review_count" text DEFAULT '0' NOT NULL,
	"distance" text,
	"license_number" text,
	"accepts_insurance" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"messages_sent" text DEFAULT '0' NOT NULL,
	"tone_analyzed" text DEFAULT '0' NOT NULL,
	"therapist_searches" text DEFAULT '0' NOT NULL,
	"call_activity" text DEFAULT '0' NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"achievement_id" varchar NOT NULL,
	"partnership_id" varchar,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"partnership_id" varchar,
	"total_messages_sent" integer DEFAULT 0 NOT NULL,
	"positive_messages_sent" integer DEFAULT 0 NOT NULL,
	"calendar_events_created" integer DEFAULT 0 NOT NULL,
	"tasks_completed" integer DEFAULT 0 NOT NULL,
	"expenses_logged" integer DEFAULT 0 NOT NULL,
	"conch_sessions_completed" integer DEFAULT 0 NOT NULL,
	"summaries_validated" integer DEFAULT 0 NOT NULL,
	"understanding_streak" integer DEFAULT 0 NOT NULL,
	"longest_understanding_streak" integer DEFAULT 0 NOT NULL,
	"average_validation_score" integer,
	"last_activity_date" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"display_name" varchar,
	"phone_number" varchar,
	"share_phone_with_contacts" boolean DEFAULT false NOT NULL,
	"invite_code" varchar(6),
	"invite_code_generated_at" timestamp,
	"relationship_type" varchar,
	"child_name" varchar,
	"consent_accepted_at" timestamp,
	"terms_accepted_at" timestamp,
	"privacy_accepted" boolean DEFAULT false NOT NULL,
	"ai_message_consent" boolean DEFAULT false NOT NULL,
	"ai_call_consent" boolean DEFAULT false NOT NULL,
	"personality_type" varchar(4),
	"communication_style" varchar,
	"conflict_resolution_style" varchar,
	"stress_triggers" text,
	"parenting_philosophy" text,
	"active_partnership_id" varchar,
	"is_guest" boolean DEFAULT false NOT NULL,
	"guest_id" varchar(6),
	"onboarding_completed_at" timestamp,
	"onboarding_step" integer DEFAULT 0,
	"is_admin" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"last_user_agent" text,
	"is_deactivated" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"subscription_tier" varchar(20) DEFAULT 'free' NOT NULL,
	"trial_started_at" timestamp DEFAULT now(),
	"subscription_active_until" timestamp,
	"total_messages_sent" integer DEFAULT 0 NOT NULL,
	"total_structured_actions" integer DEFAULT 0 NOT NULL,
	"distinct_days_active" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "weather_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"age_min_months" text NOT NULL,
	"age_max_months" text NOT NULL,
	"activity_type" varchar NOT NULL,
	"weather_conditions" text[] NOT NULL,
	"category" varchar NOT NULL,
	"duration_minutes" text,
	"materials_needed" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_interventions" ADD CONSTRAINT "agent_interventions_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_interventions" ADD CONSTRAINT "agent_interventions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_settings" ADD CONSTRAINT "agent_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_events_v2" ADD CONSTRAINT "call_events_v2_call_id_call_sessions_v2_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."call_sessions_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_events_v2" ADD CONSTRAINT "call_events_v2_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_followups" ADD CONSTRAINT "call_followups_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_followups" ADD CONSTRAINT "call_followups_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants_v2" ADD CONSTRAINT "call_participants_v2_call_id_call_sessions_v2_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."call_sessions_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants_v2" ADD CONSTRAINT "call_participants_v2_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_preferences" ADD CONSTRAINT "call_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_session_id_call_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."call_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sessions_v2" ADD CONSTRAINT "call_sessions_v2_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sessions_v2" ADD CONSTRAINT "call_sessions_v2_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_caller_id_users_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_session_id_call_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."call_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_updates" ADD CONSTRAINT "child_updates_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_updates" ADD CONSTRAINT "child_updates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conch_session_participants" ADD CONSTRAINT "conch_session_participants_session_id_conch_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."conch_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conch_session_participants" ADD CONSTRAINT "conch_session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conch_sessions" ADD CONSTRAINT "conch_sessions_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conch_sessions" ADD CONSTRAINT "conch_sessions_initiator_user_id_users_id_fk" FOREIGN KEY ("initiator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conch_sessions" ADD CONSTRAINT "conch_sessions_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conch_sessions" ADD CONSTRAINT "conch_sessions_conch_holder_user_id_users_id_fk" FOREIGN KEY ("conch_holder_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conch_state_v2" ADD CONSTRAINT "conch_state_v2_call_id_call_sessions_v2_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."call_sessions_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conch_state_v2" ADD CONSTRAINT "conch_state_v2_holder_user_id_users_id_fk" FOREIGN KEY ("holder_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conch_turns_v2" ADD CONSTRAINT "conch_turns_v2_call_id_call_sessions_v2_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."call_sessions_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conch_turns_v2" ADD CONSTRAINT "conch_turns_v2_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_patterns" ADD CONSTRAINT "conflict_patterns_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_peer_user_id_users_id_fk" FOREIGN KEY ("peer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_session_data" ADD CONSTRAINT "guest_session_data_guest_session_id_guest_sessions_session_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "public"."guest_sessions"("session_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_upgraded_to_user_id_users_id_fk" FOREIGN KEY ("upgraded_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_settings" ADD CONSTRAINT "listening_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_summaries" ADD CONSTRAINT "message_summaries_original_message_id_messages_id_fk" FOREIGN KEY ("original_message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_summaries" ADD CONSTRAINT "message_summaries_conch_session_id_conch_sessions_id_fk" FOREIGN KEY ("conch_session_id") REFERENCES "public"."conch_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_summaries" ADD CONSTRAINT "message_summaries_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_summaries" ADD CONSTRAINT "message_summaries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_auth_tokens" ADD CONSTRAINT "mobile_auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnership_balances" ADD CONSTRAINT "partnership_balances_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnership_balances" ADD CONSTRAINT "partnership_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_user1_id_users_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_user2_id_users_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prep_chat_sessions" ADD CONSTRAINT "prep_chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prep_chat_sessions" ADD CONSTRAINT "prep_chat_sessions_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_memories" ADD CONSTRAINT "relationship_memories_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_plans" ADD CONSTRAINT "safety_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_calls" ADD CONSTRAINT "scheduled_calls_scheduler_id_users_id_fk" FOREIGN KEY ("scheduler_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_calls" ADD CONSTRAINT "scheduled_calls_participant_id_users_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_calls" ADD CONSTRAINT "scheduled_calls_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_calls" ADD CONSTRAINT "scheduled_calls_actual_call_id_calls_id_fk" FOREIGN KEY ("actual_call_id") REFERENCES "public"."calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_mood_summaries" ADD CONSTRAINT "session_mood_summaries_session_id_call_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."call_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_list_id_shopping_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."shopping_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_checked_by_users_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_pages" ADD CONSTRAINT "story_pages_story_id_storybooks_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."storybooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_pages" ADD CONSTRAINT "story_pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storybooks" ADD CONSTRAINT "storybooks_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storybooks" ADD CONSTRAINT "storybooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_metrics" ADD CONSTRAINT "usage_metrics_session_id_guest_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guest_sessions"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_metrics" ADD CONSTRAINT "usage_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_active_partnership_id_partnerships_id_fk" FOREIGN KEY ("active_partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_events_v2_session_code_idx" ON "call_events_v2" USING btree ("session_code");--> statement-breakpoint
CREATE INDEX "call_events_v2_timestamp_idx" ON "call_events_v2" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "calls_status_created_at_idx" ON "calls" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "guest_session_data_session_id_idx" ON "guest_session_data" USING btree ("guest_session_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");