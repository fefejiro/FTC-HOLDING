import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users, sessions } from "./models/auth";
export { users, sessions } from "./models/auth";
export type { User, UpsertUser } from "./models/auth";

// License types for songs
export const licenseTypes = [
  "public_domain",
  "cc0",
  "cc_by",
  "cc_by_sa",
  "user_generated",
] as const;

export type LicenseType = typeof licenseTypes[number];

// Songs table - Extended for audio recognition metadata
export const songs = pgTable("songs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  releaseYear: integer("release_year"),
  duration: integer("duration"), // Duration in seconds
  genre: text("genre"),
  language: text("language").notNull(), // e.g., "yo" for Yoruba, "ig" for Igbo
  languageName: text("language_name").notNull(), // e.g., "Yoruba", "Igbo"
  licenseType: text("license_type").notNull().$type<LicenseType>(),
  licenseUrl: text("license_url"),
  lyricsStorageAllowed: boolean("lyrics_storage_allowed").notNull().default(true),
  coverArtUrl: text("cover_art_url"),
  userGeneratedMode: boolean("user_generated_mode").notNull().default(false),
  // External service metadata
  isrc: text("isrc"), // International Standard Recording Code
  spotifyId: text("spotify_id"),
  youtubeId: text("youtube_id"),
  externalSource: text("external_source"), // "acrcloud", "musixmatch", "manual"
  lastFetchedAt: timestamp("last_fetched_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
  createdAt: true,
}).extend({
  licenseType: z.enum(licenseTypes),
});

export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;

// Lyric lines table
export const lyricLines = pgTable("lyric_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  songId: varchar("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  startTime: text("start_time"), // e.g., "00:00"
  endTime: text("end_time"), // e.g., "00:04"
  text: text("text").notNull(),
  translation: text("translation"),
  culturalMeaning: text("cultural_meaning"),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLyricLineSchema = createInsertSchema(lyricLines).omit({
  id: true,
  createdAt: true,
  upvotes: true,
  downvotes: true,
});

export type InsertLyricLine = z.infer<typeof insertLyricLineSchema>;
export type LyricLine = typeof lyricLines.$inferSelect;

// User lyric translations (for copyrighted songs)
export const userLyricTranslations = pgTable("user_lyric_translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  songId: varchar("song_id").references(() => songs.id, { onDelete: "cascade" }),
  lyricText: text("lyric_text").notNull(),
  translation: text("translation").notNull(),
  culturalMeaning: text("cultural_meaning").notNull(),
  language: text("language").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserLyricTranslationSchema = createInsertSchema(userLyricTranslations).omit({
  id: true,
  createdAt: true,
});

export type InsertUserLyricTranslation = z.infer<typeof insertUserLyricTranslationSchema>;
export type UserLyricTranslation = typeof userLyricTranslations.$inferSelect;

// Request/Response types for API
export const generateMeaningRequestSchema = z.object({
  lyricLineId: z.string(),
  language: z.string(),
});

export const generateUserLyricMeaningRequestSchema = z.object({
  lyricText: z.string(),
  language: z.string(),
  languageName: z.string(),
  songId: z.string().optional(),
});

export const voteRequestSchema = z.object({
  lyricLineId: z.string(),
  voteType: z.enum(["upvote", "downvote"]),
});

export type GenerateMeaningRequest = z.infer<typeof generateMeaningRequestSchema>;
export type GenerateUserLyricMeaningRequest = z.infer<typeof generateUserLyricMeaningRequestSchema>;
export type VoteRequest = z.infer<typeof voteRequestSchema>;


// Favorites table
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  songId: varchar("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userSongUniqueIdx: uniqueIndex("favorites_user_song_idx").on(table.userId, table.songId),
}));

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

// Processing status for tracks
export const processingStatuses = [
  "pending",
  "fetching_lyrics",
  "generating_analysis",
  "completed",
  "failed",
  "no_lyrics",
] as const;

export type ProcessingStatus = typeof processingStatuses[number];

