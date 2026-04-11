import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import { storage } from "./storage";
import { pool } from "./db";
import {
  insertSongSchema,
  insertLyricLineSchema,
  insertUserLyricTranslationSchema,
  generateMeaningRequestSchema,
  generateUserLyricMeaningRequestSchema,
  voteRequestSchema,
} from "@shared/schema";
import {
  buildUnavailableArtistInfo,
  buildUnavailableFragmentInterpretation,
  extractSongDNA,
  generateArtistSongInfo,
  generateBatchCulturalAnalysis,
  generateFragmentInterpretation,
  generateLyricTranslation,
  generateSectionCulturalAnalysis,
  generateSingleLineAnalysis,
  streamSingleLineAnalysis,
} from "./openai-service";
import { ExportService } from "./export-service";
import multer from "multer";
import crypto from "crypto";
import { recognizeSong, isACRCloudConfigured } from "./acrcloud-service";
import {
  fetchLyricsFast,
  getLyricsServiceStatus,
  isLyricsServiceAvailable,
} from "./musixmatch-service";
import { resolveTrackArtwork } from "./artwork-service";
import {
  getAiProviderConfig,
  getAiClient,
  getAiUnavailableMessage,
  isAiConfigured,
} from "./lib/ai-config";
import { getBackendBuildInfo } from "./lib/build-info";
import {
  buildGlossaryAnalysesFromLyrics,
  buildGlossaryLineAnalysis,
  buildStreamingGlossaryPayload,
} from "./glossary-analysis";
import { toFile } from "openai/uploads";

interface InfrastructureIssue {
  statusCode: number;
  errorCode: string;
  error: string;
  troubleshooting: string;
  details?: string;
  retryable?: boolean;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof (error as any).message === "string") return (error as any).message;
  return "";
}

function classifyDatabaseIssue(error: unknown): InfrastructureIssue | null {
  const message = getErrorMessage(error);
  if (!message) return null;

  const normalized = message.toLowerCase();

  if (
    (normalized.includes('relation "') && normalized.includes('" does not exist')) ||
    (normalized.includes('column "') && normalized.includes('" does not exist'))
  ) {
    return {
      statusCode: 503,
      errorCode: "DATABASE_SCHEMA_MISSING",
      error: "Database schema is missing required tables/columns.",
      troubleshooting:
        "Run schema migration against production DATABASE_URL (for example: npm --prefix APPS/saywetin run db:push).",
      details: message,
    };
  }

  if (
    normalized.includes("tenant or user not found") ||
    normalized.includes("password authentication failed") ||
    (normalized.includes("role") && normalized.includes("does not exist"))
  ) {
    return {
      statusCode: 503,
      errorCode: "DATABASE_CREDENTIAL_INVALID",
      error: "Database credentials are invalid.",
      troubleshooting:
        "Check DATABASE_URL in Railway. For Supabase pooler URIs, use the full user (for example postgres.<project-ref>) and the latest DB password.",
      details: message,
    };
  }

  if (
    normalized.includes("circuit breaker open") ||
    normalized.includes("failed to retrieve database credentials")
  ) {
    return {
      statusCode: 503,
      errorCode: "DATABASE_UNAVAILABLE",
      error: "Database pooler is temporarily unavailable.",
      troubleshooting:
        "This is usually transient on Supabase pooler. Retry in a few seconds, then verify the Supabase project is active and DATABASE_URL points to the current pooler URI with sslmode=require.",
      details: message,
      retryable: true,
    };
  }

  if (
    normalized.includes("self-signed certificate in certificate chain") ||
    normalized.includes("unable to verify the first certificate") ||
    normalized.includes("certificate has expired")
  ) {
    return {
      statusCode: 503,
      errorCode: "DATABASE_TLS_ERROR",
      error: "Database TLS handshake failed.",
      troubleshooting:
        "Verify DATABASE_URL points to the Supabase pooler endpoint and uses sslmode=no-verify for this runtime. If needed, set DATABASE_SSL_NO_VERIFY=true and redeploy.",
      details: message,
    };
  }

  if (
    normalized.includes("connect econnrefused") ||
    normalized.includes("could not connect to server") ||
    normalized.includes("connection terminated unexpectedly") ||
    normalized.includes("connection to database not available") ||
    normalized.includes("authentication query failed") ||
    normalized.includes("context: handshake") ||
    normalized.includes("timeout expired") ||
    normalized.includes("getaddrinfo enotfound") ||
    normalized.includes("etimedout")
  ) {
    return {
      statusCode: 503,
      errorCode: "DATABASE_UNAVAILABLE",
      error: "Database is currently unavailable.",
      troubleshooting:
        "Check DATABASE_URL host/port/ssl settings and confirm the database service is reachable from Railway.",
      details: message,
      retryable: true,
    };
  }

  return null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withDatabaseRetry<T>(
  operationName: string,
  operation: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const issue = classifyDatabaseIssue(error);
      const shouldRetry =
        !!issue &&
        issue.errorCode === "DATABASE_UNAVAILABLE" &&
        issue.retryable === true &&
        attempt < maxAttempts;

      if (!shouldRetry) {
        throw error;
      }

      const delayMs = attempt * 400;
      console.warn(
        `[DB-RETRY] ${operationName} failed with transient database issue (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms.`,
      );
      await wait(delayMs);
    }
  }

  throw lastError;
}

interface IdentifiedSongCandidate {
  title: string;
  artist: string;
  confidence: number;
}

function normalizeAudioMimeTypeForTranscription(mimeType?: string): { filename: string; contentType: string } {
  const normalized = (mimeType || "").toLowerCase().trim();

  if (normalized.includes("aac") || normalized.includes("m4a") || normalized.includes("mp4")) {
    return { filename: "listen-snippet.m4a", contentType: "audio/mp4" };
  }

  if (normalized.includes("webm")) {
    return { filename: "listen-snippet.webm", contentType: "audio/webm" };
  }

  if (normalized.includes("wav")) {
    return { filename: "listen-snippet.wav", contentType: "audio/wav" };
  }

  if (normalized.includes("mpeg") || normalized.includes("mp3")) {
    return { filename: "listen-snippet.mp3", contentType: "audio/mpeg" };
  }

  return { filename: "listen-snippet.m4a", contentType: "audio/mp4" };
}

async function identifySongFromTextQuery(query: string): Promise<IdentifiedSongCandidate | null> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 3) {
    return null;
  }

  if (!isAiConfigured()) {
    throw new Error(getAiUnavailableMessage("Text identification"));
  }

  const openai = getAiClient();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a music identification expert specializing in African music (Nigerian, South African, Ghanaian, Kenyan, etc.) and global hits popular in Africa. Given a user's text input (which could be partial lyrics, a song description, humming description, or song/artist name), identify the most likely song.

You MUST respond with valid JSON in this exact format:
{"title": "Song Title", "artist": "Artist Name", "confidence": 85}

