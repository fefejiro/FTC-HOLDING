import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, jsonb, integer, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth (Google OAuth)
// IMPORTANT: Keep the .default() config for id column (required for Replit Auth migration)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  displayName: varchar("display_name"),
  phoneNumber: varchar("phone_number"), // Optional phone number for contact info
  sharePhoneWithContacts: boolean("share_phone_with_contacts").notNull().default(false), // User must opt-in to share phone
  inviteCode: varchar("invite_code", { length: 6 }).unique(), // 6-character invite code for partnership invites
  inviteCodeGeneratedAt: timestamp("invite_code_generated_at"), // Timestamp when invite code was created/regenerated (for 14-day expiration)
  relationshipType: varchar("relationship_type"), // ex-spouse, separated, never-married, other
  childName: varchar("child_name"), // Primary child's name (optional)
  consentAcceptedAt: timestamp("consent_accepted_at"), // Timestamp when user accepted consent agreement
  termsAcceptedAt: timestamp("terms_accepted_at"), // Timestamp when user accepted Terms & Conditions (including NDA)
  privacyAccepted: boolean("privacy_accepted").notNull().default(false), // User accepted Privacy Policy
  aiMessageConsent: boolean("ai_message_consent").notNull().default(false), // Consent for AI tone analysis on messages
  aiCallConsent: boolean("ai_call_consent").notNull().default(false), // Consent for optional AI listening during calls
  personalityType: varchar("personality_type", { length: 4 }), // Myers-Briggs personality type (INTJ, ENFP, etc.) - optional but recommended for better AI mood analysis
  communicationStyle: varchar("communication_style"), // direct, indirect, passive, assertive - helps AI understand natural communication patterns
  conflictResolutionStyle: varchar("conflict_resolution_style"), // collaborative, competitive, accommodating, avoiding, compromising
  stressTriggers: text("stress_triggers"), // Free-form text describing what causes stress/tension
  parentingPhilosophy: text("parenting_philosophy"), // Free-form description of parenting approach and values
  activePartnershipId: varchar("active_partnership_id").references((): AnyPgColumn => partnerships.id), // Primary partnership for all features (safety: prevents accidental messages to wrong ex)
  isGuest: boolean("is_guest").notNull().default(false), // True if this is a guest account (14-day expiration)
  guestId: varchar("guest_id", { length: 6 }), // Short random ID for guest users (e.g., "abc123")
  onboardingCompletedAt: timestamp("onboarding_completed_at"), // Timestamp when user completed the onboarding wizard
  onboardingStep: integer("onboarding_step").default(0), // Current step in onboarding (0 = not started, 1-3 = in progress, 4 = completed)
  isAdmin: boolean("is_admin").notNull().default(false), // Admin users can access /admin dashboard
  lastLoginAt: timestamp("last_login_at"), // Track last login for admin visibility
  lastUserAgent: text("last_user_agent"), // Device/browser info from last login
  isDeactivated: boolean("is_deactivated").notNull().default(false), // Soft-delete flag
  deletedAt: timestamp("deleted_at"), // Grace period starts from this timestamp
  // Subscription & Tiering
  subscriptionTier: varchar("subscription_tier", { length: 20 }).notNull().default("free"), // free, starter, pro
  trialStartedAt: timestamp("trial_started_at").defaultNow(),
  subscriptionActiveUntil: timestamp("subscription_active_until"),
  // Preservation & Conversion Signals
  totalMessagesSent: integer("total_messages_sent").notNull().default(0),
  totalStructuredActions: integer("total_structured_actions").notNull().default(0), // Conch sessions, scheduled events
  distinctDaysActive: integer("distinct_days_active").notNull().default(0),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  // Retention instrumentation
  sessionCount: integer("session_count").notNull().default(0), // Times user has returned to the app
  prepChatSessionCount: integer("prep_chat_session_count").notNull().default(0), // Total Prep Chat sessions lifetime
  draftToSendCount: integer("draft_to_send_count").notNull().default(0), // Prep Chat drafts that reached Messages
  firstPrepChatAt: timestamp("first_prep_chat_at"), // When user first used Prep Chat
  firstMessageSentAt: timestamp("first_message_sent_at"), // When user first sent a real message
  firstToneCheckAt: timestamp("first_tone_check_at"), // When user first ran tone analysis
  lastReEngagementAt: timestamp("last_re_engagement_at"), // Last time a re-engagement push was sent
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Guest session tracking with localStorage sync
export const guestSessions = pgTable("guest_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guestId: varchar("guest_id", { length: 36 }).notNull().default(sql`gen_random_uuid()`).unique(),
  sessionId: varchar("session_id").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id),
  displayName: varchar("display_name"),
  lastActive: timestamp("last_active").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  upgradedToUserId: varchar("upgraded_to_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Guest-scoped persistent payloads. Data is kept separate from authenticated records
// and always tagged by guestSessionId for explicit lifecycle cleanup.
export const guestSessionData = pgTable(
  "guest_session_data",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    guestSessionId: varchar("guest_session_id")
      .notNull()
      .references(() => guestSessions.sessionId, { onDelete: "cascade" }),
    data: jsonb("data").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("guest_session_data_session_id_idx").on(table.guestSessionId)],
);