// Recognized Tracks table - Songs identified via audio recognition
export const recognizedTracks = pgTable("recognized_tracks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  songId: varchar("song_id").references(() => songs.id, { onDelete: "set null" }),
  // Recognition metadata
  recognitionSource: text("recognition_source").notNull().default("acrcloud"), // "acrcloud", "audd", etc.
  confidenceScore: integer("confidence_score"), // 0-100
  audioFingerprint: text("audio_fingerprint"), // Hash of audio for caching
  // Playback position metadata (for "You were here" feature)
  playOffsetMs: integer("play_offset_ms"), // Where in song the audio matched
  trackDurationMs: integer("track_duration_ms"), // Total song duration in ms
  // Processing status
  lyricsStatus: text("lyrics_status").notNull().default("pending").$type<ProcessingStatus>(),
  analysisStatus: text("analysis_status").notNull().default("pending").$type<ProcessingStatus>(),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  // Song metadata from recognition service (stored even if song not in DB)
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  releaseYear: integer("release_year"),
  genre: text("genre"),
  isrc: text("isrc"),
  spotifyId: text("spotify_id"),
  youtubeId: text("youtube_id"),
  coverArtUrl: text("cover_art_url"),
  // Song DNA for Continuation Engine (AI-extracted)
  emotionalTone: text("emotional_tone"), // e.g., "joyful", "nostalgic", "hype", "spiritual", "melancholic"
  emotionalToneConfidence: text("emotional_tone_confidence"), // 0-1 confidence score
  culturalThemes: text("cultural_themes"), // JSON array: ["love", "hustle", "celebration", "struggle"]
  culturalThemeConfidence: text("cultural_theme_confidence"), // 0-1 confidence score
  region: text("region"), // e.g., "Nigeria", "West Africa", "South Africa"
  era: text("era"), // e.g., "2020s", "classic", "90s"
  songDnaGeneratedAt: timestamp("song_dna_generated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRecognizedTrackSchema = createInsertSchema(recognizedTracks).omit({
  id: true,
  createdAt: true,
}).extend({
  lyricsStatus: z.enum(processingStatuses).optional(),
  analysisStatus: z.enum(processingStatuses).optional(),
});

export type InsertRecognizedTrack = z.infer<typeof insertRecognizedTrackSchema>;
export type RecognizedTrack = typeof recognizedTracks.$inferSelect;

// Listening Sessions table - User audio recording and recognition history
// userId is nullable to support guest/unauthenticated users
export const listeningSessions = pgTable("listening_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for guest users
  recognizedTrackId: varchar("recognized_track_id").references(() => recognizedTracks.id, { onDelete: "set null" }),
  // Session details
  status: text("status").notNull().default("recording"), // "recording", "recognizing", "success", "failed"
  errorMessage: text("error_message"),
  audioDuration: integer("audio_duration"), // Duration in milliseconds
  recognitionTime: integer("recognition_time"), // Time taken to recognize in ms
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertListeningSessionSchema = createInsertSchema(listeningSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertListeningSession = z.infer<typeof insertListeningSessionSchema>;
export type ListeningSession = typeof listeningSessions.$inferSelect;

// Transient Lyrics table - For copyrighted songs (temporary storage)
// These are cached lyrics that shouldn't be stored permanently
export const transientLyrics = pgTable("transient_lyrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recognizedTrackId: varchar("recognized_track_id").notNull().references(() => recognizedTracks.id, { onDelete: "cascade" }),
  contentHash: text("content_hash").notNull(), // Hash of lyric content for deduplication
  fullLyrics: text("full_lyrics").notNull(), // Complete song lyrics
  language: text("language").notNull(),
  source: text("source").notNull(), // "musixmatch", "genius", "user_submitted"
  expiresAt: timestamp("expires_at").notNull(), // Auto-delete after TTL (e.g., 24 hours)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTransientLyricSchema = createInsertSchema(transientLyrics).omit({
  id: true,
  createdAt: true,
});

export type InsertTransientLyric = z.infer<typeof insertTransientLyricSchema>;
export type TransientLyric = typeof transientLyrics.$inferSelect;

// AI Translations table - Stores AI-generated cultural context and translations
// Kept separate to allow reuse across songs and comply with copyright
export const aiTranslations = pgTable("ai_translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recognizedTrackId: varchar("recognized_track_id").references(() => recognizedTracks.id, { onDelete: "cascade" }),
  lyricLineId: varchar("lyric_line_id").references(() => lyricLines.id, { onDelete: "cascade" }),
  // Lyric line content (for matching and caching)
  originalText: text("original_text").notNull(),
  textHash: text("text_hash").notNull(), // Hash for deduplication
  detectedLanguage: text("detected_language"),
  // AI-generated content
  translation: text("translation").notNull(),
  culturalContext: text("cultural_context"),
  artistIntent: text("artist_intent"),
  deeperMeaning: text("deeper_meaning"),
  languageNotes: text("language_notes"),
  // Slang terms extracted from lyrics - JSON array of {term, meaning, language}
  slangTerms: text("slang_terms"), // JSON string: [{"term":"wahala","meaning":"trouble","language":"Pidgin"}]
  // Community validation
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiTranslationSchema = createInsertSchema(aiTranslations).omit({
  id: true,
  createdAt: true,
  upvotes: true,
  downvotes: true,
});

export type InsertAiTranslation = z.infer<typeof insertAiTranslationSchema>;
export type AiTranslation = typeof aiTranslations.$inferSelect;

// Community Lyrics Submissions - User-contributed lyrics with voting
export const communityLyrics = pgTable("community_lyrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recognizedTrackId: varchar("recognized_track_id").references(() => recognizedTracks.id, { onDelete: "cascade" }),
  // Song metadata (in case not linked to recognized track)
  songTitle: text("song_title").notNull(),
  songArtist: text("song_artist").notNull(),
  // Lyrics content
  fullLyrics: text("full_lyrics").notNull(),
  language: text("language").notNull(),
  languageName: text("language_name").notNull(),
  // Community validation
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  // Reward tracking
  rewardPoints: integer("reward_points").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCommunityLyricsSchema = createInsertSchema(communityLyrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  upvotes: true,
  downvotes: true,
  rewardPoints: true,
  isVerified: true,
  verifiedAt: true,
  verifiedBy: true,
  status: true,
});

export type InsertCommunityLyrics = z.infer<typeof insertCommunityLyricsSchema>;
export type CommunityLyrics = typeof communityLyrics.$inferSelect;

// Lyrics Votes - Track who voted on community lyrics
export const lyricsVotes = pgTable("lyrics_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  communityLyricsId: varchar("community_lyrics_id").notNull().references(() => communityLyrics.id, { onDelete: "cascade" }),
  voteType: text("vote_type").notNull(), // "upvote" or "downvote"
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userLyricsUniqueIdx: uniqueIndex("lyrics_votes_user_lyrics_idx").on(table.userId, table.communityLyricsId),
}));