Rules:
- confidence should be 0-100 based on how certain you are
- If the text clearly contains lyrics from a known song, confidence should be 70-95
- If it's a vague description, confidence should be 30-60
- If you cannot identify any song at all, respond with: {"title": "", "artist": "", "confidence": 0}
- Always prioritize African/Nigerian music if the text contains Pidgin, Yoruba, Igbo, Hausa, or other African languages
- For well-known songs, use the most common title and primary artist name`,
      },
      {
        role: "user",
        content: trimmedQuery,
      },
    ],
    temperature: 0.3,
    max_tokens: 200,
  });

  const responseText = completion.choices[0]?.message?.content?.trim() || "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText) as Partial<IdentifiedSongCandidate>;

  if (!parsed.title || !parsed.artist || !Number.isFinite(parsed.confidence) || Number(parsed.confidence) <= 0) {
    return null;
  }

  return {
    title: parsed.title,
    artist: parsed.artist,
    confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence)))),
  };
}

async function transcribeAudioForSongIdentification(
  audioBuffer: Buffer,
  mimeType?: string,
): Promise<string | null> {
  if (!isAiConfigured()) {
    return null;
  }

  const openai = getAiClient();
  const fileInfo = normalizeAudioMimeTypeForTranscription(mimeType);
  const audioFile = await toFile(audioBuffer, fileInfo.filename, {
    type: fileInfo.contentType,
  });

  const transcriptionModels = ["gpt-4o-mini-transcribe", "whisper-1"] as const;

  for (const model of transcriptionModels) {
    try {
      const transcription = await openai.audio.transcriptions.create({
        model,
        file: audioFile,
        prompt:
          "Transcribe the recognizable sung words or hook from this music clip. Return only the words you can confidently hear.",
      });

      const text =
        typeof transcription === "string"
          ? transcription.trim()
          : typeof transcription.text === "string"
            ? transcription.text.trim()
            : "";

      if (text.length > 0) {
        console.log(`[AI LISTEN] Transcribed audio with ${model}: "${text.substring(0, 120)}"`);
        return text;
      }
    } catch (error: any) {
      console.warn(`[AI LISTEN] Transcription model ${model} failed: ${getErrorMessage(error) || "Unknown error"}`);
    }
  }

  return null;
}

type PublicAsyncStatus = "pending" | "complete" | "unavailable" | "failed";

function toPublicLyricsStatus(status?: string): PublicAsyncStatus {
  if (status === "completed") {
    return "complete";
  }

  if (status === "no_lyrics") {
    return "unavailable";
  }

  if (status === "failed") {
    return "failed";
  }

  return "pending";
}

function toPublicAnalysisStatus(
  analysisStatus: string | undefined,
  lyricsStatus: string | undefined,
  analysisCount: number,
  aiConfigured: boolean,
): PublicAsyncStatus {
  if (analysisCount > 0) {
    return "complete";
  }

  if (lyricsStatus === "no_lyrics") {
    return "unavailable";
  }

  if (!aiConfigured) {
    return "unavailable";
  }

  if (analysisStatus === "completed") {
    return "unavailable";
  }

  if (analysisStatus === "failed") {
    return "failed";
  }

  return "pending";
}

async function buildRecognizedTrackResponse(trackId: string) {
  const track = await storage.getRecognizedTrackById(trackId);
  if (!track) {
    return null;
  }

  const coverArtUrl = await resolveTrackArtwork({
    title: track.title,
    artist: track.artist,
    album: track.album,
    spotifyId: track.spotifyId,
    isrc: track.isrc,
  });

  let lyrics: { text: string; language: string; source: string } | null = null;
  const transientLyrics = await storage.getTransientLyricsByTrackId(trackId);
  if (transientLyrics && transientLyrics.length > 0) {
    const lyric = transientLyrics[0];
    lyrics = {
      text: lyric.fullLyrics,
      language: lyric.language,
      source: lyric.source,
    };
  }

  const storedCulturalAnalysis = await storage.getAiTranslationsByRecognizedTrackId(trackId);
  const fallbackCulturalAnalysis =
    storedCulturalAnalysis.length === 0 && lyrics?.text
      ? buildGlossaryAnalysesFromLyrics(lyrics.text)
      : [];
  const culturalAnalysis =
    storedCulturalAnalysis.length > 0 ? storedCulturalAnalysis : fallbackCulturalAnalysis;
  const aiConfig = getAiProviderConfig();
  const lyricsServiceStatus = getLyricsServiceStatus();

  const lyricsStatus = toPublicLyricsStatus(track.lyricsStatus || undefined);
  const analysisStatus = toPublicAnalysisStatus(
    track.analysisStatus || undefined,
    track.lyricsStatus || undefined,
    culturalAnalysis?.length || 0,
    aiConfig.configured,
  );

  return {
    track: {
      ...track,
      coverArtUrl,
    },
    lyrics,
    culturalAnalysis,
    status: {
      lyrics: lyricsStatus,
      analysis: analysisStatus,
      aiConfigured: aiConfig.configured,
      aiProvider: aiConfig.provider,
      lyricsProvider: lyricsServiceStatus.service,
      analysisMessage:
        analysisStatus === "unavailable"
          ? "We found the song already. More meaning is still coming together."
          : analysisStatus === "failed"
            ? "We found the song already. More meaning hit a small delay, but you can retry it."
            : undefined,
    },
  };
}

type LyricsResolutionSource = "cache" | "lrclib" | "lyrics_ovh" | "fallback" | "none";

function getPersistentLyricsExpiry(): Date {
  return new Date("2099-12-31T00:00:00.000Z");
}

function mapLyricsResolutionSource(source?: string | null): LyricsResolutionSource {
  const normalized = (source || "").toLowerCase();
  if (normalized.includes("cache")) return "cache";
  if (normalized.includes("lrclib")) return "lrclib";
  if (normalized.includes("lyrics.ovh")) return "lyrics_ovh";
  if (normalized) return "fallback";
  return "none";
}

async function persistLyricsForTrack(
  trackId: string,
  lyricsText: string,
  lyricsLanguage: string,
  source: string,
): Promise<void> {
  const contentHash = crypto.createHash("sha256").update(lyricsText).digest("hex");

  await storage.createTransientLyrics({
    recognizedTrackId: trackId,
    fullLyrics: lyricsText,
    language: lyricsLanguage,
    contentHash,
    source,
    expiresAt: getPersistentLyricsExpiry(),
  });
}

async function resolveLyricsForTrack(
  trackId: string,
  title: string,
  artist: string,
): Promise<{ text: string | null; language: string; source: LyricsResolutionSource }> {
  const lyricsStartTime = Date.now();
  const cachedLyrics = await storage.findCachedLyricsBySong(title, artist);

  if (cachedLyrics) {
    await persistLyricsForTrack(trackId, cachedLyrics.text, cachedLyrics.language, "cache");
    const elapsed = Date.now() - lyricsStartTime;
    console.log(`[lyrics] resolved in ${elapsed}ms via cache`);
    return {
      text: cachedLyrics.text,
      language: cachedLyrics.language,
      source: "cache",
    };
  }

  if (!isLyricsServiceAvailable()) {
    const elapsed = Date.now() - lyricsStartTime;
    console.log(`[lyrics] resolved in ${elapsed}ms via none`);
    return { text: null, language: "en", source: "none" };
  }

  try {
    const lyricsResult = await fetchLyricsFast(title, artist);
    if (lyricsResult.success && lyricsResult.lyrics) {
      const lyricsText = lyricsResult.lyrics.fullText;
      const lyricsLanguage = lyricsResult.lyrics.language;
      const sourceLabel = lyricsResult.lyrics.source || lyricsResult.lyrics.copyright || "fallback";
      const source = mapLyricsResolutionSource(sourceLabel);

      await persistLyricsForTrack(trackId, lyricsText, lyricsLanguage, sourceLabel);
      const elapsed = Date.now() - lyricsStartTime;
      console.log(`[lyrics] resolved in ${elapsed}ms via ${source}`);

      return {
        text: lyricsText,
        language: lyricsLanguage,
        source,
      };
    }
  } catch (error: any) {
    console.error("❌ [LYRICS] Fetch error:", error.message);
  }

  const elapsed = Date.now() - lyricsStartTime;
  console.log(`[lyrics] resolved in ${elapsed}ms via none`);
  return { text: null, language: "en", source: "none" };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup optional OIDC + session auth (guest usage works without OIDC env vars).
  await setupAuth(app);
  registerAuthRoutes(app);

  // Helper to get user ID from authenticated session
  const getUserId = (req: any): string | null => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) return null;
    return req.user.claims.sub;
  };

  // Configure multer for audio file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
      // Accept audio files
      const allowedMimes = [
        'audio/mpeg', // MP3
        'audio/mp3',
        'audio/wav',
        'audio/wave',
        'audio/x-wav',
        'audio/webm',
        'audio/ogg',
        'audio/mp4',
        'audio/m4a',
        'audio/aac',
        'audio/x-m4a',
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only audio files are allowed.'));
      }
    },
  });

  // Service status endpoint - Check if external services are configured
  app.get("/api/status", async (_req, res) => {
    const databaseUrl = (process.env.DATABASE_URL || "").trim();
    let database: {
      configured: boolean;
      connected: boolean;
      schemaReady?: boolean;
      errorCode?: string;
      error?: string;
      troubleshooting?: string;
      details?: string;
    } = {
      configured: databaseUrl.length > 0,
      connected: false,
    };

    if (!database.configured) {
      database = {
        ...database,
        errorCode: "DATABASE_URL_MISSING",
        error: "DATABASE_URL is not configured.",
        troubleshooting: "Set DATABASE_URL in Railway service variables.",
      };
    } else {
      try {
        await pool.query("select 1");
        const schemaCheck = await pool.query(
          "select to_regclass('listening_sessions') as listening_sessions",
        );
        const schemaReady = !!schemaCheck.rows?.[0]?.listening_sessions;
        database = {
          ...database,
          connected: true,
          schemaReady,
          ...(schemaReady
            ? {}
            : {
                errorCode: "DATABASE_SCHEMA_MISSING",
                error: "Database schema is missing required tables.",
                troubleshooting:
                  "Run schema migration against production DATABASE_URL (for example: npm --prefix APPS/saywetin run db:push).",
              }),
        };
      } catch (error) {
        const classified = classifyDatabaseIssue(error);
        const details = getErrorMessage(error);
        database = {
          ...database,
          errorCode: classified?.errorCode || "DATABASE_UNAVAILABLE",
          error: classified?.error || "Database connectivity check failed.",
          troubleshooting:
            classified?.troubleshooting ||
            "Verify DATABASE_URL and database reachability from Railway.",
          ...(process.env.NODE_ENV === "production" ? {} : { details }),
        };
      }
    }

    const aiConfig = getAiProviderConfig();

    res.json({
      acrcloud: {
        configured: isACRCloudConfigured(),
        service: 'Audio Recognition',
      },
      lyrics: {
        ...getLyricsServiceStatus(),
      },
      openai: {
        configured: aiConfig.configured,
        provider: aiConfig.provider,
        model: aiConfig.model,
        apiKeySource: aiConfig.apiKeySource,
        baseURLSource: aiConfig.baseURLSource,
        service: 'AI Cultural Context',
      },
      database,
    });
  });

  app.get("/api/version", (_req, res) => {
    res.json(getBackendBuildInfo());
  });

  app.get("/api/diag/acrcloud", (_req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Not found" });
    }

    return res.json({
      configured: isACRCloudConfigured(),
    });
  });

  // Listen endpoint - Main audio recognition and cultural analysis pipeline
  app.post("/api/listen", upload.single('audio'), async (req, res) => {
    const startTime = Date.now();
    let sessionId: string | undefined;

    try {
      console.log('🎵 [LISTEN] Starting audio recognition pipeline...');
      console.log('🎵 [LISTEN] Request details:', {
        hasFile: !!req.file,
        fileSize: req.file?.size,
        fileMimeType: req.file?.mimetype,
        fileOriginalName: req.file?.originalname,
        origin: req.headers.origin,
        userAgent: req.headers['user-agent']?.substring(0, 100),
        isAuthenticated: req.isAuthenticated(),
        contentType: req.headers['content-type']?.substring(0, 100),
      });

      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      if (!isACRCloudConfigured()) {
        return res.status(500).json({
          success: false,
          errorCode: 'ACRCLOUD_NOT_CONFIGURED',
          error: 'Audio recognition service is not configured.',
        });
      }

      const audioBuffer = req.file.buffer;
      const userId = getUserId(req);
      const audioDuration = parseInt(req.body.duration || '0', 10);
      console.log('🎵 [LISTEN] Audio buffer size:', audioBuffer.length, 'bytes, duration param:', audioDuration);

      // Step 1: Create listening session
      console.log('📝 [LISTEN] Creating listening session...');
      const session = await withDatabaseRetry("createListeningSession", () =>
        storage.createListeningSession({
          userId,
          status: 'recording',
          audioDuration,
        }),
      );
      sessionId = session.id;

      // Step 2: Recognize song with ACRCloud
      console.log('🎧 [LISTEN] Recognizing song with ACRCloud...');
      await storage.updateListeningSession(sessionId, { status: 'recognizing' });

      const recognitionResult = await recognizeSong(audioBuffer, audioDuration / 1000, req.file.mimetype);
      let track = recognitionResult.track;
      let recognitionSource: "acrcloud" | "ai_transcript" = "acrcloud";
      
      if (!recognitionResult.success || !recognitionResult.track) {
        const canAttemptAiFallback =
          isAiConfigured() &&
          (recognitionResult.errorCode === 'ACRCLOUD_RECOGNITION_FAILED' ||
            recognitionResult.errorCode === 'ACRCLOUD_UPSTREAM_UNAVAILABLE' ||
            recognitionResult.errorCode === 'ACRCLOUD_NOT_CONFIGURED');

        if (canAttemptAiFallback) {
          console.log('[LISTEN] ACRCloud failed, attempting AI transcript fallback...');
          const transcript = await transcribeAudioForSongIdentification(audioBuffer, req.file.mimetype);

          if (transcript) {
            try {
              const identifiedFromTranscript = await identifySongFromTextQuery(transcript);
              if (identifiedFromTranscript) {
                track = {
                  title: identifiedFromTranscript.title,
                  artist: identifiedFromTranscript.artist,
                  confidenceScore: identifiedFromTranscript.confidence,
                };
                recognitionSource = 'ai_transcript';
                console.log(`🎵 [LISTEN] AI transcript fallback identified: "${track.title}" by ${track.artist} (${track.confidenceScore}% confidence)`);
              } else {
                console.warn('[LISTEN] AI transcript fallback could not identify a song.');
              }
            } catch (fallbackError: any) {
              console.error('[LISTEN] AI transcript fallback failed:', getErrorMessage(fallbackError) || fallbackError);
            }
          } else {
            console.warn('[LISTEN] AI transcript fallback produced no transcript.');
          }
        }
      }

      if (!track) {
        await storage.updateListeningSession(sessionId, { 
          status: 'failed',
          errorMessage: recognitionResult.errorMessage || 'Song not recognized'
        });

        const errorCode = recognitionResult.errorCode || 'ACRCLOUD_RECOGNITION_FAILED';
        const statusCode =
          errorCode === 'ACRCLOUD_NOT_CONFIGURED'
            ? 500
            : errorCode === 'ACRCLOUD_UPSTREAM_UNAVAILABLE'
              ? 503
              : 404;

        return res.status(statusCode).json({
          success: false,
          errorCode,
          error: recognitionResult.errorMessage || 'Song not recognized',
          sessionId,
        });
      }

      console.log(`✅ [LISTEN] Recognized: "${track.title}" by ${track.artist}`);
      if (track.playOffsetMs) {
        console.log(`📍 [LISTEN] Play offset: ${Math.round(track.playOffsetMs / 1000)}s into the song`);
      }

      const coverArtLookup = resolveTrackArtwork({
        title: track.title,
        artist: track.artist,
        album: track.album,
        spotifyId: track.spotifyId,
        isrc: track.isrc,
        existingCoverArtUrl: track.coverArtUrl,
      });
      // Step 3: Create recognized track record
      const recognizedTrack = await storage.createRecognizedTrack({
        userId,
        title: track.title,
        artist: track.artist,
        album: track.album,
        releaseYear: track.releaseYear,
        genre: track.genre,
        isrc: track.isrc,
        spotifyId: track.spotifyId,
        youtubeId: track.youtubeId,
        confidenceScore: track.confidenceScore,
        recognitionSource,
        playOffsetMs: track.playOffsetMs,
        trackDurationMs: track.durationMs,
        lyricsStatus: 'pending',
        analysisStatus: 'pending',
        processingStartedAt: new Date(),
      });

      // Update session with recognized track
      await storage.updateListeningSession(sessionId, {
        recognizedTrackId: recognizedTrack.id,
      });

      // Define background processing helper function
      const processLyricsAndAnalysis = async () => {
        const bgStartTime = Date.now();
        await storage.updateListeningSession(sessionId!, {
          status: 'processing',
        });

        await storage.updateRecognizedTrack(recognizedTrack.id, {
          lyricsStatus: 'fetching_lyrics',
        });

        let lyricsText: string | null = null;
        let lyricsLanguage = 'en';

        // SPEED: Pre-warm artist info cache in parallel with lyrics fetch
        // This way if lyrics fail, the fallback artist info is already ready
        const artistInfoWarmup = generateArtistSongInfo(
          track.artist,
          track.title,
          track.album || undefined,
          track.genre || undefined,
          track.releaseYear,
          {
            spotifyId: track.spotifyId || null,
            isrc: track.isrc || null,
            confidenceScore: track.confidenceScore ?? null,
          }
        ).catch(err => {
          console.log(`[WARMUP] Artist info pre-fetch failed (non-critical): ${err.message}`);
          return null;
        });

        // Fetch lyrics
        const resolvedLyrics = await resolveLyricsForTrack(recognizedTrack.id, track.title, track.artist);
        lyricsText = resolvedLyrics.text;
        lyricsLanguage = resolvedLyrics.language;

        const cachedLyrics: { text: string; language: string } | null = null;
        if (false && cachedLyrics) {
          console.log(`⚡ [LYRICS] Using cached lyrics for "${track.title}" (skipped API call)`);
          await storage.updateRecognizedTrack(recognizedTrack.id, {
            lyricsStatus: 'completed',
          });
          
          const contentHash = crypto
            .createHash('sha256')
            .update(cachedLyrics.text)
            .digest('hex');
          await storage.createTransientLyrics({
            recognizedTrackId: recognizedTrack.id,
            fullLyrics: cachedLyrics.text,
            language: cachedLyrics.language,
            contentHash,
            source: 'cache',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });
          
          lyricsText = cachedLyrics.text;
          lyricsLanguage = cachedLyrics.language;
        } else if (false && isLyricsServiceAvailable()) {
          try {
            const lyricsResult = await fetchLyricsFast(track.title, track.artist);
            
            if (lyricsResult.success && lyricsResult.lyrics) {
              lyricsText = lyricsResult.lyrics.fullText;
              lyricsLanguage = lyricsResult.lyrics.language;
              
              const contentHash = crypto
                .createHash('sha256')
                .update(lyricsText)
                .digest('hex');

              await storage.createTransientLyrics({
                recognizedTrackId: recognizedTrack.id,
                fullLyrics: lyricsText,
                language: lyricsLanguage,
                contentHash,
                source: lyricsResult.lyrics.copyright || 'multi-source',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              });

              await storage.updateRecognizedTrack(recognizedTrack.id, {
                lyricsStatus: 'completed',
              });
            } else {
              await storage.updateRecognizedTrack(recognizedTrack.id, {
                lyricsStatus: 'no_lyrics',
                analysisStatus: 'no_lyrics',
                processingCompletedAt: new Date(),
              });
            }
          } catch (error: any) {
            console.error('❌ [LYRICS] Fetch error:', error.message);
            await storage.updateRecognizedTrack(recognizedTrack.id, {
              lyricsStatus: 'failed',
              analysisStatus: 'failed',
              processingCompletedAt: new Date(),
            });
          }
        }

        if (lyricsText) {
          await storage.updateRecognizedTrack(recognizedTrack.id, {
            lyricsStatus: 'completed',
          });
        } else {
          await storage.updateRecognizedTrack(recognizedTrack.id, {
            lyricsStatus: 'no_lyrics',
            analysisStatus: 'no_lyrics',
            processingCompletedAt: new Date(),
          });
        }

        const lyricsElapsed = Date.now() - bgStartTime;
        console.log(`⏱️ [PIPELINE] Lyrics phase completed in ${lyricsElapsed}ms (${lyricsText ? 'found' : 'not found'})`);

        if (lyricsText) {
          if (!isAiConfigured()) {
            console.log(`[AI] Skipping deeper analysis for "${track.title}" - no AI provider configured`);
            await storage.updateRecognizedTrack(recognizedTrack.id, {
              analysisStatus: 'failed',
              processingCompletedAt: new Date(),
            });

            await artistInfoWarmup;
            await storage.updateListeningSession(sessionId!, {
              status: 'success',
              recognitionTime: Date.now() - startTime,
            });

            return;
          }

          await storage.updateRecognizedTrack(recognizedTrack.id, {
            analysisStatus: 'generating_analysis',
          });

          const lines = lyricsText.split('\n').filter((line: string) => line.trim());
          const lyricsData = lines.map((text: string, idx: number) => ({
            text,
            lineNumber: idx + 1,
          }));

          let startLineIndex = 0;
          if (track.playOffsetMs && track.durationMs && track.durationMs > 0) {
            const progressRatio = track.playOffsetMs / track.durationMs;
            startLineIndex = Math.floor(progressRatio * lyricsData.length);
            startLineIndex = Math.max(0, startLineIndex - 2);
            console.log(`📍 [AI] Starting analysis at line ${startLineIndex + 1} (${Math.round(progressRatio * 100)}% through song)`);
          }

          const onBatchComplete = async (batchResults: any[], analysisStartIndex: number, originalLines: string[]) => {
            await Promise.all(batchResults.map(async (analysis, i) => {
              const lineText = originalLines[i];
              if (!lineText) return;

              const textHash = crypto
                .createHash('sha256')
                .update(lineText)
                .digest('hex');

              return storage.createAiTranslation({
                recognizedTrackId: recognizedTrack.id,
                lyricLineId: null,
                originalText: lineText,
                translation: analysis.translation,
                culturalContext: analysis.culturalContext,
                artistIntent: analysis.artistIntent,
                deeperMeaning: analysis.deeperMeaning,
                languageNotes: analysis.languageNotes || null,
                detectedLanguage: analysis.detectedLanguage,
                slangTerms: analysis.slangTerms ? JSON.stringify(analysis.slangTerms) : null,
                textHash,
              });
            }));
            console.log(`📝 Saved ${batchResults.length} lines for "${track.title}"`);
          };

          const sectionResults = await generateSectionCulturalAnalysis(
            lyricsData,
            track.title,
            track.artist,
            track.genre,
            lyricsLanguage,
            startLineIndex,
            2,
            onBatchComplete
          );
          const glossaryFallbackResults = buildGlossaryAnalysesFromLyrics(lyricsText);

          await storage.updateRecognizedTrack(recognizedTrack.id, {
            analysisStatus: sectionResults.length > 0 || glossaryFallbackResults.length > 0 ? 'completed' : 'failed',
            processingCompletedAt: new Date(),
          });
          
          const analysisElapsed = Date.now() - bgStartTime;
          if (sectionResults.length > 0) {
            console.log(`✅ [PIPELINE] Analysis complete in ${analysisElapsed}ms. Remaining ${Math.max(0, lyricsData.length - 4)} lines on-demand.`);
          } else {
            console.warn(`⚠️ [PIPELINE] Analysis returned no results for "${track.title}" after ${analysisElapsed}ms.`);
          }

          // Song DNA extraction runs fire-and-forget (non-blocking)
          if (sectionResults.length > 0) {
            extractSongDNA(
              track.title,
              track.artist,
              lyricsText!,
              track.genre,
              track.releaseYear
            ).then(async (songDNA) => {
              if (songDNA) {
                await storage.updateRecognizedTrack(recognizedTrack.id, {
                  emotionalTone: songDNA.emotionalTone,
                  emotionalToneConfidence: String(songDNA.emotionalToneConfidence),
                  culturalThemes: JSON.stringify(songDNA.culturalThemes),
                  culturalThemeConfidence: String(songDNA.culturalThemeConfidence),
                  region: songDNA.region,
                  era: songDNA.era,
                  songDnaGeneratedAt: new Date(),
                });
                console.log(`🧬 [DNA] Saved song DNA for "${track.title}"`);
              }
            }).catch(err => console.error('❌ [DNA] Failed:', err.message));
          }
        }

        // Wait for artist info warmup to finish (should already be done)
        await artistInfoWarmup;

        await storage.updateListeningSession(sessionId!, {
          status: 'success',
          recognitionTime: Date.now() - startTime,
        });
        
        const totalElapsed = Date.now() - bgStartTime;
        console.log(`✅ [PIPELINE] Total background processing: ${totalElapsed}ms`);
      };

      // Step 4: Return early with recognition results for progressive UX
      const recognitionTime = Date.now() - startTime;
      const coverArtUrl = await coverArtLookup;
      
      // Immediately return the recognized track so user can see metadata
      res.json({
        success: true,
        sessionId,
        recognizedTrack: {
          id: recognizedTrack.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration,
          genre: track.genre,
          spotifyId: track.spotifyId,
          youtubeId: track.youtubeId,
          confidenceScore: track.confidenceScore,
          coverArtUrl,
        },
        processingTime: recognitionTime,
      });

      // Continue processing lyrics and AI translations in the background
      // (Response already sent, so this happens asynchronously)
      process.nextTick(async () => {
        try {
          console.log(`🔄 [LISTEN] Background processing lyrics and AI for track ${recognizedTrack.id}`);
          await processLyricsAndAnalysis();
          console.log(`✅ [LISTEN] Background processing complete for session ${sessionId}`);
        } catch (bgError: any) {
          console.error('❌ [LISTEN] Background processing error:', bgError.message);
          // Mark session as failed
          await storage.updateListeningSession(sessionId!, {
            status: 'failed',
            errorMessage: `Background processing failed: ${bgError.message}`,
          }).catch(err => console.error('Failed to update session:', err));
        }
      });

    } catch (error: any) {
      console.error('❌ [LISTEN] Pipeline error:', error);

      const databaseIssue = classifyDatabaseIssue(error);

      // Update session with error status if session was created
      if (sessionId) {
        await storage.updateListeningSession(sessionId, {
          status: 'failed',
          errorMessage: error.message,
        }).catch(err => console.error('Failed to update session:', err));
      }

      if (databaseIssue) {
        return res.status(databaseIssue.statusCode).json({
          success: false,
          errorCode: databaseIssue.errorCode,
          error: databaseIssue.error,
          troubleshooting: databaseIssue.troubleshooting,
          ...(process.env.NODE_ENV === "production"
            ? {}
            : { details: databaseIssue.details || getErrorMessage(error) }),
          sessionId,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process audio recognition',
        details: error.message,
        sessionId,
      });
    }
  });

  // Get user listening history
  app.get("/api/listening-history", async (req, res) => {
    try {
      const userId = getUserId(req);
      
      if (!userId) {
        return res.json([]);
      }

      const sessions = await storage.getListeningSessionsByUserId(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching listening history:", error);
      res.status(500).json({ error: "Failed to fetch listening history" });
    }
  });

  // Manual song identification - identify by title/artist without audio recording
  app.post("/api/identify-manual", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { title, artist } = req.body;
      
      if (!title || !artist) {
        return res.status(400).json({ error: 'Title and artist are required' });
      }

      console.log(`🎵 [MANUAL] Identifying: "${title}" by ${artist}`);
      
      const userId = getUserId(req);

      // Create listening session
      const session = await storage.createListeningSession({
        userId,
        status: 'recognizing',
        audioDuration: 0,
      });

      // Create recognized track record
      const recognizedTrack = await storage.createRecognizedTrack({
        userId,
        title,
        artist,
        recognitionSource: 'manual',
        confidenceScore: 100, // Manual entry is 100% confident
      });

      // Update session with recognized track
      await storage.updateListeningSession(session.id, {
        recognizedTrackId: recognizedTrack.id,
      });

      // Background processing for lyrics and AI
      const processLyricsAndAnalysis = async () => {
        await storage.updateListeningSession(session.id, { status: 'processing' });

        // Fetch lyrics
        console.log('📜 [MANUAL] Fetching lyrics...');
        let lyricsText: string | null = null;
        let lyricsLanguage = 'en';

        const resolvedLyrics = await resolveLyricsForTrack(recognizedTrack.id, title, artist);
        lyricsText = resolvedLyrics.text;
        lyricsLanguage = resolvedLyrics.language;

        if (lyricsText) {
          await storage.updateRecognizedTrack(recognizedTrack.id, {
            lyricsStatus: 'completed',
          });
          console.log(`âœ… [MANUAL] Lyrics fetched (${lyricsText.split('\n').length} lines)`);
        } else {
          await storage.updateRecognizedTrack(recognizedTrack.id, {
            lyricsStatus: 'no_lyrics',
            analysisStatus: 'no_lyrics',
            processingCompletedAt: new Date(),
          });
        }

        if (false && isLyricsServiceAvailable()) {
          try {
            const lyricsResult = await fetchLyricsFast(title, artist);
            
            if (lyricsResult.success && lyricsResult.lyrics) {
              lyricsText = lyricsResult.lyrics.fullText;
              lyricsLanguage = lyricsResult.lyrics.language;
              
              const contentHash = crypto
                .createHash('sha256')
                .update(lyricsText)
                .digest('hex');

              await storage.createTransientLyrics({
                recognizedTrackId: recognizedTrack.id,
                fullLyrics: lyricsText,
                language: lyricsLanguage,
                contentHash,
                source: 'musixmatch',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              });

              console.log(`✅ [MANUAL] Lyrics fetched (${lyricsText.split('\n').length} lines)`);
            }
          } catch (error: any) {
            console.error('❌ [MANUAL] Lyrics fetch failed:', error.message);
          }
        }

        // Generate AI cultural analysis with progressive saving
        if (lyricsText) {
          console.log('🤖 [MANUAL] Generating AI cultural analysis...');
          
          try {
            const lines = lyricsText.split('\n').filter(line => line.trim());
            const lyricsData = lines.map((text, idx) => ({
              text,
              lineNumber: idx + 1,
            }));

            const onBatchComplete = async (batchResults: any[], startIndex: number, originalLines: string[]) => {
              await Promise.all(batchResults.map(async (analysis, i) => {
                const lineText = originalLines[i];
                if (!lineText) return;

                const textHash = crypto
                  .createHash('sha256')
                  .update(lineText)
                  .digest('hex');

                return storage.createAiTranslation({
                  recognizedTrackId: recognizedTrack.id,
                  lyricLineId: null,
                  originalText: lineText,
                  translation: analysis.translation,
                  culturalContext: analysis.culturalContext,
                  artistIntent: analysis.artistIntent,
                  deeperMeaning: analysis.deeperMeaning,
                  languageNotes: analysis.languageNotes || null,
                  detectedLanguage: analysis.detectedLanguage,
                  slangTerms: analysis.slangTerms ? JSON.stringify(analysis.slangTerms) : null,
                  textHash,
                });
              }));
              console.log(`📝 [MANUAL] Saved batch (${batchResults.length} lines)`);
            };

            await generateBatchCulturalAnalysis(
              lyricsData,
              title,
              artist,
              undefined,
              lyricsLanguage,
              onBatchComplete
            );

            console.log(`✅ [MANUAL] AI analysis complete`);
          } catch (error: any) {
            console.error('❌ [MANUAL] AI analysis failed:', error.message);
          }
        }

        await storage.updateListeningSession(session.id, {
          status: 'success',
          recognitionTime: Date.now() - startTime,
        });
      };

      // Return immediately with track info
      res.json({
        success: true,
        sessionId: session.id,
        recognizedTrack: {
          id: recognizedTrack.id,
          title,
          artist,
          confidenceScore: 100,
        },
        processingTime: Date.now() - startTime,
      });

      // Process lyrics and AI in background
      (async () => {
        try {
          await processLyricsAndAnalysis();
          console.log(`✅ [MANUAL] Background processing complete for session ${session.id}`);
        } catch (bgError: any) {
          console.error('❌ [MANUAL] Background processing error:', bgError.message);
          await storage.updateListeningSession(session.id, {
            status: 'failed',
            errorMessage: `Background processing failed: ${bgError.message}`,
          }).catch(err => console.error('Failed to update session:', err));
        }
      })();

    } catch (error: any) {
      console.error('❌ [MANUAL] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to identify song',
        details: error.message,
      });
    }
  });

  // Text-based song identification - identify by partial lyrics, humming description, or song name
  app.post("/api/identify-by-text", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string' || query.trim().length < 3) {
        return res.status(400).json({ error: 'Please type at least 3 characters' });
      }

      console.log(`🔍 [TEXT] Identifying song from text: "${query.trim().substring(0, 80)}..."`);
      
      const userId = getUserId(req);

      // Use the configured OpenAI-compatible provider to identify the song from text
      const aiConfig = getAiProviderConfig();
      if (!aiConfig.configured) {
        return res.status(503).json({
          success: false,
          error: getAiUnavailableMessage("Text identification"),
        });
      }

      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey: aiConfig.apiKey!,
        baseURL: aiConfig.baseURL,
        defaultHeaders: aiConfig.defaultHeaders,
      });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a music identification expert specializing in African music (Nigerian, South African, Ghanaian, Kenyan, etc.) and global hits popular in Africa. Given a user's text input (which could be partial lyrics, a song description, humming description, or song/artist name), identify the most likely song.

You MUST respond with valid JSON in this exact format:
{"title": "Song Title", "artist": "Artist Name", "confidence": 85}

Rules:
- confidence should be 0-100 based on how certain you are
- If the text clearly contains lyrics from a known song, confidence should be 70-95
- If it's a vague description, confidence should be 30-60
- If you cannot identify any song at all, respond with: {"title": "", "artist": "", "confidence": 0}
- Always prioritize African/Nigerian music if the text contains Pidgin, Yoruba, Igbo, Hausa, or other African languages
- For well-known songs, use the most common title and primary artist name`
          },
          {
            role: "user",
            content: query.trim()
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const responseText = completion.choices[0]?.message?.content?.trim() || '';
      
      let identified: { title: string; artist: string; confidence: number };
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        identified = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      } catch {
        console.error('❌ [TEXT] Failed to parse AI response:', responseText);
        return res.status(400).json({ 
          success: false, 
          error: 'We no fit understand the response. Try again abeg.' 
        });
      }

      if (!identified.title || !identified.artist || identified.confidence === 0) {
        return res.status(404).json({
          success: false,
          error: 'We no fit find any song from wetin you type. Try add more lyrics or details.',
        });
      }

      console.log(`🎵 [TEXT] AI identified: "${identified.title}" by ${identified.artist} (${identified.confidence}% confidence)`);

      // Create listening session
      const session = await storage.createListeningSession({
        userId,
        status: 'recognizing',
        audioDuration: 0,
      });

      // Create recognized track record
      const recognizedTrack = await storage.createRecognizedTrack({
        userId,
        title: identified.title,
        artist: identified.artist,
        recognitionSource: 'manual',
        confidenceScore: identified.confidence,
      });

      // Update session with recognized track
      await storage.updateListeningSession(session.id, {
        recognizedTrackId: recognizedTrack.id,
      });

      // Return immediately with track info
      res.json({
        success: true,
        sessionId: session.id,
        recognizedTrack: {
          id: recognizedTrack.id,
          title: identified.title,
          artist: identified.artist,
          confidenceScore: identified.confidence,
        },
        processingTime: Date.now() - startTime,
      });

      // Background processing for lyrics and AI analysis (same as manual identify)
      (async () => {
        try {
          await storage.updateListeningSession(session.id, { status: 'processing' });

          let lyricsText: string | null = null;
          let lyricsLanguage = 'en';

          const resolvedLyrics = await resolveLyricsForTrack(
            recognizedTrack.id,
            identified.title,
            identified.artist,
          );
          lyricsText = resolvedLyrics.text;
          lyricsLanguage = resolvedLyrics.language;

          if (lyricsText) {
            await storage.updateRecognizedTrack(recognizedTrack.id, {
              lyricsStatus: 'completed',
            });
          } else {
            await storage.updateRecognizedTrack(recognizedTrack.id, {
              lyricsStatus: 'no_lyrics',
              analysisStatus: 'no_lyrics',
              processingCompletedAt: new Date(),
            });
          }

          if (false && isLyricsServiceAvailable()) {
            try {
              const lyricsResult = await fetchLyricsFast(identified.title, identified.artist);
              if (lyricsResult.success && lyricsResult.lyrics) {
                lyricsText = lyricsResult.lyrics.fullText;
                lyricsLanguage = lyricsResult.lyrics.language;
                
                const contentHash = crypto
                  .createHash('sha256')
                  .update(lyricsText)
                  .digest('hex');

                await storage.createTransientLyrics({
                  recognizedTrackId: recognizedTrack.id,
                  fullLyrics: lyricsText,
                  language: lyricsLanguage,
                  contentHash,
                  source: 'musixmatch',
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                });
              }
            } catch (error: any) {
              console.error('❌ [TEXT] Lyrics fetch failed:', error.message);
            }
          }

          if (lyricsText) {
            try {
              const lines = lyricsText.split('\n').filter(line => line.trim());
              const lyricsData = lines.map((text, idx) => ({
                text,
                lineNumber: idx + 1,
              }));

              const onBatchComplete = async (batchResults: any[], startIndex: number, originalLines: string[]) => {
                await Promise.all(batchResults.map(async (analysis, i) => {
                  const lineText = originalLines[i];
                  if (!lineText) return;

                  const textHash = crypto
                    .createHash('sha256')
                    .update(lineText)
                    .digest('hex');

                  return storage.createAiTranslation({
                    recognizedTrackId: recognizedTrack.id,
                    lyricLineId: null,
                    originalText: lineText,
                    translation: analysis.translation,
                    culturalContext: analysis.culturalContext,
                    artistIntent: analysis.artistIntent,
                    deeperMeaning: analysis.deeperMeaning,
                    languageNotes: analysis.languageNotes || null,
                    detectedLanguage: analysis.detectedLanguage,
                    slangTerms: analysis.slangTerms ? JSON.stringify(analysis.slangTerms) : null,
                    textHash,
                  });
                }));
              };

              await generateBatchCulturalAnalysis(
                lyricsData,
                identified.title,
                identified.artist,
                undefined,
                lyricsLanguage,
                onBatchComplete
              );
            } catch (error: any) {
              console.error('❌ [TEXT] AI analysis failed:', error.message);
            }
          }

          await storage.updateListeningSession(session.id, {
            status: 'success',
            recognitionTime: Date.now() - startTime,
          });
          console.log(`✅ [TEXT] Background processing complete for "${identified.title}"`);
        } catch (bgError: any) {
          console.error('❌ [TEXT] Background processing error:', bgError.message);
          await storage.updateListeningSession(session.id, {
            status: 'failed',
            errorMessage: `Background processing failed: ${bgError.message}`,
          }).catch(err => console.error('Failed to update session:', err));
        }
      })();

    } catch (error: any) {
      console.error('❌ [TEXT] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to identify song',
        details: error.message,
      });
    }
  });

  // Spotify Now Playing - Get current track from Spotify
  app.get("/api/spotify/now-playing", async (req, res) => {
    try {
      const accessToken = req.query.access_token as string;
      
      if (!accessToken) {
        return res.status(400).json({ error: 'Spotify access token required' });
      }

      // Fetch currently playing track from Spotify
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204) {
        return res.json({ isPlaying: false, message: 'No track currently playing' });
      }

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: 'Failed to get Spotify playback', details: errorText });
      }

      const data = await response.json();
      
      if (!data.item) {
        return res.json({ isPlaying: false, message: 'No track currently playing' });
      }

      const track = data.item;
      
      res.json({
        isPlaying: data.is_playing,
        track: {
          title: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          album: track.album?.name,
          spotifyId: track.id,
          coverArtUrl: track.album?.images?.[0]?.url,
          duration: track.duration_ms,
        },
      });
    } catch (error: any) {
      console.error('Spotify Now Playing error:', error);
      res.status(500).json({ error: 'Failed to get current track' });
    }
  });

  // Identify Spotify track - same as manual but with Spotify metadata
  app.post("/api/identify-spotify", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { title, artist, spotifyId, album, coverArtUrl } = req.body;
      
      if (!title || !artist) {
        return res.status(400).json({ error: 'Title and artist are required' });
      }

      console.log(`🎵 [SPOTIFY] Identifying: "${title}" by ${artist}`);
      
      const userId = getUserId(req);
      const resolvedCoverArtUrl = await resolveTrackArtwork({
        title,
        artist,
        album,
        spotifyId,
        existingCoverArtUrl: coverArtUrl,
      });

      // Create listening session
      const session = await storage.createListeningSession({
        userId,
        status: 'recognizing',
        audioDuration: 0,
      });

      // Create recognized track record with Spotify metadata
      const recognizedTrack = await storage.createRecognizedTrack({
        userId,
        title,
        artist,
        album,
        spotifyId,
        recognitionSource: 'spotify',
        confidenceScore: 100,
      });

      // Update session
      await storage.updateListeningSession(session.id, {
        recognizedTrackId: recognizedTrack.id,
      });

      // Return immediately
      res.json({
        success: true,
        sessionId: session.id,
        recognizedTrack: {
          id: recognizedTrack.id,
          title,
          artist,
          album,
          spotifyId,
          coverArtUrl: resolvedCoverArtUrl,
          confidenceScore: 100,
        },
        processingTime: Date.now() - startTime,
      });

      // Background processing (same as manual)
      (async () => {
        try {
          await storage.updateListeningSession(session.id, { status: 'processing' });

          let lyricsText: string | null = null;
          let lyricsLanguage = 'en';

          const resolvedLyrics = await resolveLyricsForTrack(recognizedTrack.id, title, artist);
          lyricsText = resolvedLyrics.text;
          lyricsLanguage = resolvedLyrics.language;

          if (lyricsText) {
            await storage.updateRecognizedTrack(recognizedTrack.id, {
              lyricsStatus: 'completed',
            });
          } else {
            await storage.updateRecognizedTrack(recognizedTrack.id, {
              lyricsStatus: 'no_lyrics',
              analysisStatus: 'no_lyrics',
              processingCompletedAt: new Date(),
            });
          }

          if (false && isLyricsServiceAvailable()) {
            try {
              const lyricsResult = await fetchLyricsFast(title, artist);
              
              if (lyricsResult.success && lyricsResult.lyrics) {
                lyricsText = lyricsResult.lyrics.fullText;
                lyricsLanguage = lyricsResult.lyrics.language;
                
                const contentHash = crypto
                  .createHash('sha256')
                  .update(lyricsText)
                  .digest('hex');

                await storage.createTransientLyrics({
                  recognizedTrackId: recognizedTrack.id,
                  fullLyrics: lyricsText,
                  language: lyricsLanguage,
                  contentHash,
                  source: 'musixmatch',
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                });
              }
            } catch (error: any) {
              console.error('❌ [SPOTIFY] Lyrics fetch failed:', error.message);
            }
          }

          if (lyricsText) {
            try {
              const lines = lyricsText.split('\n').filter(line => line.trim());
              const lyricsData = lines.map((text, idx) => ({
                text,
                lineNumber: idx + 1,
              }));

              const analysisResults = await generateBatchCulturalAnalysis(
                lyricsData,
                title,
                artist,
                undefined,
                lyricsLanguage
              );

              for (let i = 0; i < analysisResults.length; i++) {
                const analysis = analysisResults[i];
                const lineText = lines[i];

                const textHash = crypto
                  .createHash('sha256')
                  .update(lineText)
                  .digest('hex');

                await storage.createAiTranslation({
                  recognizedTrackId: recognizedTrack.id,
                  lyricLineId: null,
                  originalText: lineText,
                  translation: analysis.translation,
                  culturalContext: analysis.culturalContext,
                  artistIntent: analysis.artistIntent,
                  deeperMeaning: analysis.deeperMeaning,
                  languageNotes: analysis.languageNotes || null,
                  detectedLanguage: analysis.detectedLanguage,
                  slangTerms: analysis.slangTerms ? JSON.stringify(analysis.slangTerms) : null,
                  textHash,
                });
              }
            } catch (error: any) {
              console.error('❌ [SPOTIFY] AI analysis failed:', error.message);
            }
          }

          await storage.updateListeningSession(session.id, {
            status: 'success',
            recognitionTime: Date.now() - startTime,
          });

          console.log(`✅ [SPOTIFY] Background processing complete for session ${session.id}`);
        } catch (bgError: any) {
          console.error('❌ [SPOTIFY] Background processing error:', bgError.message);
          await storage.updateListeningSession(session.id, {
            status: 'failed',
            errorMessage: `Background processing failed: ${bgError.message}`,
          }).catch(err => console.error('Failed to update session:', err));
        }
      })();

    } catch (error: any) {
      console.error('❌ [SPOTIFY] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to identify song',
        details: error.message,
      });
    }
  });

  // Search recognized tracks with filters
  app.get("/api/search", async (req, res) => {
    try {
      const { q, languages, genres, culturalCategories, limit } = req.query;
      
      // Parse array parameters
      const languageArray = languages 
        ? (Array.isArray(languages) ? languages as string[] : (languages as string).split(','))
        : undefined;
      const genreArray = genres
        ? (Array.isArray(genres) ? genres as string[] : (genres as string).split(','))
        : undefined;
      const categoryArray = culturalCategories
        ? (Array.isArray(culturalCategories) ? culturalCategories as string[] : (culturalCategories as string).split(','))
        : undefined;
      const limitNum = limit ? parseInt(limit as string) : undefined;

      const results = await storage.searchRecognizedTracks({
        query: q as string | undefined,
        languages: languageArray,
        genres: genreArray,
        culturalCategories: categoryArray,
        limit: limitNum,
      });

      res.json(results);
    } catch (error) {
      console.error("Error searching tracks:", error);
      res.status(500).json({ error: "Failed to search tracks" });
    }
  });

  const sendRecognizedTrack = async (req: any, res: any) => {
    try {
      const responsePayload = await buildRecognizedTrackResponse(req.params.id);

      if (!responsePayload) {
        return res.status(404).json({ error: "Track not found" });
      }

      res.json(responsePayload);
    } catch (error) {
      console.error("Error fetching recognized track:", error);
      res.status(500).json({ error: "Failed to fetch track details" });
    }
  };

  // Get recognized track by ID with lyrics and translations
  app.get("/api/recognized-tracks/:id", sendRecognizedTrack);

  // Backward compatibility alias for older frontend bundles.
  app.get("/api/recognized-track/:id", sendRecognizedTrack);

  // SSE endpoint for real-time track processing updates
  // Eliminates polling - client gets instant updates as processing progresses
  const streamRecognizedTrack = async (req: any, res: any) => {
    const trackId = req.params.id;
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    
    const sendEvent = (eventType: string, data: any) => {
      res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    
    let closed = false;
    req.on('close', () => { closed = true; });
    
    const fetchAndSend = async () => {
      try {
        const payload = await buildRecognizedTrackResponse(trackId);
        if (!payload) {
          sendEvent('error', { message: 'Track not found' });
          res.end();
          return;
        }

        sendEvent('update', payload);
        
        const lyricsComplete = ['complete', 'failed', 'unavailable'].includes(payload.status.lyrics);
        const analysisComplete = ['complete', 'failed', 'unavailable'].includes(payload.status.analysis);
        
        if (lyricsComplete && analysisComplete) {
          sendEvent('complete', { message: 'Processing complete' });
          res.end();
          return;
        }
      } catch (err: any) {
        sendEvent('error', { message: err.message });
      }
    };
    
    await fetchAndSend();
    
    let fetching = false;
    const interval = setInterval(async () => {
      if (closed || fetching) {
        if (closed) clearInterval(interval);
        return;
      }
      fetching = true;
      try {
        await fetchAndSend();
      } finally {
        fetching = false;
      }
    }, 800);
    
    setTimeout(() => {
      clearInterval(interval);
      if (!closed) {
        sendEvent('timeout', { message: 'Processing timeout' });
        res.end();
      }
    }, 60000);
  };

  app.get("/api/recognized-tracks/:id/stream", streamRecognizedTrack);

  // Backward compatibility alias for older frontend bundles.
  app.get("/api/recognized-track/:id/stream", streamRecognizedTrack);

  app.post("/api/recognized-tracks/:id/retry-analysis", async (req, res) => {
    try {
      const trackId = req.params.id;
      const track = await storage.getRecognizedTrackById(trackId);

      if (!track) {
        return res.status(404).json({ error: "Track not found" });
      }

      const transientLyricsRecords = await storage.getTransientLyricsByTrackId(trackId);
      const primaryLyrics = transientLyricsRecords[0];

      if (!primaryLyrics?.fullLyrics) {
        return res.status(409).json({
          error: "Lyrics never land for this track yet, so deeper gist cannot run.",
        });
      }

      const existingAnalyses = await storage.getAiTranslationsByRecognizedTrackId(trackId);
      if (existingAnalyses.length > 0) {
        await storage.updateRecognizedTrack(trackId, {
          analysisStatus: "completed",
          processingCompletedAt: new Date(),
        });

        return res.json({
          success: true,
          message: "Meaning don already dey here. We refreshed the track state.",
        });
      }

      if (!isAiConfigured()) {
        return res.status(503).json({
          error: "Deeper gist no ready right now because the AI layer is offline.",
        });
      }

      await storage.updateRecognizedTrack(trackId, {
        analysisStatus: "generating_analysis",
      });

      res.json({
        success: true,
        message: "We don restart the deeper gist from the song we already matched.",
      });

      process.nextTick(async () => {
        try {
          const lyricsText = primaryLyrics.fullLyrics;
          const lyricsLanguage = primaryLyrics.language || "en";
          const lyricsData = lyricsText
            .split("\n")
            .filter((line: string) => line.trim().length > 0)
            .map((text: string, idx: number) => ({
              text,
              lineNumber: idx + 1,
            }));

          const onBatchComplete = async (
            batchResults: any[],
            _startIndex: number,
            originalLines: string[],
          ) => {
            await Promise.all(
              batchResults.map(async (analysis, i) => {
                const lineText = originalLines[i];
                if (!lineText) return;

                const textHash = crypto.createHash("sha256").update(lineText).digest("hex");

                return storage.createAiTranslation({
                  recognizedTrackId: trackId,
                  lyricLineId: null,
                  originalText: lineText,
                  translation: analysis.translation,
                  culturalContext: analysis.culturalContext,
                  artistIntent: analysis.artistIntent,
                  deeperMeaning: analysis.deeperMeaning,
                  languageNotes: analysis.languageNotes || null,
                  detectedLanguage: analysis.detectedLanguage,
                  slangTerms: analysis.slangTerms ? JSON.stringify(analysis.slangTerms) : null,
                  textHash,
                });
              }),
            );
          };

          const batchResults = await generateBatchCulturalAnalysis(
            lyricsData,
            track.title,
            track.artist,
            track.genre || undefined,
            lyricsLanguage,
            onBatchComplete,
          );
          const glossaryFallbackResults = buildGlossaryAnalysesFromLyrics(lyricsText);

          await storage.updateRecognizedTrack(trackId, {
            analysisStatus:
              batchResults.length > 0 || glossaryFallbackResults.length > 0
                ? "completed"
                : "failed",
            processingCompletedAt: new Date(),
          });
        } catch (error: any) {
          console.error("[RETRY-ANALYSIS] Failed:", error?.message || error);
          await storage.updateRecognizedTrack(trackId, {
            analysisStatus: "failed",
            processingCompletedAt: new Date(),
          });
        }
      });
    } catch (error) {
      console.error("Error retrying deeper analysis:", error);
      res.status(500).json({
        error: "We no fit restart the deeper gist right now.",
      });
    }
  });

  // X-Ray style artist and song info
  app.get("/api/artist-info/:trackId", async (req, res) => {
    try {
      const track = await storage.getRecognizedTrackById(req.params.trackId);
      if (!track) {
        return res.status(404).json({ error: "Track not found" });
      }

      if (!isAiConfigured()) {
        return res.json({
          ...buildUnavailableArtistInfo(
            track.artist,
            track.title,
            track.album || undefined,
            track.genre || undefined,
            track.releaseYear || undefined,
          ),
          status: "complete",
        });
      }

      const info = await generateArtistSongInfo(
        track.artist,
        track.title,
        track.album || undefined,
        track.genre || undefined,
        track.releaseYear || undefined,
        {
          spotifyId: track.spotifyId || null,
          isrc: track.isrc || null,
          confidenceScore: track.confidenceScore ?? null,
        }
      );

      if (!info) {
        return res.json({
          ...buildUnavailableArtistInfo(
            track.artist,
            track.title,
            track.album || undefined,
            track.genre || undefined,
            track.releaseYear || undefined,
          ),
          status: "complete",
        });
      }

      res.json({
        ...info,
        status: "complete",
      });
    } catch (error) {
      console.error("Error generating artist info:", error);
      res.json({
        artistBio: "The artist keeps the energy direct and song-first on this record.",
        artistOrigin: "",
        musicStyle: "The sound stays rooted in the mood of the detected track.",
        songBackground: "This song holds its own personality even while richer artist context is still catching up.",
        verification: "unverified",
        status: "complete",
      });
    }
  });

  // Fragment interpretation - for when lyrics aren't available
  app.get("/api/fragment-interpretation/:trackId", async (req, res) => {
    try {
      const track = await storage.getRecognizedTrackById(req.params.trackId);
      if (!track) {
        return res.status(404).json({ error: "Track not found" });
      }

      if (!isAiConfigured()) {
        return res.json({
          ...buildUnavailableFragmentInterpretation(
            track.title,
            track.artist,
            track.genre || undefined,
            track.region || undefined,
          ),
          status: "complete",
        });
      }

      const interpretation = await generateFragmentInterpretation(
        track.title,
        track.artist,
        track.genre || undefined,
        track.region || undefined
      );

      if (!interpretation) {
        return res.json({
          ...buildUnavailableFragmentInterpretation(
            track.title,
            track.artist,
            track.genre || undefined,
            track.region || undefined,
          ),
          status: "complete",
        });
      }

      res.json({
        ...interpretation,
        status: "complete",
      });
    } catch (error) {
      console.error("Error generating fragment interpretation:", error);
      res.json({
        detectedPhrases: [],
        likelyThemes: [],
        titleMeaning: undefined,
        culturalNote: "The title lands as a bold part of the song's identity and overall mood.",
        status: "complete",
      });
    }
  });

  // Lazy-load analysis for a single lyric line (on-demand when user taps)
  app.post("/api/analyze-line", async (req, res) => {
    try {
      const { lyricText, trackId, songTitle, artistName, genre, language } = req.body;
      
      if (!lyricText || lyricText.trim().length < 3) {
        return res.status(400).json({ error: 'Lyric text is required' });
      }

      console.log(`🔍 [LAZY] On-demand analysis requested for: "${lyricText.substring(0, 40)}..."`);

      // Check if analysis already exists for this line
      const textHash = crypto
        .createHash('sha256')
        .update(lyricText.trim())
        .digest('hex');

      const existingAnalysis = await storage.getAiTranslationByTextHash(textHash);
      if (existingAnalysis) {
        console.log(`✅ [LAZY] Found cached analysis`);
        return res.json({
          success: true,
          cached: true,
          analysis: existingAnalysis,
        });
      }

      const fallbackAnalysis = buildGlossaryLineAnalysis(lyricText.trim());

      if (!isAiConfigured()) {
        if (!fallbackAnalysis) {
          return res.status(503).json({
            success: false,
            status: 'unavailable',
            message: 'No local glossary match yet for this line. Try another lyric or add a community meaning.',
          });
        }

        return res.json({
          success: true,
          cached: false,
          fallback: true,
          analysis: {
            originalText: lyricText.trim(),
            translation: fallbackAnalysis.translation,
            culturalContext: fallbackAnalysis.culturalContext,
            artistIntent: fallbackAnalysis.artistIntent,
            deeperMeaning: fallbackAnalysis.deeperMeaning,
            languageNotes: fallbackAnalysis.languageNotes,
            detectedLanguage: fallbackAnalysis.detectedLanguage,
            slangTerms: fallbackAnalysis.slangTerms ? JSON.stringify(fallbackAnalysis.slangTerms) : null,
          },
        });
      }

      // Generate new analysis for this line
      const analysis = await generateSingleLineAnalysis(
        lyricText.trim(),
        songTitle,
        artistName,
        genre,
        language
      );

      if (!analysis) {
        if (fallbackAnalysis) {
          return res.json({
            success: true,
            cached: false,
            fallback: true,
            analysis: {
              originalText: lyricText.trim(),
              translation: fallbackAnalysis.translation,
              culturalContext: fallbackAnalysis.culturalContext,
              artistIntent: fallbackAnalysis.artistIntent,
              deeperMeaning: fallbackAnalysis.deeperMeaning,
              languageNotes: fallbackAnalysis.languageNotes,
              detectedLanguage: fallbackAnalysis.detectedLanguage,
              slangTerms: fallbackAnalysis.slangTerms ? JSON.stringify(fallbackAnalysis.slangTerms) : null,
            },
          });
        }

        return res.status(503).json({
          success: false,
          status: 'unavailable',
          message: 'We found the song already. More meaning is still loading.',
        });
      }

      // Save the analysis if trackId provided
      if (trackId) {
        await storage.createAiTranslation({
          recognizedTrackId: trackId,
          lyricLineId: null,
          originalText: lyricText.trim(),
          translation: analysis.translation,
          culturalContext: analysis.culturalContext,
          artistIntent: analysis.artistIntent,
          deeperMeaning: analysis.deeperMeaning,
          languageNotes: analysis.languageNotes || null,
          detectedLanguage: analysis.detectedLanguage,
          slangTerms: analysis.slangTerms ? JSON.stringify(analysis.slangTerms) : null,
          textHash,
        });
      }

      res.json({
        success: true,
        cached: false,
        analysis: {
          originalText: lyricText.trim(),
          translation: analysis.translation,
          culturalContext: analysis.culturalContext,
          artistIntent: analysis.artistIntent,
          deeperMeaning: analysis.deeperMeaning,
          languageNotes: analysis.languageNotes,
          detectedLanguage: analysis.detectedLanguage,
          slangTerms: analysis.slangTerms ? JSON.stringify(analysis.slangTerms) : null,
        },
      });
    } catch (error: any) {
      console.error('❌ [LAZY] Error:', error);
      res.status(500).json({
        success: false,
        status: 'failed',
        message: 'We hit a problem while analyzing this line. Please try again.',
      });
    }
  });

  // Streaming analysis for a single lyric line (SSE for real-time typing effect)
  app.get("/api/analyze-line/stream", async (req, res) => {
    const { lyricText, trackId, songTitle, artistName, genre, language } = req.query;
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      if (!lyricText || String(lyricText).trim().length < 3) {
        res.write(`data: ${JSON.stringify({ type: 'error', data: 'Lyric text is required' })}\n\n`);
        res.end();
        return;
      }

      const text = String(lyricText).trim();
      console.log(`🔄 [STREAM] Streaming analysis for: "${text.substring(0, 40)}..."`);

      // Check cache first
      const textHash = crypto.createHash('sha256').update(text).digest('hex');
      const existingAnalysis = await storage.getAiTranslationByTextHash(textHash);
      
      if (existingAnalysis) {
        console.log(`✅ [STREAM] Found cached analysis, sending immediately`);
        res.write(`data: ${JSON.stringify({ type: 'cached', data: JSON.stringify(existingAnalysis) })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'complete', data: JSON.stringify(existingAnalysis) })}\n\n`);
        res.end();
        return;
      }

      const fallbackPayload = buildStreamingGlossaryPayload(text);

      if (!isAiConfigured()) {
        if (fallbackPayload) {
          res.write(`data: ${JSON.stringify({ type: 'complete', data: fallbackPayload })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ type: 'error', data: 'No local glossary match yet for this line. Try another lyric or add a community meaning.' })}\n\n`);
        }
        res.end();
        return;
      }

      // Stream the analysis
      const generator = streamSingleLineAnalysis(
        text,
        String(songTitle || ''),
        String(artistName || ''),
        String(genre || ''),
        String(language || '')
      );

      let fullContent = '';
      for await (const event of generator) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        if (event.type === 'chunk') {
          fullContent += event.data;
        }
        if (event.type === 'complete' && trackId) {
          // Save to database
          try {
            const analysis = JSON.parse(event.data);
            await storage.createAiTranslation({
              recognizedTrackId: String(trackId),
              lyricLineId: null,
              originalText: text,
              translation: analysis.translation,
              culturalContext: analysis.culturalContext,
              artistIntent: analysis.artistIntent,
              deeperMeaning: analysis.deeperMeaning,
              languageNotes: analysis.languageNotes || null,
              detectedLanguage: analysis.detectedLanguage,
              slangTerms: analysis.slangTerms ? JSON.stringify(analysis.slangTerms) : null,
              textHash,
            });
            console.log(`💾 [STREAM] Saved streaming analysis to database`);
          } catch (saveError) {
            console.error(`⚠️ [STREAM] Could not save analysis:`, saveError);
          }
        }
      }
      
      res.end();
    } catch (error) {
      console.error('❌ [STREAM] Error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', data: 'Failed to stream analysis' })}\n\n`);
      res.end();
    }
  });

  // Contribute lyrics for a recognized track and generate AI analysis
  app.post("/api/recognized-tracks/:id/contribute-lyrics", async (req, res) => {
    try {
      const trackId = req.params.id;
      const { lyrics, language } = req.body;

      if (!lyrics || lyrics.trim().length < 20) {
        return res.status(400).json({ error: 'Please provide at least 20 characters of lyrics' });
      }

      const track = await storage.getRecognizedTrackById(trackId);
      if (!track) {
        return res.status(404).json({ error: 'Track not found' });
      }

      console.log(`📝 [CONTRIBUTE] User contributing lyrics for "${track.title}" by ${track.artist}`);

      // Store the contributed lyrics
      const lyricsText = lyrics.trim();
      const lyricsLanguage = language || 'en';
      
      const contentHash = crypto
        .createHash('sha256')
        .update(lyricsText)
        .digest('hex');

      await storage.createTransientLyrics({
        recognizedTrackId: trackId,
        fullLyrics: lyricsText,
        language: lyricsLanguage,
        contentHash,
        source: 'user_contributed',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // Update track status
      await storage.updateRecognizedTrack(trackId, {
        lyricsStatus: 'completed',
        analysisStatus: 'generating_analysis',
      });

      // Return immediately - analysis will happen in background
      res.json({
        success: true,
        message: 'Lyrics received. Generating cultural analysis...',
      });

      // Generate AI analysis in background with progressive saving
      (async () => {
        try {
          if (!isAiConfigured()) {
            await storage.updateRecognizedTrack(trackId, {
              analysisStatus: 'failed',
              processingCompletedAt: new Date(),
            });
            console.log(`⚠️ [CONTRIBUTE] Skipped deeper analysis for "${track.title}" - no AI provider configured`);
            return;
          }

          const lines = lyricsText.split('\n').filter((line: string) => line.trim());
          const lyricsData = lines.map((text: string, idx: number) => ({
            text,
            lineNumber: idx + 1,
          }));

          const onBatchComplete = async (batchResults: any[], startIndex: number, originalLines: string[]) => {
            await Promise.all(batchResults.map(async (analysis, i) => {
              const lineText = originalLines[i];
              if (!lineText) return;

              const textHash = crypto
                .createHash('sha256')
                .update(lineText)
                .digest('hex');

              return storage.createAiTranslation({
                recognizedTrackId: trackId,
                lyricLineId: null,
                originalText: lineText,
                translation: analysis.translation,
                culturalContext: analysis.culturalContext,
                artistIntent: analysis.artistIntent,
                deeperMeaning: analysis.deeperMeaning,
                languageNotes: analysis.languageNotes || null,
                detectedLanguage: analysis.detectedLanguage,
                slangTerms: analysis.slangTerms ? JSON.stringify(analysis.slangTerms) : null,
                textHash,
              });
            }));
            console.log(`📝 [CONTRIBUTE] Saved batch (${batchResults.length} lines)`);
          };

          const batchResults = await generateBatchCulturalAnalysis(
            lyricsData,
            track.title,
            track.artist,
            track.genre || undefined,
            lyricsLanguage,
            onBatchComplete
          );

          await storage.updateRecognizedTrack(trackId, {
            analysisStatus: batchResults.length > 0 ? 'completed' : 'failed',
            processingCompletedAt: new Date(),
          });

          if (batchResults.length > 0) {
            console.log(`✅ [CONTRIBUTE] Analysis complete for "${track.title}"`);
          } else {
            console.warn(`⚠️ [CONTRIBUTE] Analysis returned no results for "${track.title}"`);
          }
        } catch (error: any) {
          console.error('❌ [CONTRIBUTE] Analysis failed:', error.message);
          await storage.updateRecognizedTrack(trackId, {
            analysisStatus: 'failed',
          });
        }
      })();

    } catch (error: any) {
      console.error('Error contributing lyrics:', error);
      res.status(500).json({ error: 'Failed to process lyrics' });
    }
  });

  // Community Lyrics routes
  // Submit community lyrics
  app.post("/api/community-lyrics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required to contribute lyrics" });
    }

    try {
      const userId = getUserId(req)!;
      const { songTitle, songArtist, fullLyrics, language, languageName, recognizedTrackId } = req.body;

      if (!songTitle || !songArtist || !fullLyrics || !language || !languageName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Create community lyrics submission
      const submission = await storage.createCommunityLyrics({
        userId,
        songTitle,
        songArtist,
        fullLyrics,
        language,
        languageName,
        recognizedTrackId: recognizedTrackId || null,
      });

      // Award initial points for submission
      await storage.updateUserRewards(userId, { 
        pointsToAdd: 10,
        lyricsContributed: 1,
      });

      res.status(201).json({
        success: true,
        submission,
        pointsEarned: 10,
        message: "Lyrics submitted successfully. Pending community review.",
      });
    } catch (error: any) {
      console.error("Error submitting community lyrics:", error);
      res.status(500).json({ error: "Failed to submit lyrics" });
    }
  });

  // Get user's contribution history
  app.get("/api/user/contributions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = getUserId(req)!;
      const contributions = await storage.getCommunityLyricsByUserId(userId);
      res.json(contributions);
    } catch (error) {
      console.error("Error fetching contributions:", error);
      res.status(500).json({ error: "Failed to fetch contributions" });
    }
  });

  // Get user rewards/points
  app.get("/api/user/rewards", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = getUserId(req)!;
      const rewards = await storage.getUserRewards(userId);
      res.json(rewards || {
        totalPoints: 0,
        lyricsContributed: 0,
        lyricsApproved: 0,
        votesReceived: 0,
        level: 1,
      });
    } catch (error) {
      console.error("Error fetching rewards:", error);
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  // Vote on community lyrics
  app.post("/api/community-lyrics/:id/vote", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required to vote" });
    }

    try {
      const userId = getUserId(req)!;
      const { voteType } = req.body;

      if (!voteType || !['upvote', 'downvote'].includes(voteType)) {
        return res.status(400).json({ error: "Invalid vote type" });
      }

      const result = await storage.voteOnCommunityLyrics(userId, req.params.id, voteType);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error voting on lyrics:", error);
      if (error.code === "23505") {
        return res.status(400).json({ error: "You've already voted on this submission" });
      }
      res.status(500).json({ error: "Failed to submit vote" });
    }
  });

  // Favorites routes
  // Get user favorites
  app.get("/api/favorites", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = getUserId(req)!;
      const favoriteSongs = await storage.getFavoritesBySongId(userId);
      res.json(favoriteSongs);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  // Check if song is favorited
  app.get("/api/favorites/:songId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ isFavorited: false });
    }

    try {
      const userId = getUserId(req)!;
      const isFavorited = await storage.isSongFavorited(userId, req.params.songId);
      res.json({ isFavorited });
    } catch (error) {
      console.error("Error checking favorite status:", error);
      res.status(500).json({ error: "Failed to check favorite status" });
    }
  });

  // Add favorite
  app.post("/api/favorites/:songId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = getUserId(req)!;
      const favorite = await storage.addFavorite(userId, req.params.songId);
      res.status(201).json(favorite);
    } catch (error: any) {
      console.error("Error adding favorite:", error);
      if (error.code === "23505") { // Unique violation
        return res.status(400).json({ error: "Song already favorited" });
      }
      res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  // Remove favorite
  app.delete("/api/favorites/:songId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = getUserId(req)!;
      const success = await storage.removeFavorite(userId, req.params.songId);
      if (!success) {
        return res.status(404).json({ error: "Favorite not found" });
      }
      res.json({ message: "Favorite removed" });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  // Get user translation history
  app.get("/api/user/translations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = getUserId(req)!;
      const translations = await storage.getUserLyricTranslationsByUserId(userId);
      res.json(translations);
    } catch (error) {
      console.error("Error fetching translation history:", error);
      res.status(500).json({ error: "Failed to fetch translation history" });
    }
  });

  // Get all songs
  app.get("/api/songs", async (req, res) => {
    try {
      const songs = await storage.getAllSongs();
      res.json(songs);
    } catch (error) {
      console.error("Error fetching songs:", error);
      res.status(500).json({ error: "Failed to fetch songs" });
    }
  });

  // Get song by ID
  app.get("/api/songs/:id", async (req, res) => {
    try {
      const song = await storage.getSongById(req.params.id);
      if (!song) {
        return res.status(404).json({ error: "Song not found" });
      }
      res.json(song);
    } catch (error) {
      console.error("Error fetching song:", error);
      res.status(500).json({ error: "Failed to fetch song" });
    }
  });

  // Export song with lyrics and translations
  app.get("/api/songs/:id/export/:format", async (req, res) => {
    try {
      const { id, format } = req.params;
      
      // Validate format
      if (!["json", "text", "markdown"].includes(format)) {
        return res.status(400).json({ error: "Invalid export format. Use: json, text, or markdown" });
      }

      // Get song and lyrics
      const song = await storage.getSongById(id);
      if (!song) {
        return res.status(404).json({ error: "Song not found" });
      }

      // Copyright safety: Only allow export for songs where lyrics storage is allowed
      // This prevents exporting copyrighted content that should only be translated on-demand
      if (!song.lyricsStorageAllowed || song.userGeneratedMode) {
        return res.status(403).json({ 
          error: "Export not allowed for this song. Lyrics can only be viewed on-demand for copyright compliance." 
        });
      }

      const lyrics = await storage.getLyricLinesBySongId(id);

      // Generate export
      const exportData = { song, lyrics };
      let content: string;
      let contentType: string;
      let filename: string;

      switch (format) {
        case "json":
          content = ExportService.exportAsJSON(exportData);
          contentType = "application/json";
          filename = `${song.title.replace(/[^a-z0-9]/gi, "_")}_lyrics.json`;
          break;
        case "text":
          content = ExportService.exportAsText(exportData);
          contentType = "text/plain";
          filename = `${song.title.replace(/[^a-z0-9]/gi, "_")}_lyrics.txt`;
          break;
        case "markdown":
          content = ExportService.exportAsMarkdown(exportData);
          contentType = "text/markdown";
          filename = `${song.title.replace(/[^a-z0-9]/gi, "_")}_lyrics.md`;
          break;
        default:
          return res.status(400).json({ error: "Invalid format" });
      }

      // Set headers for download
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      console.error("Error exporting song:", error);
      res.status(500).json({ error: "Failed to export song" });
    }
  });

  // Create a new song
  app.post("/api/songs", async (req, res) => {
    try {
      const validatedData = insertSongSchema.parse(req.body);
      const song = await storage.createSong(validatedData);
      res.status(201).json(song);
    } catch (error: any) {
      console.error("Error creating song:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid song data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create song" });
    }
  });

  // Update a song
  app.patch("/api/songs/:id", async (req, res) => {
    try {
      const song = await storage.updateSong(req.params.id, req.body);
      if (!song) {
        return res.status(404).json({ error: "Song not found" });
      }
      res.json(song);
    } catch (error) {
      console.error("Error updating song:", error);
      res.status(500).json({ error: "Failed to update song" });
    }
  });

  // Delete a song
  app.delete("/api/songs/:id", async (req, res) => {
    try {
      const success = await storage.deleteSong(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Song not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting song:", error);
      res.status(500).json({ error: "Failed to delete song" });
    }
  });

  // Get lyric lines for a song
  app.get("/api/lyrics/:songId", async (req, res) => {
    try {
      const lyricLines = await storage.getLyricLinesBySongId(req.params.songId);
      res.json(lyricLines);
    } catch (error) {
      console.error("Error fetching lyric lines:", error);
      res.status(500).json({ error: "Failed to fetch lyric lines" });
    }
  });

  // Create a lyric line
  app.post("/api/lyrics", async (req, res) => {
    try {
      const validatedData = insertLyricLineSchema.parse(req.body);
      const lyricLine = await storage.createLyricLine(validatedData);
      res.status(201).json(lyricLine);
    } catch (error: any) {
      console.error("Error creating lyric line:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid lyric line data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create lyric line" });
    }
  });

  // Generate meaning for a lyric line
  app.post("/api/lyrics/generate-meaning", async (req, res) => {
    try {
      if (!isAiConfigured()) {
        return res.status(503).json({
          error: getAiUnavailableMessage("Lyric meaning"),
          status: "unavailable",
        });
      }

      const validatedData = generateMeaningRequestSchema.parse(req.body);
      const { lyricLineId, language } = validatedData;

      const lyricLine = await storage.getLyricLineById(lyricLineId);
      if (!lyricLine) {
        return res.status(404).json({ error: "Lyric line not found" });
      }

      const song = await storage.getSongById(lyricLine.songId);
      if (!song) {
        return res.status(404).json({ error: "Song not found" });
      }

      // Generate translation and cultural meaning using OpenAI
      const result = await generateLyricTranslation(
        lyricLine.text,
        language,
        song.languageName
      );

      // Update the lyric line with the generated content
      const updatedLine = await storage.updateLyricLine(lyricLineId, {
        translation: result.translation,
        culturalMeaning: result.culturalMeaning,
      });

      res.json(updatedLine);
    } catch (error: any) {
      console.error("Error generating meaning:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to generate meaning" });
    }
  });

  // Generate meaning for user-submitted lyric
  app.post("/api/lyrics/generate-user-meaning", async (req, res) => {
    // Require authentication to track translation history
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      if (!isAiConfigured()) {
        return res.status(503).json({
          error: getAiUnavailableMessage("Lyric meaning"),
          status: "unavailable",
        });
      }

      const validatedData = generateUserLyricMeaningRequestSchema.parse(req.body);
      const { lyricText, language, languageName, songId } = validatedData;
      const userId = getUserId(req)!;

      // Generate translation and cultural meaning using OpenAI
      const result = await generateLyricTranslation(
        lyricText,
        language,
        languageName
      );

      // Store the user lyric translation with userId for history tracking
      await storage.createUserLyricTranslation({
        userId,
        songId: songId || null,
        lyricText,
        translation: result.translation,
        culturalMeaning: result.culturalMeaning,
        language,
      });

      // Return only the translation and cultural meaning to the frontend
      res.json({
        translation: result.translation,
        culturalMeaning: result.culturalMeaning,
      });
    } catch (error: any) {
      console.error("Error generating user lyric meaning:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to generate meaning" });
    }
  });

  // Continuation Engine - Get suggested next song
  // Uses confidence-weighted threshold logic:
  // IF emotional confidence >= 0.75 → match by emotion
  // ELSE IF cultural confidence >= 0.6 → match by themes
  // ELSE → match by region
  app.get("/api/continuation/:trackId", async (req, res) => {
    try {
      const { trackId } = req.params;
      const { excludeId } = req.query; // For session-aware deduplication
      
      // Get current track to extract its DNA
      const currentTrack = await storage.getRecognizedTrackById(trackId);
      if (!currentTrack) {
        return res.status(404).json({ error: 'Track not found' });
      }

      // If current track doesn't have DNA yet, return null (no suggestion)
      if (!currentTrack.emotionalTone) {
        return res.json({ suggestion: null, reason: 'Song DNA not yet extracted' });
      }

      // Parse confidence scores (default to 0.5 if not set)
      const emotionalConfidence = parseFloat(currentTrack.emotionalToneConfidence || '0.5');
      const culturalConfidence = parseFloat(currentTrack.culturalThemeConfidence || '0.5');

      // Parse cultural themes from JSON string
      let culturalThemes: string[] = [];
      if (currentTrack.culturalThemes) {
        try {
          culturalThemes = JSON.parse(currentTrack.culturalThemes);
        } catch {
          culturalThemes = [];
        }
      }

      // Minimum threshold check - if DNA extraction failed, show nothing
      // Both confidences below 0.3 means we don't have strong enough signal
      const MINIMUM_THRESHOLD = 0.3;
      if (emotionalConfidence < MINIMUM_THRESHOLD && culturalConfidence < MINIMUM_THRESHOLD) {
        console.log(`🔮 [CONTINUATION] Track ${trackId}: confidence too low (emotional=${emotionalConfidence}, cultural=${culturalConfidence}), no suggestion`);
        return res.json({ suggestion: null, reason: 'Song DNA confidence too low for reliable recommendation' });
      }

      // Determine matching strategy based on confidence thresholds
      let matchStrategy: 'emotional' | 'cultural' | 'regional';
      if (emotionalConfidence >= 0.75) {
        matchStrategy = 'emotional';
      } else if (culturalConfidence >= 0.6) {
        matchStrategy = 'cultural';
      } else {
        matchStrategy = 'regional';
      }

      console.log(`🔮 [CONTINUATION] Track ${trackId}: emotional=${emotionalConfidence}, cultural=${culturalConfidence} → ${matchStrategy}`);

      // Find a continuation track using the confidence-weighted priority logic
      const suggestion = await storage.findContinuationTrack({
        currentTrackId: trackId,
        emotionalTone: matchStrategy === 'emotional' ? currentTrack.emotionalTone || undefined : undefined,
        culturalThemes: matchStrategy === 'cultural' ? culturalThemes : [],
        region: matchStrategy === 'regional' ? currentTrack.region || undefined : undefined,
        excludeId: typeof excludeId === 'string' ? excludeId : undefined,
      });

      if (!suggestion) {
        return res.json({ suggestion: null, reason: 'No similar tracks found' });
      }

      res.json({
        suggestion: {
          id: suggestion.id,
          title: suggestion.title,
          artist: suggestion.artist,
          emotionalTone: suggestion.emotionalTone,
          genre: suggestion.genre,
        },
        matchReason: matchStrategy,
        confidence: matchStrategy === 'emotional' ? emotionalConfidence : culturalConfidence,
      });
    } catch (error: any) {
      console.error('❌ [CONTINUATION] Error:', error.message);
      res.status(500).json({ error: 'Failed to find continuation' });
    }
  });

  // Vote on a lyric line translation
  app.post("/api/lyrics/vote", async (req, res) => {
    try {
      const validatedData = voteRequestSchema.parse(req.body);
      const { lyricLineId, voteType } = validatedData;

      const updatedLine = await storage.voteLyricLine(lyricLineId, voteType);
      if (!updatedLine) {
        return res.status(404).json({ error: "Lyric line not found" });
      }

      res.json(updatedLine);
    } catch (error: any) {
      console.error("Error voting:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid vote data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to record vote" });
    }
  });

  // Get user lyric translations for a song
  app.get("/api/user-lyrics/:songId", async (req, res) => {
    try {
      const translations = await storage.getUserLyricTranslationsBySongId(
        req.params.songId
      );
      res.json(translations);
    } catch (error) {
      console.error("Error fetching user lyric translations:", error);
      res.status(500).json({ error: "Failed to fetch user lyric translations" });
    }
  });

  // Admin: Batch import songs
  app.post("/api/admin/import-songs", async (req, res) => {
    try {
      const { format, data } = req.body;
      
      if (!format || !data) {
        return res.status(400).json({ error: "Format and data are required" });
      }

      const validLicenses = ["public_domain", "cc0", "cc_by", "cc_by_sa"];
      let songsToImport: any[] = [];
      const errors: string[] = [];

      // Parse data based on format
      if (format === "json") {
        try {
          songsToImport = JSON.parse(data);
          if (!Array.isArray(songsToImport)) {
            songsToImport = [songsToImport];
          }
        } catch (e) {
          return res.status(400).json({ error: "Invalid JSON format" });
        }
      } else if (format === "csv") {
        // Strip UTF-8 BOM if present (common from Excel/Sheets exports)
        // MUST happen before trimming
        let csvText = data;
        if (csvText.charCodeAt(0) === 0xFEFF) {
          csvText = csvText.slice(1);
        }
        csvText = csvText.trim();
        
        // Full CSV parser that handles quotes, commas, and newlines within fields
        const parseCSV = (csvText: string): string[][] => {
          const rows: string[][] = [];
          const row: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                // Escaped quote within quoted field
                current += '"';
                i++; // Skip next quote
              } else {
                // Toggle quote state
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              // Field separator outside quotes
              row.push(current);
              current = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
              // Row separator outside quotes
              if (char === '\r' && nextChar === '\n') {
                i++; // Skip \r in \r\n
              }
              if (current || row.length > 0) {
                row.push(current);
                rows.push([...row]);
                row.length = 0;
                current = '';
              }
            } else {
              current += char;
            }
          }
          
          // Add last field and row
          if (current || row.length > 0) {
            row.push(current);
            rows.push(row);
          }
          
          return rows;
        };

        const rows = parseCSV(csvText);
        if (rows.length < 2) {
          return res.status(400).json({ error: "CSV must have header row and at least one data row" });
        }

        const headers = rows[0].map((h: string) => h.trim());
        
        const songMap = new Map();
        for (let i = 1; i < rows.length; i++) {
          const values = rows[i];
          const row: any = {};
          headers.forEach((h: string, idx: number) => {
            row[h] = (values[idx] || '').trim();
          });

          const songKey = `${row.title}-${row.artist}`;
          if (!songMap.has(songKey)) {
            songMap.set(songKey, {
              title: row.title,
              artist: row.artist,
              language: row.language,
              languageName: row.languageName,
              licenseType: row.licenseType,
              coverImageUrl: row.coverImageUrl || null,
              licenseUrl: row.licenseUrl || null,
              lyricsStorageAllowed: row.licenseType !== 'user_generated',
              userGeneratedMode: false,
              lyrics: []
            });
          }

          if (row.lyricText) {
            songMap.get(songKey).lyrics.push({
              text: row.lyricText,
              startTime: row.startTime || null,
              endTime: row.endTime || null
            });
          }
        }

        songsToImport = Array.from(songMap.values());
      } else {
        return res.status(400).json({ error: "Invalid format. Use 'json' or 'csv'" });
      }

      // Validate and import songs
      let songsImported = 0;
      let lyricsImported = 0;

      for (const songData of songsToImport) {
        try {
          // Validate license type
          if (!validLicenses.includes(songData.licenseType)) {
            errors.push(`Invalid license type for song "${songData.title}": ${songData.licenseType}`);
            continue;
          }

          // Validate required fields
          if (!songData.title || !songData.artist || !songData.language || !songData.languageName) {
            errors.push(`Missing required fields for song "${songData.title || 'unknown'}"`);
            continue;
          }

          // Create song
          const song = await storage.createSong({
            id: songData.id,
            title: songData.title,
            artist: songData.artist,
            language: songData.language,
            languageName: songData.languageName,
            licenseType: songData.licenseType,
            licenseUrl: songData.licenseUrl || null,
            coverArtUrl: songData.coverArtUrl || null,
            lyricsStorageAllowed: songData.lyricsStorageAllowed !== false,
            userGeneratedMode: songData.userGeneratedMode || false,
          });

          songsImported++;

          // Import lyrics if present
          if (songData.lyrics && Array.isArray(songData.lyrics)) {
            for (const lyricData of songData.lyrics) {
              try {
                await storage.createLyricLine({
                  id: lyricData.id,
                  songId: song.id,
                  text: lyricData.text,
                  startTime: lyricData.startTime || null,
                  endTime: lyricData.endTime || null,
                  translation: lyricData.translation || null,
                  culturalMeaning: lyricData.culturalMeaning || null,
                });
                lyricsImported++;
              } catch (e: any) {
                errors.push(`Failed to import lyric for song "${song.title}": ${e.message}`);
              }
            }
          }
        } catch (e: any) {
          errors.push(`Failed to import song "${songData.title || 'unknown'}": ${e.message}`);
        }
      }

      res.json({
        success: errors.length === 0,
        songsImported,
        lyricsImported,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("Error importing songs:", error);
      res.status(500).json({ error: "Failed to import songs" });
    }
  });

  // ========================================
  // Analytics Logging (Anonymous, Fire-and-Forget)
  // ========================================
  app.post("/api/analytics/log", async (req, res) => {
    // Always return success immediately - analytics should never block UI
    res.status(202).json({ ok: true });

    try {
      const { events } = req.body;
      if (!Array.isArray(events) || events.length === 0) return;

      // Batch insert all events
      for (const event of events) {
        if (!event.interactionType || !event.sessionId) continue;

        await storage.logInteraction({
          sessionId: event.sessionId,
          trackId: event.trackId || null,
          confidenceBucket: event.confidenceBucket || null,
          interactionType: event.interactionType,
          isAuto: event.isAuto || false,
          timeSinceRecognition: event.timeSinceRecognition || null,
          dwellTime: event.dwellTime || null,
        });
      }
    } catch (error) {
      // Silent fail - analytics should never cause errors
      console.error("[Analytics] Error logging interaction:", error);
    }
  });

  return httpServer;
}
