import {
  type Song,
  type InsertSong,
  type LyricLine,
  type InsertLyricLine,
  type UserLyricTranslation,
  type InsertUserLyricTranslation,
  type User,
  type Favorite,
  type InsertFavorite,
  type ListeningSession,
  type InsertListeningSession,
  type RecognizedTrack,
  type InsertRecognizedTrack,
  type TransientLyric,
  type InsertTransientLyric,
  type AiTranslation,
  type InsertAiTranslation,
  type CommunityLyrics,
  type InsertCommunityLyrics,
  type UserRewards,
  type InteractionLog,
  type InsertInteractionLog,
  songs,
  lyricLines,
  userLyricTranslations,
  users,
  favorites,
  listeningSessions,
  recognizedTracks,
  transientLyrics,
  aiTranslations,
  communityLyrics,
  lyricsVotes,
  userRewards,
  interactionLogs,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql, and } from "drizzle-orm";

function normalizeLyricsLookupValue(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

export interface IStorage {
  // Songs
  getAllSongs(): Promise<Song[]>;
  getSongById(id: string): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  updateSong(id: string, song: Partial<InsertSong>): Promise<Song | undefined>;
  deleteSong(id: string): Promise<boolean>;

  // Lyric Lines
  getLyricLinesBySongId(songId: string): Promise<LyricLine[]>;
  getLyricLineById(id: string): Promise<LyricLine | undefined>;
  createLyricLine(lyricLine: InsertLyricLine): Promise<LyricLine>;
  updateLyricLine(
    id: string,
    lyricLine: Partial<LyricLine>
  ): Promise<LyricLine | undefined>;
  deleteLyricLine(id: string): Promise<boolean>;
  voteLyricLine(
    id: string,
    voteType: "upvote" | "downvote"
  ): Promise<LyricLine | undefined>;

  // User Lyric Translations
  createUserLyricTranslation(
    translation: InsertUserLyricTranslation
  ): Promise<UserLyricTranslation>;
  getUserLyricTranslationsBySongId(
    songId: string
  ): Promise<UserLyricTranslation[]>;
  getUserLyricTranslationsByUserId(
    userId: string
  ): Promise<UserLyricTranslation[]>;

  // Users
  getUserById(id: string): Promise<User | undefined>;

  // Favorites
  getFavoritesBySongId(userId: string): Promise<Song[]>;
  isSongFavorited(userId: string, songId: string): Promise<boolean>;
  addFavorite(userId: string, songId: string): Promise<Favorite>;
  removeFavorite(userId: string, songId: string): Promise<boolean>;

  // Listening Sessions
  createListeningSession(session: InsertListeningSession): Promise<ListeningSession>;
  updateListeningSession(
    id: string,
    updates: Partial<InsertListeningSession>
  ): Promise<ListeningSession | undefined>;
  getListeningSessionsByUserId(userId: string): Promise<any[]>; // Returns joined session + track data

  // Recognized Tracks
  createRecognizedTrack(track: InsertRecognizedTrack): Promise<RecognizedTrack>;
  getRecognizedTrackById(id: string): Promise<RecognizedTrack | undefined>;
  updateRecognizedTrack(id: string, updates: Partial<InsertRecognizedTrack>): Promise<RecognizedTrack | undefined>;

  // Transient Lyrics (copyrighted content with TTL)
  createTransientLyrics(lyrics: InsertTransientLyric): Promise<TransientLyric>;
  getTransientLyricsByHash(contentHash: string): Promise<TransientLyric | undefined>;
  getTransientLyricsByTrackId(trackId: string): Promise<TransientLyric[]>;
  findCachedLyricsBySong(title: string, artist: string): Promise<{ text: string; language: string } | null>;

  // AI Translations
  createAiTranslation(translation: InsertAiTranslation): Promise<AiTranslation>;
  getAiTranslationsByRecognizedTrackId(trackId: string): Promise<AiTranslation[]>;
  getAiTranslationByTextHash(textHash: string): Promise<AiTranslation | undefined>;

  // Search
  searchRecognizedTracks(params: {
    query?: string;
    languages?: string[];
    genres?: string[];
    culturalCategories?: string[];
    limit?: number;
  }): Promise<any[]>;

  // Community Lyrics
  createCommunityLyrics(lyrics: InsertCommunityLyrics): Promise<CommunityLyrics>;
  getCommunityLyricsByUserId(userId: string): Promise<CommunityLyrics[]>;
  voteOnCommunityLyrics(userId: string, lyricsId: string, voteType: 'upvote' | 'downvote'): Promise<{ success: boolean; message?: string }>;

  // User Rewards
  getUserRewards(userId: string): Promise<UserRewards | undefined>;
  updateUserRewards(userId: string, updates: { pointsToAdd?: number; lyricsContributed?: number; lyricsApproved?: number; votesReceived?: number }): Promise<UserRewards>;

  // Continuation Engine - Find similar tracks
  findContinuationTrack(params: {
    currentTrackId: string;
    emotionalTone?: string;
    culturalThemes?: string[];
    region?: string;
    excludeId?: string; // Session-aware deduplication
  }): Promise<RecognizedTrack | null>;
  getTracksWithDNA(limit?: number): Promise<RecognizedTrack[]>;

  // Interaction Logging (Anonymous Analytics)
  logInteraction(log: InsertInteractionLog): Promise<InteractionLog>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // Songs
  async getAllSongs(): Promise<Song[]> {
    const result = await db.select().from(songs).orderBy(desc(songs.createdAt));
    return result;
  }

  async getSongById(id: string): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song || undefined;
  }

  async createSong(insertSong: InsertSong & { id?: string }): Promise<Song> {
    const [song] = await db.insert(songs).values(insertSong).returning();
    return song;
  }

  async updateSong(
    id: string,
    updates: Partial<InsertSong>
  ): Promise<Song | undefined> {
    const [song] = await db
      .update(songs)
      .set(updates)
      .where(eq(songs.id, id))
      .returning();
    return song || undefined;
  }

  async deleteSong(id: string): Promise<boolean> {
    // Cascade delete is handled by the database schema
    const result = await db.delete(songs).where(eq(songs.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Lyric Lines
  async getLyricLinesBySongId(songId: string): Promise<LyricLine[]> {
    const result = await db
      .select()
      .from(lyricLines)
      .where(eq(lyricLines.songId, songId))
      .orderBy(asc(lyricLines.createdAt));
    return result;
  }

  async getLyricLineById(id: string): Promise<LyricLine | undefined> {
    const [lyricLine] = await db
      .select()
      .from(lyricLines)
      .where(eq(lyricLines.id, id));
    return lyricLine || undefined;
  }

  async createLyricLine(insertLyricLine: InsertLyricLine & { id?: string }): Promise<LyricLine> {
    const [lyricLine] = await db
      .insert(lyricLines)
      .values(insertLyricLine)
      .returning();
    return lyricLine;
  }

  async updateLyricLine(
    id: string,
    updates: Partial<LyricLine>
  ): Promise<LyricLine | undefined> {
    const [lyricLine] = await db
      .update(lyricLines)
      .set(updates)
      .where(eq(lyricLines.id, id))
      .returning();
    return lyricLine || undefined;
  }

  async deleteLyricLine(id: string): Promise<boolean> {
    const result = await db.delete(lyricLines).where(eq(lyricLines.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async voteLyricLine(
    id: string,
    voteType: "upvote" | "downvote"
  ): Promise<LyricLine | undefined> {
    // Use atomic SQL update to prevent race conditions
    const column = voteType === "upvote" ? "upvotes" : "downvotes";
    const result = await db.execute(
      sql`UPDATE "lyric_lines" 
          SET ${sql.raw(column)} = ${sql.raw(column)} + 1 
          WHERE id = ${id} 
          RETURNING *`
    );
    
    if (result.rows.length === 0) {
      return undefined;
    }
    
    return result.rows[0] as LyricLine;
  }

  // User Lyric Translations
  async createUserLyricTranslation(
    insertTranslation: InsertUserLyricTranslation
  ): Promise<UserLyricTranslation> {
    const [translation] = await db
      .insert(userLyricTranslations)
      .values(insertTranslation)
      .returning();
    return translation;
  }

  async getUserLyricTranslationsBySongId(
    songId: string
  ): Promise<UserLyricTranslation[]> {
    const result = await db
      .select()
      .from(userLyricTranslations)
      .where(eq(userLyricTranslations.songId, songId))
      .orderBy(desc(userLyricTranslations.createdAt));
    return result;
  }

  async getUserLyricTranslationsByUserId(
    userId: string
  ): Promise<UserLyricTranslation[]> {
    const result = await db
      .select()
      .from(userLyricTranslations)
      .where(eq(userLyricTranslations.userId, userId))
      .orderBy(desc(userLyricTranslations.createdAt));
    return result;
  }

  // Users
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  // Favorites
  async getFavoritesBySongId(userId: string): Promise<Song[]> {
    const rows = await db
      .select()
      .from(songs)
      .innerJoin(favorites, eq(favorites.songId, songs.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    return rows.map((r) => r.songs);
  }

  async isSongFavorited(userId: string, songId: string): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.songId, songId)));
    return !!favorite;
  }

  async addFavorite(userId: string, songId: string): Promise<Favorite> {
    const [favorite] = await db
      .insert(favorites)
      .values({ userId, songId })
      .returning();
    return favorite;
  }

  async removeFavorite(userId: string, songId: string): Promise<boolean> {
    const result = await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.songId, songId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Listening Sessions
  async createListeningSession(
    insertSession: InsertListeningSession & { id?: string }
  ): Promise<ListeningSession> {
    const [session] = await db
      .insert(listeningSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateListeningSession(
    id: string,
    updates: Partial<InsertListeningSession>
  ): Promise<ListeningSession | undefined> {
    const [session] = await db
      .update(listeningSessions)
      .set(updates)
      .where(eq(listeningSessions.id, id))
      .returning();
    return session || undefined;
  }

  async getListeningSessionsByUserId(userId: string): Promise<any[]> {
    const rows = await db
      .select({
        id: listeningSessions.id,
        userId: listeningSessions.userId,
        recognizedTrackId: listeningSessions.recognizedTrackId,
        status: listeningSessions.status,
        errorMessage: listeningSessions.errorMessage,
        audioDuration: listeningSessions.audioDuration,
        recognitionTime: listeningSessions.recognitionTime,
        createdAt: listeningSessions.createdAt,
        trackId: recognizedTracks.id,
        trackTitle: recognizedTracks.title,
        trackArtist: recognizedTracks.artist,
        trackAlbum: recognizedTracks.album,
        trackCoverArtUrl: recognizedTracks.coverArtUrl,
        trackConfidenceScore: recognizedTracks.confidenceScore,
      })
      .from(listeningSessions)
      .leftJoin(recognizedTracks, eq(listeningSessions.recognizedTrackId, recognizedTracks.id))
      .where(eq(listeningSessions.userId, userId))
      .orderBy(desc(listeningSessions.createdAt));
    
    // Transform to proper shape with null handling
    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      recognizedTrackId: row.recognizedTrackId,
      status: row.status,
      errorMessage: row.errorMessage,
      audioDuration: row.audioDuration,
      recognitionTime: row.recognitionTime,
      createdAt: row.createdAt,
      recognizedTrack: row.trackId ? {
        id: row.trackId,
        title: row.trackTitle!,
        artist: row.trackArtist!,
        album: row.trackAlbum,
        coverArtUrl: row.trackCoverArtUrl,
        confidenceScore: row.trackConfidenceScore,
      } : undefined,
    }));
  }

  // Recognized Tracks
  async createRecognizedTrack(
    insertTrack: InsertRecognizedTrack & { id?: string }
  ): Promise<RecognizedTrack> {
    const [track] = await db
      .insert(recognizedTracks)
      .values(insertTrack)
      .returning();
    return track;
  }

  async getRecognizedTrackById(id: string): Promise<RecognizedTrack | undefined> {
    const [track] = await db
      .select()
      .from(recognizedTracks)
      .where(eq(recognizedTracks.id, id));
    return track || undefined;
  }

  async updateRecognizedTrack(
    id: string,
    updates: Partial<InsertRecognizedTrack>
  ): Promise<RecognizedTrack | undefined> {
    const [updated] = await db
      .update(recognizedTracks)
      .set(updates)
      .where(eq(recognizedTracks.id, id))
      .returning();
    return updated || undefined;
  }

  // Transient Lyrics
  async createTransientLyrics(
    insertLyrics: InsertTransientLyric & { id?: string }
  ): Promise<TransientLyric> {
    const [lyrics] = await db
      .insert(transientLyrics)
      .values(insertLyrics)
      .returning();
    return lyrics;
  }

  async getTransientLyricsByHash(contentHash: string): Promise<TransientLyric | undefined> {
    const [lyrics] = await db
      .select()
      .from(transientLyrics)
      .where(eq(transientLyrics.contentHash, contentHash));
    return lyrics || undefined;
  }

  async getTransientLyricsByTrackId(trackId: string): Promise<TransientLyric[]> {
    const result = await db
      .select()
      .from(transientLyrics)
      .where(eq(transientLyrics.recognizedTrackId, trackId))
      .orderBy(desc(transientLyrics.createdAt));
    return result;
  }

  async findCachedLyricsBySong(title: string, artist: string): Promise<{ text: string; language: string } | null> {
    const normalizedTitle = normalizeLyricsLookupValue(title);
    const normalizedArtist = normalizeLyricsLookupValue(artist);

    // Find any recognized track with matching title/artist that has non-expired lyrics
    const now = new Date();
    const results = await db
      .select({
        fullLyrics: transientLyrics.fullLyrics,
        language: transientLyrics.language,
      })
      .from(transientLyrics)
      .innerJoin(recognizedTracks, eq(transientLyrics.recognizedTrackId, recognizedTracks.id))
      .where(
        and(
          sql`trim(regexp_replace(lower(${recognizedTracks.title}), '[^a-z0-9]+', ' ', 'g')) = ${normalizedTitle}`,
          sql`trim(regexp_replace(lower(${recognizedTracks.artist}), '[^a-z0-9]+', ' ', 'g')) = ${normalizedArtist}`,
          sql`${transientLyrics.expiresAt} > ${now}`
        )
      )
      .limit(1);

    if (results.length === 0) return null;

    return {
      text: results[0].fullLyrics,
      language: results[0].language || 'en',
    };
  }

  // AI Translations
  async createAiTranslation(
    insertTranslation: InsertAiTranslation & { id?: string }
  ): Promise<AiTranslation> {
    const [translation] = await db
      .insert(aiTranslations)
      .values(insertTranslation)
      .returning();
    return translation;
  }

  async getAiTranslationsByRecognizedTrackId(trackId: string): Promise<AiTranslation[]> {
    const result = await db
      .select()
      .from(aiTranslations)
      .where(eq(aiTranslations.recognizedTrackId, trackId))
      .orderBy(asc(aiTranslations.createdAt));
    return result;
  }

  async getAiTranslationByTextHash(textHash: string): Promise<AiTranslation | undefined> {
    const [translation] = await db
      .select()
      .from(aiTranslations)
      .where(eq(aiTranslations.textHash, textHash))
      .limit(1);
    return translation || undefined;
  }

  // Search
  async searchRecognizedTracks(params: {
    query?: string;
    languages?: string[];
    genres?: string[];
    culturalCategories?: string[];
    limit?: number;
  }): Promise<any[]> {
    const { query, languages, genres, culturalCategories, limit = 50 } = params;

    // Build query dynamically based on filters
    let queryBuilder = db
      .selectDistinct({
        id: recognizedTracks.id,
        title: recognizedTracks.title,
        artist: recognizedTracks.artist,
        album: recognizedTracks.album,
        genre: recognizedTracks.genre,
        releaseYear: recognizedTracks.releaseYear,
        spotifyId: recognizedTracks.spotifyId,
        youtubeId: recognizedTracks.youtubeId,
        confidenceScore: recognizedTracks.confidenceScore,
        createdAt: recognizedTracks.createdAt,
        // Include AI translation fields for cultural category filtering
        culturalContext: aiTranslations.culturalContext,
        artistIntent: aiTranslations.artistIntent,
      })
      .from(recognizedTracks)
      .leftJoin(aiTranslations, eq(recognizedTracks.id, aiTranslations.recognizedTrackId))
      .leftJoin(transientLyrics, eq(recognizedTracks.id, transientLyrics.recognizedTrackId));

    const conditions: any[] = [];

    // Text search across title, artist, album, and cached lyrics text
    if (query && query.trim()) {
      const searchTerm = `%${query.trim().toLowerCase()}%`;
      conditions.push(
        sql`(
          LOWER(${recognizedTracks.title}) LIKE ${searchTerm} OR
          LOWER(${recognizedTracks.artist}) LIKE ${searchTerm} OR
          LOWER(COALESCE(${recognizedTracks.album}, '')) LIKE ${searchTerm} OR
          LOWER(COALESCE(${transientLyrics.fullLyrics}, '')) LIKE ${searchTerm}
        )`
      );
    }

    // Genre filter
    if (genres && genres.length > 0) {
      conditions.push(sql`${recognizedTracks.genre} = ANY(${genres})`);
    }

    // Language filter (searches in transient lyrics)
    if (languages && languages.length > 0) {
      conditions.push(sql`${transientLyrics.language} = ANY(${languages})`);
    }

    // Cultural category filter (searches in AI translations)
    if (culturalCategories && culturalCategories.length > 0) {
      const categoryConditions = culturalCategories.map(category => {
        const searchTerm = `%${category.toLowerCase()}%`;
        return sql`(
          LOWER(COALESCE(${aiTranslations.culturalContext}, '')) LIKE ${searchTerm} OR
          LOWER(COALESCE(${aiTranslations.artistIntent}, '')) LIKE ${searchTerm}
        )`;
      });
      conditions.push(sql`(${sql.join(categoryConditions, sql` OR `)})`);
    }

    // Apply all conditions and execute query
    let results;
    if (conditions.length > 0) {
      results = await queryBuilder
        .where(sql`${sql.join(conditions, sql` AND `)}`)
        .orderBy(desc(recognizedTracks.confidenceScore), desc(recognizedTracks.createdAt))
        .limit(limit);
    } else {
      results = await queryBuilder
        .orderBy(desc(recognizedTracks.confidenceScore), desc(recognizedTracks.createdAt))
        .limit(limit);
    }

    // Group results by track ID to avoid duplicates from joins
    const uniqueTracks = new Map();
    results.forEach(row => {
      if (!uniqueTracks.has(row.id)) {
        uniqueTracks.set(row.id, {
          id: row.id,
          title: row.title,
          artist: row.artist,
          album: row.album,
          genre: row.genre,
          releaseYear: row.releaseYear,
          spotifyId: row.spotifyId,
          youtubeId: row.youtubeId,
          confidenceScore: row.confidenceScore,
          createdAt: row.createdAt,
        });
      }
    });

    return Array.from(uniqueTracks.values());
  }

  // Community Lyrics
  async createCommunityLyrics(lyrics: InsertCommunityLyrics): Promise<CommunityLyrics> {
    const [result] = await db.insert(communityLyrics).values(lyrics).returning();
    return result;
  }

  async getCommunityLyricsByUserId(userId: string): Promise<CommunityLyrics[]> {
    return await db.select().from(communityLyrics).where(eq(communityLyrics.userId, userId)).orderBy(desc(communityLyrics.createdAt));
  }

  async voteOnCommunityLyrics(userId: string, lyricsId: string, voteType: 'upvote' | 'downvote'): Promise<{ success: boolean; message?: string }> {
    // Insert the vote (will fail if duplicate due to unique constraint)
    await db.insert(lyricsVotes).values({
      userId,
      communityLyricsId: lyricsId,
      voteType,
    });

    // Update the vote count on the lyrics
    if (voteType === 'upvote') {
      await db.update(communityLyrics)
        .set({ upvotes: sql`${communityLyrics.upvotes} + 1` })
        .where(eq(communityLyrics.id, lyricsId));
    } else {
      await db.update(communityLyrics)
        .set({ downvotes: sql`${communityLyrics.downvotes} + 1` })
        .where(eq(communityLyrics.id, lyricsId));
    }

    // Get the lyrics to find the original contributor and award them points
    const [lyric] = await db.select().from(communityLyrics).where(eq(communityLyrics.id, lyricsId));
    if (lyric && lyric.userId !== userId) {
      // Award 5 points per vote received to the contributor
      await this.updateUserRewards(lyric.userId, { pointsToAdd: 5, votesReceived: 1 });
    }

    return { success: true };
  }

  // User Rewards
  async getUserRewards(userId: string): Promise<UserRewards | undefined> {
    const [result] = await db.select().from(userRewards).where(eq(userRewards.userId, userId));
    return result;
  }

  async updateUserRewards(userId: string, updates: { pointsToAdd?: number; lyricsContributed?: number; lyricsApproved?: number; votesReceived?: number }): Promise<UserRewards> {
    const existing = await this.getUserRewards(userId);

    if (!existing) {
      // Create new rewards record
      const [result] = await db.insert(userRewards).values({
        userId,
        totalPoints: updates.pointsToAdd || 0,
        lyricsContributed: updates.lyricsContributed || 0,
        lyricsApproved: updates.lyricsApproved || 0,
        votesReceived: updates.votesReceived || 0,
        level: 1,
      }).returning();
      return result;
    }

    // Update existing record
    const [result] = await db.update(userRewards)
      .set({
        totalPoints: sql`${userRewards.totalPoints} + ${updates.pointsToAdd || 0}`,
        lyricsContributed: sql`${userRewards.lyricsContributed} + ${updates.lyricsContributed || 0}`,
        lyricsApproved: sql`${userRewards.lyricsApproved} + ${updates.lyricsApproved || 0}`,
        votesReceived: sql`${userRewards.votesReceived} + ${updates.votesReceived || 0}`,
        level: sql`CASE WHEN ${userRewards.totalPoints} + ${updates.pointsToAdd || 0} >= 500 THEN 3 WHEN ${userRewards.totalPoints} + ${updates.pointsToAdd || 0} >= 100 THEN 2 ELSE 1 END`,
      })
      .where(eq(userRewards.userId, userId))
      .returning();
    return result;
  }

  // Continuation Engine - Find similar tracks
  async findContinuationTrack(params: {
    currentTrackId: string;
    emotionalTone?: string;
    culturalThemes?: string[];
    region?: string;
    excludeId?: string; // Session-aware: exclude song user just came from
  }): Promise<RecognizedTrack | null> {
    const { currentTrackId, emotionalTone, culturalThemes, region, excludeId } = params;

    // Build base exclusion conditions
    const baseExclusions = excludeId
      ? sql`${recognizedTracks.id} != ${currentTrackId} AND ${recognizedTracks.id} != ${excludeId} AND ${recognizedTracks.analysisStatus} = 'completed'`
      : sql`${recognizedTracks.id} != ${currentTrackId} AND ${recognizedTracks.analysisStatus} = 'completed'`;

    // Strategy-based matching (now controlled by confidence thresholds in routes)
    // Only one strategy is passed based on confidence
    if (emotionalTone) {
      const [match] = await db.select()
        .from(recognizedTracks)
        .where(and(
          baseExclusions,
          sql`${recognizedTracks.emotionalTone} = ${emotionalTone}`
        ))
        .orderBy(sql`RANDOM()`)
        .limit(1);
      if (match) return match;
    }

    if (culturalThemes && culturalThemes.length > 0) {
      const themesArray = `{${culturalThemes.join(',')}}`;
      const [match] = await db.select()
        .from(recognizedTracks)
        .where(and(
          baseExclusions,
          sql`${recognizedTracks.culturalThemes}::text[] && ${themesArray}::text[]`
        ))
        .orderBy(sql`RANDOM()`)
        .limit(1);
      if (match) return match;
    }

    if (region) {
      const [match] = await db.select()
        .from(recognizedTracks)
        .where(and(
          baseExclusions,
          sql`${recognizedTracks.region} = ${region}`
        ))
        .orderBy(sql`RANDOM()`)
        .limit(1);
      if (match) return match;
    }

    // Fallback: Any track with DNA that's completed
    const [match] = await db.select()
      .from(recognizedTracks)
      .where(and(
        baseExclusions,
        sql`${recognizedTracks.emotionalTone} IS NOT NULL`
      ))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    return match || null;
  }

  async getTracksWithDNA(limit: number = 50): Promise<RecognizedTrack[]> {
    return await db.select()
      .from(recognizedTracks)
      .where(sql`${recognizedTracks.emotionalTone} IS NOT NULL`)
      .orderBy(desc(recognizedTracks.createdAt))
      .limit(limit);
  }

  // Interaction Logging (Anonymous Analytics)
  async logInteraction(log: InsertInteractionLog): Promise<InteractionLog> {
    const [result] = await db.insert(interactionLogs).values(log).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