export const insertLyricsVoteSchema = createInsertSchema(lyricsVotes).omit({
  id: true,
  createdAt: true,
});

export type InsertLyricsVote = z.infer<typeof insertLyricsVoteSchema>;
export type LyricsVote = typeof lyricsVotes.$inferSelect;

// User Points/Rewards tracking
export const userRewards = pgTable("user_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  totalPoints: integer("total_points").notNull().default(0),
  lyricsContributed: integer("lyrics_contributed").notNull().default(0),
  lyricsApproved: integer("lyrics_approved").notNull().default(0),
  votesReceived: integer("votes_received").notNull().default(0),
  level: integer("level").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserRewardsSchema = createInsertSchema(userRewards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserRewards = z.infer<typeof insertUserRewardsSchema>;
export type UserRewards = typeof userRewards.$inferSelect;

// Batch import schema for Public Domain/CC songs
export const batchImportSongSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().optional(),
  releaseYear: z.number().optional(),
  duration: z.number().optional(),
  genre: z.string().optional(),
  language: z.string().min(2).max(5), // ISO code like "yo", "ig", "sw"
  languageName: z.string().min(1), // "Yoruba", "Igbo", "Swahili"
  licenseType: z.enum(["public_domain", "cc0", "cc_by", "cc_by_sa"]),
  licenseUrl: z.string().url().optional(),
  lyrics: z.string().optional(), // Full lyrics text
  coverArtUrl: z.string().url().optional(),
  isrc: z.string().optional(),
  spotifyId: z.string().optional(),
  youtubeId: z.string().optional(),
});

export const batchImportRequestSchema = z.object({
  songs: z.array(batchImportSongSchema).min(1).max(100),
  skipDuplicates: z.boolean().default(true),
  generateAnalysis: z.boolean().default(false),
});

export type BatchImportSong = z.infer<typeof batchImportSongSchema>;
export type BatchImportRequest = z.infer<typeof batchImportRequestSchema>;

// Interaction logs for anonymous behavioral analytics
export const interactionLogs = pgTable("interaction_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(), // Ephemeral session ID, no user identity
  trackId: varchar("track_id").references(() => recognizedTracks.id, { onDelete: "set null" }),
  confidenceBucket: text("confidence_bucket"), // "high", "medium", "low"
  interactionType: text("interaction_type").notNull(), // Enum: open_artist_info, expand_song_context, view_phrase_interpretation, open_spotify, add_lyrics_click, collapse_section, scroll_depth_reached, recognition_success
  isAuto: boolean("is_auto").notNull().default(false), // True if auto-expanded
  timeSinceRecognition: integer("time_since_recognition"), // Seconds since track recognition
  dwellTime: integer("dwell_time"), // Time spent on section in seconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInteractionLogSchema = createInsertSchema(interactionLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertInteractionLog = z.infer<typeof insertInteractionLogSchema>;
export type InteractionLog = typeof interactionLogs.$inferSelect;

// Interaction types enum for type safety
export const interactionTypes = [
  "recognition_success",
  "open_artist_info",
  "expand_song_context",
  "view_phrase_interpretation",
  "open_spotify",
  "add_lyrics_click",
  "collapse_section",
  "scroll_depth_reached",
] as const;

export type InteractionType = typeof interactionTypes[number];

// Re-export chat models for AI integrations
export * from "./models/chat";