// Mobile auth tokens - one-time tokens for native app OAuth flow
// When OAuth completes in external browser, we generate a token and redirect to peacepad://auth-success?token=xxx
// The app then exchanges this token for a session cookie in its webview context
export const mobileAuthTokens = pgTable("mobile_auth_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token", { length: 64 }).notNull().unique(),
  sessionData: text("session_data"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type MobileAuthToken = typeof mobileAuthTokens.$inferSelect;

export const mobileAuthStates = pgTable("mobile_auth_states", {
  state: varchar("state", { length: 128 }).primaryKey(),
  nonce: varchar("nonce", { length: 64 }).notNull(),
  codeVerifier: varchar("code_verifier", { length: 256 }).notNull(),
  hostname: varchar("hostname", { length: 256 }).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type MobileAuthState = typeof mobileAuthStates.$inferSelect;

// Contacts table for managing relationships and permissions (legacy - being replaced by partnerships)
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // Owner of the contact
  peerUserId: varchar("peer_user_id").notNull().references(() => users.id), // The contact person
  nickname: varchar("nickname"), // Optional custom nickname for the contact
  allowAudio: boolean("allow_audio").notNull().default(true), // Permission for audio calls
  allowVideo: boolean("allow_video").notNull().default(true), // Permission for video calls
  allowSms: boolean("allow_sms").notNull().default(false), // Permission to send SMS
  allowRecording: boolean("allow_recording").notNull().default(false), // Permission for call recording
  allowAiTone: boolean("allow_ai_tone").notNull().default(false), // Permission for AI tone analysis
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Partnerships table for co-parenting relationships (supports multiple co-parents)
export const partnerships = pgTable("partnerships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull().references((): AnyPgColumn => users.id), // First co-parent
  user2Id: varchar("user2_id").notNull().references((): AnyPgColumn => users.id), // Second co-parent
  inviteCode: varchar("invite_code", { length: 6 }).notNull(), // Shared code used to create partnership
  // Partnership-level permissions (both parties can configure)
  allowAudio: boolean("allow_audio").notNull().default(true),
  allowVideo: boolean("allow_video").notNull().default(true),
  allowRecording: boolean("allow_recording").notNull().default(false),
  allowAiTone: boolean("allow_ai_tone").notNull().default(true), // Default on for co-parenting
  // Custody schedule configuration
  custodyEnabled: boolean("custody_enabled").notNull().default(false), // Toggle custody calendar feature
  custodyPattern: text("custody_pattern"), // week_on_off, every_other_weekend, two_two_three, custom
  custodyStartDate: timestamp("custody_start_date"), // When the pattern begins
  custodyPrimaryParent: text("custody_primary_parent"), // user1 or user2 - who has custody first
  custodyConfig: jsonb("custody_config"), // Custom pattern configuration (days of week, etc.)
  user1Color: text("user1_color").default("#3b82f6"), // User 1 calendar color (soft blue)
  user2Color: text("user2_color").default("#10b981"), // User 2 calendar color (soft green)
  // Co-parent personality integration for AI-adapted communication
  // Each user sets their own confirmed personality - overrides any guesses
  user1PersonalityConfirmed: varchar("user1_personality_confirmed", { length: 4 }), // User 1's self-reported MBTI
  user2PersonalityConfirmed: varchar("user2_personality_confirmed", { length: 4 }), // User 2's self-reported MBTI
  // Guessed personalities (tentative - used when confirmed not available)
  user1PersonalityGuess: varchar("user1_personality_guess", { length: 4 }), // User 2's guess for User 1
  user2PersonalityGuess: varchar("user2_personality_guess", { length: 4 }), // User 1's guess for User 2
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Conversations table for both 1:1 and group chats (FRO compliant)
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"), // Optional name for group chats (e.g., "Family Group")
  type: text("type").notNull(), // 'direct' for 1:1, 'group' for 3+ people
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Conversation members junction table (who's in each conversation)
export const conversationMembers = pgTable("conversation_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Usage metrics tracking
export const usageMetrics = pgTable("usage_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => guestSessions.sessionId),
  userId: varchar("user_id").notNull().references(() => users.id),
  messagesSent: text("messages_sent").notNull().default("0"),
  toneAnalyzed: text("tone_analyzed").notNull().default("0"),
  therapistSearches: text("therapist_searches").notNull().default("0"),
  callActivity: text("call_activity").notNull().default("0"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientId: varchar("recipient_id").references(() => users.id), // For backward compatibility with 1:1 conversations
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: 'cascade' }), // New: links message to conversation
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  tone: text("tone"),
  toneSummary: text("tone_summary"),
  toneEmoji: text("tone_emoji"),
  rewordingSuggestion: text("rewording_suggestion"),
  // WhatsApp-like media support
  messageType: text("message_type").notNull().default("text"), // text, image, audio, video, document
  fileUrl: text("file_url"), // URL to uploaded file
  fileName: text("file_name"), // Original file name
  fileSize: text("file_size"), // File size in bytes
  mimeType: text("mime_type"), // MIME type of file
  duration: text("duration"), // Duration for audio/video in seconds
  transcript: text("transcript"), // Whisper transcription for voice notes (auto-generated)
  isUrgent: boolean("is_urgent").notNull().default(false), // Mark message as urgent (triggers push notification)
  // Delivery tracking (WhatsApp-style)
  status: text("status").notNull().default("sent"), // sent, delivered, read
  deliveredAt: timestamp("delivered_at"), // When message was delivered to recipient
  readAt: timestamp("read_at"), // When message was read by recipient
  // Share-to-chat feature - allows sharing events, expenses, tasks in chat
  sharedItemType: text("shared_item_type"), // event, expense, task
  sharedItemId: varchar("shared_item_id"), // ID of the shared item
  isDeleted: boolean("is_deleted").notNull().default(false), // Soft delete for messages
  // WhatsApp-style inline reply
  replyToId: varchar("reply_to_id"), // ID of message being replied to (self-referential)
});

export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id), // SECURITY: Tie to specific partnership
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  dueDate: text("due_date"),
  location: text("location"), // Structured location data (JSON: {address, lat, lng})
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id), // SECURITY: Tie to specific partnership
  assignedTo: varchar("assigned_to").references(() => users.id), // User assigned to complete this task
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const childUpdates = pgTable("child_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childName: text("child_name").notNull(),
  update: text("update").notNull(),
  location: text("location"), // Structured location data (JSON: {address, lat, lng})
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id), // SECURITY: Tie to specific partnership
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Children table for storing child profiles during onboarding
export const children = pgTable("children", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  partnershipId: varchar("partnership_id").references(() => partnerships.id), // Optional: shared with co-parent
  name: text("name").notNull(),
  nickname: text("nickname"), // Optional nickname
  birthDate: timestamp("birth_date"), // Optional: for age calculation
  age: integer("age"), // Alternative to birthDate - can be manually entered
  grade: text("grade"), // Optional: current school grade
  notes: text("notes"), // Special notes (allergies, preferences, etc.)
  photoUrl: text("photo_url"), // Optional profile photo
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pets = pgTable("pets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  vetAppointments: text("vet_appointments"),
  expenses: text("expenses"),
  custodySchedule: text("custody_schedule"),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id), // SECURITY: Tie to specific partnership
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: text("type").notNull(), // pickup, dropoff, custody_switch, appointment, other
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  description: text("description"),
  location: text("location"), // Structured location data (JSON: {address, lat, lng, displayName})
  childName: text("child_name"), // Which child this relates to
  recurring: text("recurring"), // none, daily, weekly, biweekly, monthly
  notes: text("notes"), // Additional notes
  isUrgent: boolean("is_urgent").notNull().default(false), // Mark event as urgent (triggers push notification)
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Custody schedule templates for quick setup (every other weekend, 2-2-3, etc.)
export const scheduleTemplates = pgTable("schedule_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "Every Other Weekend", "2-2-3 Schedule", etc.
  description: text("description").notNull(), // Detailed explanation of the pattern
  pattern: text("pattern").notNull(), // JSON structure defining the schedule pattern
  isCustom: boolean("is_custom").notNull().default(false), // true for user-created templates
  createdBy: varchar("created_by").references(() => users.id), // null for system templates
  isPublic: boolean("is_public").notNull().default(true), // System templates are public
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  category: text("category").notNull(),
  paidBy: varchar("paid_by").notNull().references(() => users.id),
  partnershipId: varchar("partnership_id").references(() => partnerships.id), // Nullable for solo use
  status: text("status").notNull().default("pending"), // pending, paid, settled
  receiptUrl: text("receipt_url"), // URL to uploaded receipt image/PDF
  fileName: text("file_name"), // Original file name of receipt
  fileSize: text("file_size"), // File size in bytes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Expense participants - tracks who owes what on each expense
export const expenseParticipants = pgTable("expense_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseId: varchar("expense_id").notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id),
  owedAmount: text("owed_amount").notNull(), // How much this person owes
  paidAmount: text("paid_amount").notNull().default("0"), // How much they've paid back
  percentage: text("percentage").notNull(), // Their share percentage (e.g., "60" for 60%)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Settlements - payment acknowledgements for expenses
export const settlements = pgTable("settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseId: varchar("expense_id").notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  payerId: varchar("payer_id").notNull().references(() => users.id), // Who is paying
  receiverId: varchar("receiver_id").notNull().references(() => users.id), // Who receives payment
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id),
  amount: text("amount").notNull(), // Amount being settled
  method: text("method").notNull(), // manual, etransfer, paypal, wise, other
  paymentLink: text("payment_link"), // Optional link to external payment (e.g., PayPal.me)
  status: text("status").notNull().default("initiated"), // initiated, pending_confirmation, confirmed, rejected
  initiatedAt: timestamp("initiated_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"), // When receiver confirmed receipt
  rejectedAt: timestamp("rejected_at"), // When receiver disputed
  rejectedReason: text("rejected_reason"), // Why settlement was rejected
  reminderSentAt: timestamp("reminder_sent_at"), // Track when reminder was sent
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Partnership balances - running total of who owes what
export const partnershipBalances = pgTable("partnership_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  netBalance: text("net_balance").notNull().default("0"), // Positive = they owe others, Negative = others owe them
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Call sessions for shareable video/audio calls (legacy - for session code approach)
export const callSessions = pgTable("call_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionCode: varchar("session_code").notNull().unique(), // 6-digit code like Zoom
  hostId: varchar("host_id").notNull().references(() => users.id),
  callType: varchar("call_type").notNull(), // 'audio' or 'video'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

// Direct calls between co-parents (new calling system)
export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callerId: varchar("caller_id").notNull().references(() => users.id), // Who initiated the call
  receiverId: varchar("receiver_id").notNull().references(() => users.id), // Who was called
  partnershipId: varchar("partnership_id").references(() => partnerships.id), // Link to partnership
  sessionId: varchar("session_id").references(() => callSessions.id), // Link to WebRTC session (nullable for backward compat)
  callType: varchar("call_type").notNull(), // 'audio' or 'video'
  status: varchar("status").notNull().default("ringing"), // ringing, active, ended, missed, declined
  reason: text("reason"), // Optional context: "Calling about: pickup time"
  isEmergency: boolean("is_emergency").notNull().default(false), // Emergency call flag (bypasses DND)
  declineReason: text("decline_reason"), // "Busy", "Can't talk now", "Will call back", "Other"
  startedAt: timestamp("started_at"), // When call was answered (null if never answered)
  endedAt: timestamp("ended_at"), // When call ended
  duration: text("duration"), // Duration in seconds (calculated from startedAt to endedAt)
  createdAt: timestamp("created_at").notNull().defaultNow(), // When call was initiated
}, (table) => ({
  // Index for call cleanup service to efficiently find stuck ringing calls
  statusCreatedAtIdx: index("calls_status_created_at_idx").on(table.status, table.createdAt),
}));

// Scheduled calls for future appointments
export const scheduledCalls = pgTable("scheduled_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schedulerId: varchar("scheduler_id").notNull().references(() => users.id), // Who scheduled the call
  participantId: varchar("participant_id").notNull().references(() => users.id), // Other participant
  partnershipId: varchar("partnership_id").references(() => partnerships.id),
  callType: varchar("call_type").notNull(), // 'audio' or 'video'
  scheduledFor: timestamp("scheduled_for").notNull(), // When the call is scheduled
  title: text("title"), // Optional title like "Weekly check-in"
  notes: text("notes"), // Optional notes about the call
  reason: text("reason"), // Optional call reason/context
  duration: text("duration"), // Estimated duration in minutes
  reminderSent: boolean("reminder_sent").notNull().default(false), // Track if reminder notification was sent
  reminderMinutes: text("reminder_minutes").default("15"), // Minutes before to send reminder
  status: varchar("status").notNull().default("pending"), // pending, completed, cancelled, missed
  actualCallId: varchar("actual_call_id").references(() => calls.id), // Links to actual call when it happens
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Call follow-ups: Messages sent after missed calls for context
export const callFollowups = pgTable("call_followups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => calls.id, { onDelete: 'cascade' }),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User preferences for call boundaries and etiquette
export const callPreferences = pgTable("call_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  // Global call hours (can be overridden per partnership)
  acceptCallsStartHour: text("accept_calls_start_hour").default("8"), // 24-hour format: "8" = 8am
  acceptCallsEndHour: text("accept_calls_end_hour").default("21"), // 24-hour format: "21" = 9pm
  doNotDisturb: boolean("do_not_disturb").notNull().default(false), // DND mode toggle
  allowEmergencyOverride: boolean("allow_emergency_override").notNull().default(true), // Allow emergency calls during DND
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Call recordings for audit/legal purposes
export const callRecordings = pgTable("call_recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => callSessions.id),
  recordingUrl: text("recording_url"), // Local blob URL or external storage
  transcript: text("transcript"), // AI-generated transcript
  duration: text("duration"), // Duration in seconds
  participants: text("participants").array(), // Array of participant IDs
  recordedBy: varchar("recorded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Therapist directory for legal/support resources
export const therapists = pgTable("therapists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  rating: text("rating"), // Average rating (1-5)
  reviewCount: text("review_count").notNull().default("0"),
  distance: text("distance"), // Calculated distance from user
  licenseNumber: text("license_number"),
  acceptsInsurance: boolean("accepts_insurance").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Support Resources directory for domestic abuse, crisis, therapy, legal, shelter resources
export const supportResources = pgTable("support_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organization: text("organization").notNull(),
  region: text("region").notNull(), // "Toronto, ON", "Ontario (province-wide)", etc.
  countryCode: text("country_code").notNull().default("CA"), // ISO 3166-1 alpha-2 country code
  isNationwide: boolean("is_nationwide").notNull().default(false), // True for national hotlines
  services: text("services").array().notNull(), // Array of services: ["24/7 crisis line", "Therapy", "Legal clinic", "Shelter"]
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  address: text("address"), // Physical address if applicable
  category: text("category").notNull(), // crisis, therapy, legal, shelter, support_groups, other
  genderFocus: text("gender_focus").notNull(), // all, male, female, lgbtq
  isFree: boolean("is_free").notNull().default(true), // Free vs paid service
  isVerified: boolean("is_verified").notNull().default(true), // Verified by PeacePad team
  latitude: text("latitude"), // For location-based search
  longitude: text("longitude"),
  operatingHours: text("operating_hours"), // e.g., "24/7", "Mon-Fri 9am-5pm"
  languages: text("languages").array(), // Languages supported: ["English", "French", "Spanish"]
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Audit logs for legal documentation
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  actionType: text("action_type").notNull(), // 'message', 'call', 'appointment', 'export'
  resourceId: varchar("resource_id"), // ID of message, call, event, etc.
  resourceType: text("resource_type"), // 'message', 'call', 'event', etc.
  details: jsonb("details"), // Additional context
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Push notification subscriptions (supports both web push and native FCM/APNs)
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull().default("web"), // "web", "android", "ios"
  // Web push fields (required for web, null for native)
  endpoint: text("endpoint").unique(),
  p256dh: text("p256dh"),
  auth: text("auth"),
  // Native push fields (required for native, null for web)
  deviceToken: text("device_token").unique(), // FCM/APNs token
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Session mood summaries for AI listening feature (7-day TTL)
export const sessionMoodSummaries = pgTable("session_mood_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => callSessions.id),
  participants: text("participants").array().notNull(), // Array of participant user IDs
  emotionsTimeline: jsonb("emotions_timeline").notNull().default('[]'), // Array of {timestamp, emotion, confidence}
  summary: text("summary"), // AI-generated summary of emotional journey
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull().default(sql`NOW() + INTERVAL '7 days'`), // Auto-delete after 7 days
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, timestamp: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
export const insertChildUpdateSchema = createInsertSchema(childUpdates).omit({ id: true, createdAt: true });
export const insertChildSchema = createInsertSchema(children).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPetSchema = createInsertSchema(pets).omit({ id: true, createdAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGuestSessionSchema = createInsertSchema(guestSessions).omit({ id: true, createdAt: true });
export const insertGuestSessionDataSchema = createInsertSchema(guestSessionData).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUsageMetricSchema = createInsertSchema(usageMetrics).omit({ id: true, lastUpdated: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPartnershipSchema = createInsertSchema(partnerships).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationMemberSchema = createInsertSchema(conversationMembers).omit({ id: true, joinedAt: true });

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertChildUpdate = z.infer<typeof insertChildUpdateSchema>;
export type ChildUpdate = typeof childUpdates.$inferSelect;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Child = typeof children.$inferSelect;
export type InsertPet = z.infer<typeof insertPetSchema>;
export type Pet = typeof pets.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertGuestSession = z.infer<typeof insertGuestSessionSchema>;
export type GuestSession = typeof guestSessions.$inferSelect;
export type InsertGuestSessionData = z.infer<typeof insertGuestSessionDataSchema>;
export type GuestSessionData = typeof guestSessionData.$inferSelect;
export type InsertUsageMetric = z.infer<typeof insertUsageMetricSchema>;
export type UsageMetric = typeof usageMetrics.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertPartnership = z.infer<typeof insertPartnershipSchema>;
export type Partnership = typeof partnerships.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversationMember = z.infer<typeof insertConversationMemberSchema>;
export type ConversationMember = typeof conversationMembers.$inferSelect;
export const insertCallSessionSchema = createInsertSchema(callSessions).omit({ id: true, createdAt: true });
export type InsertCallSession = z.infer<typeof insertCallSessionSchema>;
export type CallSession = typeof callSessions.$inferSelect;

export const insertCallRecordingSchema = createInsertSchema(callRecordings).omit({ id: true, createdAt: true });
export type InsertCallRecording = z.infer<typeof insertCallRecordingSchema>;
export type CallRecording = typeof callRecordings.$inferSelect;

export const insertTherapistSchema = createInsertSchema(therapists).omit({ id: true, createdAt: true });
export type InsertTherapist = z.infer<typeof insertTherapistSchema>;
export type Therapist = typeof therapists.$inferSelect;

export const insertSupportResourceSchema = createInsertSchema(supportResources).omit({ id: true, createdAt: true, lastUpdated: true });
export type InsertSupportResource = z.infer<typeof insertSupportResourceSchema>;
export type SupportResource = typeof supportResources.$inferSelect;

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true }).refine(
  (data) => {
    // Web push requires endpoint, p256dh, and auth
    if (data.platform === 'web') {
      return !!data.endpoint && !!data.p256dh && !!data.auth;
    }
    // Native push requires deviceToken
    if (data.platform === 'android' || data.platform === 'ios') {
      return !!data.deviceToken;
    }
    return false;
  },
  {
    message: "Invalid push subscription: Web push requires endpoint/p256dh/auth, native push requires deviceToken",
  }
);
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export const insertSessionMoodSummarySchema = createInsertSchema(sessionMoodSummaries).omit({ id: true, createdAt: true, expiresAt: true });
export type InsertSessionMoodSummary = z.infer<typeof insertSessionMoodSummarySchema>;
export type SessionMoodSummary = typeof sessionMoodSummaries.$inferSelect;

export const insertScheduleTemplateSchema = createInsertSchema(scheduleTemplates).omit({ id: true, createdAt: true });
export type InsertScheduleTemplate = z.infer<typeof insertScheduleTemplateSchema>;
export type ScheduleTemplate = typeof scheduleTemplates.$inferSelect;

export const insertCallSchema = createInsertSchema(calls).omit({ id: true, createdAt: true });
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

export const insertScheduledCallSchema = createInsertSchema(scheduledCalls).omit({ id: true, createdAt: true });
export type InsertScheduledCall = z.infer<typeof insertScheduledCallSchema>;
export type ScheduledCall = typeof scheduledCalls.$inferSelect;

export const insertCallFollowupSchema = createInsertSchema(callFollowups).omit({ id: true, createdAt: true });
export type InsertCallFollowup = z.infer<typeof insertCallFollowupSchema>;
export type CallFollowup = typeof callFollowups.$inferSelect;

export const insertCallPreferenceSchema = createInsertSchema(callPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCallPreference = z.infer<typeof insertCallPreferenceSchema>;
export type CallPreference = typeof callPreferences.$inferSelect;

export const insertExpenseParticipantSchema = createInsertSchema(expenseParticipants).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExpenseParticipant = z.infer<typeof insertExpenseParticipantSchema>;
export type ExpenseParticipant = typeof expenseParticipants.$inferSelect;

export const insertSettlementSchema = createInsertSchema(settlements).omit({ id: true, createdAt: true, updatedAt: true, initiatedAt: true });
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type Settlement = typeof settlements.$inferSelect;

export const insertPartnershipBalanceSchema = createInsertSchema(partnershipBalances).omit({ id: true, lastUpdated: true });
export type InsertPartnershipBalance = z.infer<typeof insertPartnershipBalanceSchema>;
export type PartnershipBalance = typeof partnershipBalances.$inferSelect;

// Conch Mode sessions - walkie-talkie style communication
export const conchSessions = pgTable("conch_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id),
  initiatorUserId: varchar("initiator_user_id").notNull().references(() => users.id),
  callId: varchar("call_id").references(() => calls.id, { onDelete: 'cascade' }), // Associated video/audio call for the session
  status: varchar("status").notNull().default("pending"), // pending, active, ended, abandoned
  conchHolderUserId: varchar("conch_holder_user_id").references(() => users.id), // Who currently has the conch
  baseTurnDurationSeconds: text("base_turn_duration_seconds").notNull().default("60"), // Default 60 seconds per turn
  currentTurnEndsAt: timestamp("current_turn_ends_at"), // When current speaker's time expires
  extraTimeCapSeconds: text("extra_time_cap_seconds").notNull().default("90"), // Maximum extra time allowed per turn (90s = 3x30s)
  pendingExtraTimeRequest: jsonb("pending_extra_time_request"), // {"requesterId": "userId", "requestedAt": timestamp} or null
  strikeCounts: jsonb("strike_counts").default('{}'), // {"userId1": 0, "userId2": 1}
  moodData: jsonb("mood_data").default('{}'), // Current mood analysis data
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Conch session participants - track who joined
export const conchSessionParticipants = pgTable("conch_session_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => conchSessions.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
});

export const insertConchSessionSchema = createInsertSchema(conchSessions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConchSession = z.infer<typeof insertConchSessionSchema>;
export type ConchSession = typeof conchSessions.$inferSelect;

export const insertConchSessionParticipantSchema = createInsertSchema(conchSessionParticipants).omit({ id: true, joinedAt: true });
export type InsertConchSessionParticipant = z.infer<typeof insertConchSessionParticipantSchema>;
export type ConchSessionParticipant = typeof conchSessionParticipants.$inferSelect;

// Parenting tips and articles - personalized content feed
export const parentingTips = pgTable("parenting_tips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"), // Short summary for card preview
  category: varchar("category").notNull(), // health, behavior, education, development, nutrition, activities, emotional_support
  ageMinMonths: text("age_min_months").notNull(), // Minimum child age in months (0 for newborn)
  ageMaxMonths: text("age_max_months").notNull(), // Maximum child age in months (216 for 18 years)
  imageUrl: text("image_url"), // Optional image for the article
  author: text("author"), // Article author name
  tags: text("tags").array(), // Searchable tags like "sleep", "tantrums", "school"
  readTimeMinutes: text("read_time_minutes"), // Estimated reading time
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertParentingTipSchema = createInsertSchema(parentingTips).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertParentingTip = z.infer<typeof insertParentingTipSchema>;
export type ParentingTip = typeof parentingTips.$inferSelect;

// Weather-based activity suggestions
export const weatherActivities = pgTable("weather_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  ageMinMonths: text("age_min_months").notNull(),
  ageMaxMonths: text("age_max_months").notNull(),
  activityType: varchar("activity_type").notNull(), // indoor, outdoor, flexible
  weatherConditions: text("weather_conditions").array().notNull(), // sunny, rainy, snowy, cloudy, hot, cold, windy
  category: varchar("category").notNull(), // creative, active, educational, sensory, social
  durationMinutes: text("duration_minutes"),
  materialsNeeded: text("materials_needed").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWeatherActivitySchema = createInsertSchema(weatherActivities).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWeatherActivity = z.infer<typeof insertWeatherActivitySchema>;
export type WeatherActivity = typeof weatherActivities.$inferSelect;

// Collaborative storybooks
export const storybooks = pgTable("storybooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id),
  title: text("title").notNull(),
  coverImageUrl: text("cover_image_url"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const storyPages = pgTable("story_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storyId: varchar("story_id").notNull().references(() => storybooks.id, { onDelete: 'cascade' }),
  pageNumber: integer("page_number").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStorybookSchema = createInsertSchema(storybooks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStorybook = z.infer<typeof insertStorybookSchema>;
export type Storybook = typeof storybooks.$inferSelect;

export const insertStoryPageSchema = createInsertSchema(storyPages).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStoryPage = z.infer<typeof insertStoryPageSchema>;
export type StoryPage = typeof storyPages.$inferSelect;

// Shareable shopping lists
export const shoppingLists = pgTable("shopping_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id),
  name: text("name").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const shoppingItems = pgTable("shopping_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: varchar("list_id").notNull().references(() => shoppingLists.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  quantity: text("quantity"),
  checked: boolean("checked").notNull().default(false),
  addedBy: varchar("added_by").notNull().references(() => users.id),
  checkedBy: varchar("checked_by").references(() => users.id),
  checkedAt: timestamp("checked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingList = typeof shoppingLists.$inferSelect;

export const insertShoppingItemSchema = createInsertSchema(shoppingItems).omit({ id: true, createdAt: true, updatedAt: true, checkedAt: true });
export type InsertShoppingItem = z.infer<typeof insertShoppingItemSchema>;
export type ShoppingItem = typeof shoppingItems.$inferSelect;

// Gamification: User statistics tracking
export const userStats = pgTable("user_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  partnershipId: varchar("partnership_id").references(() => partnerships.id), // Link stats to specific partnership
  // Message statistics
  totalMessagesSent: integer("total_messages_sent").notNull().default(0),
  positiveMessagesSent: integer("positive_messages_sent").notNull().default(0), // Calm/cooperative tone
  // Activity statistics
  calendarEventsCreated: integer("calendar_events_created").notNull().default(0),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  expensesLogged: integer("expenses_logged").notNull().default(0),
  conchSessionsCompleted: integer("conch_sessions_completed").notNull().default(0),
  // Rogerian Active Listening statistics
  summariesValidated: integer("summaries_validated").notNull().default(0), // Total validated summaries
  understandingStreak: integer("understanding_streak").notNull().default(0), // Current streak of validated summaries
  longestUnderstandingStreak: integer("longest_understanding_streak").notNull().default(0), // Best streak ever
  averageValidationScore: integer("average_validation_score"), // Running average of AI validation scores
  // Engagement tracking
  lastActivityDate: timestamp("last_activity_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Gamification: Streaks tracking
export const streaks = pgTable("streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  partnershipId: varchar("partnership_id").references(() => partnerships.id),
  streakType: varchar("streak_type").notNull(), // communication, positive_tone, calendar_usage, task_completion
  currentStreak: integer("current_streak").notNull().default(0), // Current consecutive days
  longestStreak: integer("longest_streak").notNull().default(0), // All-time best
  lastActivityDate: timestamp("last_activity_date").notNull(), // Last day the streak was maintained
  streakStartDate: timestamp("streak_start_date").notNull(), // When current streak started
  isActive: boolean("is_active").notNull().default(true), // False if streak is broken
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Gamification: Achievement definitions
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(), // first_message, week_streak, positive_week, etc.
  name: text("name").notNull(), // "First Message", "7-Day Streak", etc.
  description: text("description").notNull(),
  icon: text("icon").notNull(), // Emoji or icon name
  category: varchar("category").notNull(), // communication, consistency, positivity, collaboration
  tier: varchar("tier").notNull(), // bronze, silver, gold, platinum
  requirement: integer("requirement").notNull(), // Numeric threshold (e.g., 7 for 7-day streak)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Gamification: User achievements earned
export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: varchar("achievement_id").notNull().references(() => achievements.id, { onDelete: 'cascade' }),
  partnershipId: varchar("partnership_id").references(() => partnerships.id),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

// Beta Feedback Schema
export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull(), // bug, suggestion, praise, other
  severity: text("severity"), // critical, high, medium, low (only for bugs)
  category: text("category").notNull(), // messaging, conch-mode, calendar, expenses, auth, ui, performance, other
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  deviceInfo: text("device_info"), // User agent string
  appVersion: text("app_version"),
  url: text("url"), // Page where feedback was submitted
  status: text("status").default("new"), // new, reviewing, resolved, wont-fix
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export type Feedback = typeof feedback.$inferSelect;
export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
  adminNotes: true,
  status: true,
});
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Safety Plans for domestic violence victims
// Safety-plan payloads are stored as ciphertext; this does not describe encryption
// guarantees for unrelated PeacePad tables or third-party processors.
export const safetyPlans = pgTable("safety_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Encrypted fields - stored as base64-encoded ciphertext
  encryptedData: text("encrypted_data").notNull(), // Contains all sensitive safety plan data encrypted with user-specific key
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// For API responses - decrypted safety plan data structure
export interface SafetyPlanData {
  emergencyContacts?: Array<{name: string; phone: string; relationship: string; isSafe: boolean}>;
  safePlaces?: Array<{name: string; address: string; phone: string; notes: string}>;
  importantDocuments?: string;
  financialResources?: string;
  medications?: string;
  childrenNeeds?: string;
  escapeRoute?: string;
  codeWords?: string;
  workSafety?: string;
  additionalNotes?: string;
}

export type SafetyPlan = typeof safetyPlans.$inferSelect;
export const insertSafetyPlanSchema = createInsertSchema(safetyPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  encryptedData: true,
});
export type InsertSafetyPlan = z.infer<typeof insertSafetyPlanSchema>;

// ==================== V2 CALL ENGINE TABLES ====================
// These tables support the new server-authoritative call and conch system
// Designed to replace the current buggy WebRTC implementation with clean architecture

// V2 Call Sessions - Represents one live or ended call
export const callSessionsV2 = pgTable("call_sessions_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  sessionCode: varchar("session_code", { length: 6 }).notNull().unique(), // 6-digit code for group calls
  type: varchar("type").notNull(), // 'audio', 'video', 'group-audio', 'group-video'
  status: varchar("status").notNull().default("initiated"), // 'initiated', 'ringing', 'connecting', 'live', 'ended', 'missed', 'declined', 'failed'
  conchEnabled: boolean("conch_enabled").notNull().default(false), // Whether conch system is active
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"), // When call actually started (first participant connected)
  endedAt: timestamp("ended_at"), // When call ended
  endReason: varchar("end_reason"), // 'user-ended', 'timeout', 'network', 'all-left'
  partnershipId: varchar("partnership_id").references(() => partnerships.id), // For 1:1 partner calls
  sequenceId: integer("sequence_id").notNull().default(0), // For negotiation ordering
});

// V2 Call Participants - Track participants in V2 calls
export const callParticipantsV2 = pgTable("call_participants_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => callSessionsV2.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role").notNull().default("participant"), // 'host' or 'participant'
  joinedAt: timestamp("joined_at"),
  leftAt: timestamp("left_at"),
  isMuted: boolean("is_muted").notNull().default(false),
  hasVideo: boolean("has_video").notNull().default(false),
  negotiationRole: varchar("negotiation_role"), // 'offerer' or 'answerer' - locked after assignment
  lastIceRestart: timestamp("last_ice_restart"), // Track ICE restart attempts
  connectionState: varchar("connection_state").default("new"), // 'new', 'connecting', 'connected', 'disconnected', 'failed'
});

// V2 Conch State - Real-time ephemeral conch state (persisted for recovery)
export const conchStateV2 = pgTable("conch_state_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => callSessionsV2.id, { onDelete: 'cascade' }),
  state: varchar("state").notNull().default("idle"), // 'idle', 'held', 'grace', 'cooldown'
  holderUserId: varchar("holder_user_id").references(() => users.id), // Who currently holds conch
  expiresAt: timestamp("expires_at"), // When current turn expires
  cooldownUntil: timestamp("cooldown_until"), // When same user can request again
  requestQueue: jsonb("request_queue").default('[]'), // Array of userIds waiting for conch
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
});

// V2 Conch Turns - History of who held the conch and for how long
export const conchTurnsV2 = pgTable("conch_turns_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => callSessionsV2.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // Duration in seconds
  wasInterrupted: boolean("was_interrupted").notNull().default(false), // Host override or emergency
  endReason: varchar("end_reason"), // 'timer', 'released', 'host-override', 'disconnected'
});

// V2 Call Events - Audit log for all call events for debugging and analytics
export const callEventsV2 = pgTable("call_events_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => callSessionsV2.id, { onDelete: 'cascade' }),
  sessionCode: varchar("session_code", { length: 6 }).notNull(), // Denormalized for faster queries
  eventType: varchar("event_type").notNull(), // 'call:create', 'call:accept', 'conch:request', etc.
  userId: varchar("user_id").references(() => users.id), // Who triggered the event
  sequenceId: integer("sequence_id").notNull(), // Order of events for deterministic replay
  payload: jsonb("payload").notNull().default('{}'), // Event-specific data
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => ({
  // Indexes for efficient event querying
  sessionCodeIdx: index("call_events_v2_session_code_idx").on(table.sessionCode),
  timestampIdx: index("call_events_v2_timestamp_idx").on(table.timestamp),
}));

// V2 Module Runs - execution audit trail for v2 module engine
export const ppV2ModuleRuns = pgTable(
  "pp_v2_module_runs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id),
    sessionId: varchar("session_id"),
    moduleId: varchar("module_id").notNull(),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    finishedAt: timestamp("finished_at"),
    conflictLevel: integer("conflict_level"),
    safetyFlags: jsonb("safety_flags").notNull().default(sql`'[]'::jsonb`),
    inputHash: varchar("input_hash", { length: 64 }),
    outputHash: varchar("output_hash", { length: 64 }),
    status: varchar("status").notNull().default("started"),
    errorCode: varchar("error_code"),
  },
  (table) => ({
    moduleIdIdx: index("pp_v2_module_runs_module_id_idx").on(table.moduleId),
    startedAtIdx: index("pp_v2_module_runs_started_at_idx").on(table.startedAt),
  }),
);

// V2 Launcher State - sticky launcher preferences per user/session
export const ppV2LauncherState = pgTable(
  "pp_v2_launcher_state",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id),
    sessionId: varchar("session_id"),
    pinnedModules: jsonb("pinned_modules").notNull().default(sql`'[]'::jsonb`),
    recentModules: jsonb("recent_modules").notNull().default(sql`'[]'::jsonb`),
    usageCounts: jsonb("usage_counts").notNull().default(sql`'{}'::jsonb`),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("pp_v2_launcher_state_user_id_idx").on(table.userId),
    sessionIdIdx: index("pp_v2_launcher_state_session_id_idx").on(table.sessionId),
  }),
);

// V2 Conversation Sessions - orchestrator session continuity
export const ppV2ConversationSessions = pgTable(
  "pp_v2_conversation_sessions",
  {
    sessionId: uuid("session_id").primaryKey().defaultRandom(),
    userId: varchar("user_id").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("pp_v2_conversation_sessions_user_id_idx").on(table.userId),
    lastActiveAtIdx: index("pp_v2_conversation_sessions_last_active_at_idx").on(table.lastActiveAt),
  }),
);

// V2 Conversation Messages - persisted user/assistant turns for orchestration
export const ppV2ConversationMessages = pgTable(
  "pp_v2_conversation_messages",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => ppV2ConversationSessions.sessionId, { onDelete: "cascade" }),
    role: varchar("role").notNull(),
    text: text("text").notNull(),
    mode: varchar("mode").notNull(),
    intentId: varchar("intent_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    sessionCreatedAtIdx: index("pp_v2_conversation_messages_session_created_at_idx").on(
      table.sessionId,
      table.createdAt,
    ),
    roleIdx: index("pp_v2_conversation_messages_role_idx").on(table.role),
  }),
);

// V2 Co-parent profile hints - lightweight single-user personalization baseline
export const ppV2CoparentProfiles = pgTable(
  "pp_v2_coparent_profiles",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id),
    label: varchar("label"),
    coparentStyle: varchar("coparent_style"),
    notes: jsonb("notes").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("pp_v2_coparent_profiles_user_id_idx").on(table.userId),
  }),
);

// Type exports for V2 tables
export const insertCallSessionV2Schema = createInsertSchema(callSessionsV2).omit({ 
  id: true, 
  createdAt: true,
  sequenceId: true,
});
export type InsertCallSessionV2 = z.infer<typeof insertCallSessionV2Schema>;
export type CallSessionV2 = typeof callSessionsV2.$inferSelect;

export const insertCallParticipantV2Schema = createInsertSchema(callParticipantsV2).omit({ 
  id: true,
});
export type InsertCallParticipantV2 = z.infer<typeof insertCallParticipantV2Schema>;
export type CallParticipantV2 = typeof callParticipantsV2.$inferSelect;

export const insertConchStateV2Schema = createInsertSchema(conchStateV2).omit({ 
  id: true,
  lastUpdatedAt: true,
});
export type InsertConchStateV2 = z.infer<typeof insertConchStateV2Schema>;
export type ConchStateV2 = typeof conchStateV2.$inferSelect;

export const insertConchTurnV2Schema = createInsertSchema(conchTurnsV2).omit({ 
  id: true,
});
export type InsertConchTurnV2 = z.infer<typeof insertConchTurnV2Schema>;
export type ConchTurnV2 = typeof conchTurnsV2.$inferSelect;

export const insertCallEventV2Schema = createInsertSchema(callEventsV2).omit({ 
  id: true,
  timestamp: true,
});
export type InsertCallEventV2 = z.infer<typeof insertCallEventV2Schema>;
export type CallEventV2 = typeof callEventsV2.$inferSelect;

export const insertPpV2ModuleRunSchema = createInsertSchema(ppV2ModuleRuns).omit({
  id: true,
  startedAt: true,
});
export type InsertPpV2ModuleRun = z.infer<typeof insertPpV2ModuleRunSchema>;
export type PpV2ModuleRun = typeof ppV2ModuleRuns.$inferSelect;

export const insertPpV2LauncherStateSchema = createInsertSchema(ppV2LauncherState).omit({
  id: true,
  updatedAt: true,
});
export type InsertPpV2LauncherState = z.infer<typeof insertPpV2LauncherStateSchema>;
export type PpV2LauncherState = typeof ppV2LauncherState.$inferSelect;

export const insertPpV2ConversationSessionSchema = createInsertSchema(ppV2ConversationSessions).omit({
  createdAt: true,
  lastActiveAt: true,
});
export type InsertPpV2ConversationSession = z.infer<typeof insertPpV2ConversationSessionSchema>;
export type PpV2ConversationSession = typeof ppV2ConversationSessions.$inferSelect;

export const insertPpV2ConversationMessageSchema = createInsertSchema(ppV2ConversationMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertPpV2ConversationMessage = z.infer<typeof insertPpV2ConversationMessageSchema>;
export type PpV2ConversationMessage = typeof ppV2ConversationMessages.$inferSelect;

export const insertPpV2CoparentProfileSchema = createInsertSchema(ppV2CoparentProfiles).omit({
  id: true,
  createdAt: true,
});
export type InsertPpV2CoparentProfile = z.infer<typeof insertPpV2CoparentProfileSchema>;
export type PpV2CoparentProfile = typeof ppV2CoparentProfiles.$inferSelect;

// Gamification type exports
export const insertUserStatsSchema = createInsertSchema(userStats).omit({ id: true, updatedAt: true });
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;

export const insertStreakSchema = createInsertSchema(streaks).omit({ id: true, updatedAt: true });
export type InsertStreak = z.infer<typeof insertStreakSchema>;
export type Streak = typeof streaks.$inferSelect;

export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true, createdAt: true });
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({ id: true, earnedAt: true });
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;

// ==================== ROGERIAN ACTIVE LISTENING TABLES ====================
// Implements Carl Rogers' "summarize before responding" principle to promote genuine understanding

// Message Summaries - Track when users summarize what they heard before responding
export const messageSummaries = pgTable("message_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Link to original message (for chat) or conch session turn (for Conch Mode)
  originalMessageId: varchar("original_message_id").references(() => messages.id, { onDelete: 'cascade' }),
  conchSessionId: varchar("conch_session_id").references(() => conchSessions.id, { onDelete: 'cascade' }),
  conchTurnNumber: integer("conch_turn_number"), // Which turn in the conch session this summary is for
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id),
  // The summary content
  summaryText: text("summary_text").notNull(),
  originalContent: text("original_content"), // Cache of what was being summarized (for AI validation context)
  // AI validation results
  validationScore: integer("validation_score"), // 0-100 score from AI
  capturedPoints: text("captured_points").array(), // Key points the user captured correctly
  missedPoints: text("missed_points").array(), // Key points the user missed
  aiFeedback: text("ai_feedback"), // Coaching message from AI
  // User metadata
  createdBy: varchar("created_by").notNull().references(() => users.id),
  skipped: boolean("skipped").notNull().default(false), // User chose "I hear you, but I disagree" escape option
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSummarySchema = createInsertSchema(messageSummaries).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertMessageSummary = z.infer<typeof insertMessageSummarySchema>;
export type MessageSummary = typeof messageSummaries.$inferSelect;

// User settings for Rogerian listening feature
export const listeningSettings = pgTable("listening_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  // Feature toggles
  enableConchModeSummary: boolean("enable_conch_mode_summary").notNull().default(true), // Enable summarization in Conch Mode
  enableChatUnderstandingCheck: boolean("enable_chat_understanding_check").notNull().default(true), // Enable optional understanding checks in chat
  // Threshold settings
  emotionalMessageThreshold: integer("emotional_message_threshold").default(60), // Min tone intensity to trigger understanding check
  // Gamification preferences
  showUnderstandingStreak: boolean("show_understanding_streak").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertListeningSettingsSchema = createInsertSchema(listeningSettings).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
});
export type InsertListeningSettings = z.infer<typeof insertListeningSettingsSchema>;
export type ListeningSettings = typeof listeningSettings.$inferSelect;

// ============================================
// AGENT MEMORY SYSTEM - Long-term Relationship Intelligence
// ============================================

// Relationship memories - vectorized storage for pattern recognition
export const relationshipMemories = pgTable("relationship_memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id, { onDelete: 'cascade' }),
  // Memory classification
  memoryType: varchar("memory_type").notNull(), // 'message', 'conflict', 'resolution', 'pattern', 'milestone', 'trigger'
  sourceType: varchar("source_type").notNull(), // 'chat', 'conch_session', 'calendar', 'expense', 'agent_insight'
  sourceId: varchar("source_id"), // Original record ID (message ID, event ID, etc.)
  // Content
  content: text("content").notNull(), // Natural language summary of the memory
  embedding: jsonb("embedding"), // Vector embedding (1536 dimensions for OpenAI ada-002)
  // Context
  emotionalTone: varchar("emotional_tone"), // positive, neutral, frustrated, defensive, hostile
  conflictScore: integer("conflict_score"), // 0-100 conflict intensity
  participants: text("participants").array(), // User IDs involved
  topics: text("topics").array(), // Extracted topics: 'schedule', 'money', 'custody', 'communication'
  // Temporal
  occurredAt: timestamp("occurred_at").notNull(), // When the original event happened
  weekOfYear: integer("week_of_year"), // For weekly pattern analysis
  dayOfWeek: integer("day_of_week"), // 0-6, for day-based patterns
  timeOfDay: varchar("time_of_day"), // 'morning', 'afternoon', 'evening', 'night'
  // Agent analysis
  patternTags: text("pattern_tags").array(), // AI-detected patterns: 'recurring_conflict', 'escalation_trigger', 'resolution_success'
  importanceScore: integer("importance_score").default(50), // 0-100, how significant for relationship understanding
  lastRetrievedAt: timestamp("last_retrieved_at"), // Track usage for relevance
  retrievalCount: integer("retrieval_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRelationshipMemorySchema = createInsertSchema(relationshipMemories).omit({
  id: true,
  createdAt: true,
});
export type InsertRelationshipMemory = z.infer<typeof insertRelationshipMemorySchema>;
export type RelationshipMemory = typeof relationshipMemories.$inferSelect;

// Agent interventions - log of proactive agent actions
export const agentInterventions = pgTable("agent_interventions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id, { onDelete: 'cascade' }),
  triggeredBy: varchar("triggered_by").notNull(), // 'pattern_detection', 'threshold_breach', 'schedule_conflict', 'predictive'
  interventionType: varchar("intervention_type").notNull(), // 'nudge', 'suggestion', 'alert', 'auto_draft', 'reminder'
  // Context
  targetUserId: varchar("target_user_id").references(() => users.id), // Who the intervention is for (null = both)
  relatedMemoryIds: text("related_memory_ids").array(), // Memory IDs that triggered this
  // Content
  title: text("title").notNull(),
  message: text("message").notNull(),
  suggestedAction: text("suggested_action"), // What the agent recommends
  // Delivery
  deliveryChannel: varchar("delivery_channel"), // 'push', 'in_app', 'email'
  deliveredAt: timestamp("delivered_at"),
  // User response
  userResponse: varchar("user_response"), // 'accepted', 'dismissed', 'modified', 'ignored'
  responseDetails: text("response_details"),
  respondedAt: timestamp("responded_at"),
  // Effectiveness tracking
  conflictPrevented: boolean("conflict_prevented"),
  outcomeNotes: text("outcome_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAgentInterventionSchema = createInsertSchema(agentInterventions).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentIntervention = z.infer<typeof insertAgentInterventionSchema>;
export type AgentIntervention = typeof agentInterventions.$inferSelect;

// Conflict patterns - AI-detected recurring issues
export const conflictPatterns = pgTable("conflict_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id, { onDelete: 'cascade' }),
  // Pattern details
  patternName: varchar("pattern_name").notNull(), // 'weekend_handoff_tension', 'expense_disagreements', 'schedule_conflicts'
  description: text("description").notNull(),
  // Triggers
  triggerTopics: text("trigger_topics").array(), // Topics that activate this pattern
  triggerPhrases: text("trigger_phrases").array(), // Phrases that indicate pattern activation
  triggerTimeOfWeek: text("trigger_time_of_week").array(), // 'friday_evening', 'sunday_night', etc.
  // Statistics
  occurrenceCount: integer("occurrence_count").default(1),
  lastOccurredAt: timestamp("last_occurred_at"),
  averageSeverity: integer("average_severity"), // 0-100
  // Prevention
  preventionStrategies: text("prevention_strategies").array(), // AI-generated prevention tips
  successfulInterventions: integer("successful_interventions").default(0),
  failedInterventions: integer("failed_interventions").default(0),
  // Status
  isActive: boolean("is_active").notNull().default(true),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConflictPatternSchema = createInsertSchema(conflictPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertConflictPattern = z.infer<typeof insertConflictPatternSchema>;
export type ConflictPattern = typeof conflictPatterns.$inferSelect;

// Prep chat sessions - AI coaching before difficult conversations
// PrepChat works as a SOLO TOOL - no partnership required
export const prepChatSessions = pgTable("prep_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  partnershipId: varchar("partnership_id").references(() => partnerships.id, { onDelete: 'cascade' }), // Nullable for solo use
  // Topic
  topic: varchar("topic").notNull(), // 'schedule_change', 'expense_request', 'boundary_setting', 'sensitive_topic', 'custom'
  customTopic: text("custom_topic"), // User-defined topic if custom
  // Personality context for AI coaching (solo mode)
  coParentPersonalityType: varchar("co_parent_personality_type"), // Myers-Briggs type for tailored coaching
  userPersonalityType: varchar("user_personality_type"), // User's own type for balanced advice
  // Coaching conversation
  messages: jsonb("messages").notNull().default([]), // Array of {role: 'user'|'coach', content: string, timestamp: string}
  // Drafted message
  draftedMessage: text("drafted_message"), // The message user is preparing to send
  tonePreview: jsonb("tone_preview"), // AI analysis of how the draft might be perceived
  // Emotion regulation
  breathingExerciseCompleted: boolean("breathing_exercise_completed").default(false),
  groundingExerciseCompleted: boolean("grounding_exercise_completed").default(false),
  emotionalStateStart: varchar("emotional_state_start"), // User's emotional state at session start
  emotionalStateEnd: varchar("emotional_state_end"), // User's emotional state at session end
  // Outcome
  sentToChat: boolean("sent_to_chat").default(false), // Was the drafted message sent?
  sentMessageId: varchar("sent_message_id"), // ID of the sent message
  outcome: varchar("outcome"), // 'sent', 'revised', 'abandoned', 'postponed'
  outcomeNotes: text("outcome_notes"),
  // Session metadata
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertPrepChatSessionSchema = createInsertSchema(prepChatSessions).omit({
  id: true,
  createdAt: true,
});
export type InsertPrepChatSession = z.infer<typeof insertPrepChatSessionSchema>;
export type PrepChatSession = typeof prepChatSessions.$inferSelect;

// Agent settings - user preferences for proactive agent behavior
export const agentSettings = pgTable("agent_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  // Feature toggles
  enableProactiveNudges: boolean("enable_proactive_nudges").notNull().default(true),
  enablePredictiveAlerts: boolean("enable_predictive_alerts").notNull().default(true),
  enableDailySummary: boolean("enable_daily_summary").notNull().default(false),
  enableWeeklyReport: boolean("enable_weekly_report").notNull().default(true),
  enablePrepChatSuggestions: boolean("enable_prep_chat_suggestions").notNull().default(true),
  // Thresholds
  conflictAlertThreshold: integer("conflict_alert_threshold").default(70), // 0-100, when to alert about predicted conflict
  nudgeFrequency: varchar("nudge_frequency").default('moderate'), // 'minimal', 'moderate', 'proactive'
  // Delivery preferences
  preferredChannel: varchar("preferred_channel").default('in_app'), // 'in_app', 'push', 'email'
  quietHoursStart: varchar("quiet_hours_start"), // '22:00'
  quietHoursEnd: varchar("quiet_hours_end"), // '07:00'
  // Summary preferences
  dailySummaryTime: varchar("daily_summary_time").default('20:00'),
  weeklyReportDay: varchar("weekly_report_day").default('sunday'),
  // Privacy
  allowPatternLearning: boolean("allow_pattern_learning").notNull().default(false),
  dataRetentionMonths: integer("data_retention_months").default(12),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAgentSettingsSchema = createInsertSchema(agentSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAgentSettings = z.infer<typeof insertAgentSettingsSchema>;
export type AgentSettings = typeof agentSettings.$inferSelect;
