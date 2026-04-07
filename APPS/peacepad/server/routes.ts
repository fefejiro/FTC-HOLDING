import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  isSoftAuthenticated,
  getUserId,
  isAuthenticatedEither,
  createDemoPartnership,
  clearGuestCookie,
  resolveGuestIdentity,
  trialEnforcer,
  GUEST_COOKIE_NAME,
} from "./softAuth";
import { createUpgradeFromGuestHandler } from "./guestUpgrade";
import {
  insertMessageSchema,
  insertNoteSchema,
  insertTaskSchema,
  insertChildUpdateSchema,
  insertChildSchema,
  insertPetSchema,
  insertExpenseSchema,
  insertExpenseParticipantSchema,
  insertSettlementSchema,
  insertEventSchema,
  insertCallRecordingSchema,
  insertTherapistSchema,
  insertAuditLogSchema,
  insertFeedbackSchema,
  insertSafetyPlanSchema,
  insertMessageSummarySchema,
  insertListeningSettingsSchema,
  type Partnership,
  type InsertPartnership,
} from "@shared/schema";
import {
  validateSummary,
  detectEmotionalMessage,
  type SummaryValidationInput,
} from "./summaryValidator";
import {
  generatePrepChatCoaching,
  generatePrepChatDraft,
  analyzeDraftTone,
} from "./services/prepChatService";
import {
  mapPreviewToLegacyResponse,
  mapPreviewToPreflight,
  parsePreflightRequest,
  resolveConversationIdFromMetadata,
  type PreviewAnalysisResponse,
} from "./services/preflightContract";

// Build ID - generated once at module load
const BUILD_ID = Date.now().toString();
import {
  setupWebRTCSignaling,
  broadcastNewMessage,
  broadcastMessageDelivered,
  broadcastMessageRead,
  broadcastMessageToneUpdate,
  notifyPartnershipJoin,
  notifyPartnershipDeleted,
  notifyIncomingCall,
  notifyCallAccepted,
  notifyCallerAccepted,
  notifyCallDeclined,
  notifyCallEnded,
  broadcastTaskUpdate,
  broadcastExpenseUpdate,
  broadcastScheduleUpdate,
  broadcastNoteUpdate,
  broadcastSafetyPlanUpdate,
  broadcastProfileUpdate,
  broadcastCalendarConflict,
  broadcastConchSessionCreated,
  broadcastConchSessionJoined,
  broadcastConchStateSync,
  broadcastConchPassed,
  broadcastConchStrikeApplied,
  broadcastConchExtraTimeRequest,
  broadcastConchExtraTimeResponse,
  broadcastConchReaction,
  broadcastAIIntervention,
  broadcastTurnSummary,
  broadcastConchSessionEnded,
  broadcastConchInviteDeclined,
  callEngineV2, // CRITICAL FIX: Import V2 engine to register legacy sessions
} from "./webrtc-signaling";
import OpenAI from "openai";
import { transcribeFromBase64 } from "./whisperService";
import {
  analyzeEmotion,
  generateSessionSummary,
  generateEmotionIntervention,
  generateTurnSummary,
  analyzeConflict,
  analyzeMessageComprehensive,
  generateSuggestedResponse,
  detectLanguage,
} from "./emotionAnalyzer";
import {
  analyzeConchTurn,
  generateTurnSummary as generateConchTurnSummary,
  generateConchSessionSummary,
  type ConchTurnAnalysis,
  type ConchSessionSummary,
} from "./conchContentAnalyzer";
import {
  aiCache,
  isDevMode,
  getMaxTokens,
  logTokenUsage,
  mockToneAnalysis,
  createCacheKey,
  mockCalendarSuggestions,
  calculateConflictEscalationScore,
  generateDeescalationRewrite,
  type CESResult,
} from "./aiHelper";
import { rateLimiters } from "./rateLimiter";
import { sanitizeInput, sanitizeObject } from "./sanitizer";
import { generateICalFromEvents } from "./utils/icalGenerator";
import { seedScheduleTemplates } from "./seedTemplates";
import { seedWeatherActivities, weatherActivitiesSeed } from "./seedWeatherActivities";
import { seedParentingTips, parentingTipsSeed } from "./seedParentingTips";
import { seedMessages } from "./seedMessages";
import { seedAchievements } from "./seedAchievements";
import { testMonitor } from "./testMonitor";
import {
  sendInviteAcceptanceEmail,
  sendNewPartnershipEmail,
  sendNewUserAdminNotification,
  sendPartnershipConnectedEmail,
  sendDataExportEmail,
  sendPartnershipRemovedEmail,
} from "./email";
import { sendPushNotification, getVapidPublicKey } from "./push-notifications";
import { buildBoundaryPrompt } from "./services/aiBoundaries.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  buildParentingTipFallbackCatalog,
  buildWeatherActivityFallbackCatalog,
  getFallbackParentingTips,
  getFallbackWeatherActivities,
  normalizeParentingCategory,
  normalizeWeatherCondition,
} from "./lib/contentFallbacks";
import { findScheduleConflicts, getDisplayEventTitle, normalizeSchedulableEvent } from "@shared/peacepad/scheduling";
import {
  getWebUpdateMetrics,
  parseWebUpdateTelemetryPayload,
  recordWebUpdateTelemetry,
} from "./lib/webUpdateTelemetry";

// Initialize OpenAI with proper error checking
// Prioritize OPENAI_API_KEY (user's own key) over AI_INTEGRATIONS key which may have incorrect values
const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const baseURL = process.env.OPENAI_API_KEY
  ? undefined
  : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

console.log(`[OpenAI Init] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[OpenAI Init] API Key present: ${apiKey ? "YES ✅" : "NO ❌"}`);
console.log(
  `[OpenAI Init] API Key source: ${process.env.OPENAI_API_KEY ? "OPENAI_API_KEY" : process.env.AI_INTEGRATIONS_OPENAI_API_KEY ? "AI_INTEGRATIONS_OPENAI_API_KEY" : "NONE"}`
);
console.log(`[OpenAI Init] Base URL: ${baseURL || "default (api.openai.com)"}`);

if (!apiKey) {
  console.error(
    `[OpenAI Init] ⚠️  WARNING: No OpenAI API key configured! Tone analysis will use mock data.`
  );
  console.error(
    `[OpenAI Init] ⚠️  Set either OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY environment variable.`
  );
}

const openai = new OpenAI({
  apiKey: apiKey || "sk-placeholder-key-for-init-only",
  baseURL: baseURL,
});

function getActionsApiKey(): string {
  const value =
    process.env.PEACEPAD_ACTIONS_API_KEY ||
    process.env.ACTIONS_API_KEY ||
    "";
  return normalizeActionsApiKey(value);
}

function normalizeActionsApiKey(value: string | null | undefined): string {
  const trimmed = (value || "").trim();
  // Accept mistakenly quoted env values (e.g. "abc123" or 'abc123')
  return trimmed.replace(/^['"]+|['"]+$/g, "").trim();
}

function extractActionsApiKey(req: any): string | null {
  const apiKeyHeader = req.get("x-api-key");
  if (typeof apiKeyHeader === "string" && apiKeyHeader.trim()) {
    return normalizeActionsApiKey(apiKeyHeader);
  }

  const authHeader = req.get("authorization");
  if (typeof authHeader === "string") {
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch?.[1]) {
      return normalizeActionsApiKey(bearerMatch[1]);
    }
  }

  return null;
}

// Configure multer for call recordings
const uploadDir = path.join(process.cwd(), "uploads", "recordings");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Configure multer for chat attachments
const chatAttachmentsDir = path.join(process.cwd(), "uploads", "chat");
if (!fs.existsSync(chatAttachmentsDir)) {
  fs.mkdirSync(chatAttachmentsDir, { recursive: true });
}

const chatUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatAttachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const chatUpload = multer({
  storage: chatUploadStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for images, videos, documents
  fileFilter: (req, file, cb) => {
    // Allow images, videos, audio, PDFs, and text documents
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
      "video/ogg",
      "audio/mp3",
      "audio/mpeg",
      "audio/wav",
      "audio/webm",
      "audio/ogg",
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: images, videos, audio, PDFs, documents`));
    }
  },
});

// Configure multer for expense receipts
const receiptsDir = path.join(process.cwd(), "uploads", "receipts");
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

const receiptUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, receiptsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const receiptUpload = multer({
  storage: receiptUploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for receipts (images/PDFs)
  fileFilter: (req, file, cb) => {
    // Only allow images and PDFs for receipts
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed for receipts`));
    }
  },
});

// Configure multer for profile photos
const profilePhotosDir = path.join(process.cwd(), "uploads", "profiles");
if (!fs.existsSync(profilePhotosDir)) {
  fs.mkdirSync(profilePhotosDir, { recursive: true });
}

const profileUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePhotosDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const profileUpload = multer({
  storage: profileUploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profile photos
  fileFilter: (req, file, cb) => {
    // Only allow image files for profile photos
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed for profile photos`));
    }
  },
});

interface UserPreferences {
  personalityType?: string;
  coParentPersonalityType?: string | null;
  isCoParentPersonalityGuessed?: boolean;
  communicationStyle?: string;
  conflictResolutionStyle?: string;
}

const parentingTipFallbackCatalog = buildParentingTipFallbackCatalog(parentingTipsSeed);
const weatherActivityFallbackCatalog = buildWeatherActivityFallbackCatalog(weatherActivitiesSeed);

// Helper function to fetch user preferences including co-parent personality
async function getUserPreferencesWithCoParent(userId: string): Promise<UserPreferences | undefined> {
  const user = await storage.getUser(userId);
  if (!user) return undefined;
  
  const prefs: UserPreferences = {
    personalityType: user.personalityType || undefined,
    communicationStyle: user.communicationStyle || undefined,
    conflictResolutionStyle: user.conflictResolutionStyle || undefined,
  };
  
  // Get co-parent personality from active partnership if available
  if (user.activePartnershipId) {
    const partnership = await storage.getPartnership(user.activePartnershipId);
    if (partnership) {
      const isUser1 = partnership.user1Id === userId;
      
      // Get effective co-parent personality (confirmed > guessed)
      const coParentConfirmed = isUser1 
        ? partnership.user2PersonalityConfirmed 
        : partnership.user1PersonalityConfirmed;
      const coParentGuess = isUser1 
        ? partnership.user2PersonalityGuess 
        : partnership.user1PersonalityGuess;
      
      if (coParentConfirmed) {
        prefs.coParentPersonalityType = coParentConfirmed;
        prefs.isCoParentPersonalityGuessed = false;
      } else if (coParentGuess) {
        prefs.coParentPersonalityType = coParentGuess;
        prefs.isCoParentPersonalityGuessed = true;
      }
    }
  }
  
  return prefs;
}

async function analyzeTone(
  content: string,
  userPrefs?: UserPreferences,
  conversationHistory?: string[]
): Promise<{
  tone: string;
  summary: string;
  emoji: string;
  rewordingSuggestion: string | null;
  manipulationFlags?: string[];
  translationToPlainEnglish?: string;
}> {
  try {
    console.log(`[Tone Analysis] ========== START ==========`);
    console.log(`[Tone Analysis] Content: "${content}"`);
    console.log(`[Tone Analysis] Content length: ${content.length}`);
    if (userPrefs) {
      console.log(`[Tone Analysis] User preferences:`, JSON.stringify(userPrefs));
    }

    // Dev mode protection - return mock response to avoid token usage
    const devMode = isDevMode() && process.env.ALLOW_DEV_AI !== "true";
    console.log(`[Tone Analysis] Dev mode check: ${devMode}`);
    console.log(`[Tone Analysis] NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`[Tone Analysis] ALLOW_DEV_AI: ${process.env.ALLOW_DEV_AI || "not set"}`);

    if (devMode) {
      console.log(`[Tone Analysis] ✓ Using MOCK analysis (dev mode enabled)`);
      const mockResult = mockToneAnalysis(content, userPrefs);
      console.log(`[Tone Analysis] Mock result:`, JSON.stringify(mockResult));
      console.log(`[Tone Analysis] ========== END (MOCK) ==========`);
      return mockResult;
    }

    console.log(`[Tone Analysis] NOT in dev mode, using real OpenAI API...`);

    // Check if API key is configured
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error(`[Tone Analysis] ❌ ERROR: No OpenAI API key available! Cannot call real API.`);
      console.error(
        `[Tone Analysis] Falling back to mock analysis. Set API_KEY environment variable to enable real AI.`
      );
      return mockToneAnalysis(content, userPrefs);
    }

    // Check cache first to reduce duplicate API calls
    const cacheKey = createCacheKey("tone", content + JSON.stringify(userPrefs || {}) + (conversationHistory?.join("|") || ""));
    const cached = aiCache.get<{
      tone: string;
      summary: string;
      emoji: string;
      rewordingSuggestion: string | null;
    }>(cacheKey);

    if (cached) {
      logTokenUsage("analyzeTone", 150, true);
      return cached;
    }
    const maxTokens = getMaxTokens(250); // Increased for multi-language + manipulation detection

    // Build personalized context based on user preferences (Myers-Briggs, communication style)
    let personalizationContext = "";
    if (userPrefs) {
      const parts = [];
      if (userPrefs.personalityType) {
        parts.push(`My Myers-Briggs: ${userPrefs.personalityType}`);
      }
      if (userPrefs.coParentPersonalityType) {
        parts.push(`Co-parent Myers-Briggs: ${userPrefs.coParentPersonalityType}${userPrefs.isCoParentPersonalityGuessed ? " (estimated)" : " (confirmed)"}`);
      }
      if (userPrefs.communicationStyle) {
        parts.push(`Communication style: ${userPrefs.communicationStyle}`);
      }
      if (userPrefs.conflictResolutionStyle) {
        parts.push(`Conflict resolution: ${userPrefs.conflictResolutionStyle}`);
      }
      if (parts.length > 0) {
        personalizationContext = `\n\nUSER PROFILE:\n${parts.join("\n")}\nUse this to provide more accurate tone analysis and personality-tailored suggestions. If both personalities are known, tailor suggestions to bridge communication gaps between different personality types.`;
      }
    }

    // Add conversation history to context if available
    const historyContext = conversationHistory && conversationHistory.length > 0
      ? `\n\nRECENT CONVERSATION HISTORY (for context):\n${conversationHistory.join("\n")}`
      : "";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze tone and suggest a clearer version for a message between people who share responsibilities (co-parents, family members, roommates, etc).
Match the user's language exactly.
Focus on communication clarity — help them be understood, not just calmer.
${buildBoundaryPrompt()}
Respond ONLY with a JSON object.
{
  "tone": "calm|cooperative|neutral|frustrated|defensive|hostile",
  "summary": "2-5 words describing emotion",
  "emoji": "😊|🤝|😐|😤|🛡️|🚨",
  "rewordingSuggestion": "natural, concise clearer alternative",
  "manipulationFlags": []
}`,
        },
        {
          role: "user",
          content: content,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 150,
    });

    const result = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(result);

    const tone = parsed.tone?.toLowerCase() || "neutral";
    const summary = parsed.summary || "Message sent";
    const emoji = parsed.emoji || "😐";
    const rewordingSuggestion =
      typeof parsed.rewordingSuggestion === "string" && parsed.rewordingSuggestion.trim()
        ? parsed.rewordingSuggestion
        : null;
    const manipulationFlags = Array.isArray(parsed.manipulationFlags)
      ? parsed.manipulationFlags
      : [];
    const translationToPlainEnglish = (parsed.translationToPlainEnglish as string) || undefined;

    // Log manipulation detection for monitoring
    if (manipulationFlags.length > 0) {
      console.log(`[Tone Analysis] ⚠️ Manipulation detected: ${manipulationFlags.join(", ")}`);
    }

    const resultData = {
      tone,
      summary,
      emoji,
      rewordingSuggestion,
      manipulationFlags,
      translationToPlainEnglish: (translationToPlainEnglish || undefined) as string | undefined,
    };

    // Cache the result
    aiCache.set(cacheKey, resultData);
    logTokenUsage("analyzeTone", maxTokens, false);

    return resultData;
  } catch (error) {
    console.error("[Tone Analysis] ❌ ========== OPENAI API ERROR ==========");
    console.error("[Tone Analysis] Error type:", error?.constructor?.name || "unknown");
    console.error(
      "[Tone Analysis] Error message:",
      error instanceof Error ? error.message : String(error)
    );
    if (error instanceof Error && error.message.includes("API")) {
      console.error("[Tone Analysis] 🔑 API KEY ISSUE DETECTED - Check OpenAI credentials!");
    }
    console.error(
      "[Tone Analysis] Error stack:",
      error instanceof Error ? error.stack : "no stack"
    );
    console.error("[Tone Analysis] ========== FALLING BACK TO MOCK ANALYSIS ==========");
    // Use pattern matching fallback instead of generic "neutral"
    const mockResult = mockToneAnalysis(content, userPrefs);
    console.error("[Tone Analysis] Returned mock result:", JSON.stringify(mockResult));
    return mockResult;
  }
}

function isExternalPreflightApiEnabled(): boolean {
  const explicitFlag =
    process.env.FEATURE_EXTERNAL_PREFLIGHT_API ??
    process.env.PEACEPAD_EXTERNAL_PREFLIGHT_API ??
    process.env.PEACEPAD_ENABLE_EXTERNAL_PREFLIGHT_API;

  if (typeof explicitFlag === "string" && explicitFlag.trim()) {
    const normalized = explicitFlag.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
  }

  return process.env.NODE_ENV !== "production";
}

async function buildMessagePreviewPayload(
  userId: string | undefined,
  content: string,
  conversationId?: string,
): Promise<PreviewAnalysisResponse> {
  // Fetch user preferences including co-parent personality for personalized AI analysis
  const userPrefs = userId ? await getUserPreferencesWithCoParent(userId) : undefined;

  // Get recent conversation history for context (for both tone and CES analysis)
  let conversationHistory: string[] | undefined;
  let conversationHistoryFull: Array<{
    content: string;
    senderId: string;
    createdAt: string | Date;
    tone?: string | null;
  }> = [];

  if (conversationId && userId) {
    const messages = await storage.getMessagesByUser(userId);
    const convMessages = messages.filter((m) => m.conversationId === conversationId).slice(-10); // CES trajectory

    conversationHistory = convMessages.map((m) => m.content);
    conversationHistoryFull = convMessages.map((m) => ({
      content: m.content,
      senderId: m.senderId,
      createdAt: m.createdAt,
      tone: m.tone,
    }));
  }

  // Run tone analysis
  const {
    tone,
    summary,
    emoji,
    rewordingSuggestion,
    manipulationFlags,
    translationToPlainEnglish,
  } = await analyzeTone(content, userPrefs, conversationHistory);

  // Calculate Conflict Escalation Score (CES)
  let cesResult: CESResult | null = null;
  let deescalationSuggestion: string | null = null;

  const cesActorId = userId || "external-api";
  if (cesActorId) {
    cesResult = calculateConflictEscalationScore(content, conversationHistoryFull, cesActorId);

    // Generate de-escalation rewrite if intervention needed
    if (cesResult.interventionLevel !== "none") {
      deescalationSuggestion = generateDeescalationRewrite(
        content,
        cesResult.score,
        cesResult.signals,
        userPrefs
          ? {
              personalityType: userPrefs.personalityType,
              coParentPersonalityType: userPrefs.coParentPersonalityType,
            }
          : undefined,
      );
    }
  }

  return {
    tone,
    summary,
    emoji,
    rewordingSuggestion,
    manipulationFlags,
    translationToPlainEnglish,
    originalMessage: content,
    ces: cesResult
      ? {
          score: cesResult.score,
          state: cesResult.state,
          phase: cesResult.phase,
          interventionLevel: cesResult.interventionLevel,
          trajectory: cesResult.trajectory,
          signals: cesResult.signals,
          suggestedActions: cesResult.suggestedActions,
          pauseRecommended: cesResult.pauseRecommended,
          pauseDuration: cesResult.pauseDuration,
          childImpactReminder: cesResult.childImpactReminder,
          deescalationSuggestion,
        }
      : null,
  };
}

async function getTranscribedText(filePath: string): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "whisper-1",
  });
  return transcription.text;
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  const upgradeFromGuestHandler = createUpgradeFromGuestHandler({
    storage,
    resolveGuestIdentity,
    clearGuestCookie,
  });

  // Track active users after auth middleware (so req.user is populated)
  app.use((req: any, res, next) => {
    if (req.user?.claims?.sub) {
      testMonitor.trackActiveUser(req.user.claims.sub);
    }
    next();
  });

  // Enforce guest trial expiry on write operations without affecting authenticated users.
  app.use("/api", trialEnforcer);

  // PHASE 2: Disabled for MVP refocus. Re-enable these route families when ready to reintroduce them.
  const phase2DisabledPrefixes = [
    "/api/expenses",
    "/api/settlements",
    "/api/tasks",
    "/api/child-updates",
    "/api/children",
    "/api/conch-sessions",
    "/api/calls",
    "/api/scheduled-calls",
    "/api/summaries",
    "/api/achievements",
    "/api/user-stats",
    "/api/parenting-tips",
    "/api/therapists",
    "/api/support-resources",
  ];

  // Removed from the MVP surface entirely.
  const removedPrefixes = [
    "/api/shopping-lists",
    "/api/shopping-items",
    "/api/pets",
    "/api/weather-activities",
  ];

  app.use((req, res, next) => {
    const requestPath = String(req.originalUrl || req.path || "").split("?")[0];

    if (removedPrefixes.some((prefix) => requestPath.startsWith(prefix))) {
      return res.status(410).json({
        message: "This endpoint has been removed from the current PeacePad MVP.",
      });
    }

    if (phase2DisabledPrefixes.some((prefix) => requestPath.startsWith(prefix))) {
      return res.status(404).json({
        message: "This feature is disabled in the PeacePad MVP refocus.",
      });
    }

    if (requestPath.startsWith("/api/events")) {
      const isReadOnlyEventsRoute =
        req.method === "GET" &&
        (requestPath === "/api/events" || /^\/api\/events\/?$/.test(requestPath));

      if (!isReadOnlyEventsRoute) {
        return res.status(404).json({
          message: "Calendar editing is disabled in the PeacePad MVP.",
        });
      }
    }

    next();
  });

  // Geocoding routes moved to comprehensive route below (line ~6740)

  app.get("/api/geocode/reverse", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      // Use zoom=18 for more detailed address data
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PeacePad/1.0 (peacepad@peacepad.ca)'
        }
      });

      if (!response.ok) throw new Error('Nominatim reverse request failed');
      const data = await response.json();
      const addr = data.address || {};

      // Priority for locality: prefer specific local areas over large city names
      // For Canadian addresses, this helps show "Ajax" instead of "Toronto"
      const locality = addr.suburb || addr.neighbourhood || addr.municipality || 
                       addr.city_district || addr.town || addr.village || 
                       addr.hamlet || addr.city;
      
      // Get county/region for context (like "Durham Regional Municipality")
      const county = addr.county || addr.region;
      
      // Build a more precise display name
      // Prefer: "Ajax, Durham Regional Municipality, Ontario" over "Toronto, Ontario"
      const displayParts = [];
      if (locality) displayParts.push(locality);
      if (county && county !== locality) displayParts.push(county);
      if (addr.state || addr.province) displayParts.push(addr.state || addr.province);
      if (addr.country) displayParts.push(addr.country);
      
      const preciseDisplayName = displayParts.length > 0 
        ? displayParts.join(', ') 
        : data.display_name;

      console.log(`[Geocode] Reverse: (${lat}, ${lng}) -> ${preciseDisplayName}`);

      res.json({
        displayName: preciseDisplayName,
        address: data.display_name, // Full address for reference
        city: locality,
        county: county,
        state: addr.state || addr.province,
        country: addr.country,
        countryCode: addr.country_code?.toUpperCase(),
        postalCode: addr.postcode
      });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({ error: "Failed to reverse geocode" });
    }
  });

  // IP-based geolocation fallback (uses client's real IP)
  app.get("/api/geocode/ip", async (req, res) => {
    try {
      // Get client's real IP from headers (Replit/proxy sets these)
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
                    || (req.headers['x-real-ip'] as string)
                    || req.socket.remoteAddress
                    || '';
      
      console.log(`[IP Geolocation] Client IP: ${clientIp}`);
      
      // Use ip-api.com (free, no API key required, 45 requests/minute)
      const ipApiUrl = `http://ip-api.com/json/${clientIp}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone`;
      const response = await fetch(ipApiUrl);
      
      if (!response.ok) throw new Error('IP geolocation request failed');
      const data = await response.json();
      
      if (data.status === 'fail') {
        console.log(`[IP Geolocation] Failed: ${data.message}`);
        return res.status(404).json({ error: data.message || "Could not determine location from IP" });
      }
      
      const displayName = data.city 
        ? `${data.city}, ${data.regionName || data.region}, ${data.country}`
        : `${data.regionName || data.region}, ${data.country}`;
      
      console.log(`[IP Geolocation] Found: ${displayName} (${data.lat}, ${data.lon})`);
      
      res.json({
        lat: data.lat,
        lng: data.lon,
        displayName,
        city: data.city,
        state: data.regionName || data.region,
        country: data.country,
        countryCode: data.countryCode,
        timezone: data.timezone,
      });
    } catch (error) {
      console.error('[IP Geolocation] Error:', error);
      res.status(500).json({ error: "Failed to geolocate IP" });
    }
  });

  // AI-enhanced location refinement endpoint
  app.post("/api/location/ai-enhance", isAuthenticatedEither, async (req: any, res) => {
    try {
      const { location } = req.body;
      
      if (!location || !location.lat || !location.lng) {
        return res.status(400).json({ error: "Invalid location data" });
      }

      // Use AI to enhance/validate location data
      const prompt = `Given this location data, provide a refined and validated location response.

Input location:
- Display name: ${location.displayName || "Unknown"}
- City: ${location.city || "Unknown"}
- State/Province: ${location.state || "Unknown"}
- Country: ${location.country || "Unknown"}
- Coordinates: ${location.lat}, ${location.lng}

Tasks:
1. Validate the location makes sense geographically
2. If the city/state/country seem incorrect for the coordinates, provide corrected values
3. Create a clean, user-friendly display name
4. Determine the country code (2-letter ISO)
5. For Canadian locations, include the province abbreviation

Respond ONLY with valid JSON (no markdown):
{
  "displayName": "Clean, formatted location name",
  "city": "City name",
  "state": "State or Province",
  "country": "Country name",
  "countryCode": "XX",
  "isValid": true/false,
  "confidence": 0.0-1.0
}`;

      const openai = (await import("openai")).default;
      const client = new openai();
      
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a precise location data validator. Always respond with valid JSON only, no markdown formatting." },
          { role: "user", content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.1,
      });

      const responseText = completion.choices[0]?.message?.content?.trim() || "";
      
      // Parse JSON response
      let enhanced;
      try {
        // Remove any markdown code blocks if present
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        enhanced = JSON.parse(cleanJson);
      } catch (parseError) {
        console.log("[AI Location] Failed to parse response, returning original:", responseText);
        return res.json(location);
      }

      console.log(`[AI Location] Enhanced: ${location.displayName} -> ${enhanced.displayName}`);

      res.json({
        ...location,
        displayName: enhanced.displayName || location.displayName,
        city: enhanced.city || location.city,
        state: enhanced.state || location.state,
        country: enhanced.country || location.country,
        countryCode: enhanced.countryCode || location.countryCode,
        aiConfidence: enhanced.confidence,
      });
    } catch (error) {
      console.error("[AI Location] Error:", error);
      // Return original location on error
      res.json(req.body.location || {});
    }
  });

  // Whisper transcription endpoint
  app.post("/api/openai/transcribe", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const transcription = await getTranscribedText(req.file.path);

      // Cleanup uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ text: transcription });
    } catch (error) {
      console.error("[Transcription Error]:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  // Sitemap.xml - Dynamic XML sitemap for search engines
  app.get("/sitemap.xml", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <!-- Homepage - Highest Priority -->
  <url>
    <loc>https://peacepad.ca/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Help & Support Page -->
  <url>
    <loc>https://peacepad.ca/help</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Find Support / Therapist Directory -->
  <url>
    <loc>https://peacepad.ca/therapist-directory</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Resources Page -->
  <url>
    <loc>https://peacepad.ca/resources</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Feature Landing Pages -->
  <url>
    <loc>https://peacepad.ca/features/messaging</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://peacepad.ca/features/calendar</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://peacepad.ca/features/expenses</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://peacepad.ca/features/support</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://peacepad.ca/features/conch-mode</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Legal Pages -->
  <url>
    <loc>https://peacepad.ca/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://peacepad.ca/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(sitemapXml);
  });

  // Robots.txt - Search engine directives
  app.get("/robots.txt", (req, res) => {
    const robotsTxt = `# PeacePad Robots.txt
# https://peacepad.ca

User-agent: *
Allow: /

# Allow search engines to crawl public pages
Allow: /help
Allow: /resources
Allow: /therapist-directory
Allow: /features/
Allow: /privacy
Allow: /terms

# Disallow authenticated/private user pages
Disallow: /chat
Disallow: /onboarding
Disallow: /join-partnership
Disallow: /settings
Disallow: /call-preferences
Disallow: /calls
Disallow: /join-call
Disallow: /scheduling
Disallow: /tasks
Disallow: /expenses
Disallow: /notes
Disallow: /child-updates
Disallow: /pets
Disallow: /parenting-tips
Disallow: /weather-activities
Disallow: /storybook-creator
Disallow: /shopping-list
Disallow: /conch-mode
Disallow: /dashboard
Disallow: /admin
Disallow: /api/

# Sitemap location
Sitemap: https://peacepad.ca/sitemap.xml

# Crawl-delay for polite crawling
Crawl-delay: 1
`;

    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(robotsTxt);
  });

  // Build version endpoint (public, no auth required)
  app.get("/api/version", (req, res) => {
    res.json({ buildId: BUILD_ID });
  });

  // Get WebRTC ICE servers (TURN/STUN) for reliable mobile connections
  // SECURITY: Requires authentication to prevent TURN credential abuse
  app.get("/api/webrtc/ice-servers", isAuthenticatedEither, async (req: any, res) => {
    try {
      // Always include STUN servers as baseline
      const iceServers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ];

      // Option 1: Simple TURN server configuration (for free/self-hosted TURN)
      const turnUrl = process.env.VITE_TURN_URL;
      const turnUser = process.env.VITE_TURN_USER;
      const turnPass = process.env.VITE_TURN_PASS;

      if (turnUrl && turnUser && turnPass) {
        iceServers.push({
          urls: turnUrl,
          username: turnUser,
          credential: turnPass,
        } as any); // RTCIceServer supports username/credential but TS definition may be incomplete
        console.log(
          "[WebRTC] Using configured TURN server (total ICE servers:",
          iceServers.length,
          ")"
        );
      } else {
        // Option 2: Twilio TURN (if simple TURN not configured)
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

        if (twilioAccountSid && twilioAuthToken) {
          try {
            // Fetch Twilio ICE servers (includes TURN)
            const response = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Tokens.json`,
              {
                method: "POST",
                headers: {
                  Authorization:
                    "Basic " +
                    Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64"),
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.ice_servers) {
                iceServers.push(...data.ice_servers);
                console.log(
                  "[WebRTC] Successfully fetched Twilio TURN credentials (total ICE servers:",
                  iceServers.length,
                  ")"
                );
              }
            } else {
              console.warn("[WebRTC] Failed to fetch Twilio TURN credentials, using STUN only");
            }
          } catch (error) {
            console.error("[WebRTC] Error fetching Twilio TURN credentials:", error);
          }
        } else {
          console.log("[WebRTC] No TURN server configured, using STUN only");
        }
      }

      res.json({ iceServers });
    } catch (error) {
      console.error("[WebRTC] Error getting ICE servers:", error);
      // Fallback to STUN only
      res.json({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
    }
  });

  // Test monitoring endpoints
  app.get("/api/test-monitor/summary", (req, res) => {
    res.json(testMonitor.getSummary());
  });

  app.get("/api/test-monitor/logs", (req, res) => {
    const { priority, category } = req.query;
    let logs = testMonitor.getAllLogs();

    if (priority) {
      logs = logs.filter((l) => l.priority === priority);
    }
    if (category) {
      logs = logs.filter((l) => l.category === category);
    }

    res.json(logs);
  });

  app.post("/api/test-monitor/reset", (req, res) => {
    testMonitor.reset();
    res.json({ message: "Monitor reset successfully" });
  });

  app.post("/api/test-monitor/client-error", (req, res) => {
    const { message, stack, componentStack, priority } = req.body;
    testMonitor.log(priority || "P2", "UI", message, { componentStack }, stack);
    res.json({ logged: true });
  });

  app.post("/api/test-monitor/interaction", (req, res) => {
    testMonitor.trackInteraction(req.body);
    res.json({ logged: true });
  });

  app.post("/api/test-monitor/performance", (req, res) => {
    const { metric, value, details } = req.body;
    testMonitor.trackPerformance(metric, value, details);
    res.json({ logged: true });
  });

  app.post("/api/test-monitor/webrtc-stats", (req, res) => {
    const { callId, metrics } = req.body;

    // Log WebRTC quality metrics
    const summary =
      `Call ${callId}: ${metrics.connectionState || "unknown"} - ` +
      `Packets Lost: ${metrics.inbound?.packetsLost || 0}, ` +
      `Jitter: ${metrics.inbound?.jitter ? (metrics.inbound.jitter * 1000).toFixed(2) + "ms" : "N/A"}, ` +
      `RTT: ${metrics.connection?.currentRoundTripTime ? (metrics.connection.currentRoundTripTime * 1000).toFixed(2) + "ms" : "N/A"}`;

    testMonitor.log("P3", "Performance", summary, metrics);
    res.json({ logged: true });
  });

  app.post("/api/telemetry/web-update", (req, res) => {
    const parsed = parseWebUpdateTelemetryPayload(req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        message: "Invalid web update telemetry payload",
        errors: parsed.errors,
      });
    }

    try {
      recordWebUpdateTelemetry(parsed.payload);
      return res.status(202).json({ accepted: true });
    } catch (error) {
      console.error("[WebUpdateTelemetry] Failed to record event:", error);
      return res.status(500).json({ message: "Failed to record telemetry event" });
    }
  });

  app.get("/api/test-monitor/analysis", (req, res) => {
    const analysis = testMonitor.analyzeIssues();
    const userFlow = testMonitor.getUserFlow();
    const interactions = testMonitor.getInteractions();

    res.json({
      analysis,
      userFlow: userFlow.slice(-20), // Last 20 navigation events
      interactionCount: interactions.length,
      touchEvents: interactions.filter((i: any) => i.type === "touch").length,
    });
  });

  // Test endpoint for admin notification emails
  app.post("/api/test-monitor/test-admin-email", async (req, res) => {
    try {
      const testEmail = process.env.ADMIN_EMAIL || "test@example.com";
      const result = await sendNewUserAdminNotification(
        testEmail,
        "Test Beta User",
        "test-user-id-12345",
        new Date()
      );

      if (result) {
        res.json({
          success: true,
          message: `Test admin notification sent to ${testEmail}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.json({
          success: false,
          message: "ADMIN_EMAIL not configured or email sending failed",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[Test] Error sending test admin email:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ==================== E2E TEST SEEDING ENDPOINTS (Development Only) ====================
  // These endpoints allow Playwright tests to set up required test data like partnerships
  
  app.post("/api/test/seed-partnership", async (req: any, res) => {
    // Only allow in development/test environments
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_SEEDING) {
      return res.status(403).json({ message: "Test seeding not allowed in production" });
    }
    
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      // Check if user already has an active partnership
      const user = await storage.getUser(userId);
      if (user?.activePartnershipId) {
        const existingPartnership = await storage.getPartnership(user.activePartnershipId);
        if (existingPartnership) {
          return res.json({ 
            success: true, 
            message: "Partnership already exists",
            partnershipId: existingPartnership.id,
            alreadyExisted: true
          });
        }
      }
      
      // Create a test partner user
      const testPartnerId = `test-partner-${Date.now()}`;
      const testPartnerResult = await storage.upsertUser({
        id: testPartnerId,
        displayName: "Test Co-Parent",
        email: `test-partner-${Date.now()}@peacepad-test.ca`,
        isGuest: true,
        guestId: `tp${Math.random().toString(36).substring(2, 8)}`,
      });
      
      // Generate invite code for partnership
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create partnership between user and test partner
      const partnership = await storage.createPartnership({
        user1Id: userId,
        user2Id: testPartnerResult.user.id,
        inviteCode: inviteCode as string,
        allowAudio: true as boolean,
        allowVideo: true as boolean,
        allowAiTone: true as boolean,
      } as any);
      
      // Set this as active partnership for both users
      await storage.upsertUser({ ...user, activePartnershipId: partnership.id });
      await storage.upsertUser({ ...testPartnerResult.user, activePartnershipId: partnership.id });
      
      // Create a test conversation for the partnership
      const conversation = await storage.createConversation({
        name: "Test Co-Parent Chat",
        type: "direct",
        createdBy: userId,
      });
      
      // Add both users as participants
      // Using 'as any' to bypass the storage interface method check while preserving functionality
      const storageAny = storage as any;
      if (typeof storageAny.addConversationParticipant === 'function') {
        await storageAny.addConversationParticipant(conversation.id, userId, "member");
        await storageAny.addConversationParticipant(conversation.id, testPartnerResult.user.id, "member");
      }
      
      console.log(`[Test Seeding] Created partnership ${partnership.id} for user ${userId}`);
      
      res.json({
        success: true,
        message: "Test partnership created",
        partnershipId: partnership.id,
        partnerId: testPartnerResult.user.id,
        conversationId: conversation.id,
        alreadyExisted: false
      });
    } catch (error) {
      console.error("[Test Seeding] Error:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to seed partnership" 
      });
    }
  });
  
  app.get("/api/test/check-partnership", async (req: any, res) => {
    // Only allow in development/test environments
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_SEEDING) {
      return res.status(403).json({ message: "Test endpoints not allowed in production" });
    }
    
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "userId query parameter is required" });
      }
      
      const user = await storage.getUser(userId as string);
      if (!user) {
        return res.json({ hasPartnership: false, message: "User not found" });
      }
      
      if (!user.activePartnershipId) {
        return res.json({ hasPartnership: false, message: "No active partnership" });
      }
      
      const partnership = await storage.getPartnership(user.activePartnershipId);
      if (!partnership) {
        return res.json({ hasPartnership: false, message: "Partnership not found" });
      }
      
      res.json({
        hasPartnership: true,
        partnershipId: partnership.id,
        partnerId: partnership.user1Id === userId ? partnership.user2Id : partnership.user1Id
      });
    } catch (error) {
      console.error("[Test Check] Error:", error);
      res.status(500).json({ hasPartnership: false, message: "Error checking partnership" });
    }
  });

  // 🚀 PERFORMANCE: Defer seeding operations to run AFTER server is ready
  // This prevents blocking initial requests and improves cold start time
  // Use setImmediate to run seeds on next event loop tick after server initialization
  setImmediate(() => {
    // Seed schedule templates (non-blocking, deferred)
    seedScheduleTemplates().catch((err) => {
      console.error("Failed to seed schedule templates (will retry on next startup):", err.message);
      testMonitor.log("P3", "Database", "Failed to seed schedule templates", {
        error: err.message,
      });
    });

    // Seed weather activities (non-blocking, deferred)
    seedWeatherActivities().catch((err) => {
      console.error("Failed to seed weather activities (will retry on next startup):", err.message);
      testMonitor.log("P3", "Database", "Failed to seed weather activities", {
        error: err.message,
      });
    });

    // Seed parenting tips (non-blocking, deferred)
    seedParentingTips().catch((err) => {
      console.error("Failed to seed parenting tips (will retry on next startup):", err.message);
      testMonitor.log("P3", "Database", "Failed to seed parenting tips", {
        error: err.message,
      });
    });

    // Seed sample messages with tone spectrum (non-blocking, deferred)
    seedMessages().catch((err) => {
      console.error("Failed to seed sample messages (will retry on next startup):", err.message);
      testMonitor.log("P3", "Database", "Failed to seed sample messages", { error: err.message });
    });

    // Seed gamification achievements (non-blocking, deferred)
    seedAchievements().catch((err) => {
      console.error("Failed to seed achievements (will retry on next startup):", err.message);
      testMonitor.log("P3", "Database", "Failed to seed achievements", { error: err.message });
    });
  });

  app.post("/api/auth/upgrade-from-guest", isAuthenticated, upgradeFromGuestHandler);
  // Backward-compatible alias: treat legacy calls as confirmed.
  app.post("/api/auth/upgrade", isAuthenticated, (req: any, res, next) => {
    req.body = { ...(req.body || {}), confirmUpgrade: true };
    return upgradeFromGuestHandler(req, res, next);
  });

  if (process.env.NODE_ENV !== "production") {
    app.get("/api/debug/cookies", (req: any, res) => {
      const rawCookie = String(req.headers?.cookie || "");
      const cookiePairs = rawCookie
        .split(";")
        .map((entry) => entry.trim())
        .filter(Boolean);
      const guestCookieEntry = cookiePairs.find((entry) => entry.startsWith(`${GUEST_COOKIE_NAME}=`));

      res.json({
        origin: req.headers?.origin || null,
        host: req.headers?.host || null,
        protocol: req.protocol,
        secure: Boolean(req.secure),
        hasGuestCookie: Boolean(guestCookieEntry),
        guestCookie: guestCookieEntry || null,
        hasSessionCookie: cookiePairs.some(
          (entry) => entry.startsWith("peacepad.sid=") || entry.startsWith("connect.sid="),
        ),
        cookies: cookiePairs,
      });
    });
  }

  // Get current authenticated user (supports both Replit Auth and Guest Auth)
  app.get("/api/auth/user", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Non-critical telemetry should never block auth/session restoration.
      try {
        await storage.updateUserActiveDays(userId);
      } catch (error) {
        console.warn("[Auth] Failed to update active days:", error);
      }

      let user = await storage.getUser(userId);

      // Handle restoration if user is deactivated
      if (user && user.isDeactivated) {
        await storage.reactivateUser(userId);
        user.isDeactivated = false;
        user.deletedAt = null;
      }

      // Ensure user has an invite code (for legacy users)
      if (user && !user.inviteCode) {
        try {
          const newCode = await storage.generateInviteCode();
          const result = await storage.upsertUser({
            ...user,
            inviteCode: newCode,
          });
          user = result.user;
        } catch (error) {
          console.warn("[Auth] Failed to backfill invite code:", error);
        }
      }

      // Track last login time, device info, and session count (debounced to once/hour)
      if (user) {
        try {
          const userAgent = req.headers['user-agent'] || null;
          const now = new Date();
          const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
          const hoursSinceLastLogin = lastLogin
            ? (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60)
            : Infinity;
          const isNewSession = hoursSinceLastLogin >= 1;
          await storage.upsertUser({
            ...user,
            lastLoginAt: now,
            lastUserAgent: userAgent,
            sessionCount: isNewSession ? (user.sessionCount ?? 0) + 1 : (user.sessionCount ?? 0),
          });
        } catch (error) {
          console.warn("[Auth] Failed to update last login metadata:", error);
        }
      }

      // Log user action for analytics (login/session check)
      if (user) {
        testMonitor.logUserAction(userId, "user_authenticated", {
          displayName: user.displayName,
        });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      testMonitor.log("P2", "API", "Error fetching user", {
        error: error instanceof Error ? error.message : "Unknown",
      });
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // GET /api/usage/status - Get subscription and usage status
  app.get("/api/usage/status", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const trialDays = 14;
      const trialStartedAt = user.trialStartedAt ? new Date(user.trialStartedAt) : new Date(user.createdAt || Date.now());
      const expiresAt = new Date(trialStartedAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      // Conversion signals (The 3-signal rule)
      const hasMinMessages = (user.totalMessagesSent || 0) >= 10;
      const hasStructuredAction = (user.totalStructuredActions || 0) >= 1;
      const hasMinActiveDays = (user.distinctDaysActive || 0) >= 4;
      
      const isEligibleForPreservation = hasMinMessages && hasStructuredAction && hasMinActiveDays;

      res.json({
        tier: user.subscriptionTier,
        trialExpiresAt: expiresAt,
        daysRemaining,
        isTrialActive: now < expiresAt,
        usage: {
          messages: user.totalMessagesSent,
          actions: user.totalStructuredActions,
          activeDays: user.distinctDaysActive,
        },
        signals: {
          hasMinMessages,
          hasStructuredAction,
          hasMinActiveDays,
          isEligibleForPreservation
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch usage status" });
    }
  });
  app.get("/api/auth/guest-session-info", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.isGuest) {
        return res.json(null);
      }

      // Get the most recent guest session for this user by userId
      const guestSession = await storage.getGuestSessionByUserId(userId);
      if (!guestSession) {
        return res.json(null);
      }

      const now = new Date();
      const expiresAt = new Date(guestSession.expiresAt);
      const msRemaining = expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

      res.json({
        expiresAt: guestSession.expiresAt,
        daysRemaining,
      });
    } catch (error) {
      console.error("Error fetching guest session info:", error);
      res.status(500).json({ message: "Failed to fetch guest session info" });
    }
  });

  // Logout endpoint - clears server-side session
  // NOTE: No auth middleware - logout must work even if session is already invalid/expired
  app.post("/api/auth/logout", async (req: any, res) => {
    try {
      // Always clear the cookie first, regardless of session state
      res.clearCookie("connect.sid", { path: "/" });
      clearGuestCookie(req, res);
      
      if (req.logout) {
        req.logout((err: any) => {
          if (err) {
            console.error("Error during logout:", err);
          }
          if (req.session) {
            req.session.destroy((err: any) => {
              if (err) {
                console.error("Error destroying session:", err);
              }
              res.json({ success: true });
            });
          } else {
            res.json({ success: true });
          }
        });
      } else {
        if (req.session) {
          req.session.destroy((err: any) => {
            if (err) {
              console.error("Error destroying session:", err);
            }
            res.json({ success: true });
          });
        } else {
          res.json({ success: true });
        }
      }
    } catch (error) {
      console.error("Error during logout:", error);
      // Still return success - the goal is to log out, even if cleanup fails
      res.json({ success: true });
    }
  });

  // Get all users (for contact selection) - phone numbers excluded for privacy - supports both auth methods
  app.get("/api/users", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const users = await storage.getAllUsers();
      // Return only basic user info for privacy - NO phone numbers to non-contacts
      const basicUserInfo = users.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        profileImageUrl: u.profileImageUrl,
      }));
      res.json(basicUserInfo);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get specific user by ID (basic info only for assigned tasks, etc.) - supports both auth methods
  app.get("/api/users/:userId", isAuthenticatedEither, async (req: any, res) => {
    try {
      const currentUserId = getUserId(req);
      if (!currentUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { userId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return only basic user info for privacy
      const basicUserInfo = {
        id: user.id,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      };

      res.json(basicUserInfo);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch("/api/user/profile", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const {
        profileImageUrl,
        displayName,
        phoneNumber,
        sharePhoneWithContacts,
        childName,
        relationshipType,
        personalityType,
        activePartnershipId,
      } = req.body;

      const updateData: any = {};
      if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (sharePhoneWithContacts !== undefined)
        updateData.sharePhoneWithContacts = sharePhoneWithContacts;
      if (childName !== undefined) updateData.childName = childName;
      if (relationshipType !== undefined) updateData.relationshipType = relationshipType;
      if (personalityType !== undefined) updateData.personalityType = personalityType;
      if (activePartnershipId !== undefined) updateData.activePartnershipId = activePartnershipId;

      // Check if this is a new user completing onboarding (setting displayName for first time)
      const existingUser = await storage.getUser(userId);
      const isFirstTimeOnboarding = !existingUser?.displayName && displayName;

      const { user: updatedUser } = await storage.upsertUser({
        id: userId,
        ...updateData,
      });

      // Notify co-parent of profile changes (name or photo)
      if (
        (displayName !== undefined || profileImageUrl !== undefined) &&
        existingUser?.activePartnershipId
      ) {
        const changes: { displayName?: string; profileImageUrl?: string } = {};
        if (displayName !== undefined && displayName !== existingUser.displayName) {
          changes.displayName = displayName;
        }
        if (profileImageUrl !== undefined && profileImageUrl !== existingUser.profileImageUrl) {
          changes.profileImageUrl = profileImageUrl;
        }
        if (Object.keys(changes).length > 0) {
          broadcastProfileUpdate(existingUser.activePartnershipId, userId, changes);
        }
      }

      // Send welcome email for new users (not those joining via invite)
      if (isFirstTimeOnboarding && updatedUser.email) {
        const partnerships = await storage.getPartnerships(userId);
        // Only send if they have no partnerships (new account, not invite acceptance)
        if (partnerships.length === 0) {
          sendNewPartnershipEmail(updatedUser.email, updatedUser.displayName || "there").catch(
            (err) => console.error("[Profile Update] Failed to send welcome email:", err)
          );

          // Create demo partnership for authenticated users on first onboarding
          // so they can immediately see sample messages with tone analysis
          createDemoPartnership(userId, "authenticated").catch((err) =>
            console.error("[Profile Update] Failed to create demo partnership:", err)
          );
        }
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update user consent preferences
  app.patch("/api/user/consent", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { privacyAccepted, aiMessageConsent, aiCallConsent, ndaAccepted } = req.body;

      const updateData: any = {};
      if (privacyAccepted !== undefined) updateData.privacyAccepted = privacyAccepted;
      if (aiMessageConsent !== undefined) updateData.aiMessageConsent = aiMessageConsent;
      if (aiCallConsent !== undefined) updateData.aiCallConsent = aiCallConsent;

      // When consent is accepted, mark terms as accepted
      if (privacyAccepted && ndaAccepted) {
        updateData.termsAcceptedAt = new Date();
      }

      const { user: updatedUser } = await storage.upsertUser({
        id: userId,
        ...updateData,
      });

      console.log(`[Consent] User ${userId} consent preferences updated:`, {
        privacyAccepted,
        aiMessageConsent,
        aiCallConsent,
        termsAcceptedAt: updateData.termsAcceptedAt,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating consent:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Export user data (GDPR compliance)
  app.get("/api/user/export", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const exportData = await storage.exportUserData(userId);

      // Send security notification email (async, don't block response)
      const user = await storage.getUser(userId);
      if (user?.email) {
        const userName =
          `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.displayName || "User";
        const ipAddress = req.ip || (req.headers["x-forwarded-for"] as string) || undefined;
        sendDataExportEmail(user.email, userName, new Date(), ipAddress).catch((error) => {
          console.error("[Data Export] Failed to send security notification email:", error);
        });
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="peacepad-data-export-${new Date().toISOString().split("T")[0]}.json"`
      );
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting user data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Delete user account - supports both OAuth and Guest users
  app.delete("/api/user/account", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user is already deactivated (restoration flow)
      const user = await storage.getUser(userId);
      if (user?.isDeactivated) {
        // Hard delete after grace period or if user explicitly requests immediate deletion while deactivated
        await storage.deleteUser(userId);
        req.logout((err: any) => {
          if (req.session) {
            req.session.destroy(() => {
              res.json({ success: true, message: "Account permanently deleted" });
            });
          } else {
            res.json({ success: true, message: "Account permanently deleted" });
          }
        });
        return;
      }

      // Standard flow: Deactivate user and mark for deletion (30-day grace period)
      await storage.deactivateUser(userId);

      // Clear session with proper error handling
      req.logout((err: any) => {
        if (err) {
          console.error("Error logging out during account deletion:", err);
        }

        // Destroy session
        if (req.session) {
          req.session.destroy((sessionErr: any) => {
            if (sessionErr) {
              console.error("Error destroying session during account deletion:", sessionErr);
            }
            // Send success response regardless of logout/session errors
            res.json({ success: true, message: "Account deleted successfully" });
          });
        } else {
          // If no session, just send response
          res.json({ success: true, message: "Account deleted successfully" });
        }
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Accept terms and conditions (including NDA) - supports both auth methods
  app.post("/api/users/accept-terms", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { user: updatedUser } = await storage.upsertUser({
        id: userId,
        termsAcceptedAt: new Date(),
      });

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error accepting terms:", error);
      res.status(500).json({ message: "Failed to accept terms" });
    }
  });

  // Message routes
  app.get("/api/messages", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { recipientId } = req.query;

      // Get all messages for the user
      let messages = await storage.getMessagesByUser(userId);

      // Filter by recipient if provided (for partnership-specific conversations)
      if (recipientId && typeof recipientId === "string") {
        messages = messages.filter(
          (msg) =>
            (msg.senderId === userId && msg.recipientId === recipientId) ||
            (msg.senderId === recipientId && msg.recipientId === userId)
        );
      }

      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // GPT Actions endpoint (stateless auth via API key header).
  // Uses same tone analysis engine as in-app preview but does not require a session cookie.
  app.post("/api/actions/preview-tone", async (req: any, res) => {
    try {
      const configuredApiKey = getActionsApiKey();
      if (!configuredApiKey) {
        return res.status(503).json({
          message: "Actions API key is not configured on the server.",
        });
      }

      const providedApiKey = extractActionsApiKey(req);
      if (!providedApiKey || providedApiKey !== configuredApiKey) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const content =
        typeof req.body?.content === "string"
          ? sanitizeInput(req.body.content).trim()
          : "";

      if (!content) {
        return res.status(400).json({ message: "content is required" });
      }

      let conversationHistory: string[] | undefined;
      if (Array.isArray(req.body?.conversationHistory)) {
        const normalized = req.body.conversationHistory
          .filter((item: unknown): item is string => typeof item === "string")
          .map((item: string) => sanitizeInput(item).trim())
          .filter(Boolean)
          .slice(-10);
        if (normalized.length > 0) {
          conversationHistory = normalized;
        }
      }

      const { tone, summary, emoji, rewordingSuggestion } = await analyzeTone(
        content,
        undefined,
        conversationHistory,
      );

      return res.json({
        tone,
        summary,
        emoji,
        rewordingSuggestion: rewordingSuggestion ?? null,
        originalMessage: content,
      });
    } catch (error) {
      console.error("Error in actions preview-tone:", error);
      return res.status(500).json({ message: "Failed to analyze message tone" });
    }
  });

  // Preview tone analysis without sending (AI-first feature)
  // Enhanced with Conflict Escalation Score (CES) for predictive harm prevention
  app.post("/api/messages/preview", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { content, conversationId } = req.body;

      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Message content is required" });
      }

      const previewPayload = await buildMessagePreviewPayload(
        userId || undefined,
        sanitizeInput(content),
        typeof conversationId === "string" ? conversationId : undefined,
      );

      // Preserve existing route contract for current app clients.
      res.json(mapPreviewToLegacyResponse(previewPayload));
    } catch (error) {
      console.error("Error previewing tone:", error);
      res.status(500).json({ message: "Failed to analyze message tone" });
    }
  });

  // Canonical API wrapper for external integrations (cookie-auth in v1).
  if (isExternalPreflightApiEnabled()) {
    app.post("/api/v1/message/preflight", async (req: any, res) => {
      try {
        const configuredApiKey = getActionsApiKey();
        const providedApiKey = extractActionsApiKey(req);
        const hasValidApiKey =
          Boolean(configuredApiKey) &&
          Boolean(providedApiKey) &&
          providedApiKey === configuredApiKey;

        const userId = getUserId(req);
        if (!userId && !hasValidApiKey) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = parsePreflightRequest(req.body);
        if (!parsed) {
          return res.status(400).json({ message: "text is required" });
        }

        const conversationId = resolveConversationIdFromMetadata(parsed.metadata);

        const previewPayload = await buildMessagePreviewPayload(
          userId || undefined,
          sanitizeInput(parsed.text),
          conversationId,
        );
        const preflight = mapPreviewToPreflight(previewPayload);

        res.json(preflight);
      } catch (error) {
        console.error("Error in preflight API:", error);
        res.status(500).json({ message: "Failed to run message preflight analysis" });
      }
    });
  }

  app.post("/api/messages", isAuthenticatedEither, rateLimiters.messages, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get sessionId for analytics - fallback to userId for OAuth users
      const sessionId = req.user?.sessionId ?? req.session?.sessionId ?? userId;

      let conversationId = req.body.conversationId;
      let recipientId = req.body.recipientId;

      // If conversationId is provided, verify user is a member
      if (conversationId) {
        const members = await storage.getConversationMembers(conversationId);
        const isMember = members.some((m) => m.userId === userId);

        if (!isMember) {
          return res.status(403).json({ message: "You are not a member of this conversation" });
        }
      } else if (recipientId) {
        // Legacy: recipientId provided - find or create direct conversation
        const recipient = await storage.getUser(recipientId);
        if (!recipient) {
          return res.status(400).json({ message: "Invalid recipient" });
        }

        // Find existing direct conversation or create one
        let directConv = await storage.findDirectConversation(userId, recipientId);
        if (!directConv) {
          directConv = await storage.createConversation({
            type: "direct",
            createdBy: userId,
          });
          await storage.addConversationMember({
            conversationId: directConv.id,
            userId: userId,
          });
          await storage.addConversationMember({
            conversationId: directConv.id,
            userId: recipientId,
          });
        }
        conversationId = directConv.id;
      } else {
        return res
          .status(400)
          .json({ message: "Either conversationId or recipientId is required" });
      }

      // Sanitize user input before processing
      const sanitizedBody = {
        ...req.body,
        content: sanitizeInput(req.body.content), // Sanitize message content
      };

      const parsed = insertMessageSchema.parse({
        ...sanitizedBody,
        senderId: userId,
        conversationId,
        recipientId, // Keep for backward compatibility
      });

      // INSTANT DELIVERY: Create message immediately with "analyzing" tone
      // Then analyze tone in background and update via WebSocket
      const message = await storage.createMessage({
        ...parsed,
        tone: "analyzing",
        toneSummary: "Analyzing tone...",
        toneEmoji: null,
        rewordingSuggestion: null,
      });

      // Track usage
      await storage.incrementUserUsage(userId, { messages: 1 });

      // Get sender info for notification + set firstMessageSentAt on first send
      const sender = await storage.getUser(userId);
      if (sender && !sender.firstMessageSentAt) {
        try {
          await storage.upsertUser({ ...sender, firstMessageSentAt: new Date() });
        } catch (err) {
          console.warn("[Messages] Failed to set firstMessageSentAt:", err);
        }
      }

      // Broadcast immediately - no waiting for AI analysis
      await broadcastNewMessage(
        message.id,
        userId,
        sender?.displayName || "Someone",
        parsed.content,
        conversationId
      );

      // Send push notifications immediately (WhatsApp-style)
      const members = await storage.getConversationMembers(conversationId);
      const senderName = sender?.displayName || "Someone";

      for (const member of members) {
        if (member.userId !== userId) {
          await sendPushNotification(member.userId, {
            title: parsed.isUrgent ? `Urgent: ${senderName}` : senderName,
            body: parsed.content.substring(0, 100) + (parsed.content.length > 100 ? "..." : ""),
            channel: 'messages', // High priority for chat messages
            data: {
              url: "/chat",
              conversationId,
              messageId: message.id,
              type: parsed.isUrgent ? "urgent_message" : "message",
            },
          });
        }
      }

      // Return message immediately - user sees it right away
      res.json(message);

      // BACKGROUND: Analyze tone asynchronously (don't await - fire and forget)
      (async () => {
        try {
          // Fetch user preferences for personalized AI analysis
          const userPrefs = await getUserPreferencesWithCoParent(userId);

          // Get recent conversation history for context
          const recentMessages = await storage.getMessagesByUser(userId);
          const conversationHistory = recentMessages
            .filter(m => m.conversationId === conversationId)
            .slice(-5)
            .map(m => m.content);

          const { tone, summary, emoji, rewordingSuggestion } = await analyzeTone(
            parsed.content,
            userPrefs,
            conversationHistory
          );

          // Update message with analyzed tone
          await storage.updateMessageTone(message.id, {
            tone,
            toneSummary: summary,
            toneEmoji: emoji,
            rewordingSuggestion,
          });

          // Broadcast tone update to all conversation members
          await broadcastMessageToneUpdate(message.id, conversationId, {
            tone,
            toneSummary: summary,
            toneEmoji: emoji,
            rewordingSuggestion,
          });

          // Log analytics with actual tone
          testMonitor.logUserAction(userId, "message_sent", {
            conversationId,
            tone,
            messageType: parsed.messageType,
          });

          // Gamification: Track message stats and streaks
          try {
            const partnershipId = undefined;

            await storage.incrementUserStat(userId, "totalMessagesSent", 1, partnershipId);

            if (tone === "calm" || tone === "cooperative") {
              await storage.incrementUserStat(userId, "positiveMessagesSent", 1, partnershipId);
            }

            await storage.incrementStreak(userId, "communication", partnershipId);

            const stats = await storage.getUserStats(userId, partnershipId);
            if (stats) {
              if (stats.totalMessagesSent === 1) {
                await storage.awardAchievement(userId, "first_message", partnershipId);
              }
              if (stats.positiveMessagesSent === 50) {
                await storage.awardAchievement(userId, "positive_communicator", partnershipId);
              }
            }

            const streak = await storage.getStreak(userId, "communication", partnershipId);
            if (streak) {
              if (streak.currentStreak === 3) {
                await storage.awardAchievement(userId, "communication_streak_3", partnershipId);
              } else if (streak.currentStreak === 7) {
                await storage.awardAchievement(userId, "communication_streak_7", partnershipId);
              } else if (streak.currentStreak === 30) {
                await storage.awardAchievement(userId, "communication_streak_30", partnershipId);
              }
            }
          } catch (gamificationError) {
            console.error("[Gamification] Error tracking message stats:", gamificationError);
          }
        } catch (analyzeError) {
          console.error("[Tone Analysis] Background analysis failed:", analyzeError);
          // Update with neutral tone on failure
          await storage.updateMessageTone(message.id, {
            tone: "neutral",
            toneSummary: "Message sent",
            toneEmoji: "😐",
            rewordingSuggestion: null,
          });
          await broadcastMessageToneUpdate(message.id, conversationId, {
            tone: "neutral",
            toneSummary: "Message sent",
            toneEmoji: "😐",
            rewordingSuggestion: null,
          });
        }
      })();
    } catch (error: any) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: error.message || "Failed to create message" });
    }
  });

  // Share-to-chat: Share events, expenses, or tasks in chat for accountability
  app.post(
    "/api/messages/share",
    isAuthenticatedEither,
    rateLimiters.messages,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const { conversationId, itemType, itemId } = req.body;

        // Validate required fields
        if (!conversationId || !itemType || !itemId) {
          return res
            .status(400)
            .json({ message: "conversationId, itemType, and itemId are required" });
        }

        // Validate item type
        if (!["event", "expense", "task"].includes(itemType)) {
          return res.status(400).json({ message: "itemType must be event, expense, or task" });
        }

        // Verify user is a member of the conversation
        const members = await storage.getConversationMembers(conversationId);
        const isMember = members.some((m) => m.userId === userId);
        if (!isMember) {
          return res.status(403).json({ message: "You are not a member of this conversation" });
        }

        // Get user's partnership for validation
        const partnerships = await storage.getPartnerships(userId);
        const partnership = partnerships[0];
        if (!partnership) {
          return res.status(400).json({ message: "No active partnership found" });
        }

        // Fetch and validate the shared item belongs to user's partnership
        let itemSnapshot: {
          title: string;
          subtitle: string;
          metadata: Record<string, any>;
        } | null = null;

        if (itemType === "event") {
          const event = await storage.getEvent(itemId);
          if (!event) {
            return res.status(404).json({ message: "Event not found" });
          }
          // Verify event belongs to user's partnership (events have createdBy which should be in partnership)
          if (event.createdBy !== partnership.user1Id && event.createdBy !== partnership.user2Id) {
            return res.status(403).json({ message: "Event does not belong to your partnership" });
          }
          itemSnapshot = {
            title: event.title,
            subtitle: new Date(event.startDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            metadata: { type: event.type, location: event.location, childName: event.childName },
          };
        } else if (itemType === "expense") {
          const expense = await storage.getExpense(itemId);
          if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
          }
          if (expense.partnershipId !== partnership.id) {
            return res.status(403).json({ message: "Expense does not belong to your partnership" });
          }
          itemSnapshot = {
            title: expense.description,
            subtitle: `$${expense.amount} - ${expense.category}`,
            metadata: { status: expense.status, paidBy: expense.paidBy },
          };
        } else if (itemType === "task") {
          const task = await storage.getTask(itemId);
          if (!task) {
            return res.status(404).json({ message: "Task not found" });
          }
          if (task.partnershipId !== partnership.id) {
            return res.status(403).json({ message: "Task does not belong to your partnership" });
          }
          itemSnapshot = {
            title: task.title,
            subtitle: task.dueDate ? `Due: ${task.dueDate}` : "No due date",
            metadata: { completed: task.completed, assignedTo: task.assignedTo },
          };
        }

        // Create message content as JSON snapshot for fallback
        const contentSnapshot = JSON.stringify({
          type: itemType,
          id: itemId,
          snapshot: itemSnapshot,
        });

        // Create the share message
        const message = await storage.createMessage({
          content: contentSnapshot,
          senderId: userId,
          conversationId,
          messageType: "shared",
          sharedItemType: itemType,
          sharedItemId: itemId,
        });

        // Track usage
        await storage.incrementUserUsage(userId, { messages: 1 });

        // Get sender info for notification
        const sender = await storage.getUser(userId);
        const senderName = sender?.displayName || "Someone";

        // Create notification text based on item type
        const itemTypeLabel = itemType === "event" ? "calendar event" : itemType;
        const notificationText = `Shared a ${itemTypeLabel}: ${itemSnapshot?.title || "Item"}`;

        // Broadcast to conversation members
        await broadcastNewMessage(message.id, userId, senderName, notificationText, conversationId);

        // Send push notifications
        for (const member of members) {
          if (member.userId !== userId) {
            await sendPushNotification(member.userId, {
              title: senderName,
              body: notificationText,
              channel: 'messages', // Messages channel for shared items
              data: {
                url: "/chat",
                conversationId,
                messageId: message.id,
                type: "shared_item",
              },
            });
          }
        }

        res.json({
          ...message,
          sharedItemData: itemSnapshot,
        });
      } catch (error: any) {
        console.error("Error sharing item to chat:", error);
        res.status(400).json({ message: error.message || "Failed to share item" });
      }
    }
  );

  // Mark message as delivered (WhatsApp-style delivery tracking)
  app.patch("/api/messages/:messageId/delivered", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { messageId } = req.params;
      const message = await storage.getMessage(messageId);

      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Only recipient can mark as delivered
      // For conversation-based messages, recipientId may be null - check membership instead
      if (message.senderId === userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (message.recipientId && message.recipientId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (!message.recipientId && message.conversationId) {
        const members = await storage.getConversationMembers(message.conversationId);
        const isMember = members.some((m) => m.userId === userId);
        if (!isMember) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      // Update delivery status
      await storage.updateMessageStatus(messageId, "delivered");

      // Broadcast to sender
      broadcastMessageDelivered(messageId, message.senderId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as delivered:", error);
      res.status(500).json({ message: "Failed to mark message as delivered" });
    }
  });

  // Mark message as read (WhatsApp-style read receipts)
  app.patch("/api/messages/:messageId/read", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { messageId } = req.params;
      const message = await storage.getMessage(messageId);

      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Only recipient can mark as read
      // For conversation-based messages, recipientId may be null - check membership instead
      if (message.senderId === userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (message.recipientId && message.recipientId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (!message.recipientId && message.conversationId) {
        const members = await storage.getConversationMembers(message.conversationId);
        const isMember = members.some((m) => m.userId === userId);
        if (!isMember) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      // Update read status
      await storage.updateMessageStatus(messageId, "read");

      // Broadcast to sender
      broadcastMessageRead(messageId, message.senderId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Chat attachments upload endpoint
  app.post(
    "/api/chat-attachments",
    isAuthenticatedEither,
    rateLimiters.uploads,
    chatUpload.single("file"),
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const file = req.file;

        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const fileUrl = `/uploads/chat/${file.filename}`;
        const messageType = req.body.messageType || "document"; // text, image, audio, video, document
        const duration = req.body.duration || null; // For audio/video

        // Return file information to be used when creating the message
        res.json({
          fileUrl,
          fileName: file.originalname,
          fileSize: file.size.toString(),
          mimeType: file.mimetype,
          duration,
          messageType,
        });
      } catch (error: any) {
        console.error("Error uploading chat attachment:", error);
        res.status(400).json({ message: error.message || "Failed to upload file" });
      }
    }
  );

  // Voice note upload and transcription endpoint
  app.post(
    "/api/voice-notes",
    isAuthenticatedEither,
    rateLimiters.messages,
    chatUpload.single("audio"),
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const file = req.file;

        if (!file) {
          return res.status(400).json({ message: "No audio file uploaded" });
        }

        console.log("[Voice Note] Processing upload:", {
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
        });

        const fileUrl = `/uploads/chat/${file.filename}`;
        const duration = req.body.duration || "0";

        // Transcribe using Whisper API
        let transcript = "";
        let tone = "neutral";
        let toneSummary = "Voice note sent";
        let toneEmoji = "🎤";
        let rewordingSuggestion: string | null = null;

        try {
          console.log("[Voice Note] Starting Whisper transcription...");
          const filePath = path.join(chatAttachmentsDir, file.filename);

          // Create a read stream and send to Whisper
          const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-1",
            language: "en", // Can be removed to auto-detect
          });

          transcript = transcription.text;
          console.log("[Voice Note] Transcription complete:", transcript);

          // Analyze tone of transcript
          if (transcript && transcript !== "[Transcription unavailable]") {
            try {
              console.log("[Voice Note] Analyzing tone of transcript...");

              // Fetch user preferences including co-parent personality for personalized AI analysis
              const userPrefs = await getUserPreferencesWithCoParent(userId);

              const toneAnalysis = await analyzeTone(transcript, userPrefs);
              tone = toneAnalysis.tone;
              toneSummary = toneAnalysis.summary;
              toneEmoji = toneAnalysis.emoji;
              rewordingSuggestion = toneAnalysis.rewordingSuggestion;
              console.log("[Voice Note] Tone analysis complete:", tone);
            } catch (error: any) {
              console.error("[Voice Note] Tone analysis failed:", error);
              // Continue with defaults if tone analysis fails
            }
          }
        } catch (error: any) {
          console.error("[Voice Note] Whisper transcription failed:", error);
          // Continue without transcript if transcription fails
          transcript = "[Transcription unavailable]";
        }

        // Return file information, transcript, and tone analysis
        res.json({
          fileUrl,
          fileName: file.originalname,
          fileSize: file.size.toString(),
          mimeType: file.mimetype,
          duration,
          transcript,
          tone,
          toneSummary,
          toneEmoji,
          rewordingSuggestion,
          messageType: "audio",
        });
      } catch (error: any) {
        console.error("Error processing voice note:", error);
        res.status(400).json({ message: error.message || "Failed to process voice note" });
      }
    }
  );

  // Receipt upload endpoint for expenses - supports both auth methods
  app.post(
    "/api/receipt-upload",
    isAuthenticatedEither,
    rateLimiters.uploads,
    receiptUpload.single("file"),
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const file = req.file;

        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const fileUrl = `/uploads/receipts/${file.filename}`;

        // Return file information to be used when creating the expense
        res.json({
          receiptUrl: fileUrl,
          fileName: file.originalname,
          fileSize: file.size.toString(),
        });
      } catch (error: any) {
        console.error("Error uploading receipt:", error);
        res.status(400).json({ message: error.message || "Failed to upload receipt" });
      }
    }
  );

  // Profile photo upload endpoint - supports both auth methods
  app.post(
    "/api/profile-upload",
    isAuthenticatedEither,
    rateLimiters.uploads,
    profileUpload.single("file"),
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        console.log("[Profile Upload] Starting upload for user:", userId);
        console.log("[Profile Upload] Content-Type:", req.headers["content-type"]);

        const file = req.file;

        console.log(
          "[Profile Upload] File received:",
          file
            ? {
                filename: file.filename,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path,
              }
            : "NO FILE"
        );

        if (!file) {
          console.error("[Profile Upload] No file in request");
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Validate file type (images only)
        if (!file.mimetype.startsWith("image/")) {
          console.error("[Profile Upload] Invalid file type:", file.mimetype);
          return res.status(400).json({ message: "Only image files are allowed" });
        }

        const baseUrl = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
        const profileImageUrl = `${baseUrl}/uploads/profiles/${file.filename}`;

        console.log("[Profile Upload] Success! File saved at:", profileImageUrl);
        res.json({
          url: profileImageUrl, // Frontend expects 'url'
          fileName: file.originalname,
          fileSize: file.size.toString(),
        });
      } catch (error: any) {
        console.error("[Profile Upload] Error:", error);
        console.error("[Profile Upload] Error stack:", error.stack);
        res.status(400).json({ message: error.message || "Failed to upload profile photo" });
      }
    }
  );

  // Partnership routes - supports both auth methods
  app.get("/api/partnerships", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const partnerships = await storage.getPartnerships(userId);

      // Fetch co-parent info for each partnership
      const partnershipsWithUsers = await Promise.all(
        partnerships.map(async (p) => {
          const coParentId = p.user1Id === userId ? p.user2Id : p.user1Id;
          const coParent = await storage.getUser(coParentId);
          return {
            ...p,
            partner: coParent
              ? {
                  id: coParent.id,
                  displayName: coParent.displayName,
                  firstName: coParent.firstName,
                  lastName: coParent.lastName,
                  email: coParent.email,
                  profileImageUrl: coParent.profileImageUrl,
                  phoneNumber: coParent.sharePhoneWithContacts ? coParent.phoneNumber : null,
                }
              : null,
          };
        })
      );

      res.json(partnershipsWithUsers);
    } catch (error) {
      console.error("Error fetching partnerships:", error);
      res.status(500).json({ message: "Failed to fetch partnerships" });
    }
  });

  app.delete("/api/partnerships/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const partnershipId = req.params.id;

      // Verify the user is part of this partnership
      const partnership = await storage.getPartnership(partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }

      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this partnership" });
      }

      // Get both users' info before deleting (for security notification emails)
      const currentUser = await storage.getUser(userId);
      const partnerId = partnership.user1Id === userId ? partnership.user2Id : partnership.user1Id;
      const partnerUser = await storage.getUser(partnerId);
      const timestamp = new Date();

      // Clear activePartnershipId for users who have this partnership set as active
      // This prevents foreign key constraint violations during deletion
      if (currentUser?.activePartnershipId === partnershipId) {
        // Find another active partnership for the current user
        const otherPartnerships = await storage.getPartnerships(userId);
        const nextActive = otherPartnerships.find((p) => p.id !== partnershipId);
        await storage.upsertUser({
          id: userId,
          activePartnershipId: nextActive?.id || null,
        });
      }

      if (partnerUser?.activePartnershipId === partnershipId) {
        // Find another active partnership for the partner
        const otherPartnerships = await storage.getPartnerships(partnerId);
        const nextActive = otherPartnerships.find((p) => p.id !== partnershipId);
        await storage.upsertUser({
          id: partnerId,
          activePartnershipId: nextActive?.id || null,
        });
      }

      // Delete the partnership
      await storage.deletePartnership(partnershipId);

      // Notify the partner in real-time via WebSocket that partnership was deleted
      // This prevents them from sending messages after deletion
      const currentUserName =
        `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
        currentUser?.displayName ||
        "Your co-parent";
      notifyPartnershipDeleted(partnerId, partnershipId, currentUserName);

      // Send security notification emails to both users (async, after deletion)
      if (currentUser?.email && partnerUser) {
        const userName =
          `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
          currentUser.displayName ||
          "User";
        const partnerName =
          `${partnerUser.firstName || ""} ${partnerUser.lastName || ""}`.trim() ||
          partnerUser.displayName ||
          "Co-parent";
        sendPartnershipRemovedEmail(
          currentUser.email,
          userName,
          partnerName,
          timestamp,
          "you"
        ).catch((err) => {
          console.error("[Partnership Delete] Failed to send security notification to user:", err);
        });
      }
      if (partnerUser?.email && currentUser) {
        const partnerUserName =
          `${partnerUser.firstName || ""} ${partnerUser.lastName || ""}`.trim() ||
          partnerUser.displayName ||
          "User";
        const initiatorName =
          `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
          currentUser.displayName ||
          "Co-parent";
        sendPartnershipRemovedEmail(
          partnerUser.email,
          partnerUserName,
          initiatorName,
          timestamp,
          "partner"
        ).catch((err) => {
          console.error(
            "[Partnership Delete] Failed to send security notification to partner:",
            err
          );
        });
      }

      res.json({ message: "Partnership deleted successfully" });
    } catch (error) {
      console.error("Error deleting partnership:", error);
      res.status(500).json({ message: "Failed to delete partnership" });
    }
  });

  app.post("/api/partnerships/join", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { inviteCode: rawCode } = req.body;

      // Validate invite code exists before normalization
      if (!rawCode || typeof rawCode !== "string") {
        console.log(`[Partnership Join] Missing or invalid invite code in request`);
        return res.status(400).json({ message: "Invalid invite code" });
      }

      // Normalize invite code to uppercase for case-insensitive matching
      const inviteCode = rawCode.toUpperCase().trim();

      console.log(`[Partnership Join] User ${userId} attempting to join with code: ${inviteCode}`);

      if (inviteCode.length !== 6) {
        console.log(`[Partnership Join] Invalid code length: ${inviteCode.length}`);
        return res.status(400).json({ message: "Invalid invite code" });
      }

      // Find user with this invite code
      const coParent = await storage.getUserByInviteCode(inviteCode);

      if (!coParent) {
        console.log(`[Partnership Join] No user found with invite code: ${inviteCode}`);
        return res.status(404).json({ message: "Invalid invite code" });
      }

      console.log(
        `[Partnership Join] Found co-parent: ${coParent.displayName} (ID: ${coParent.id})`
      );

      // Check if invite code has expired (14 days)
      if (coParent.inviteCodeGeneratedAt) {
        const codeAge = Date.now() - new Date(coParent.inviteCodeGeneratedAt).getTime();
        const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000; // 14 days

        if (codeAge > fourteenDaysInMs) {
          console.log(
            `[Partnership Join] Invite code expired (generated ${Math.floor(codeAge / (24 * 60 * 60 * 1000))} days ago)`
          );
          return res.status(410).json({
            message: "This invite code has expired. Please ask for a new one.",
            expired: true,
          });
        }
      }

      if (coParent.id === userId) {
        return res
          .status(400)
          .json({
            message:
              "This is your own invite code. Please ask your co-parent to share their code with you.",
          });
      }

      // Check if partnership already exists
      const existingPartnerships = await storage.getPartnerships(userId);
      const alreadyPartnered = existingPartnerships.some(
        (p) => p.user1Id === coParent.id || p.user2Id === coParent.id
      );

      if (alreadyPartnered) {
        return res.status(400).json({ message: "Partnership already exists" });
      }

      // Get current user before creating partnership (needed for auto-select logic)
      const currentUser = await storage.getUser(userId);

      // Create partnership
      console.log(`[Partnership Join] Creating partnership between ${userId} and ${coParent.id}`);
      // Note: Using 'as any' to bypass Drizzle ORM type inference bug with .references() fields
      // Runtime types are correct (all strings match schema), TypeScript inference is broken
      const partnership = await storage.createPartnership({
        user1Id: userId,
        user2Id: coParent.id,
        inviteCode: inviteCode,
      } as any);
      console.log(`[Partnership Join] ✅ Partnership created successfully! ID: ${partnership.id}`);

      // Notify the co-parent that the partnership has been joined
      try {
        notifyPartnershipJoin(coParent.id, currentUser?.displayName || "Your co-parent");
        console.log(`[Partnership Join] Sent real-time notification to co-parent ${coParent.id}`);
      } catch (wsError) {
        console.error(`[Partnership Join] Failed to send real-time notification to co-parent:`, wsError);
      }

      // Notify the joining user as well
      try {
        notifyPartnershipJoin(userId, coParent.displayName || "Your co-parent");
        console.log(`[Partnership Join] Sent real-time notification to joining user ${userId}`);
      } catch (wsError) {
        console.error(`[Partnership Join] Failed to notify joining user:`, wsError);
      }

      // Set new partnership as primary for BOTH users for seamless experience
      console.log(
        `[Partnership Join] 🎯 Setting new partnership ${partnership.id} as primary for both users...`
      );
      try {
        // Set for joining user
        await storage.upsertUser({
          id: userId,
          activePartnershipId: partnership.id,
        });
        console.log(
          `[Partnership Join] ✅ Partnership ${partnership.id} set as primary for user ${userId}`
        );

        // Set for co-parent (partner) - smooth experience so they see partnership immediately
        await storage.upsertUser({
          id: coParent.id,
          activePartnershipId: partnership.id,
        });
        console.log(
          `[Partnership Join] ✅ Partnership ${partnership.id} set as primary for co-parent ${coParent.id}`
        );
      } catch (err) {
        console.error(`[Partnership Join] ⚠️ Error setting active partnership:`, err);
        // Don't fail here - partnership is created, just log the error
      }

      // Send emails asynchronously with better error handling
      const timestamp = new Date();
      const emailPromises = [];

      // Welcome email to joining user
      if (currentUser?.email) {
        console.log(`[Partnership Join] 📧 Queuing welcome email for ${currentUser.displayName}`);
        emailPromises.push(
          sendInviteAcceptanceEmail(
            currentUser.email,
            currentUser.displayName || "there",
            coParent.displayName || "your co-parent"
          )
            .then(() => {
              console.log(`[Partnership Join] ✅ Welcome email sent to ${currentUser.email}`);
            })
            .catch((err) => {
              console.error(
                `[Partnership Join] ❌ Failed to send welcome email to ${currentUser.email}:`,
                err.message
              );
            })
        );
      }

      // Partnership connected notification to joining user
      if (currentUser?.email) {
        console.log(
          `[Partnership Join] 📧 Queuing partnership notification for ${currentUser.displayName}`
        );
        const userName =
          `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
          currentUser.displayName ||
          "User";
        const partnerName =
          `${coParent.firstName || ""} ${coParent.lastName || ""}`.trim() ||
          coParent.displayName ||
          "Co-parent";
        emailPromises.push(
          sendPartnershipConnectedEmail(currentUser.email, userName, partnerName, timestamp)
            .then(() => {
              console.log(
                `[Partnership Join] ✅ Partnership notification sent to ${currentUser.email}`
              );
            })
            .catch((err) => {
              console.error(
                `[Partnership Join] ❌ Failed to send partnership notification to ${currentUser.email}:`,
                err.message
              );
            })
        );
      }

      // Partnership connected notification to co-parent
      if (coParent.email) {
        console.log(
          `[Partnership Join] 📧 Queuing partnership notification for co-parent ${coParent.displayName}`
        );
        const coParentName =
          `${coParent.firstName || ""} ${coParent.lastName || ""}`.trim() ||
          coParent.displayName ||
          "User";
        const userDisplayName =
          `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
          currentUser?.displayName ||
          "Co-parent";
        emailPromises.push(
          sendPartnershipConnectedEmail(coParent.email, coParentName, userDisplayName, timestamp)
            .then(() => {
              console.log(
                `[Partnership Join] ✅ Partnership notification sent to ${coParent.email}`
              );
            })
            .catch((err) => {
              console.error(
                `[Partnership Join] ❌ Failed to send partnership notification to ${coParent.email}:`,
                err.message
              );
            })
        );
      }

      // Wait for all emails to complete (non-blocking)
      Promise.allSettled(emailPromises)
        .then(() => {
          console.log(`[Partnership Join] ✅ All partnership emails processed`);
        })
        .catch((err) => {
          console.error(`[Partnership Join] ⚠️ Unexpected error in email batch:`, err);
        });

      // Log user action for analytics
      testMonitor.logUserAction(userId, "partnership_created", {
        partnershipId: partnership.id,
        coParentId: coParent.id,
      });

      // Auto-create 1:1 direct conversation for this partnership
      let directConversation = await storage.findDirectConversation(userId, coParent.id);

      if (!directConversation) {
        console.log(`[Partnership Join] Creating 1:1 conversation for partnership`);
        directConversation = await storage.createConversation({
          type: "direct",
          createdBy: userId,
        });

        // Add both users as members
        await storage.addConversationMember({
          conversationId: directConversation.id,
          userId: userId,
        });
        await storage.addConversationMember({
          conversationId: directConversation.id,
          userId: coParent.id,
        });
        console.log(`[Partnership Join] ✅ 1:1 conversation created! ID: ${directConversation.id}`);
      } else {
        console.log(
          `[Partnership Join] 1:1 conversation already exists (ID: ${directConversation.id})`
        );
      }

      // Auto-create family group conversation if 3+ people are connected
      const allPartnerships = await storage.getPartnerships(userId);
      const coParentPartnerships = await storage.getPartnerships(coParent.id);

      // Collect all unique user IDs in the partnership network
      const allUserIds = new Set<string>();
      allUserIds.add(userId);
      allUserIds.add(coParent.id);

      [...allPartnerships, ...coParentPartnerships].forEach((p) => {
        allUserIds.add(p.user1Id);
        allUserIds.add(p.user2Id);
      });

      const uniqueUserIds = Array.from(allUserIds);

      // If 3+ people are connected, create/ensure family group exists
      if (uniqueUserIds.length >= 3) {
        // Check if a group conversation already exists with these exact members
        const userConversations = await storage.getConversations(userId);
        const existingGroup = userConversations.find((conv) => {
          if (conv.type !== "group") return false;
          const memberIds = conv.members.map((m: any) => m.id).sort();
          const expectedIds = uniqueUserIds.sort();
          return (
            memberIds.length === expectedIds.length &&
            memberIds.every((id: string, i: number) => id === expectedIds[i])
          );
        });

        if (!existingGroup) {
          const groupConversation = await storage.createConversation({
            name: "Family Group",
            type: "group",
            createdBy: userId,
          });

          // Add all connected users as members
          await Promise.all(
            uniqueUserIds.map((uid) =>
              storage.addConversationMember({
                conversationId: groupConversation.id,
                userId: uid,
              })
            )
          );

          // Create audit log for family group creation
          await storage.createAuditLog({
            userId,
            actionType: "conversation_created",
            resourceId: groupConversation.id,
            resourceType: "conversation",
            details: {
              conversationType: "group",
              conversationName: "Family Group",
              memberCount: uniqueUserIds.length,
              trigger: "auto_created_on_partnership",
            },
          });
        }
      }

      // Notify BOTH users that the partnership was established
      // This triggers WebSocket events to invalidate queries for real-time sync
      // (reusing currentUser from email notification above)
      if (currentUser) {
        // Notify the co-parent (code owner) that someone joined using their code
        notifyPartnershipJoin(coParent.id, currentUser.displayName || "Someone");
        // Also notify the joiner (current user) that they've connected with co-parent
        notifyPartnershipJoin(userId, coParent.displayName || "Your co-parent");
      }

      // Fetch updated user with activePartnershipId for immediate frontend use
      const updatedUser = await storage.getUser(userId);

      // ALSO set the partnership as primary for the code owner (co-parent) so they see it immediately
      console.log(
        `[Partnership Join] 🎯 Also setting partnership ${partnership.id} as primary for co-parent ${coParent.id}...`
      );
      await storage.upsertUser({
        id: coParent.id,
        activePartnershipId: partnership.id,
      });
      console.log(
        `[Partnership Join] ✅ Partnership ${partnership.id} also set as primary for co-parent ${coParent.id}`
      );

      const response = {
        ...partnership,
        coParent: {
          id: coParent.id,
          displayName: coParent.displayName,
          profileImageUrl: coParent.profileImageUrl,
        },
        user: updatedUser, // Include updated user with activePartnershipId
        directConversationId: directConversation?.id, // Include conversation ID for immediate use
      };

      console.log(
        `[Partnership Join] ✅ SUCCESS! Partnership ${partnership.id} with conversation ${directConversation?.id}`
      );
      res.json(response);
    } catch (error) {
      console.error("[Partnership Join] ❌ ERROR:", error);
      console.error(
        "[Partnership Join] Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
      res.status(500).json({ message: "Failed to join partnership" });
    }
  });

  app.post("/api/partnerships/regenerate-code", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const newCode = await storage.regenerateInviteCode(userId);
      res.json({ inviteCode: newCode });
    } catch (error) {
      console.error("Error regenerating invite code:", error);
      res.status(500).json({ message: "Failed to regenerate invite code" });
    }
  });

  app.patch("/api/partnerships/:id/custody", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const partnershipId = req.params.id;
      const {
        custodyEnabled,
        custodyPattern,
        custodyStartDate,
        custodyPrimaryParent,
        custodyConfig,
        user1Color,
        user2Color,
      } = req.body;

      // Verify user is part of this partnership
      const partnership = await storage.getPartnership(partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res.status(403).json({ message: "You are not part of this partnership" });
      }

      // Update custody settings
      const updates: any = {};
      if (custodyEnabled !== undefined) updates.custodyEnabled = custodyEnabled;
      if (custodyPattern !== undefined) updates.custodyPattern = custodyPattern;
      if (custodyStartDate !== undefined)
        updates.custodyStartDate = custodyStartDate ? new Date(custodyStartDate) : null;
      if (custodyPrimaryParent !== undefined) updates.custodyPrimaryParent = custodyPrimaryParent;
      if (custodyConfig !== undefined) updates.custodyConfig = custodyConfig;
      if (user1Color !== undefined) updates.user1Color = user1Color;
      if (user2Color !== undefined) updates.user2Color = user2Color;

      const updatedPartnership = await storage.updatePartnership(partnershipId, updates);
      res.json(updatedPartnership);
    } catch (error) {
      console.error("Error updating custody schedule:", error);
      res.status(500).json({ message: "Failed to update custody schedule" });
    }
  });

  // Get partnership personality settings
  app.get("/api/partnerships/:id/personality", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const partnershipId = req.params.id;

      const partnership = await storage.getPartnership(partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      
      const isUser1 = partnership.user1Id === userId;
      const isUser2 = partnership.user2Id === userId;
      
      if (!isUser1 && !isUser2) {
        return res.status(403).json({ message: "You are not part of this partnership" });
      }

      // Return the effective personalities for this user
      const myPersonality = isUser1 
        ? partnership.user1PersonalityConfirmed 
        : partnership.user2PersonalityConfirmed;
      const coParentPersonality = isUser1
        ? (partnership.user2PersonalityConfirmed || partnership.user2PersonalityGuess)
        : (partnership.user1PersonalityConfirmed || partnership.user1PersonalityGuess);
      const isCoParentPersonalityGuessed = isUser1
        ? (!partnership.user2PersonalityConfirmed && !!partnership.user2PersonalityGuess)
        : (!partnership.user1PersonalityConfirmed && !!partnership.user1PersonalityGuess);
      const myGuessForCoParent = isUser1 
        ? partnership.user2PersonalityGuess 
        : partnership.user1PersonalityGuess;
        
      res.json({
        myPersonalityConfirmed: myPersonality,
        coParentPersonalityGuess: myGuessForCoParent,
        effectivePersonalities: {
          mine: myPersonality,
          coParent: coParentPersonality,
          isCoParentGuessed: isCoParentPersonalityGuessed,
        },
      });
    } catch (error) {
      console.error("Error fetching partnership personality:", error);
      res.status(500).json({ message: "Failed to fetch personality settings" });
    }
  });

  // Update partnership personality settings - for AI-adapted communication
  app.patch("/api/partnerships/:id/personality", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const partnershipId = req.params.id;
      const { myPersonalityConfirmed, coParentPersonalityGuess } = req.body;

      // Verify user is part of this partnership
      const partnership = await storage.getPartnership(partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      
      const isUser1 = partnership.user1Id === userId;
      const isUser2 = partnership.user2Id === userId;
      
      if (!isUser1 && !isUser2) {
        return res.status(403).json({ message: "You are not part of this partnership" });
      }

      // Build updates based on which user is making the request
      const updates: any = {};
      
      if (myPersonalityConfirmed !== undefined) {
        // User sets their OWN confirmed personality (overrides any guess)
        if (isUser1) {
          updates.user1PersonalityConfirmed = myPersonalityConfirmed;
        } else {
          updates.user2PersonalityConfirmed = myPersonalityConfirmed;
        }
      }
      
      if (coParentPersonalityGuess !== undefined) {
        // User guesses the OTHER person's personality (tentative, can be overridden)
        if (isUser1) {
          updates.user2PersonalityGuess = coParentPersonalityGuess;
        } else {
          updates.user1PersonalityGuess = coParentPersonalityGuess;
        }
      }

      const updatedPartnership = await storage.updatePartnership(partnershipId, updates);
      
      // Return the effective personalities for this user
      const myPersonality = isUser1 
        ? updatedPartnership.user1PersonalityConfirmed 
        : updatedPartnership.user2PersonalityConfirmed;
      const coParentPersonality = isUser1
        ? (updatedPartnership.user2PersonalityConfirmed || updatedPartnership.user2PersonalityGuess)
        : (updatedPartnership.user1PersonalityConfirmed || updatedPartnership.user1PersonalityGuess);
      const isCoParentPersonalityGuessed = isUser1
        ? (!updatedPartnership.user2PersonalityConfirmed && !!updatedPartnership.user2PersonalityGuess)
        : (!updatedPartnership.user1PersonalityConfirmed && !!updatedPartnership.user1PersonalityGuess);
        
      res.json({
        partnership: updatedPartnership,
        effectivePersonalities: {
          mine: myPersonality,
          coParent: coParentPersonality,
          isCoParentGuessed: isCoParentPersonalityGuessed,
        },
      });
    } catch (error) {
      console.error("Error updating partnership personality:", error);
      res.status(500).json({ message: "Failed to update personality settings" });
    }
  });

  // Conversation routes - supports both auth methods
  app.get("/api/conversations", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { name, type, memberIds } = req.body;

      if (!type || !memberIds || !Array.isArray(memberIds)) {
        return res.status(400).json({ message: "Missing required fields: type, memberIds" });
      }

      // Create conversation
      const conversation = await storage.createConversation({
        name,
        type,
        createdBy: userId,
      });

      // Add members to conversation
      const memberPromises = memberIds.map((memberId: string) =>
        storage.addConversationMember({
          conversationId: conversation.id,
          userId: memberId,
        })
      );
      await Promise.all(memberPromises);

      // Create audit log for group conversation creation
      if (type === "group") {
        await storage.createAuditLog({
          userId,
          actionType: "conversation_created",
          resourceId: conversation.id,
          resourceType: "conversation",
          details: {
            conversationType: type,
            conversationName: name,
            memberCount: memberIds.length,
          },
        });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const conversationId = req.params.id;

      // Verify user is a member of this conversation
      const members = await storage.getConversationMembers(conversationId);
      const isMember = members.some((m) => m.userId === userId);

      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this conversation" });
      }

      const messages = await storage.getConversationMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Re-analyze tone for messages with unavailable tone analysis
  app.post("/api/messages/reanalyze-tone", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("[Tone Re-analysis] Starting re-analysis of old messages...");

      // Fetch messages with unavailable tone analysis
      const messagesToUpdate = await storage.getMessagesWithUnavailableTone();

      console.log(`[Tone Re-analysis] Found ${messagesToUpdate.length} messages to update`);

      let updated = 0;
      let failed = 0;

      // Re-analyze each message
      for (const message of messagesToUpdate) {
        try {
          // Get user preferences including co-parent personality for personalized analysis
          const userPrefs = await getUserPreferencesWithCoParent(message.senderId);

          // Analyze tone
          const toneAnalysis = await analyzeTone(message.content, userPrefs);

          // Update message with new tone data
          await storage.updateMessageTone(message.id, {
            tone: toneAnalysis.tone,
            toneSummary: toneAnalysis.summary,
            toneEmoji: toneAnalysis.emoji,
            rewordingSuggestion: toneAnalysis.rewordingSuggestion,
          });

          updated++;
          console.log(`[Tone Re-analysis] ✓ Updated message ${message.id}: ${toneAnalysis.tone}`);
        } catch (error: any) {
          failed++;
          console.error(
            `[Tone Re-analysis] ✗ Failed to update message ${message.id}:`,
            error.message
          );
        }
      }

      console.log(`[Tone Re-analysis] Complete. Updated: ${updated}, Failed: ${failed}`);

      res.json({
        success: true,
        total: messagesToUpdate.length,
        updated,
        failed,
      });
    } catch (error: any) {
      console.error("Error re-analyzing message tones:", error);
      res.status(500).json({ message: error.message || "Failed to re-analyze message tones" });
    }
  });

  app.delete("/api/conversations/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const conversationId = req.params.id;

      // Verify user is a member of this conversation
      const members = await storage.getConversationMembers(conversationId);
      const isMember = members.some((m) => m.userId === userId);

      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this conversation" });
      }

      // Delete the conversation (cascade will delete members and messages)
      await storage.deleteConversation(conversationId);

      // Audit log
      try {
        await storage.createAuditLog({
          userId,
          actionType: "conversation_deleted",
          resourceId: conversationId,
          resourceType: "conversation",
          details: {},
        });
      } catch (auditError) {
        console.error("Failed to log conversation deletion:", auditError);
      }

      res.json({ success: true, message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Note routes - supports both auth methods
  app.get("/api/notes", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // SECURITY: Get user's active partnership to filter notes
      const user = await storage.getUser(userId);
      const partnershipId = user?.activePartnershipId || undefined;

      const notes = await storage.getNotes(userId, partnershipId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post("/api/notes", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // SECURITY: Require active partnership to create notes
      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res
          .status(400)
          .json({ message: "No active partnership. Please join or create a partnership first." });
      }

      const parsed = insertNoteSchema.parse({
        ...req.body,
        partnershipId: user.activePartnershipId,
        createdBy: userId,
      });
      const note = await storage.createNote(parsed);

      broadcastNoteUpdate(user.activePartnershipId, "created", userId, parsed.title);

      res.json(note);
    } catch (error: any) {
      console.error("Error creating note:", error);
      res.status(400).json({ message: error.message || "Failed to create note" });
    }
  });

  app.patch("/api/notes/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const note = await storage.updateNote(req.params.id, req.body);

      const user = await storage.getUser(userId);
      if (user?.activePartnershipId) {
        broadcastNoteUpdate(user.activePartnershipId, "updated", userId, req.body.title);
      }

      res.json(note);
    } catch (error) {
      console.error("Error updating note:", error);
      res.status(400).json({ message: "Failed to update note" });
    }
  });

  app.delete("/api/notes/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      await storage.deleteNote(req.params.id);

      if (user?.activePartnershipId) {
        broadcastNoteUpdate(user.activePartnershipId, "deleted", userId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(400).json({ message: "Failed to delete note" });
    }
  });

  // Task routes - supports both auth methods
  app.get("/api/tasks", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // SECURITY: Get user's active partnership to filter tasks
      const user = await storage.getUser(userId);
      const partnershipId = user?.activePartnershipId || undefined;

      const tasks = await storage.getTasks(userId, partnershipId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticatedEither, rateLimiters.standard, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // SECURITY: Require active partnership to create tasks
      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res
          .status(400)
          .json({ message: "No active partnership. Please join or create a partnership first." });
      }

      // Sanitize user input
      const sanitizedBody = {
        ...req.body,
        title: sanitizeInput(req.body.title),
        description: sanitizeInput(req.body.description),
      };

      const parsed = insertTaskSchema.parse({
        ...sanitizedBody,
        partnershipId: user.activePartnershipId,
        createdBy: userId,
      });
      const task = await storage.createTask(parsed);
      broadcastTaskUpdate(userId); // Notify other users
      res.json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: error.message || "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user's active partnership for filtering
      const user = await storage.getUser(userId);
      const partnershipId = user?.activePartnershipId;

      // Get the old task state before updating (fetch tasks from active partnership)
      const allTasks = await storage.getTasks(userId, partnershipId ?? undefined);
      const oldTask = allTasks.find((t) => t.id === req.params.id);

      const task = await storage.updateTask(req.params.id, req.body);

      // Gamification: Track task completion
      try {
        // Check if task was just completed (not completed before, completed now)
        if (oldTask && !oldTask.completed && task.completed) {
          // Use task's partnershipId for gamification tracking
          const taskPartnershipId = task.partnershipId || partnershipId;

          // Increment tasks completed
          await storage.incrementUserStat(
            userId,
            "tasksCompleted",
            1,
            taskPartnershipId ?? undefined
          );

          // Check and award achievements
          const stats = await storage.getUserStats(userId, taskPartnershipId ?? undefined);
          if (stats) {
            // Task Master achievement (20 tasks)
            if (stats.tasksCompleted === 20) {
              await storage.awardAchievement(userId, "task_master", taskPartnershipId ?? undefined);
            }
          }
        }
      } catch (gamificationError) {
        console.error("[Gamification] Error tracking task stats:", gamificationError);
      }

      broadcastTaskUpdate(userId); // Notify other users
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await storage.deleteTask(req.params.id);
      broadcastTaskUpdate(userId); // Notify other users
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(400).json({ message: "Failed to delete task" });
    }
  });

  // Child update routes
  app.get("/api/child-updates", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // SECURITY: Get user's active partnership to filter child updates
      const user = await storage.getUser(userId);
      const partnershipId = user?.activePartnershipId || undefined;

      const updates = await storage.getChildUpdates(userId, partnershipId);
      res.json(updates);
    } catch (error) {
      console.error("Error fetching child updates:", error);
      res.status(500).json({ message: "Failed to fetch child updates" });
    }
  });

  app.post("/api/child-updates", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // SECURITY: Require active partnership to create child updates
      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res
          .status(400)
          .json({ message: "No active partnership. Please join or create a partnership first." });
      }

      const parsed = insertChildUpdateSchema.parse({
        ...req.body,
        partnershipId: user.activePartnershipId,
        createdBy: userId,
      });
      const update = await storage.createChildUpdate(parsed);
      res.json(update);
    } catch (error: any) {
      console.error("Error creating child update:", error);
      res.status(400).json({ message: error.message || "Failed to create child update" });
    }
  });

  app.delete("/api/child-updates/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      await storage.deleteChildUpdate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting child update:", error);
      res.status(400).json({ message: "Failed to delete child update" });
    }
  });

  // Children routes (for onboarding) - supports both auth methods
  app.get("/api/children", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const childrenList = await storage.getChildren(userId);
      res.json(childrenList);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Failed to fetch children" });
    }
  });

  app.post("/api/children", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const parsed = insertChildSchema.parse({
        ...req.body,
        userId,
      });
      const child = await storage.createChild(parsed);
      res.json(child);
    } catch (error: any) {
      console.error("Error creating child:", error);
      res.status(400).json({ message: error.message || "Failed to create child" });
    }
  });

  app.patch("/api/children/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      // Verify ownership
      const existingChild = await storage.getChild(req.params.id);
      if (!existingChild || existingChild.userId !== userId) {
        return res.status(404).json({ message: "Child not found" });
      }
      const child = await storage.updateChild(req.params.id, req.body);
      res.json(child);
    } catch (error: any) {
      console.error("Error updating child:", error);
      res.status(400).json({ message: error.message || "Failed to update child" });
    }
  });

  app.delete("/api/children/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      // Verify ownership
      const existingChild = await storage.getChild(req.params.id);
      if (!existingChild || existingChild.userId !== userId) {
        return res.status(404).json({ message: "Child not found" });
      }
      await storage.deleteChild(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting child:", error);
      res.status(400).json({ message: "Failed to delete child" });
    }
  });

  // Onboarding progress routes
  app.patch("/api/onboarding/step", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { step } = req.body;
      if (typeof step !== "number" || step < 0 || step > 4) {
        return res.status(400).json({ message: "Invalid step number" });
      }
      const result = await storage.upsertUser({
        id: userId,
        onboardingStep: step,
        onboardingCompletedAt: step === 4 ? new Date() : null,
      });
      res.json({ step, completed: step === 4 });
    } catch (error: any) {
      console.error("Error updating onboarding step:", error);
      res.status(400).json({ message: error.message || "Failed to update onboarding step" });
    }
  });

  app.get("/api/onboarding/status", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        step: user.onboardingStep || 0,
        completed: !!user.onboardingCompletedAt,
        completedAt: user.onboardingCompletedAt,
      });
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ message: "Failed to fetch onboarding status" });
    }
  });

  // Pet routes - supports both auth methods
  app.get("/api/pets", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // SECURITY: Get user's active partnership to filter pets
      const user = await storage.getUser(userId);
      const partnershipId = user?.activePartnershipId || undefined;

      const pets = await storage.getPets(userId, partnershipId);
      res.json(pets);
    } catch (error) {
      console.error("Error fetching pets:", error);
      res.status(500).json({ message: "Failed to fetch pets" });
    }
  });

  app.post("/api/pets", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // SECURITY: Require active partnership to create pets
      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res
          .status(400)
          .json({ message: "No active partnership. Please join or create a partnership first." });
      }

      const parsed = insertPetSchema.parse({
        ...req.body,
        partnershipId: user.activePartnershipId,
        createdBy: userId,
      });
      const pet = await storage.createPet(parsed);
      res.json(pet);
    } catch (error: any) {
      console.error("Error creating pet:", error);
      res.status(400).json({ message: error.message || "Failed to create pet" });
    }
  });

  // Expense routes - supports both auth methods
  app.get("/api/expenses", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // SECURITY: Get user's active partnership to filter expenses
      const user = await storage.getUser(userId);
      const partnershipId = user?.activePartnershipId || undefined;

      const expenses = await storage.getExpenses(userId, partnershipId);

      // Enrich each expense with participant data for the current user
      const enrichedExpenses = await Promise.all(
        expenses.map(async (expense) => {
          const participants = await storage.getExpenseParticipants(expense.id);
          const userParticipant = participants.find((p) => p.userId === userId);

          // For solo expenses (no partnershipId), show meaningful defaults
          // The user who paid owns 100% and has "paid" the full amount
          const isSoloExpense = !expense.partnershipId;
          const isPaidByUser = expense.paidBy === userId;
          const totalAmount = parseFloat(expense.amount);

          if (isSoloExpense) {
            // Solo expense: user paid it, they own 100%, fully paid
            return {
              ...expense,
              userPercentage: "100",
              userOwedAmount: totalAmount.toFixed(2),
              userPaidAmount: totalAmount.toFixed(2), // They already paid when creating
              isSoloExpense: true,
            };
          }

          // Partnership expense with participant data
          if (userParticipant) {
            return {
              ...expense,
              userPercentage: userParticipant.percentage,
              userOwedAmount: userParticipant.owedAmount,
              userPaidAmount: userParticipant.paidAmount,
              isSoloExpense: false,
            };
          }

          // Fallback for partnership expenses without participant record (edge case)
          return {
            ...expense,
            userPercentage: isPaidByUser ? "100" : "50", // Default assumptions
            userOwedAmount: isPaidByUser ? totalAmount.toFixed(2) : (totalAmount / 2).toFixed(2),
            userPaidAmount: isPaidByUser ? totalAmount.toFixed(2) : "0",
            isSoloExpense: false,
          };
        })
      );

      res.json(enrichedExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", isAuthenticatedEither, rateLimiters.standard, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { splitPercentages } = req.body; // e.g., { user1Id: 60, user2Id: 40 }

      // Sanitize user input
      const sanitizedBody = {
        ...req.body,
        description: sanitizeInput(req.body.description),
        category: sanitizeInput(req.body.category),
      };

      const parsed = insertExpenseSchema.parse({
        ...sanitizedBody,
        paidBy: userId,
      });
      const expense = await storage.createExpense(parsed);

      // Gamification: Track expense logging
      try {
        const partnershipId = expense.partnershipId;

        // Increment expenses logged
        await storage.incrementUserStat(userId, "expensesLogged", 1, partnershipId || undefined);

        // Check and award achievements
        const stats = await storage.getUserStats(userId, partnershipId || undefined);
        if (stats) {
          // Expense Tracker achievement (30 expenses)
          if (stats.expensesLogged === 30) {
            await storage.awardAchievement(userId, "expense_tracker", partnershipId || undefined);
          }
        }
      } catch (gamificationError) {
        console.error("[Gamification] Error tracking expense stats:", gamificationError);
      }

      // Solo mode: skip partnership-related operations if no partnershipId
      if (parsed.partnershipId) {
        // Get partnership to determine both parents
        const partnership = await storage.getPartnership(parsed.partnershipId);
        if (!partnership) {
          throw new Error("Partnership not found");
        }

        // Determine split percentages (default to 50/50 if not provided)
        const totalAmount = parseFloat(parsed.amount);
        const user1Id = partnership.user1Id;
        const user2Id = partnership.user2Id;

        let user1Percentage = 50;
        let user2Percentage = 50;

        if (splitPercentages) {
          user1Percentage = splitPercentages[user1Id] || 50;
          user2Percentage = splitPercentages[user2Id] || 50;
        }

        // Create expense participants for both users
        const user1Owed = ((totalAmount * user1Percentage) / 100).toFixed(2);
        const user2Owed = ((totalAmount * user2Percentage) / 100).toFixed(2);

        await storage.createExpenseParticipant({
          expenseId: expense.id,
          userId: user1Id,
          partnershipId: parsed.partnershipId,
          owedAmount: user1Owed,
          paidAmount: parsed.paidBy === user1Id ? totalAmount.toFixed(2) : "0",
          percentage: user1Percentage.toString(),
        });

        await storage.createExpenseParticipant({
          expenseId: expense.id,
          userId: user2Id,
          partnershipId: parsed.partnershipId,
          owedAmount: user2Owed,
          paidAmount: parsed.paidBy === user2Id ? totalAmount.toFixed(2) : "0",
          percentage: user2Percentage.toString(),
        });

        // Initialize or update partnership balances
        await storage.calculatePartnershipBalances(parsed.partnershipId);
      }
      // Solo expenses don't create participant records - they're handled differently in display

      broadcastExpenseUpdate(userId); // Notify other users
      res.json(expense);
    } catch (error: any) {
      console.error("Error creating expense:", error);
      res.status(400).json({ message: error.message || "Failed to create expense" });
    }
  });

  // Settlement routes - supports both auth methods
  app.post("/api/settlements/initiate", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { expenseId, amount, method, paymentLink, partnershipId, receiverId } = req.body;

      // Check if expense is already settled
      const expense = await storage.getExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      if (expense.status === "settled") {
        return res.status(400).json({ message: "This expense has already been fully settled" });
      }

      // SOLO EXPENSE: If no partnershipId, this is a solo expense - mark as settled directly
      if (!partnershipId) {
        // For solo expenses, just mark as settled immediately
        await storage.updateExpense(expenseId, { status: "settled" });
        console.log(`[Expense] Solo expense ${expenseId} marked as settled`);
        return res.json({ 
          message: "Expense marked as settled",
          soloMode: true,
          expenseId 
        });
      }

      // PARTNERSHIP EXPENSE: Verify user is part of the partnership
      const partnership = await storage.getPartnership(partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }

      const isPartOfPartnership = partnership.user1Id === userId || partnership.user2Id === userId;
      if (!isPartOfPartnership) {
        return res.status(403).json({ message: "You are not part of this partnership" });
      }

      // Verify user is a participant in the expense
      const participants = await storage.getExpenseParticipants(expenseId);
      const userParticipant = participants.find((p) => p.userId === userId);
      if (!userParticipant) {
        return res.status(403).json({ message: "You are not a participant in this expense" });
      }

      // Calculate how much the user still owes
      const owed = parseFloat(userParticipant.owedAmount);
      const alreadyPaid = parseFloat(userParticipant.paidAmount);
      const remainingOwed = owed - alreadyPaid;

      // Check if user actually owes money
      if (remainingOwed <= 0) {
        return res.status(400).json({ 
          message: "You have already paid your share of this expense",
          alreadyPaid: alreadyPaid.toFixed(2),
          owedAmount: owed.toFixed(2)
        });
      }

      // Check if payment amount exceeds what's owed
      const paymentAmount = parseFloat(amount);
      if (paymentAmount > remainingOwed + 0.01) { // Allow 1 cent tolerance for rounding
        return res.status(400).json({ 
          message: `Payment amount ($${paymentAmount.toFixed(2)}) exceeds what you owe ($${remainingOwed.toFixed(2)})`,
          maxPayment: remainingOwed.toFixed(2),
          owedAmount: owed.toFixed(2),
          alreadyPaid: alreadyPaid.toFixed(2)
        });
      }

      // Determine receiver (the other person in the partnership)
      const derivedReceiverId =
        partnership.user1Id === userId ? partnership.user2Id : partnership.user1Id;

      // Validate receiverId if provided
      if (receiverId && receiverId !== derivedReceiverId) {
        return res.status(400).json({ message: "Invalid receiver for this partnership" });
      }

      const parsed = insertSettlementSchema.parse({
        expenseId,
        payerId: userId, // Always use authenticated user
        receiverId: derivedReceiverId,
        partnershipId,
        amount: Math.min(paymentAmount, remainingOwed).toFixed(2), // Cap at remaining owed
        method,
        paymentLink,
        status: "pending_confirmation",
      });

      const settlement = await storage.createSettlement(parsed);

      // NOTE: Do NOT update paidAmount here - only update when settlement is confirmed
      // This prevents pending settlements from inflating the paid amount

      // Recalculate partnership balances
      await storage.calculatePartnershipBalances(partnershipId);

      // Send push notification to co-parent about the payment
      try {
        const expense = await storage.getExpense(expenseId);
        const payer = await storage.getUser(userId);
        const payerName = payer?.displayName || payer?.firstName || "Your co-parent";
        const expenseDescription = expense?.description || "an expense";
        const formattedAmount = parseFloat(amount).toFixed(2);

        await sendPushNotification(derivedReceiverId, {
          title: "Payment Logged",
          body: `${payerName} logged a $${formattedAmount} payment for ${expenseDescription}`,
          channel: 'general', // General notifications for expenses
          data: {
            type: "expense_payment",
            expenseId,
            settlementId: settlement.id,
            url: `/expense/${expenseId}`,
          },
        });
      } catch (pushError) {
        console.error("[Settlement] Failed to send push notification:", pushError);
        // Don't fail the settlement if push notification fails
      }

      res.json(settlement);
    } catch (error: any) {
      console.error("Error initiating settlement:", error);
      res.status(400).json({ message: error.message || "Failed to initiate settlement" });
    }
  });

  app.patch("/api/settlements/:id/confirm", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const settlementId = req.params.id;

      const settlement = await storage.getSettlement(settlementId);
      if (!settlement) {
        return res.status(404).json({ message: "Settlement not found" });
      }

      // Only receiver can confirm
      if (settlement.receiverId !== userId) {
        return res.status(403).json({ message: "Only the receiver can confirm" });
      }

      const updated = await storage.updateSettlement(settlementId, {
        status: "confirmed",
        confirmedAt: new Date(),
      });

      // NOW update payer's paid amount (only for confirmed settlements)
      const participants = await storage.getExpenseParticipants(settlement.expenseId);
      const payerParticipant = participants.find((p) => p.userId === settlement.payerId);

      if (payerParticipant) {
        const currentPaid = parseFloat(payerParticipant.paidAmount);
        const settlementAmount = parseFloat(settlement.amount);
        const owed = parseFloat(payerParticipant.owedAmount);
        
        // Cap at owed amount to prevent overpayment
        const newPaidAmount = Math.min(currentPaid + settlementAmount, owed);
        await storage.updateExpenseParticipant(payerParticipant.id, {
          paidAmount: newPaidAmount.toFixed(2),
        });
      }

      // Recalculate partnership balances
      await storage.calculatePartnershipBalances(settlement.partnershipId);

      // BROADCAST: Notify all users in the partnership about the balance change
      broadcastExpenseUpdate(settlement.payerId);
      broadcastExpenseUpdate(settlement.receiverId);

      // Check if expense is now fully settled (all participants have paid their share)
      const updatedParticipants = await storage.getExpenseParticipants(settlement.expenseId);
      const isFullySettled = updatedParticipants.every((p) => {
        const owed = parseFloat(p.owedAmount);
        const paid = parseFloat(p.paidAmount);
        return paid >= owed - 0.01; // Allow 1 cent tolerance for rounding
      });

      if (isFullySettled) {
        // Auto-mark expense as settled
        await storage.updateExpense(settlement.expenseId, { status: "settled" });
        console.log(`[Expense] Expense ${settlement.expenseId} auto-settled - all shares paid`);
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error confirming settlement:", error);
      res.status(400).json({ message: error.message || "Failed to confirm settlement" });
    }
  });

  app.patch("/api/settlements/:id/dispute", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const settlementId = req.params.id;
      const { reason } = req.body;

      const settlement = await storage.getSettlement(settlementId);
      if (!settlement) {
        return res.status(404).json({ message: "Settlement not found" });
      }

      // Only receiver can dispute
      if (settlement.receiverId !== userId) {
        return res.status(403).json({ message: "Only the receiver can dispute" });
      }

      const updated = await storage.updateSettlement(settlementId, {
        status: "rejected",
        rejectedAt: new Date(),
        rejectedReason: reason,
      });

      // Reverse the paid amount update
      const participants = await storage.getExpenseParticipants(settlement.expenseId);
      const payerParticipant = participants.find((p) => p.userId === settlement.payerId);

      if (payerParticipant) {
        const currentPaid = parseFloat(payerParticipant.paidAmount);
        const settlementAmount = parseFloat(settlement.amount);
        await storage.updateExpenseParticipant(payerParticipant.id, {
          paidAmount: Math.max(0, currentPaid - settlementAmount).toFixed(2),
        });
      }

      // Recalculate partnership balances
      await storage.calculatePartnershipBalances(settlement.partnershipId);

      res.json(updated);
    } catch (error: any) {
      console.error("Error disputing settlement:", error);
      res.status(400).json({ message: error.message || "Failed to dispute settlement" });
    }
  });

  app.get("/api/partnerships/:id/balance", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const partnershipId = req.params.id;

      const balance = await storage.getPartnershipBalance(partnershipId, userId);
      res.json(balance || { partnershipId, userId, netBalance: "0", lastUpdated: new Date() });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });

  app.get("/api/settlements/pending", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const pending = await storage.getPendingSettlements(userId);
      res.json(pending);
    } catch (error) {
      console.error("Error fetching pending settlements:", error);
      res.status(500).json({ message: "Failed to fetch pending settlements" });
    }
  });

  // Get pending expenses for AI context awareness
  // This allows AI to know when a money discussion is about a real pending expense
  app.get("/api/expenses/pending-for-ai", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res.json([]);
      }

      const expenses = await storage.getExpenses(userId, user.activePartnershipId);
      
      // Filter to pending expenses and extract relevant info for AI
      const pendingExpenses = expenses
        .filter(e => e.status === "pending")
        .map(e => ({
          id: e.id,
          description: e.description.toLowerCase(),
          amount: e.amount,
          category: e.category.toLowerCase(),
          keywords: extractExpenseKeywords(e.description, e.category)
        }));

      res.json(pendingExpenses);
    } catch (error) {
      console.error("Error fetching pending expenses for AI:", error);
      res.status(500).json({ message: "Failed to fetch pending expenses" });
    }
  });

  // Helper function to extract keywords from expense description
  function extractExpenseKeywords(description: string, category: string): string[] {
    const words = (description + " " + category).toLowerCase().split(/\s+/);
    const keywords = new Set<string>();
    
    // Child-related expense keywords
    const childTerms = ["school", "supplies", "tuition", "medical", "doctor", "medicine", 
                        "clothes", "clothing", "shoes", "uniform", "sports", "activities",
                        "daycare", "childcare", "camp", "lessons", "tutoring", "braces",
                        "glasses", "prescription", "dental", "therapy", "food", "groceries"];
    
    for (const word of words) {
      if (childTerms.some(term => word.includes(term))) {
        keywords.add(word);
      }
    }
    
    return Array.from(keywords);
  }

  app.get("/api/expenses/:id/settlements", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const expenseId = req.params.id;
      const settlements = await storage.getExpenseSettlements(expenseId);
      res.json(settlements);
    } catch (error) {
      console.error("Error fetching expense settlements:", error);
      res.status(500).json({ message: "Failed to fetch settlements" });
    }
  });

  // Therapist search endpoint - supports both auth methods
  app.get("/api/therapists/search", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const postalCode = req.query.postalCode as string;

      if (!postalCode) {
        return res.status(400).json({ message: "Postal code required" });
      }

      // Mock therapist data - in production, this would integrate with Google Places API or OpenStreetMap
      const mockTherapists = [
        {
          id: "1",
          name: "Dr. Sarah Johnson",
          type: "family therapist",
          address: `123 Main St, ${postalCode}`,
          phone: "(555) 123-4567",
          rating: 4.8,
          distance: "0.5 miles",
        },
        {
          id: "2",
          name: "Michael Chen, LMFT",
          type: "relationship counselor",
          address: `456 Oak Ave, ${postalCode}`,
          phone: "(555) 234-5678",
          rating: 4.9,
          distance: "1.2 miles",
        },
        {
          id: "3",
          name: "Dr. Emily Rodriguez",
          type: "co-parenting mediator",
          address: `789 Pine Rd, ${postalCode}`,
          phone: "(555) 345-6789",
          rating: 4.7,
          distance: "2.0 miles",
        },
      ];

      res.json(mockTherapists);
    } catch (error) {
      console.error("Error searching therapists:", error);
      res.status(500).json({ message: "Failed to search therapists" });
    }
  });

  // Event routes - supports both auth methods
  app.get("/api/events", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const events = await storage.getEvents(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post("/api/events", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const parsed = insertEventSchema.parse({
        ...req.body,
        createdBy: userId,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      const event = await storage.createEvent(parsed);

      // Track usage
      await storage.incrementUserUsage(userId, { actions: 1 });

      // Check for conflicts with existing events and notify co-parent
      const user = await storage.getUser(userId);
      if (user?.activePartnershipId) {
        const allEvents = await storage.getEvents(userId);
        const normalizedNewEvent = normalizeSchedulableEvent(parsed);
        const newStart = normalizedNewEvent?.start.getTime() ?? parsed.startDate.getTime();
        const newEnd = normalizedNewEvent?.end.getTime() ?? (parsed.endDate ? parsed.endDate.getTime() : newStart + 3600000);

        for (const existingEvent of allEvents) {
          if (existingEvent.id === event.id) continue;
          const normalizedExistingEvent = normalizeSchedulableEvent(existingEvent);
          if (!normalizedExistingEvent) {
            continue;
          }

          const existingStart = normalizedExistingEvent.start.getTime();
          const existingEnd = normalizedExistingEvent.end.getTime();

          // Check for overlap
          if (newStart < existingEnd && newEnd > existingStart) {
            broadcastCalendarConflict(user.activePartnershipId, userId, {
              eventTitle: getDisplayEventTitle(parsed.title) || "New event",
              conflictsWith: normalizedExistingEvent.title,
            });
            break; // Only notify once per creation
          }
        }
      }

      // Gamification: Track calendar event stats
      try {
        const partnershipId = undefined; // Events don't have partnershipId in schema

        // Increment calendar events created
        await storage.incrementUserStat(userId, "calendarEventsCreated", 1, partnershipId);

        // Check and award achievements
        const stats = await storage.getUserStats(userId, partnershipId);
        if (stats) {
          // Calendar Champion achievement (25 events)
          if (stats.calendarEventsCreated === 25) {
            await storage.awardAchievement(userId, "calendar_champion", partnershipId);
          }
        }
      } catch (gamificationError) {
        console.error("[Gamification] Error tracking calendar stats:", gamificationError);
      }

      broadcastScheduleUpdate(userId); // Notify other users

      // Send push notification if event is urgent
      if (event.isUrgent) {
        const partnerships = await storage.getPartnerships(userId);
        const partnerIds = partnerships.map((p: Partnership) =>
          p.user1Id === userId ? p.user2Id : p.user1Id
        );

        if (partnerIds.length > 0) {
          const eventTitle = event.title || "New event";
          for (const partnerId of partnerIds) {
            await sendPushNotification(partnerId, {
              title: `Urgent: ${eventTitle}`,
              body: `Your co-parent scheduled an urgent event`,
              channel: 'general', // Calendar notifications
              data: { type: "event", eventId: event.id },
            });
          }
        }
      }

      res.json(event);
    } catch (error: any) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: error.message || "Failed to create event" });
    }
  });

  app.patch("/api/events/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const eventId = req.params.id;

      // Check if event exists and user has access
      const existingEvent = await storage.getEvent(eventId);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (existingEvent.createdBy !== userId) {
        return res.status(403).json({ message: "Unauthorized to update this event" });
      }

      const parsed = insertEventSchema.parse({
        ...req.body,
        createdBy: userId,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      const event = await storage.updateEvent(eventId, parsed);

      // Check for conflicts with existing events and notify co-parent
      const user = await storage.getUser(userId);
      if (user?.activePartnershipId) {
        const allEvents = await storage.getEvents(userId);
        const normalizedNewEvent = normalizeSchedulableEvent(parsed);
        const newStart = normalizedNewEvent?.start.getTime() ?? parsed.startDate.getTime();
        const newEnd = normalizedNewEvent?.end.getTime() ?? (parsed.endDate ? parsed.endDate.getTime() : newStart + 3600000);

        for (const existingEvent of allEvents) {
          if (existingEvent.id === event.id) continue;
          const normalizedExistingEvent = normalizeSchedulableEvent(existingEvent);
          if (!normalizedExistingEvent) {
            continue;
          }

          const existingStart = normalizedExistingEvent.start.getTime();
          const existingEnd = normalizedExistingEvent.end.getTime();

          if (newStart < existingEnd && newEnd > existingStart) {
            broadcastCalendarConflict(user.activePartnershipId, userId, {
              eventTitle: getDisplayEventTitle(parsed.title) || "Updated event",
              conflictsWith: normalizedExistingEvent.title,
            });
            break;
          }
        }
      }

      broadcastScheduleUpdate(userId); // Notify other users

      // Send push notification if event is urgent
      if (event.isUrgent) {
        const partnerships = await storage.getPartnerships(userId);
        const partnerIds = partnerships.map((p: Partnership) =>
          p.user1Id === userId ? p.user2Id : p.user1Id
        );

        if (partnerIds.length > 0) {
          const eventTitle = event.title || "Event updated";
          for (const partnerId of partnerIds) {
            await sendPushNotification(partnerId, {
              title: `Urgent: ${eventTitle}`,
              body: `Your co-parent updated an urgent event`,
              channel: 'general', // Calendar notifications
              data: { type: "event", eventId: event.id },
            });
          }
        }
      }

      res.json(event);
    } catch (error: any) {
      console.error("Error updating event:", error);
      res.status(400).json({ message: error.message || "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const eventId = req.params.id;

      // Check if event exists and user has access
      const existingEvent = await storage.getEvent(eventId);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (existingEvent.createdBy !== userId) {
        return res.status(403).json({ message: "Unauthorized to delete this event" });
      }

      await storage.deleteEvent(eventId);
      broadcastScheduleUpdate(userId); // Notify other users
      res.json({ success: true, message: "Event deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting event:", error);
      res.status(400).json({ message: error.message || "Failed to delete event" });
    }
  });

  // Export events as iCal/ICS file for calendar apps (Google Calendar, Apple Calendar, Outlook, etc.)
  app.get("/api/events/export/ical", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const events = await storage.getEvents(userId);

      // Get user's display name for calendar title
      const user = await storage.getUser(userId);
      const calendarName = user?.displayName
        ? `${user.displayName}'s PeacePad Custody Schedule`
        : "PeacePad Custody Schedule";

      // Generate iCal content
      const icalContent = generateICalFromEvents(events, calendarName);

      // Get filename from query or use default
      const filename =
        (req.query.filename as string) ||
        `peacepad-custody-${new Date().toISOString().split("T")[0]}.ics`;

      // Set headers for file download (force download, don't display in browser)
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", Buffer.byteLength(icalContent, "utf8").toString());
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      res.send(icalContent);
    } catch (error) {
      console.error("Error exporting events to iCal:", error);
      res.status(500).json({ message: "Failed to export calendar" });
    }
  });

  // Schedule template routes - supports both auth methods
  app.get("/api/schedule-templates", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const templates = await storage.getScheduleTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching schedule templates:", error);
      res.status(500).json({ message: "Failed to fetch schedule templates" });
    }
  });

  app.post("/api/schedule-templates", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const template = await storage.createScheduleTemplate({
        ...req.body,
        createdBy: userId,
        isCustom: true,
        isPublic: false,
      });
      res.json(template);
    } catch (error: any) {
      console.error("Error creating schedule template:", error);
      res.status(400).json({ message: error.message || "Failed to create schedule template" });
    }
  });

  app.post("/api/schedule-templates/:id/apply", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const templateId = req.params.id;
      const { startDate, childName, location } = req.body;

      const template = await storage.getScheduleTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Parse the template pattern (JSON) and generate events
      const pattern = JSON.parse(template.pattern);
      const generatedEvents = [];
      const baseDate = new Date(startDate);

      // Generate events based on pattern (simplified version)
      for (const eventDef of pattern.events) {
        const eventDate = new Date(baseDate);
        eventDate.setDate(baseDate.getDate() + (eventDef.dayOffset || 0));

        const event = await storage.createEvent({
          title: eventDef.title,
          type: eventDef.type,
          startDate: eventDate,
          endDate: eventDef.duration
            ? new Date(eventDate.getTime() + eventDef.duration * 60 * 60 * 1000)
            : undefined,
          description: eventDef.description,
          location: location || eventDef.location,
          childName: childName || eventDef.childName,
          recurring: eventDef.recurring,
          notes: `Created from template: ${template.name}`,
          createdBy: userId,
        });

        // Track usage
        await storage.incrementUserUsage(userId, { actions: 1 });
        generatedEvents.push(event);
      }

      res.json({
        message: `Applied template: ${template.name}`,
        events: generatedEvents,
      });
    } catch (error: any) {
      console.error("Error applying schedule template:", error);
      res.status(400).json({ message: error.message || "Failed to apply schedule template" });
    }
  });

  app.delete("/api/schedule-templates/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const templateId = req.params.id;
      await storage.deleteScheduleTemplate(templateId);
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting schedule template:", error);
      res.status(500).json({ message: "Failed to delete schedule template" });
    }
  });

  // AI conflict detection for events - supports both auth methods
  app.get("/api/events/analyze", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const events = await storage.getEvents(userId);
      const conflicts = findScheduleConflicts(events);
      const suggestions: string[] = [];

      // Dev mode protection - use mock suggestions to avoid token usage
      if (isDevMode()) {
        const mockSuggestions = mockCalendarSuggestions();
        suggestions.push(...mockSuggestions.map((s) => s.reason));
      } else {
        // Use AI to analyze scheduling patterns (production only)
        if (events.length > 0) {
          try {
            const eventSummary = events
              .map((e) => `${e.type}: ${e.title} at ${new Date(e.startDate).toLocaleString()}`)
              .join("\n");

            const response = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a co-parenting scheduling assistant. Analyze the schedule and identify potential conflicts or provide helpful suggestions for better coordination.",
                },
                {
                  role: "user",
                  content: `Analyze this co-parenting schedule:\n${eventSummary}\n\nProvide 1-3 brief suggestions for better coordination (max 50 words each).`,
                },
              ],
              temperature: 0.7,
              max_tokens: 150,
            });

            const aiSuggestions = response.choices[0]?.message?.content
              ?.split("\n")
              .filter((s) => s.trim());
            if (aiSuggestions) {
              suggestions.push(...aiSuggestions.slice(0, 3));
            }
          } catch (error) {
            console.error("AI analysis error:", error);
            // Fallback suggestions if AI fails
            if (conflicts.length > 0) {
              suggestions.push("Consider adjusting overlapping events to avoid conflicts");
            }
          }
        }
      }

      res.json({
        hasConflicts: conflicts.length > 0,
        conflicts,
        suggestions,
      });
    } catch (error) {
      console.error("Error analyzing events:", error);
      res.status(500).json({ message: "Failed to analyze events" });
    }
  });

  // Call session routes - supports both auth methods
  app.post("/api/call-sessions", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { callType } = req.body;

      // Validate call type
      const validCallTypes = ["audio", "video"];
      const finalCallType = validCallTypes.includes(callType) ? callType : "audio";

      // Generate a 6-digit session code with retry on collision
      let session;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();

          session = await storage.createCallSession({
            sessionCode,
            hostId: userId,
            callType: finalCallType,
          });

          break; // Success, exit retry loop
        } catch (error: any) {
          attempts++;
          if (error.code === "23505" && attempts < maxAttempts) {
            // Unique constraint violation, retry with new code
            continue;
          }
          throw error; // Re-throw if not a collision or max attempts reached
        }
      }

      res.json(session);
    } catch (error) {
      console.error("Error creating call session:", error);
      res.status(500).json({ message: "Failed to create call session" });
    }
  });

  // Public endpoint - no auth required to view session details
  app.get("/api/call-sessions/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const session = await storage.getCallSessionByCode(code);

      if (!session || !session.isActive) {
        return res.status(404).json({ message: "Call session not found or ended" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error fetching call session:", error);
      res.status(500).json({ message: "Failed to fetch call session" });
    }
  });

  app.post("/api/call-sessions/:code/end", isAuthenticatedEither, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { code } = req.params;
      await storage.endCallSession(code);
      res.json({ message: "Call ended successfully" });
    } catch (error) {
      console.error("Error ending call session:", error);
      res.status(500).json({ message: "Failed to end call session" });
    }
  });

  // ============ NEW DIRECT CALLING SYSTEM ============

  // POST /api/calls/initiate - DISABLED: Call feature removed from MVP
  app.post("/api/calls/initiate", isAuthenticatedEither, async (req: any, res) => {
    return res.status(501).json({
      message: "Call feature coming soon in Peace Sessions",
      feature: "calls",
      status: "coming_soon",
    });
  });

  // POST /api/calls - DISABLED: Call feature removed from MVP
  app.post("/api/calls", isAuthenticatedEither, async (req: any, res) => {
    return res.status(501).json({
      message: "Call feature coming soon in Peace Sessions",
      feature: "calls",
      status: "coming_soon",
    });
  });

  // GET /api/calls - Get call history with optional filters - supports both auth methods
  app.get("/api/calls", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { filter } = req.query; // 'all', 'missed', 'received', 'outgoing'

      const calls = await storage.getCalls(userId, filter as string);
      res.json(calls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  // PATCH /api/calls/:id/accept - DISABLED: Call feature removed from MVP
  app.patch("/api/calls/:id/accept", isAuthenticatedEither, async (req: any, res) => {
    return res.status(501).json({
      message: "Call feature coming soon in Peace Sessions",
      feature: "calls",
      status: "coming_soon",
    });
  });

  // PATCH /api/calls/:id/decline - DISABLED: Call feature removed from MVP
  app.patch("/api/calls/:id/decline", isAuthenticatedEither, async (req: any, res) => {
    return res.status(501).json({
      message: "Call feature coming soon in Peace Sessions",
      feature: "calls",
      status: "coming_soon",
    });
  });

  // PATCH /api/calls/:id/missed - DISABLED: Call feature removed from MVP
  app.patch("/api/calls/:id/missed", isAuthenticatedEither, async (req: any, res) => {
    return res.status(501).json({
      message: "Call feature coming soon in Peace Sessions",
      feature: "calls",
      status: "coming_soon",
    });
  });

  // GET /api/calls/:id - Get call details by ID - supports both auth methods
  app.get("/api/calls/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { id } = req.params;
      const call = await storage.getCall(id);

      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      res.json(call);
    } catch (error) {
      console.error("Error fetching call:", error);
      res.status(500).json({ message: "Failed to fetch call" });
    }
  });

  // PATCH /api/calls/:id/end - DISABLED: Call feature removed from MVP
  app.patch("/api/calls/:id/end", isAuthenticatedEither, async (req: any, res) => {
    return res.status(501).json({
      message: "Call feature coming soon in Peace Sessions",
      feature: "calls",
      status: "coming_soon",
    });
  });

  // POST /api/calls/:id/followup - DISABLED: Call feature removed from MVP
  app.post("/api/calls/:id/followup", isAuthenticatedEither, async (req: any, res) => {
    return res.status(501).json({
      message: "Call feature coming soon in Peace Sessions",
      feature: "calls",
      status: "coming_soon",
    });
  });

  // POST /api/scheduled-calls - Schedule a future call - supports both auth methods
  app.post("/api/scheduled-calls", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { participantId, callType, scheduledFor, title, notes, partnershipId } = req.body;

      // Validate call type
      if (!["audio", "video"].includes(callType)) {
        return res.status(400).json({ message: "Invalid call type. Must be 'audio' or 'video'" });
      }

      // Verify participant exists
      const participant = await storage.getUser(participantId);
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      // Validate scheduled time is in the future
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }

      const scheduledCall = await storage.createScheduledCall({
        schedulerId: userId,
        participantId,
        partnershipId: partnershipId || null,
        callType,
        scheduledFor: scheduledDate,
        title: title || "Scheduled Call",
        notes: notes || null,
      });

      res.json(scheduledCall);
    } catch (error) {
      console.error("Error scheduling call:", error);
      res.status(500).json({ message: "Failed to schedule call" });
    }
  });

  // GET /api/scheduled-calls - Get scheduled calls - supports both auth methods
  app.get("/api/scheduled-calls", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const scheduledCalls = await storage.getScheduledCalls(userId);
      res.json(scheduledCalls);
    } catch (error) {
      console.error("Error fetching scheduled calls:", error);
      res.status(500).json({ message: "Failed to fetch scheduled calls" });
    }
  });

  // GET /api/call-preferences - Get user's call preferences - supports both auth methods
  app.get("/api/call-preferences", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const preferences = await storage.getCallPreference(userId);

      // If no preferences exist, create default ones
      if (!preferences) {
        const defaultPreferences = await storage.createCallPreference({
          userId,
          acceptCallsStartHour: "8",
          acceptCallsEndHour: "21",
          doNotDisturb: false,
          allowEmergencyOverride: true,
        });
        return res.json(defaultPreferences);
      }

      res.json(preferences);
    } catch (error) {
      console.error("Error fetching call preferences:", error);
      res.status(500).json({ message: "Failed to fetch call preferences" });
    }
  });

  // POST /api/call-preferences - Create or update call preferences - supports both auth methods
  app.post("/api/call-preferences", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { acceptCallsStartHour, acceptCallsEndHour, doNotDisturb, allowEmergencyOverride } =
        req.body;

      // Check if preferences already exist
      const existing = await storage.getCallPreference(userId);

      let preferences;
      if (existing) {
        // Update existing preferences
        preferences = await storage.updateCallPreference(existing.id, {
          acceptCallsStartHour,
          acceptCallsEndHour,
          doNotDisturb,
          allowEmergencyOverride,
        });
      } else {
        // Create new preferences
        preferences = await storage.createCallPreference({
          userId,
          acceptCallsStartHour,
          acceptCallsEndHour,
          doNotDisturb,
          allowEmergencyOverride,
        });
      }

      res.json(preferences);
    } catch (error) {
      console.error("Error updating call preferences:", error);
      res.status(500).json({ message: "Failed to update call preferences" });
    }
  });

  // GET /api/call-preferences/check/:partnerId - Check if partner accepts calls now - supports both auth methods
  app.get(
    "/api/call-preferences/check/:partnerId",
    isAuthenticatedEither,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const { partnerId } = req.params;
        const { isEmergency } = req.query;

        const preferences = await storage.getCallPreference(partnerId);

        // No preferences = accepting calls (default hours 8am-9pm)
        if (!preferences) {
          return res.json({
            canCall: true,
            reason: null,
            isWithinHours: true,
            isDndActive: false,
            allowEmergencyOverride: true,
            acceptableHours: "8:00 - 21:00",
          });
        }

        // Check DND
        if (preferences.doNotDisturb) {
          const hours = `${preferences.acceptCallsStartHour || "8"}:00 - ${preferences.acceptCallsEndHour || "21"}:00`;
          if (isEmergency === "true" && preferences.allowEmergencyOverride) {
            return res.json({
              canCall: true,
              reason: "emergency_override",
              isWithinHours: true,
              isDndActive: true,
              allowEmergencyOverride: true,
              acceptableHours: hours,
            });
          }
          return res.json({
            canCall: false,
            reason: "dnd_active",
            isWithinHours: true,
            isDndActive: true,
            allowEmergencyOverride: preferences.allowEmergencyOverride,
            acceptableHours: hours,
          });
        }

        // Check time boundaries
        const now = new Date();
        const currentHour = now.getHours();
        const startHour = parseInt(preferences.acceptCallsStartHour || "0");
        const endHour = parseInt(preferences.acceptCallsEndHour || "23");

        const isWithinHours = currentHour >= startHour && currentHour < endHour;

        if (!isWithinHours) {
          const hours = `${startHour}:00 - ${endHour}:00`;
          // Emergency calls outside hours - check if emergency override is allowed
          if (isEmergency === "true") {
            if (preferences.allowEmergencyOverride) {
              return res.json({
                canCall: true,
                reason: "emergency_outside_hours",
                isWithinHours: false,
                isDndActive: false,
                allowEmergencyOverride: true,
                acceptableHours: hours,
              });
            } else {
              // Emergency override not allowed
              return res.json({
                canCall: false,
                reason: "outside_hours_no_override",
                isWithinHours: false,
                isDndActive: false,
                allowEmergencyOverride: false,
                acceptableHours: hours,
              });
            }
          }
          return res.json({
            canCall: false,
            reason: "outside_hours",
            isWithinHours: false,
            isDndActive: false,
            allowEmergencyOverride: preferences.allowEmergencyOverride,
            acceptableHours: hours,
          });
        }

        res.json({
          canCall: true,
          reason: null,
          isWithinHours: true,
          isDndActive: false,
          allowEmergencyOverride: preferences.allowEmergencyOverride,
          acceptableHours: `${startHour}:00 - ${endHour}:00`,
        });
      } catch (error) {
        console.error("Error checking call preferences:", error);
        res.status(500).json({ message: "Failed to check call preferences" });
      }
    }
  );

  // ============ END NEW DIRECT CALLING SYSTEM ============

  // ============ CONCH MODE (WALKIE-TALKIE) SESSIONS ============

  // POST /api/conch-sessions - Create a new Conch Mode session - supports both auth methods
  app.post("/api/conch-sessions", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { partnershipId } = req.body;

      if (!partnershipId) {
        return res.status(400).json({ message: "Partnership ID is required" });
      }

      // SECURITY: Verify user is a member of this partnership
      const partnership = await storage.getPartnership(partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized: You are not a member of this partnership" });
      }

      // Check if there's already an active session for this partnership
      const existingSession = await storage.getActiveConchSession(partnershipId);
      if (existingSession) {
        return res.status(409).json({
          message: "Active session already exists",
          session: existingSession,
        });
      }

      // CRITICAL FIX: Create CallSession with sessionCode IMMEDIATELY on creation
      // This ensures both users have sessionCode for WebRTC connection from the start
      const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
      const callSession = await storage.createCallSession({
        sessionCode,
        hostId: userId, // Initiator is the host
        callType: "audio", // Conch Mode uses audio primarily
        isActive: true, // Active while waiting for partner to join
      });
      console.log(`[Conch Create] CallSession created with code: ${sessionCode}`);

      // Create a Call record to link the Conch session to WebRTC
      const coParentId = partnership.user1Id === userId ? partnership.user2Id : partnership.user1Id;
      const call = await storage.createCall({
        callerId: userId,
        receiverId: coParentId,
        callType: "audio",
        status: "pending",
        sessionId: callSession.id,
      });

      // Create the session with callId already set
      const session = await storage.createConchSession({
        partnershipId,
        initiatorUserId: userId,
        status: "pending",
        conchHolderUserId: userId, // Initiator starts with the conch
        baseTurnDurationSeconds: "90", // 90-second turns for thoughtful conversation
        moodData: {},
        strikeCounts: {},
        callId: call.id, // Link to WebRTC call from the start
      });

      // Track usage
      await storage.incrementUserUsage(userId, { actions: 1 });

      // Register with CallEngineV2 for signaling (host is the initiator)
      callEngineV2.registerLegacySession(sessionCode, call.id, userId);
      console.log(
        `[Conch Create] ✅ Session registered with CallEngineV2: ${sessionCode} → ${call.id}`
      );

      // Add initiator as first participant
      await storage.addConchSessionParticipant({
        sessionId: session.id,
        userId,
      });

      // Broadcast session creation to partnership
      await broadcastConchSessionCreated(session.id, partnershipId, userId);

      // Send push notification to co-parent (important if app is backgrounded)
      const initiator = await storage.getUser(userId);
      const initiatorName = initiator?.displayName || "Your co-parent";

      await sendPushNotification(coParentId, {
        title: "Conch Mode Invitation",
        body: `${initiatorName} is inviting you to a structured conversation`,
        channel: 'conch', // High priority for Conch invitations
        data: {
          type: "conch_invite",
          sessionId: session.id,
          partnershipId,
          url: "/conch",
        },
      });

      console.log(
        `[Conch] User ${userId} created session ${session.id} for partnership ${partnershipId} with sessionCode ${sessionCode}`
      );

      // Return session with sessionCode so initiator can connect to WebRTC immediately
      res.json({
        ...session,
        sessionCode, // CRITICAL: Include sessionCode so initiator can join WebRTC session
      });
    } catch (error) {
      console.error("Error creating Conch session:", error);
      res.status(500).json({ message: "Failed to create Conch session" });
    }
  });

  // GET /api/conch-sessions/active - Get active session for user's partnership - supports both auth methods
  app.get("/api/conch-sessions/active", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { partnershipId } = req.query;

      if (!partnershipId) {
        return res.status(400).json({ message: "Partnership ID is required" });
      }

      // SECURITY: Verify user is a member of this partnership
      const partnership = await storage.getPartnership(partnershipId as string);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized: You are not a member of this partnership" });
      }

      const session = await storage.getActiveConchSession(partnershipId as string);

      // CRITICAL FIX: Include sessionCode for ANY session with callId (not just active ones)
      // This allows initiator to connect to WebRTC while session is still 'pending'
      if (session && session.callId) {
        const call = await storage.getCall(session.callId);
        if (call && call.sessionId) {
          const callSession = await storage.getCallSessionById(call.sessionId);
          if (callSession) {
            res.json({
              ...session,
              sessionCode: callSession.sessionCode, // Include sessionCode for WebRTC
            });
            return;
          }
        }
      }

      res.json(session || null);
    } catch (error) {
      console.error("Error fetching active Conch session:", error);
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  // POST /api/conch-sessions/:id/join - Join an existing Conch session - supports both auth methods
  app.post("/api/conch-sessions/:id/join", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { id } = req.params;

      const session = await storage.getConchSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // SECURITY: Verify user is a member of this session's partnership
      const partnership = await storage.getPartnership(session.partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized: You are not a member of this partnership" });
      }

      if (session.status !== "pending" && session.status !== "active") {
        return res.status(400).json({ message: "Session is not joinable" });
      }

      // Check if user already joined
      const participants = await storage.getConchSessionParticipants(id);
      const alreadyJoined = participants.some((p) => p.userId === userId);

      if (!alreadyJoined) {
        await storage.addConchSessionParticipant({
          sessionId: id,
          userId,
        });
      }

      // Activate session when second person joins
      if (session.status === "pending") {
        // CRITICAL FIX: Session now has callId from creation - use existing CallSession
        if (!session.callId) {
          console.error(`[Conch Join] ❌ Session ${id} missing callId - this should not happen`);
          return res.status(500).json({
            message: "Session data corrupted - missing call ID",
            details: "callId missing from pending session",
          });
        }

        // Fetch existing call and CallSession
        const call = await storage.getCall(session.callId);
        if (!call || !call.sessionId) {
          console.error(`[Conch Join] ❌ Call ${session.callId} or sessionId not found`);
          return res.status(500).json({
            message: "Session data corrupted - call not found",
            details: "call or sessionId missing",
          });
        }

        const callSession = await storage.getCallSessionById(call.sessionId);
        if (!callSession) {
          console.error(`[Conch Join] ❌ CallSession ${call.sessionId} not found`);
          return res.status(500).json({
            message: "Session data corrupted - call session not found",
          });
        }

        console.log(`[Conch Join] Using existing sessionCode: ${callSession.sessionCode}`);

        // Update call to active status
        await storage.updateCall(call.id, {
          status: "active",
          startedAt: new Date(),
        });

        // Note: CallSession status update not needed - WebRTC connection uses sessionCode only

        // Calculate turn duration based on session settings
        const turnDurationMs = parseInt(session.baseTurnDurationSeconds || "90") * 1000;

        const updatedSession = await storage.updateConchSession(id, {
          status: "active",
          startedAt: new Date(),
          currentTurnEndsAt: new Date(Date.now() + turnDurationMs), // Use session's configured duration
        });

        // Broadcast session joined and activated
        await broadcastConchSessionJoined(id, session.partnershipId, userId);

        // Notify BOTH parties that the call is active via WebSocket (atomic broadcast)
        const callWithSessionCode = {
          ...call,
          sessionCode: callSession.sessionCode,
        };
        notifyCallAccepted(callWithSessionCode);

        console.log(
          `[Conch] Session ${id} activated with call ${call.id}, sessionCode ${callSession.sessionCode}`
        );

        // Return session data WITH sessionCode for WebRTC connection
        res.json({
          ...updatedSession,
          sessionCode: callSession.sessionCode, // CRITICAL: Include sessionCode so frontend can join correct WebRTC session
        });
      } else if (session.status === "active") {
        // Session already active - fetch sessionCode from associated call
        if (session.callId) {
          const call = await storage.getCall(session.callId);
          if (call && call.sessionId) {
            const existingCallSession = await storage.getCallSessionById(call.sessionId);
            if (existingCallSession) {
              // CRITICAL FIX: Validate hostId, fallback to initiatorUserId
              const hostId = existingCallSession.hostId || session.initiatorUserId;
              if (!hostId) {
                console.error(
                  `[Conch Join] ❌ Cannot determine hostId for session ${id} - both hostId and initiatorUserId are missing`
                );
                return res.status(500).json({
                  message: "Session data corrupted - cannot determine host user",
                  details: "hostId and initiatorUserId both missing",
                });
              }

              // CRITICAL FIX: Register existing session with CallEngineV2 for re-joins
              callEngineV2.registerLegacySession(existingCallSession.sessionCode, call.id, hostId);
              console.log(
                `[Conch Join] ✅ Existing session re-registered with CallEngineV2: ${existingCallSession.sessionCode} → ${call.id} (host: ${hostId})`
              );

              res.json({
                ...session,
                sessionCode: existingCallSession.sessionCode, // Include sessionCode for re-joins
              });
              return;
            }
          }
        }
        // CRITICAL FIX: Return error if sessionCode not found - client can't join without it
        console.error(
          `[Conch Join] ❌ Active session ${id} missing CallSession data - cannot provide sessionCode`
        );
        return res.status(500).json({
          message: "Session data corrupted - missing WebRTC session code",
          details: "callId or sessionId missing",
        });
      } else {
        // Session is not pending or active (ended/cancelled)
        console.error(`[Conch Join] ❌ Cannot join session ${id} with status: ${session.status}`);
        return res.status(400).json({
          message: "Session is not joinable",
          status: session.status,
        });
      }
    } catch (error) {
      console.error("Error joining Conch session:", error);
      res.status(500).json({ message: "Failed to join session" });
    }
  });

  // POST /api/conch-sessions/:id/decline - Decline a Conch session invite - supports both auth methods
  app.post("/api/conch-sessions/:id/decline", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { id } = req.params;

      const session = await storage.getConchSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // SECURITY: Verify user is a member of this session's partnership
      const partnership = await storage.getPartnership(session.partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized: You are not a member of this partnership" });
      }

      // Can only decline pending sessions
      if (session.status !== "pending") {
        return res.status(400).json({ message: "Session is not pending" });
      }

      // End the session
      await storage.updateConchSession(id, {
        status: "ended",
        endedAt: new Date(),
      });

      // Notify initiator that invite was declined
      const decliner = await storage.getUser(userId);
      const declinerName = decliner?.displayName || "Your co-parent";

      await broadcastConchInviteDeclined(
        id,
        session.partnershipId,
        session.initiatorUserId,
        declinerName
      );

      console.log(`[Conch] Session ${id} declined by ${userId}`);
      res.json({ message: "Invite declined" });
    } catch (error) {
      console.error("Error declining Conch session:", error);
      res.status(500).json({ message: "Failed to decline session" });
    }
  });

  // PATCH /api/conch-sessions/:id/state - Update session state (timer, strikes, mood) - supports both auth methods
  app.patch("/api/conch-sessions/:id/state", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { id } = req.params;
      const updates = req.body;

      const session = await storage.getConchSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // SECURITY: Verify user is a member of this session's partnership
      const partnership = await storage.getPartnership(session.partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized: You are not a member of this partnership" });
      }

      const updatedSession = await storage.updateConchSession(id, updates);

      // Broadcast state sync to all participants (if active)
      if (updatedSession.conchHolderUserId && updatedSession.currentTurnEndsAt) {
        await broadcastConchStateSync(id, session.partnershipId, {
          conchHolderUserId: updatedSession.conchHolderUserId,
          currentTurnEndsAt: updatedSession.currentTurnEndsAt,
          status: updatedSession.status,
        });
      }

      res.json(updatedSession);
    } catch (error) {
      console.error("Error updating Conch session state:", error);
      res.status(500).json({ message: "Failed to update session state" });
    }
  });

  // POST /api/conch-sessions/:id/end - End a Conch session - supports both auth methods
  app.post("/api/conch-sessions/:id/end", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { id } = req.params;

      const session = await storage.getConchSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // SECURITY: Verify user is a member of this session's partnership
      const partnership = await storage.getPartnership(session.partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized: You are not a member of this partnership" });
      }

      // End the associated call if one exists
      if (session.callId) {
        try {
          await storage.updateCall(session.callId, {
            status: "ended",
            endedAt: new Date(),
          });

          // Notify both users that the call has ended
          notifyCallEnded(partnership.user1Id, session.callId, "conch-session-ended");
          notifyCallEnded(partnership.user2Id, session.callId, "conch-session-ended");

          console.log(`[Conch] Ended associated call ${session.callId} for session ${id}`);
        } catch (callError) {
          console.error(`[Conch] Failed to end call ${session.callId}:`, callError);
          // Continue with session end even if call update fails
        }
      }

      // Generate session summary from turn history
      let sessionSummary: ConchSessionSummary | null = null;
      try {
        const moodData = (session.moodData || {}) as any;
        const turnHistory = moodData.turnHistory || [];
        const detectedLanguage = moodData.detectedLanguage || "en";

        // Calculate session duration in minutes
        const sessionDurationMinutes = session.startedAt
          ? Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000)
          : 0;

        if (turnHistory.length > 0) {
          sessionSummary = await generateConchSessionSummary(
            turnHistory,
            sessionDurationMinutes,
            detectedLanguage
          );

          // Store summary in moodData before ending
          await storage.updateConchSession(id, {
            moodData: { ...moodData, sessionSummary } as any,
          });

          console.log(
            `[Conch] Session summary generated: ${sessionSummary.keyTopicsDiscussed.length} topics, ${sessionSummary.turnCount} turns`
          );
        }
      } catch (summaryError) {
        console.error("[Conch] Failed to generate session summary:", summaryError);
        // Continue with session end even if summary fails
      }

      await storage.endConchSession(id);

      // Broadcast session end to all participants
      await broadcastConchSessionEnded(id, session.partnershipId);

      console.log(`[Conch] Session ${id} ended`);
      res.json({
        message: "Session ended successfully",
        summary: sessionSummary,
      });
    } catch (error) {
      console.error("Error ending Conch session:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  // POST /api/conch-sessions/:id/decline - Decline a Conch session invitation - supports both auth methods
  app.post("/api/conch-sessions/:id/decline", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { id } = req.params;
      const { reason } = req.body;

      const session = await storage.getConchSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // SECURITY: Verify user is a member of this session's partnership
      const partnership = await storage.getPartnership(session.partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized: You are not a member of this partnership" });
      }

      // Only allow declining pending sessions
      if (session.status !== "pending") {
        return res.status(400).json({ message: "Can only decline pending sessions" });
      }

      // End the session (mark as abandoned)
      await storage.updateConchSession(id, {
        status: "abandoned",
      });

      // Broadcast session end to all participants
      await broadcastConchSessionEnded(id, session.partnershipId);

      console.log(
        `[Conch] Session ${id} declined by user ${userId}${reason ? ` - Reason: ${reason}` : ""}`
      );
      res.json({ message: "Session declined successfully" });
    } catch (error) {
      console.error("Error declining Conch session:", error);
      res.status(500).json({ message: "Failed to decline session" });
    }
  });

  // GET /api/conch-sessions/history - Get past Conch sessions for partnership - supports both auth methods
  app.get("/api/conch-sessions/history", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { partnershipId } = req.query;
      if (!partnershipId) {
        return res.status(400).json({ message: "partnershipId required" });
      }

      const partnership = await storage.getPartnership(partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const sessions = await storage.getAllConchSessions();
      const pastSessions = sessions
        .filter((s) => s.partnershipId === partnershipId && s.status === "ended")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      res.json(pastSessions);
    } catch (error) {
      console.error("Error fetching Conch session history:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  // POST /api/conch-sessions/:id/pass - Pass conch to other user - supports both auth methods
  app.post("/api/conch-sessions/:id/pass", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { id } = req.params;

      const session = await storage.getConchSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // SECURITY: Verify user is a member of this session's partnership
      const partnership = await storage.getPartnership(session.partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized: You are not a member of this partnership" });
      }

      // VALIDATION: Only the conch holder can pass the conch
      if (session.conchHolderUserId !== userId) {
        return res.status(403).json({ message: "Only the conch holder can pass the conch" });
      }

      // VALIDATION: Prevent bouncing - must hold conch for at least 5 seconds before passing
      if (session.currentTurnEndsAt) {
        const baseDurationMs = parseInt(session.baseTurnDurationSeconds || "90") * 1000;
        const timeRemainingMs = new Date(session.currentTurnEndsAt).getTime() - Date.now();
        const timeHeldMs = baseDurationMs - timeRemainingMs; // base duration - time remaining
        const timeHeldSec = Math.floor(timeHeldMs / 1000);

        if (timeHeldSec < 5) {
          return res.status(400).json({
            message: "Please wait at least 5 seconds before passing the conch",
            timeHeld: timeHeldSec,
          });
        }
      }

      // Determine new conch holder (switch to the other partner)
      const newHolderUserId =
        session.conchHolderUserId === partnership.user1Id
          ? partnership.user2Id
          : partnership.user1Id;

      // === AI CONTENT ANALYSIS BEFORE PASSING ===
      // Analyze the turn that just ended for manipulation patterns
      const moodData = (session.moodData || {}) as any;
      const turnTranscripts = moodData.currentTurnTranscripts || [];
      const detectedLanguage = moodData.detectedLanguage || "en";
      const emotionSnapshot = moodData.lastEmotionSnapshot;

      // Get speaker info synchronously before any async operations
      const speakerUser = await storage.getUser(userId);
      const speakerName = speakerUser?.displayName || "Speaker";

      // Store basic turn info synchronously in turnHistory BEFORE clearing transcripts
      // This ensures session summary has data even if async AI analysis fails
      const existingTurnHistory = moodData.turnHistory || [];
      const turnRecord = {
        speakerUserId: userId,
        speakerName,
        keyPoints:
          turnTranscripts.length > 0
            ? [`Turn completed with ${turnTranscripts.length} transcript segments`]
            : [],
        unaddressedConcerns: [],
        overallSentiment: "neutral",
        timestamp: new Date().toISOString(),
        rawTranscript: turnTranscripts.join(" ").substring(0, 500), // Store snippet for reference
      };
      existingTurnHistory.push(turnRecord);
      const turnIndex = existingTurnHistory.length - 1; // Track index for async update

      // Run content analysis asynchronously (don't block the pass action)
      // Analysis runs in background and broadcasts results via WebSocket
      if (turnTranscripts.length > 0) {
        const capturedTranscripts = [...turnTranscripts]; // Capture before clearing
        (async () => {
          try {
            const combinedTranscript = capturedTranscripts.join(" ");
            console.log(
              `[Conch AI] Analyzing turn content (${combinedTranscript.length} chars, lang: ${detectedLanguage})`
            );

            // Analyze the turn for manipulation and communication quality
            const turnAnalysis = await analyzeConchTurn(
              combinedTranscript,
              emotionSnapshot,
              capturedTranscripts,
              detectedLanguage
            );

            // If manipulation detected, broadcast AI intervention to the listener (new conch holder)
            if (turnAnalysis.content.hasManipulation) {
              console.log(
                `[Conch AI] Manipulation detected: ${turnAnalysis.content.manipulationType} (${turnAnalysis.content.severity})`
              );

              // Send intervention to the listener (new holder receiving the conch)
              const interventionMessage =
                turnAnalysis.content.counselorNote ||
                "Take a moment to process what you just heard.";
              await broadcastAIIntervention(
                id,
                session.partnershipId,
                "tone_alert",
                interventionMessage,
                turnAnalysis.content.suggestedResponse,
                turnAnalysis.content.severity,
                newHolderUserId
              );
            }

            // Generate and broadcast turn summary
            const turnSummary = await generateConchTurnSummary(
              capturedTranscripts,
              speakerName,
              detectedLanguage
            );

            await broadcastTurnSummary(id, session.partnershipId, userId, turnSummary);

            // Update turn history with AI-generated summary details
            try {
              const currentSession = await storage.getConchSession(id);
              if (currentSession) {
                const currentMoodData = (currentSession.moodData || {}) as any;
                const currentTurnHistory = currentMoodData.turnHistory || [];
                if (currentTurnHistory[turnIndex]) {
                  currentTurnHistory[turnIndex] = {
                    ...currentTurnHistory[turnIndex],
                    keyPoints: turnSummary.keyPoints,
                    unaddressedConcerns: turnSummary.unaddressedConcerns,
                    overallSentiment: turnSummary.overallSentiment,
                  };
                  await storage.updateConchSession(id, {
                    moodData: { ...currentMoodData, turnHistory: currentTurnHistory } as any,
                  });
                }
              }
            } catch (storeError) {
              console.error("[Conch AI] Failed to update turn summary:", storeError);
            }

            console.log(
              `[Conch AI] Turn summary generated for ${speakerName}: ${turnSummary.keyPoints.length} key points`
            );
          } catch (error) {
            console.error("[Conch AI] Failed to analyze turn content:", error);
          }
        })();
      }

      // Update session with new holder and reset timer to fresh turn duration
      // Clear any pending extra time request and reset cumulative extra time counter (no carryover)
      const turnDurationMs = parseInt(session.baseTurnDurationSeconds || "60") * 1000; // Default 60s per schema

      // Reset cumulative extra time for new turn and clear transcripts for next turn
      // Include turnHistory that was updated synchronously above
      const updatedMoodData = {
        ...moodData,
        turnHistory: existingTurnHistory, // Include synchronized turn history
        currentTurnExtraTimeGranted: 0, // Reset counter for fresh turn
        currentTurnTranscripts: [], // Clear transcripts for new turn
      };

      const updatedSession = await storage.updateConchSession(id, {
        conchHolderUserId: newHolderUserId,
        currentTurnEndsAt: new Date(Date.now() + turnDurationMs), // Fresh timer for new holder
        pendingExtraTimeRequest: null, // Clear any pending request
        moodData: updatedMoodData as any, // Reset extra time counter and transcripts
      });

      // Broadcast conch pass event with new timer (guaranteed non-null since we just set it)
      const newTurnEndsAt =
        updatedSession.currentTurnEndsAt || new Date(Date.now() + turnDurationMs);
      await broadcastConchPassed(id, session.partnershipId, newHolderUserId, newTurnEndsAt);

      // Send push notification to new conch holder (helpful if app is backgrounded)
      const previousHolder = await storage.getUser(userId);
      const previousHolderName = previousHolder?.displayName || "Your co-parent";

      await sendPushNotification(newHolderUserId, {
        title: "It's Your Turn",
        body: `${previousHolderName} passed the conch to you`,
        channel: 'conch', // High priority for Conch turns
        data: {
          type: "conch_turn",
          sessionId: id,
          partnershipId: session.partnershipId,
          url: "/conch",
        },
      });

      console.log(`[Conch] Conch passed from ${userId} to ${newHolderUserId} in session ${id}`);
      res.json(updatedSession);
    } catch (error) {
      console.error("Error passing conch:", error);
      res.status(500).json({ message: "Failed to pass conch" });
    }
  });

  // POST /api/conch-sessions/:id/extra-time/request - Request extra time - supports both auth methods
  app.post(
    "/api/conch-sessions/:id/extra-time/request",
    isAuthenticatedEither,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        const { seconds = 30 } = req.body;

        const session = await storage.getConchSession(id);
        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }

        // SECURITY: Verify user is a member of this session's partnership
        const partnership = await storage.getPartnership(session.partnershipId);
        if (!partnership) {
          return res.status(404).json({ message: "Partnership not found" });
        }
        if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
          return res
            .status(403)
            .json({ message: "Unauthorized: You are not a member of this partnership" });
        }

        // Verify requester is the current conch holder
        if (session.conchHolderUserId !== userId) {
          return res.status(403).json({ message: "Only the conch holder can request extra time" });
        }

        // Check if there's already a pending request
        if (session.pendingExtraTimeRequest) {
          const pending = session.pendingExtraTimeRequest as any;
          return res.status(400).json({
            message: "Extra time request already pending approval",
            pendingRequest: pending,
          });
        }

        // Calculate CUMULATIVE extra time granted during this turn (not remaining)
        // Strategy: Compare current turn end time with what it would be with just base duration
        // This tracks total granted regardless of how much has been consumed
        const baseTurnDurationMs = parseInt(session.baseTurnDurationSeconds || "90") * 1000;
        const currentEndTime = session.currentTurnEndsAt
          ? new Date(session.currentTurnEndsAt).getTime()
          : Date.now();

        // Get when this turn started by looking at last conch pass or session start
        // For safety, estimate turn start as (current end time - base duration - any extras)
        // Better approach: currentTurnEndsAt was set when turn started, so we can back-calculate
        // But safest is to track cumulative in pending request metadata

        // Use moodData or strikeCounts structure to temporarily track cumulative extra time
        const moodData = (session.moodData || {}) as any;
        const cumulativeExtraTimeSec = moodData.currentTurnExtraTimeGranted || 0;

        // Check against cap
        const extraTimeCap = parseInt(session.extraTimeCapSeconds || "90");
        const newCumulativeTotal = cumulativeExtraTimeSec + seconds;

        if (newCumulativeTotal > extraTimeCap) {
          return res.status(400).json({
            message: `Extra time cap reached. You've been granted ${cumulativeExtraTimeSec}s this turn. Max is ${extraTimeCap}s.`,
            currentExtraTime: cumulativeExtraTimeSec,
            cap: extraTimeCap,
            requested: seconds,
          });
        }

        // Store pending request
        const pendingRequest = {
          requesterId: userId,
          requestedAt: new Date().toISOString(),
          seconds,
        };

        await storage.updateConchSession(id, {
          pendingExtraTimeRequest: pendingRequest as any,
        });

        // Broadcast extra time request to partner (approval required for extra time)
        await broadcastConchExtraTimeRequest(id, session.partnershipId, userId, seconds);

        console.log(
          `[Conch] User ${userId} requested ${seconds} seconds extra time in session ${id} (cumulative granted: ${cumulativeExtraTimeSec}s, cap: ${extraTimeCap}s)`
        );
        res.json({
          message: "Extra time request sent",
          seconds,
          currentExtraTime: cumulativeExtraTimeSec,
          cap: extraTimeCap,
        });
      } catch (error) {
        console.error("Error requesting extra time:", error);
        res.status(500).json({ message: "Failed to request extra time" });
      }
    }
  );

  // POST /api/conch-sessions/:id/extra-time/approve - Approve extra time request - supports both auth methods
  app.post(
    "/api/conch-sessions/:id/extra-time/approve",
    isAuthenticatedEither,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        const { seconds = 30 } = req.body;

        const session = await storage.getConchSession(id);
        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }

        // SECURITY: Verify user is a member of this session's partnership
        const partnership = await storage.getPartnership(session.partnershipId);
        if (!partnership) {
          return res.status(404).json({ message: "Partnership not found" });
        }
        if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
          return res
            .status(403)
            .json({ message: "Unauthorized: You are not a member of this partnership" });
        }

        // Add extra time to current turn and clear pending request
        const currentEndTime = session.currentTurnEndsAt
          ? new Date(session.currentTurnEndsAt).getTime()
          : Date.now();
        const newEndTime = new Date(currentEndTime + seconds * 1000);

        // Increment cumulative extra time granted this turn
        const moodData = (session.moodData || {}) as any;
        const currentCumulative = moodData.currentTurnExtraTimeGranted || 0;
        const updatedMoodData = {
          ...moodData,
          currentTurnExtraTimeGranted: currentCumulative + seconds,
        };

        const updatedSession = await storage.updateConchSession(id, {
          currentTurnEndsAt: newEndTime,
          pendingExtraTimeRequest: null, // Clear pending request after approval
          moodData: updatedMoodData as any,
        });

        // Broadcast approval with extra time granted
        await broadcastConchExtraTimeResponse(id, session.partnershipId, true, seconds);

        console.log(
          `[Conch] User ${userId} approved ${seconds} seconds extra time in session ${id} (cumulative: ${currentCumulative + seconds}s)`
        );
        res.json(updatedSession);
      } catch (error) {
        console.error("Error approving extra time:", error);
        res.status(500).json({ message: "Failed to approve extra time" });
      }
    }
  );

  // POST /api/conch-sessions/:id/extra-time/deny - Deny extra time request - supports both auth methods
  app.post(
    "/api/conch-sessions/:id/extra-time/deny",
    isAuthenticatedEither,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;

        const session = await storage.getConchSession(id);
        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }

        // SECURITY: Verify user is a member of this session's partnership
        const partnership = await storage.getPartnership(session.partnershipId);
        if (!partnership) {
          return res.status(404).json({ message: "Partnership not found" });
        }
        if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
          return res
            .status(403)
            .json({ message: "Unauthorized: You are not a member of this partnership" });
        }

        // Clear pending request
        await storage.updateConchSession(id, {
          pendingExtraTimeRequest: null,
        });

        // Broadcast denial
        await broadcastConchExtraTimeResponse(id, session.partnershipId, false, 0);

        console.log(`[Conch] User ${userId} denied extra time request in session ${id}`);
        res.json({ message: "Extra time request denied" });
      } catch (error) {
        console.error("Error denying extra time:", error);
        res.status(500).json({ message: "Failed to deny extra time" });
      }
    }
  );

  // POST /api/conch-sessions/:id/reaction - Send reaction during conch session - supports both auth methods
  app.post("/api/conch-sessions/:id/reaction", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { id } = req.params;
      const { emoji } = req.body;

      const session = await storage.getConchSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // SECURITY: Verify user is a member of this session's partnership
      const partnership = await storage.getPartnership(session.partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized: You are not a member of this partnership" });
      }

      // SECURITY: Get sender info from authenticated user (don't trust client)
      const sender = await storage.getUser(userId);
      if (!sender) {
        return res.status(404).json({ message: "User not found" });
      }
      const senderName = sender.displayName || sender.firstName || "You";

      // Broadcast reaction to both users in the session
      await broadcastConchReaction(id, session.partnershipId, emoji, senderName, userId);

      console.log(`[Conch] Reaction ${emoji} sent by ${userId} in session ${id}`);
      res.json({ message: "Reaction sent" });
    } catch (error) {
      console.error("Error sending reaction:", error);
      res.status(500).json({ message: "Failed to send reaction" });
    }
  });

  // POST /api/conch-sessions/:id/turn-summary - Generate AI counselor summary after speaking turn
  app.post("/api/conch-sessions/:id/turn-summary", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { id } = req.params;
      const { transcript } = req.body;

      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({ message: "Transcript is required" });
      }

      const session = await storage.getConchSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // SECURITY: Verify user is a member of this session's partnership
      const partnership = await storage.getPartnership(session.partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized: You are not a member of this partnership" });
      }

      // Get speaker name
      const speaker = await storage.getUser(userId);
      if (!speaker) {
        return res.status(404).json({ message: "User not found" });
      }
      const speakerName = speaker.displayName || speaker.firstName || "Speaker";

      // Generate AI counselor summary
      const summary = await generateTurnSummary(transcript, speakerName);

      console.log(`[Conch AI] Generated turn summary for ${speakerName} in session ${id}`);
      res.json(summary);
    } catch (error) {
      console.error("[Conch AI] Error generating turn summary:", error);
      res.status(500).json({ message: "Failed to generate turn summary" });
    }
  });

  // POST /api/conch-sessions/:id/check-intervention - Check if AI intervention is needed
  app.post(
    "/api/conch-sessions/:id/check-intervention",
    isAuthenticatedEither,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const { id } = req.params;
        const { currentEmotion, previousEmotion, recentTranscript } = req.body;

        if (!currentEmotion) {
          return res.status(400).json({ message: "Current emotion data is required" });
        }

        const session = await storage.getConchSession(id);
        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }

        // SECURITY: Verify user is a member of this session's partnership
        const partnership = await storage.getPartnership(session.partnershipId);
        if (!partnership) {
          return res.status(404).json({ message: "Partnership not found" });
        }
        if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
          return res
            .status(403)
            .json({ message: "Unauthorized: You are not a member of this partnership" });
        }

        // Generate AI counselor intervention
        const intervention = await generateEmotionIntervention(
          currentEmotion,
          previousEmotion,
          recentTranscript
        );

        console.log(
          `[Conch AI] Checked intervention for session ${id}: ${intervention.shouldIntervene ? "YES" : "NO"}`
        );

        // Broadcast intervention to both users if needed
        if (intervention.shouldIntervene && intervention.type && intervention.message) {
          await broadcastAIIntervention(
            id,
            session.partnershipId,
            intervention.type,
            intervention.message,
            intervention.suggestion,
            intervention.severity,
            userId // Target user who is experiencing the mood shift
          );
        }

        res.json(intervention);
      } catch (error) {
        console.error("[Conch AI] Error checking intervention:", error);
        res.status(500).json({ message: "Failed to check intervention" });
      }
    }
  );

  // POST /api/conch-sessions/:id/transcript - Store transcript segment during turn
  app.post("/api/conch-sessions/:id/transcript", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { id } = req.params;
      const { transcript, language } = req.body;

      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({ message: "Transcript is required" });
      }

      const session = await storage.getConchSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // SECURITY: Verify user is a member of this session's partnership
      const partnership = await storage.getPartnership(session.partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized: You are not a member of this partnership" });
      }

      // Only the conch holder can add transcripts
      if (session.conchHolderUserId !== userId) {
        return res.status(403).json({ message: "Only the conch holder can add transcripts" });
      }

      // Update moodData with the new transcript segment
      const moodData = (session.moodData || {}) as any;
      const currentTranscripts = moodData.currentTurnTranscripts || [];
      currentTranscripts.push(transcript.trim());

      const updatedMoodData = {
        ...moodData,
        currentTurnTranscripts: currentTranscripts,
        detectedLanguage: language || moodData.detectedLanguage || "en",
      };

      await storage.updateConchSession(id, {
        moodData: updatedMoodData as any,
      });

      console.log(
        `[Conch] Transcript added by ${userId} in session ${id} (${currentTranscripts.length} segments, lang: ${updatedMoodData.detectedLanguage})`
      );
      res.json({ message: "Transcript stored", segments: currentTranscripts.length });
    } catch (error) {
      console.error("Error storing transcript:", error);
      res.status(500).json({ message: "Failed to store transcript" });
    }
  });

  // ============ END CONCH MODE SESSIONS ============

  // ============ AI-POWERED MESSAGE ANALYSIS ============

  // Helper function to check AI message consent
  async function checkAiMessageConsent(userId: string): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      return user?.aiMessageConsent === true;
    } catch {
      return false;
    }
  }

  // Comprehensive message analysis with conflict detection and communication coaching
  app.post(
    "/api/analyze-message",
    isAuthenticatedEither,
    rateLimiters.aiAnalysis,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if user has consented to AI message analysis
        const hasConsent = await checkAiMessageConsent(userId);
        if (!hasConsent) {
          console.log(`[AI Analysis] User ${userId} has not consented to AI analysis - skipping`);
          return res.json({
            emotion: { emotion: "neutral", confidence: 0, language: "en" },
            conflictAnalysis: { hasConflict: false },
            coaching: null,
            aiDisabled: true,
            message:
              "AI analysis is disabled. Enable it in your settings to receive tone suggestions.",
          });
        }

        const { message, conversationHistory, context } = req.body;

        if (!message || typeof message !== "string") {
          return res.status(400).json({ message: "Message is required" });
        }

        const analysis = await analyzeMessageComprehensive(message, conversationHistory, context);

        console.log(
          `[AI Analysis] Message analyzed for user ${userId}: emotion=${analysis.emotion.emotion}, conflict=${analysis.conflictAnalysis?.hasConflict || false}`
        );

        res.json(analysis);
      } catch (error) {
        console.error("[AI Analysis] Error analyzing message:", error);
        res.status(500).json({ message: "Failed to analyze message" });
      }
    }
  );

  // Quick conflict detection for real-time typing assistance
  app.post(
    "/api/detect-conflict",
    isAuthenticatedEither,
    rateLimiters.aiAnalysis,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if user has consented to AI message analysis
        const hasConsent = await checkAiMessageConsent(userId);
        if (!hasConsent) {
          return res.json({
            hasConflict: false,
            aiDisabled: true,
          });
        }

        const { message, conversationHistory } = req.body;

        if (!message || typeof message !== "string") {
          return res.status(400).json({ message: "Message is required" });
        }

        const conflictAnalysis = await analyzeConflict(message, conversationHistory);

        res.json(conflictAnalysis);
      } catch (error) {
        console.error("[AI Analysis] Error detecting conflict:", error);
        res.status(500).json({ message: "Failed to detect conflict" });
      }
    }
  );

  // Get suggested response for de-escalation
  app.post(
    "/api/suggest-response",
    isAuthenticatedEither,
    rateLimiters.aiAnalysis,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if user has consented to AI message analysis
        const hasConsent = await checkAiMessageConsent(userId);
        if (!hasConsent) {
          return res.json({
            suggestion: null,
            aiDisabled: true,
            message: "AI suggestions are disabled. Enable AI analysis in your settings.",
          });
        }

        const { message, emotion, conflictAnalysis } = req.body;

        if (!message || typeof message !== "string") {
          return res.status(400).json({ message: "Message is required" });
        }

        // If emotion not provided, analyze it first
        const emotionResult = emotion || (await analyzeEmotion(message));

        const suggestion = await generateSuggestedResponse(
          message,
          emotionResult,
          conflictAnalysis
        );

        res.json({ suggestion, language: emotionResult.language || "en" });
      } catch (error) {
        console.error("[AI Analysis] Error suggesting response:", error);
        res.status(500).json({ message: "Failed to suggest response" });
      }
    }
  );

  // Detect language of text
  app.post(
    "/api/detect-language",
    isAuthenticatedEither,
    rateLimiters.aiAnalysis,
    async (req: any, res) => {
      try {
        const { text } = req.body;

        if (!text || typeof text !== "string") {
          return res.status(400).json({ message: "Text is required" });
        }

        const language = await detectLanguage(text);

        res.json({ language });
      } catch (error) {
        console.error("[AI Analysis] Error detecting language:", error);
        res.status(500).json({ message: "Failed to detect language" });
      }
    }
  );

  // ============ END AI-POWERED MESSAGE ANALYSIS ============

  // Authenticated file serving for uploads
  app.get("/uploads/recordings/:filename", isAuthenticated, (req: any, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    // Validate file exists and is within uploads directory
    if (!fs.existsSync(filePath) || !filePath.startsWith(uploadDir)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.sendFile(filePath);
  });

  // Protected chat file serving with ownership verification
  app.get("/uploads/chat/:filename", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { filename } = req.params;

      // Secure path validation - prevent directory traversal
      const safePath = path.resolve(chatAttachmentsDir, path.basename(filename));
      if (!safePath.startsWith(path.resolve(chatAttachmentsDir))) {
        return res.status(403).json({ message: "Invalid file path" });
      }

      // Validate file exists
      if (!fs.existsSync(safePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      // Verify user has at least one partnership (authorized to view chat files)
      const partnerships = await storage.getPartnerships(userId);
      if (!partnerships || partnerships.length === 0) {
        return res.status(403).json({ message: "Access denied - no active partnership" });
      }

      // User is in a partnership, serve the file
      res.sendFile(safePath);
    } catch (error) {
      console.error("[Chat Files] Error verifying file ownership:", error);
      res.status(500).json({ message: "Error serving file" });
    }
  });

  // Call recording routes
  app.post(
    "/api/call-recordings",
    isAuthenticated,
    upload.single("file"),
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const file = req.file;

        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const recordingUrl = `/uploads/recordings/${file.filename}`;
        const sessionCode = req.body.sessionCode || `recording-${Date.now()}`;

        // Create or find call session
        let sessionId = sessionCode;
        try {
          const existingSession = await storage.getCallSessionByCode(sessionCode);
          if (existingSession) {
            sessionId = existingSession.id;
          } else {
            // Create a new session for this recording
            const newSession = await storage.createCallSession({
              sessionCode: sessionCode,
              hostId: userId,
              callType: req.body.recordingType || "video",
            });
            sessionId = newSession.id;
          }
        } catch {
          // If session operations fail, use sessionCode as sessionId
          sessionId = sessionCode;
        }

        const parsed = insertCallRecordingSchema.parse({
          sessionId,
          recordingUrl,
          recordingType: req.body.recordingType || "video",
          duration: req.body.duration?.toString() || "0",
          participants: [userId],
          recordedBy: userId,
        });

        const recording = await storage.createCallRecording(parsed);

        // Create audit log
        await storage.createAuditLog({
          userId,
          actionType: "call_recording",
          resourceId: recording.id,
          resourceType: "recording",
          details: { sessionId: recording.sessionId },
        });

        res.json(recording);
      } catch (error: any) {
        console.error("Error creating call recording:", error);
        res.status(400).json({ message: error.message || "Failed to create call recording" });
      }
    }
  );

  app.get("/api/call-recordings", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const recordings = await storage.getCallRecordings(userId);
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching call recordings:", error);
      res.status(500).json({ message: "Failed to fetch call recordings" });
    }
  });

  // Push notification routes
  app.get("/api/push/vapid-public-key", (req, res) => {
    res.json({ publicKey: getVapidPublicKey() });
  });

  app.post("/api/push/subscribe", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { endpoint, keys } = req.body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      const subscription = await storage.createPushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      res.json({ success: true, subscription });
    } catch (error: any) {
      // Handle duplicate endpoint error
      if (error.code === "23505") {
        return res.json({ success: true, message: "Already subscribed" });
      }
      console.error("Error creating push subscription:", error);
      res.status(500).json({ message: "Failed to create push subscription" });
    }
  });

  app.delete("/api/push/unsubscribe", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint is required" });
      }

      await storage.deletePushSubscription({ endpoint });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ message: "Failed to delete push subscription" });
    }
  });

  // Native push notification registration (FCM/APNs for Capacitor apps)
  app.post("/api/push/register-native", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { token, platform } = req.body;

      if (!token || !platform) {
        return res.status(400).json({ message: "Token and platform are required" });
      }

      if (platform !== "android" && platform !== "ios") {
        return res.status(400).json({ message: "Platform must be 'android' or 'ios'" });
      }

      // Store native push token
      const subscription = await storage.createPushSubscription({
        userId,
        platform,
        deviceToken: token,
        endpoint: null,
        p256dh: null,
        auth: null,
      });

      console.log(`[Push] Registered ${platform} token for user ${userId}`);
      res.json({ success: true, subscription });
    } catch (error: any) {
      // Handle duplicate token error
      if (error.code === "23505") {
        return res.json({ success: true, message: "Token already registered" });
      }
      console.error("Error registering native push token:", error);
      res.status(500).json({ message: "Failed to register push token" });
    }
  });

  // Unregister native push token
  app.post("/api/push/unregister-native", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Delete all native tokens for this user
      const subscriptions = await storage.getPushSubscriptionsByUser(userId);
      const nativeTokens = subscriptions.filter(
        (s) => s.platform === "android" || s.platform === "ios"
      );

      for (const token of nativeTokens) {
        if (token.deviceToken) {
          await storage.deletePushSubscription({ deviceToken: token.deviceToken });
        }
      }

      console.log(`[Push] Unregistered native tokens for user ${userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unregistering native push tokens:", error);
      res.status(500).json({ message: "Failed to unregister push tokens" });
    }
  });

  // Simple in-memory cache for geocoding (1 hour TTL)
  const geocodeCache = new Map<string, { results: any[]; timestamp: number }>();
  const GEOCODE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  // Geocoding route - convert address/postal code to coordinates
  // Note: No authentication required for location search (needed for event creation before login)
  app.get("/api/geocode", async (req: any, res) => {
    try {
      const { query, address, lat, lng } = req.query;
      const searchTerm = (query || address) as string;
      const userLat = lat ? parseFloat(lat as string) : null;
      const userLng = lng ? parseFloat(lng as string) : null;

      if (!searchTerm) {
        return res.json({ results: [] });
      }

      // Check cache first (include location bias in cache key if provided)
      const cacheKey = userLat && userLng 
        ? `${searchTerm.toLowerCase().trim()}_${userLat.toFixed(2)}_${userLng.toFixed(2)}`
        : searchTerm.toLowerCase().trim();
      const cached = geocodeCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < GEOCODE_CACHE_TTL) {
        testMonitor.log("P3", "Performance", `Geocode cache hit for: ${searchTerm}`);
        return res.json({ results: cached.results });
      }

      const addressStr = searchTerm;
      let data: any = null;
      let isCanada = false;

      // Check if it's a Canadian postal code (full format: A1A 1A1 or A1A1A1, partial: A1A)
      const canadianPostalFullRegex = /^[A-Za-z]\d[A-Za-z][\s\-]?\d[A-Za-z]\d$/;
      const canadianPostalPartialRegex = /^[A-Za-z]\d[A-Za-z]$/;

      if (canadianPostalFullRegex.test(addressStr.trim())) {
        // Use Geocoder.ca for full Canadian postal codes (more accurate)
        const postalCode = addressStr.replace(/\s/g, "").toUpperCase();
        try {
          const geocoderUrl = `https://geocoder.ca/?postal=${postalCode}&geoit=XML&json=1`;
          const response = await fetch(geocoderUrl);
          const geocoderData = await response.json();

          if (geocoderData && geocoderData.latt && geocoderData.longt) {
            isCanada = true;
            return res.json({
              results: [
                {
                  lat: parseFloat(geocoderData.latt),
                  lng: parseFloat(geocoderData.longt),
                  displayName: `${postalCode}, ${geocoderData.standard?.city || ""}, ${geocoderData.standard?.prov || "ON"}, Canada`,
                  address: `${postalCode}, ${geocoderData.standard?.city || ""}, ${geocoderData.standard?.prov || "ON"}, Canada`,
                  city: geocoderData.standard?.city,
                  state: geocoderData.standard?.prov || "ON",
                  country: "Canada",
                },
              ],
            });
          }
        } catch (geocoderError) {
          console.log("Geocoder.ca failed, falling back to Nominatim:", geocoderError);
        }
      } else if (canadianPostalPartialRegex.test(addressStr.trim())) {
        // Handle partial Canadian postal code (first 3 characters like "L1N")
        const partialPostalCode = addressStr.replace(/\s/g, "").toUpperCase();

        // Common FSA (Forward Sortation Area) to approximate coordinates mapping
        // First letter indicates province, first 3 chars indicate general area
        const fsaLookup: {
          [key: string]: { lat: number; lng: number; city: string; prov: string };
        } = {
          // Ontario L-codes (GTA and surrounding)
          L0: { lat: 43.8, lng: -79.4, city: "York Region", prov: "ON" },
          L1: { lat: 43.9, lng: -78.9, city: "Oshawa/Durham", prov: "ON" },
          L2: { lat: 43.15, lng: -79.25, city: "St. Catharines", prov: "ON" },
          L3: { lat: 43.9, lng: -79.5, city: "Markham/Vaughan", prov: "ON" },
          L4: { lat: 44.0, lng: -79.45, city: "Newmarket/Aurora", prov: "ON" },
          L5: { lat: 43.6, lng: -79.65, city: "Mississauga", prov: "ON" },
          L6: { lat: 43.7, lng: -79.76, city: "Brampton", prov: "ON" },
          L7: { lat: 43.52, lng: -79.85, city: "Oakville/Milton", prov: "ON" },
          L8: { lat: 43.25, lng: -79.85, city: "Hamilton", prov: "ON" },
          L9: { lat: 43.73, lng: -80.0, city: "Georgetown/Acton", prov: "ON" },
          // Ontario M-codes (Toronto)
          M1: { lat: 43.75, lng: -79.23, city: "Scarborough East", prov: "ON" },
          M2: { lat: 43.78, lng: -79.35, city: "North York", prov: "ON" },
          M3: { lat: 43.75, lng: -79.42, city: "North York West", prov: "ON" },
          M4: { lat: 43.68, lng: -79.38, city: "East York", prov: "ON" },
          M5: { lat: 43.65, lng: -79.38, city: "Downtown Toronto", prov: "ON" },
          M6: { lat: 43.68, lng: -79.45, city: "York/Etobicoke", prov: "ON" },
          M7: { lat: 43.66, lng: -79.39, city: "Toronto Central", prov: "ON" },
          M8: { lat: 43.63, lng: -79.5, city: "Etobicoke", prov: "ON" },
          M9: { lat: 43.65, lng: -79.55, city: "Etobicoke West", prov: "ON" },
          // Ontario K-codes (Ottawa area)
          K1: { lat: 45.42, lng: -75.69, city: "Ottawa Central", prov: "ON" },
          K2: { lat: 45.35, lng: -75.75, city: "Ottawa West", prov: "ON" },
          K7: { lat: 44.23, lng: -76.48, city: "Kingston", prov: "ON" },
          // Ontario N-codes (Southwestern)
          N1: { lat: 43.45, lng: -80.5, city: "Guelph/Cambridge", prov: "ON" },
          N2: { lat: 43.48, lng: -80.52, city: "Waterloo", prov: "ON" },
          N3: { lat: 43.27, lng: -80.82, city: "Brantford", prov: "ON" },
          N5: { lat: 42.98, lng: -81.25, city: "London", prov: "ON" },
          N6: { lat: 42.98, lng: -81.23, city: "London East", prov: "ON" },
          N7: { lat: 43.32, lng: -81.15, city: "Stratford", prov: "ON" },
          N8: { lat: 42.3, lng: -82.98, city: "Windsor", prov: "ON" },
          N9: { lat: 42.32, lng: -83.02, city: "Windsor West", prov: "ON" },
        };

        // Check first 2 characters for common FSAs
        const fsaPrefix = partialPostalCode.substring(0, 2);
        if (fsaLookup[fsaPrefix]) {
          const location = fsaLookup[fsaPrefix];
          return res.json({
            results: [
              {
                lat: location.lat,
                lng: location.lng,
                displayName: `${partialPostalCode} area (${location.city}, ${location.prov}, Canada)`,
                address: `${partialPostalCode} area, ${location.city}, ${location.prov}, Canada`,
                city: location.city,
                state: location.prov,
                country: "Canada",
              },
            ],
          });
        }

        // Fall back to Nominatim search for other postal codes
        const searchQuery = `${partialPostalCode}, Canada`;
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=3&countrycodes=ca`;
        const response = await fetch(nominatimUrl, {
          headers: {
            "User-Agent": "PeacePad-CoParenting-App",
          },
        });

        data = await response.json();

        if (data && data.length > 0) {
          return res.json({
            results: [
              {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                displayName: `${partialPostalCode} area, ${data[0].address?.city || data[0].address?.town || ""}, Canada`,
                address: data[0].display_name,
                city: data[0].address?.city || data[0].address?.town,
                state: data[0].address?.state,
                country: "Canada",
              },
            ],
          });
        }
      }

      // Use OpenStreetMap Nominatim for non-Canadian addresses or as fallback
      // Increase limit to 10 to get more options for city name searches (e.g., Whitby could be in Ontario, England, etc.)
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressStr)}&format=json&addressdetails=1&limit=10`;
      const response = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "PeacePad-CoParenting-App",
        },
      });

      data = await response.json();

      if (!data || data.length === 0) {
        return res.json({ results: [] });
      }

      // Prioritize Canadian results when searching city names (no postal code pattern)
      const hasPostalCodePattern = /\d/.test(addressStr); // Has any digit (likely postal/zip code)
      if (!hasPostalCodePattern && data.length > 1) {
        // Sort to put Canadian locations first
        data.sort((a: any, b: any) => {
          const aIsCanada = a.address?.country === "Canada" || a.address?.country_code === "ca";
          const bIsCanada = b.address?.country === "Canada" || b.address?.country_code === "ca";
          if (aIsCanada && !bIsCanada) return -1;
          if (!aIsCanada && bIsCanada) return 1;
          return 0;
        });
      }

      // Return multiple results from Nominatim (up to 10)
      let results = data.slice(0, 10).map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name,
        address: item.display_name,
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        country: item.address?.country,
        postalCode: item.address?.postcode,
      }));

      // If user location provided, sort results by distance (closest first)
      if (userLat && userLng) {
        results = results.map((r: any) => ({
          ...r,
          distance: calculateDistance(userLat, userLng, r.lat, r.lng),
        })).sort((a: any, b: any) => a.distance - b.distance);
      }

      // Store in cache
      geocodeCache.set(cacheKey, { results, timestamp: Date.now() });

      // Clean old cache entries (prevent memory leak)
      if (geocodeCache.size > 1000) {
        const oldestKeys = Array.from(geocodeCache.keys()).slice(0, 100);
        oldestKeys.forEach((key) => geocodeCache.delete(key));
      }

      res.json({ results });
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ message: "Failed to geocode address" });
    }
  });

  // Haversine formula for accurate distance calculation in km
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Support Resources directory - includes therapists, crisis support, government services, etc.
  app.get("/api/support-resources", isAuthenticatedEither, async (req: any, res) => {
    try {
      const { lat, lng, maxDistance, address, resourceType, category, genderFocus, userCountryCode } = req.query;

      if (!lat || !lng) {
        return res.json([]);
      }

      const distanceNum = parseInt((maxDistance as string) || "50");
      const filterType = (resourceType as string) || "all";
      const categoryFilter = (category as string) || "all";
      const genderFilter = (genderFocus as string) || "all";

      // Fetch from database with filters
      const dbResources = await storage.getSupportResources(categoryFilter, genderFilter);

      // Fetch supplementary results from 211 Ontario API (if configured)
      const { ontario211Service } = await import("./services/ontario211");
      let ontario211Resources: any[] = [];

      if (ontario211Service.isConfigured()) {
        const keywords =
          categoryFilter !== "all"
            ? ontario211Service.getCategoryKeywords(categoryFilter)
            : "family support domestic violence";

        const apiResults = await ontario211Service.searchResources({
          latitude: parseFloat(lat as string),
          longitude: parseFloat(lng as string),
          radius: distanceNum,
          keywords,
          limit: 10,
        });

        ontario211Resources = apiResults.map((resource: any) => {
          // Map 211 categories to PeacePad types based on requested filter
          let mappedType = categoryFilter !== "all" ? categoryFilter : "other";

          // Try to infer type from 211 categories if available
          if (resource.categories && Array.isArray(resource.categories)) {
            const cats = resource.categories.map((c: any) =>
              typeof c === "string" ? c.toLowerCase() : c.name?.toLowerCase() || ""
            );
            if (cats.some((c: string) => c.includes("crisis") || c.includes("hotline")))
              mappedType = "crisis";
            else if (cats.some((c: string) => c.includes("shelter") || c.includes("housing")))
              mappedType = "shelter";
            else if (cats.some((c: string) => c.includes("legal") || c.includes("law")))
              mappedType = "legal";
            else if (
              cats.some(
                (c: string) =>
                  c.includes("therapy") || c.includes("counseling") || c.includes("mental")
              )
            )
              mappedType = "therapist";
            else if (cats.some((c: string) => c.includes("support group") || c.includes("peer")))
              mappedType = "support_groups";
          }

          return {
            id: `211-${resource.id}`,
            name: resource.name,
            organization: resource.organization,
            type: mappedType, // Use properly mapped type instead of category filter
            specialty: resource.description?.substring(0, 100) || "Community Resource",
            description: resource.description,
            address: resource.address
              ? `${resource.address}, ${resource.city}, ${resource.province}`
              : resource.city,
            latitude: resource.latitude || "0",
            longitude: resource.longitude || "0",
            phone: resource.phone,
            email: resource.email,
            website: resource.website,
            hours: resource.hours,
            isFree: true, // Assume 211 resources are free/low-cost
            isOnline: !resource.latitude,
            languages: resource.languages || [],
            distance: 0,
            genderFocus: "all", // 211 resources don't specify gender focus
            category: mappedType,
            source: "211 Ontario",
          };
        });
      }

      // Map database resources to API format
      const allResources = dbResources.map((resource: any) => ({
        id: resource.id,
        name: resource.organization,
        type: resource.category,
        specialty: resource.services.join(", "),
        description: resource.services.join(", "),
        address: resource.address || resource.region,
        latitude: resource.latitude || "0",
        longitude: resource.longitude || "0",
        phone: resource.phone,
        email: resource.email,
        website: resource.website,
        hours: resource.operatingHours,
        isFree: resource.isFree,
        isOnline: !resource.latitude,
        isNationwide: resource.isNationwide || false,
        countryCode: resource.countryCode || "CA", // Default to Canada for database resources
        languages: resource.languages || [],
        distance: 0,
        genderFocus: resource.genderFocus,
        category: resource.category,
        region: resource.region,
        isVerified: resource.isVerified,
      }));

      // Add static crisis resources (always available)
      const staticCrisisResources = [
        // CANADIAN CRISIS & IMMEDIATE SUPPORT (24/7)
        {
          id: "crisis-988",
          name: "988 Suicide Crisis Helpline",
          type: "crisis",
          specialty: "24/7 Crisis Support",
          description: "Immediate support for anyone in suicidal crisis or emotional distress",
          address: "Available across Canada",
          latitude: "43.6532",
          longitude: "-79.3832",
          phone: "988 (call or text)",
          website: "https://988.ca/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "CA",
          languages: ["English", "French"],
          distance: 0,
        },
        {
          id: "crisis-kids",
          name: "Kids Help Phone",
          type: "crisis",
          specialty: "Youth Crisis Support (Ages 5-29)",
          description: "Professional counseling, information and referrals",
          address: "Available across Canada",
          latitude: "43.6532",
          longitude: "-79.3832",
          phone: "1-800-668-6868 or text CONNECT to 686868",
          website: "https://kidshelpphone.ca/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "CA",
          languages: ["English", "French"],
          distance: 0,
        },
        {
          id: "crisis-211",
          name: "211 Ontario",
          type: "crisis",
          specialty: "Community, Health & Social Services Helpline",
          description: "Information and referral to community, health and mental health services",
          address: "Available across Ontario",
          latitude: "43.6532",
          longitude: "-79.3832",
          phone: "211 or 1-877-330-3213",
          website: "https://211ontario.ca/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "CA",
          languages: ["English", "French", "150+ languages via translation"],
          distance: 0,
        },
        {
          id: "crisis-text",
          name: "Crisis Text Line Canada",
          type: "crisis",
          specialty: "Text-Based Crisis Support",
          description: "Free, confidential crisis support via text message",
          address: "Available across Canada",
          latitude: "43.6532",
          longitude: "-79.3832",
          phone: "Text CONNECT to 686868",
          website: "https://www.crisistextline.ca/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "CA",
          languages: ["English", "French"],
          distance: 0,
        },
        {
          id: "crisis-women",
          name: "Assaulted Women's Helpline",
          type: "crisis",
          specialty: "Support for Women Experiencing Abuse",
          description: "Crisis counseling, safety planning, and referrals",
          address: "Available across Ontario",
          latitude: "43.6532",
          longitude: "-79.3832",
          phone: "1-866-863-0511 (TTY: 1-866-863-7868)",
          website: "https://www.awhl.org/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "CA",
          languages: ["English", "French", "9+ languages"],
          distance: 0,
        },
        // US CRISIS RESOURCES
        {
          id: "crisis-us-988",
          name: "988 Suicide & Crisis Lifeline (US)",
          type: "crisis",
          specialty: "24/7 Crisis Support",
          description:
            "Free and confidential support for people in distress, prevention and crisis resources",
          address: "Available across United States",
          latitude: "29.7604",
          longitude: "-95.3698",
          phone: "988 (call or text)",
          website: "https://988lifeline.org/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "US",
          languages: ["English", "Spanish"],
          distance: 0,
        },
        {
          id: "crisis-us-text",
          name: "Crisis Text Line (US)",
          type: "crisis",
          specialty: "Text-Based Crisis Support",
          description: "Free, 24/7 support for those in crisis. Text HOME to 741741",
          address: "Available across United States",
          latitude: "29.7604",
          longitude: "-95.3698",
          phone: "Text HOME to 741741",
          website: "https://www.crisistextline.org/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "US",
          languages: ["English", "Spanish"],
          distance: 0,
        },
        {
          id: "crisis-us-domestic",
          name: "National Domestic Violence Hotline",
          type: "crisis",
          specialty: "Domestic Violence Support",
          description: "Support and resources for victims of domestic violence and abuse",
          address: "Available across United States",
          latitude: "29.7604",
          longitude: "-95.3698",
          phone: "1-800-799-7233 or text START to 88788",
          website: "https://www.thehotline.org/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "US",
          languages: ["English", "Spanish", "200+ languages via interpretation"],
          distance: 0,
        },
        // UK CRISIS RESOURCES
        {
          id: "crisis-uk-samaritans",
          name: "Samaritans",
          type: "crisis",
          specialty: "24/7 Emotional Support",
          description: "Confidential emotional support for anyone in distress or at risk of suicide",
          address: "Available across United Kingdom",
          latitude: "51.5074",
          longitude: "-0.1278",
          phone: "116 123 (free)",
          website: "https://www.samaritans.org/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "GB",
          languages: ["English", "Welsh"],
          distance: 0,
        },
        {
          id: "crisis-uk-domestic",
          name: "National Domestic Abuse Helpline (UK)",
          type: "crisis",
          specialty: "Domestic Abuse Support",
          description: "Support for women experiencing domestic abuse",
          address: "Available across United Kingdom",
          latitude: "51.5074",
          longitude: "-0.1278",
          phone: "0808 2000 247 (free)",
          website: "https://www.nationaldahelpline.org.uk/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "GB",
          languages: ["English"],
          distance: 0,
        },
        // AUSTRALIA CRISIS RESOURCES
        {
          id: "crisis-au-lifeline",
          name: "Lifeline Australia",
          type: "crisis",
          specialty: "24/7 Crisis Support & Suicide Prevention",
          description: "Confidential crisis support and suicide prevention services",
          address: "Available across Australia",
          latitude: "-33.8688",
          longitude: "151.2093",
          phone: "13 11 14",
          website: "https://www.lifeline.org.au/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "AU",
          languages: ["English"],
          distance: 0,
        },
        {
          id: "crisis-au-1800respect",
          name: "1800RESPECT",
          type: "crisis",
          specialty: "Family & Domestic Violence Support",
          description: "National sexual assault, domestic and family violence counselling service",
          address: "Available across Australia",
          latitude: "-33.8688",
          longitude: "151.2093",
          phone: "1800 737 732",
          website: "https://www.1800respect.org.au/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "AU",
          languages: ["English", "Interpreter services available"],
          distance: 0,
        },
        // UAE CRISIS RESOURCES
        {
          id: "crisis-uae-support",
          name: "Dubai Foundation for Women & Children",
          type: "crisis",
          specialty: "Domestic Violence & Child Abuse Support",
          description: "Emergency shelter and support for women and children experiencing abuse",
          address: "Available in UAE",
          latitude: "25.2048",
          longitude: "55.2708",
          phone: "800 111 (toll-free UAE)",
          website: "https://www.dfwac.ae/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "AE",
          languages: ["English", "Arabic"],
          distance: 0,
        },
        // INDIA CRISIS RESOURCES
        {
          id: "crisis-in-vandrevala",
          name: "Vandrevala Foundation Helpline",
          type: "crisis",
          specialty: "24/7 Mental Health Crisis Support",
          description: "Professional mental health crisis support and counselling",
          address: "Available across India",
          latitude: "19.0760",
          longitude: "72.8777",
          phone: "1860 2662 345",
          website: "https://www.vandrevalafoundation.com/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "IN",
          languages: ["English", "Hindi"],
          distance: 0,
        },
        {
          id: "crisis-in-women",
          name: "Women Helpline India",
          type: "crisis",
          specialty: "Women in Distress Support",
          description: "Government helpline for women facing violence or abuse",
          address: "Available across India",
          latitude: "28.6139",
          longitude: "77.2090",
          phone: "181 (toll-free)",
          website: "https://ncw.nic.in/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "IN",
          languages: ["English", "Hindi", "Regional languages"],
          distance: 0,
        },
        // SOUTH AFRICA CRISIS RESOURCES
        {
          id: "crisis-za-lifeline",
          name: "South African Depression & Anxiety Group",
          type: "crisis",
          specialty: "Mental Health Crisis Support",
          description: "Counselling and support for depression, anxiety, and mental health crises",
          address: "Available across South Africa",
          latitude: "-26.2041",
          longitude: "28.0473",
          phone: "0800 567 567",
          website: "https://www.sadag.org/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "ZA",
          languages: ["English", "Afrikaans", "Zulu"],
          distance: 0,
        },
        // NEW ZEALAND CRISIS RESOURCES
        {
          id: "crisis-nz-lifeline",
          name: "Lifeline New Zealand",
          type: "crisis",
          specialty: "24/7 Crisis Support",
          description: "Confidential support for anyone feeling overwhelmed or in distress",
          address: "Available across New Zealand",
          latitude: "-36.8485",
          longitude: "174.7633",
          phone: "0800 543 354",
          website: "https://www.lifeline.org.nz/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "NZ",
          languages: ["English", "Maori"],
          distance: 0,
        },
        // CHINA CRISIS RESOURCES
        {
          id: "crisis-cn-beijing",
          name: "Beijing Psychological Crisis Research & Intervention Center",
          type: "crisis",
          specialty: "24/7 Crisis Hotline",
          description: "Psychological crisis intervention and suicide prevention hotline",
          address: "Available across China",
          latitude: "39.9042",
          longitude: "116.4074",
          phone: "010-82951332",
          website: "https://www.crisis.org.cn/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "CN",
          languages: ["Mandarin"],
          distance: 0,
        },
        {
          id: "crisis-cn-hope24",
          name: "Hope 24 Hotline",
          type: "crisis",
          specialty: "Mental Health Crisis Support",
          description: "National mental health crisis support and counselling service",
          address: "Available across China",
          latitude: "31.2304",
          longitude: "121.4737",
          phone: "400-161-9995",
          website: "https://www.hope24.com.cn/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "CN",
          languages: ["Mandarin", "English"],
          distance: 0,
        },
        // INTERNATIONAL FALLBACK
        {
          id: "crisis-international-iasp",
          name: "International Association for Suicide Prevention",
          type: "crisis",
          specialty: "Global Crisis Resource Directory",
          description: "Find crisis centres and helplines worldwide through the IASP directory",
          address: "Worldwide",
          latitude: "0",
          longitude: "0",
          phone: "Visit website for your country's helpline",
          website: "https://www.iasp.info/resources/Crisis_Centres/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "INT",
          languages: ["Multiple languages"],
          distance: 0,
        },
        {
          id: "crisis-international-befrienders",
          name: "Befrienders Worldwide",
          type: "crisis",
          specialty: "Emotional Support Directory",
          description: "Global network of emotional support centres - find help in your country",
          address: "Worldwide",
          latitude: "0",
          longitude: "0",
          phone: "Visit website for local numbers",
          website: "https://www.befrienders.org/",
          hours: "24/7",
          isFree: true,
          isOnline: true,
          isNationwide: true,
          countryCode: "INT",
          languages: ["Multiple languages"],
          distance: 0,
        },
      ];

      // Combine database resources with static crisis resources and 211 Ontario results
      const combinedResources = [
        ...staticCrisisResources.filter(
          (r: any) => genderFilter === "all" || r.genderFocus === genderFilter || !r.genderFocus
        ),
        ...allResources,
        ...ontario211Resources, // Add supplementary 211 Ontario results
      ];

      // Calculate actual distances using haversine formula
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);

      const resourcesWithDistance = combinedResources.map((resource: any) => ({
        ...resource,
        distance: resource.isOnline
          ? 0
          : Math.round(
              calculateDistance(
                userLat,
                userLng,
                parseFloat(resource.latitude || "0"),
                parseFloat(resource.longitude || "0")
              )
            ),
      }));

      // Filter by resource type if specified
      let filtered =
        filterType === "all"
          ? resourcesWithDistance
          : resourcesWithDistance.filter((r: any) => r.type === filterType);

      // Smart geo-fencing: prioritize user's country
      const userCountry = (userCountryCode as string)?.toUpperCase() || 'CA';
      
      // Filter by distance and country (limit worldwide noise)
      // 1. Keep all crisis resources in user's country
      // 2. Keep online resources
      // 3. Filter local resources by distance
      // 4. LIMIT results for other countries to only the most critical ones
      filtered = filtered.filter((r: any) => {
        const isUserCountry = r.countryCode === userCountry;
        if (isUserCountry) return true;
        if (r.countryCode === 'INT') return true;
        if (r.type === "crisis" && r.isNationwide) return true;
        return false;
      });

      // Filter local resources by distance (for non-nationwide)
      filtered = filtered.filter(
        (r: any) => r.isNationwide || r.isOnline || r.distance <= distanceNum
      );

      // Sort: user's country first, then crisis, then by distance
      filtered.sort((a: any, b: any) => {
        // Priority 1: User's country resources first
        const aUserCountry = a.countryCode === userCountry;
        const bUserCountry = b.countryCode === userCountry;
        if (aUserCountry && !bUserCountry) return -1;
        if (!aUserCountry && bUserCountry) return 1;
        
        // Priority 2: Crisis resources within each country group
        if (a.type === "crisis" && b.type !== "crisis") return -1;
        if (a.type !== "crisis" && b.type === "crisis") return 1;
        
        // Priority 3: Nationwide services before local
        if (a.isNationwide && !b.isNationwide) return -1;
        if (!a.isNationwide && b.isNationwide) return 1;
        
        // Priority 4: By distance
        return a.distance - b.distance;
      });

      res.json(filtered);
    } catch (error) {
      console.error("Error fetching support resources:", error);
      res.status(500).json({ message: "Failed to fetch support resources" });
    }
  });

  // Keep old therapists endpoint for backward compatibility
  app.get("/api/therapists", isAuthenticated, async (req, res) => {
    // Redirect to support-resources with therapist filter
    req.query.resourceType = "therapist";
    return app._router.handle(
      Object.assign(req, { url: "/api/support-resources", originalUrl: "/api/support-resources" }),
      res,
      () => {}
    );
  });

  app.post("/api/therapists", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertTherapistSchema.parse(req.body);
      const therapist = await storage.createTherapist(parsed);
      res.json(therapist);
    } catch (error: any) {
      console.error("Error creating therapist:", error);
      res.status(400).json({ message: error.message || "Failed to create therapist" });
    }
  });

  // Audit log and export routes
  app.get("/api/audit-trail", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate, format } = req.query;

      const auditTrail = await storage.getUserAuditTrail(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      // Create audit log for export
      await storage.createAuditLog({
        userId,
        actionType: "export",
        resourceType: "audit_trail",
        details: {
          format,
          itemCount:
            auditTrail.summary.totalMessages +
            auditTrail.summary.totalEvents +
            auditTrail.summary.totalCalls,
        },
      });

      // If format is CSV or PDF, convert the data
      if (format === "json") {
        res.json(auditTrail);
      } else if (format === "csv") {
        // Generate FRO-compliant CSV with conversation metadata
        let csv = "Type,Content,Date,Conversation Type,Participants,Tone,Details\n";

        auditTrail.messages.forEach((m: any) => {
          const content = (m.content || "").replace(/"/g, '""'); // Escape quotes
          const conversationType = m.conversationType || "Unknown";
          const participants = (m.participants || "Unknown").replace(/"/g, '""');
          const tone = m.tone || "N/A";
          const details = m.toneSummary ? m.toneSummary.replace(/"/g, '""') : "";
          csv += `Message,"${content}",${m.timestamp},"${conversationType}","${participants}","${tone}","${details}"\n`;
        });

        auditTrail.events.forEach((e: any) => {
          const title = (e.title || "").replace(/"/g, '""');
          csv += `Event,"${title}",${e.startDate},"N/A","N/A","N/A","Type: ${e.type}"\n`;
        });

        auditTrail.calls.forEach((c: any) => {
          csv += `Call,"${c.callType} call",${c.createdAt},"N/A","N/A","N/A","Code: ${c.sessionCode}"\n`;
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="audit-trail.csv"');
        res.send(csv);
      } else {
        res.json(auditTrail);
      }
    } catch (error) {
      console.error("Error fetching audit trail:", error);
      res.status(500).json({ message: "Failed to fetch audit trail" });
    }
  });

  app.get("/api/audit-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getAuditLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // AI Listening - Emotion analysis from audio
  app.post("/api/analyze-emotion", isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId, audioData, mimeType, timestamp } = req.body;

      if (!audioData) {
        return res.status(400).json({ message: "Audio data required" });
      }

      // Transcribe audio using Whisper
      const transcription = await transcribeFromBase64(audioData, mimeType);

      if (!transcription.text || transcription.text.trim().length === 0) {
        return res.json({
          emotion: "neutral",
          confidence: 0,
          summary: "No speech detected",
        });
      }

      // Analyze emotion from transcript
      const emotionResult = await analyzeEmotion(transcription.text);

      res.json(emotionResult);
    } catch (error) {
      console.error("Error analyzing emotion:", error);
      res.status(500).json({
        emotion: "neutral",
        confidence: 0,
        summary: "Analysis failed",
      });
    }
  });

  // AI Listening - Generate session summary
  app.post("/api/session-summary", isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId, emotionTimeline } = req.body;

      if (!emotionTimeline || emotionTimeline.length === 0) {
        return res.json({
          summary: "No emotional data recorded for this session.",
        });
      }

      const summary = await generateSessionSummary(emotionTimeline);

      // Save to database
      await storage.createSessionMoodSummary({
        sessionId,
        participants: [req.user.claims.sub], // Will be updated with actual participants
        emotionsTimeline: emotionTimeline,
        summary,
      });

      res.json({ summary });
    } catch (error) {
      console.error("Error generating session summary:", error);
      res.status(500).json({
        summary:
          "Your conversation showed thoughtful communication. Keep building on these positive interactions.",
      });
    }
  });

  // Get session mood summary
  app.get("/api/session-mood/:sessionId", isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const summary = await storage.getSessionMoodSummary(sessionId);

      if (!summary) {
        return res.status(404).json({ message: "Summary not found" });
      }

      res.json(summary);
    } catch (error) {
      console.error("Error fetching session mood:", error);
      res.status(500).json({ message: "Failed to fetch session mood" });
    }
  });

  // Parenting tips API with smart fallback
  app.get("/api/parenting-tips", isAuthenticatedEither, async (req: any, res) => {
    const parsedAge =
      req.query.childAgeMonths && req.query.childAgeMonths !== "all"
        ? parseInt(req.query.childAgeMonths as string, 10)
        : NaN;
    const ageMonths = isNaN(parsedAge) ? undefined : parsedAge;
    const categoryFilter = normalizeParentingCategory(req.query.category as string | undefined);

    try {
      // First, try exact match
      let tips = await storage.getParentingTips(ageMonths, categoryFilter);

      // Smart fallback: if no exact matches, progressively relax filters
      if (tips.length === 0) {
        // Fallback 1: Try age only (ignore category)
        if (ageMonths !== undefined && categoryFilter) {
          tips = await storage.getParentingTips(ageMonths, undefined);
          if (tips.length > 0) {
            console.log(`[Tips] No exact match, falling back to age-only (${tips.length} results)`);
          }
        }

        // Fallback 2: Try category only (ignore age)
        if (tips.length === 0 && categoryFilter) {
          tips = await storage.getParentingTips(undefined, categoryFilter);
          if (tips.length > 0) {
            console.log(`[Tips] No exact match, falling back to category-only (${tips.length} results)`);
          }
        }

        // Fallback 3: Try age ±24 months (for broader age range)
        if (tips.length === 0 && ageMonths !== undefined) {
          const allTips = await storage.getParentingTips(undefined, undefined);
          tips = allTips.filter(tip => {
            const minAge = parseInt(tip.ageMinMonths);
            const maxAge = parseInt(tip.ageMaxMonths);
            // Include tips that are within 24 months of target age
            return (ageMonths >= minAge - 24 && ageMonths <= maxAge + 24);
          });
          if (tips.length > 0) {
            console.log(`[Tips] No exact match, falling back to age ±24 months (${tips.length} results)`);
          }
        }

        // Fallback 4: Return general tips (all ages) as last resort
        if (tips.length === 0) {
          const allTips = await storage.getParentingTips(undefined, undefined);
          // Prioritize "all ages" tips (ageMinMonths = 0 and ageMaxMonths >= 144)
          tips = allTips.filter(tip => 
            parseInt(tip.ageMinMonths) === 0 && parseInt(tip.ageMaxMonths) >= 144
          );
          if (tips.length === 0) {
            tips = allTips.slice(0, 10); // Take first 10 tips as absolute fallback
          }
          console.log(`[Tips] Using general fallback (${tips.length} results)`);
        }
      }

      if (tips.length === 0) {
        tips = getFallbackParentingTips(parentingTipFallbackCatalog, ageMonths, categoryFilter);
      }

      res.json(tips);
    } catch (error) {
      console.error("Error fetching parenting tips:", error);
      res.json(getFallbackParentingTips(parentingTipFallbackCatalog, ageMonths, categoryFilter));
    }
  });

  app.get("/api/parenting-tips/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const tip = await storage.getParentingTip(req.params.id);

      if (!tip) {
        return res.status(404).json({ message: "Tip not found" });
      }

      res.json(tip);
    } catch (error) {
      console.error("Error fetching parenting tip:", error);
      res.status(500).json({ message: "Failed to fetch parenting tip" });
    }
  });

  // Weather activities API
  app.get("/api/weather-activities", isAuthenticatedEither, async (req: any, res) => {
    const parsedAge =
      req.query.childAgeMonths && req.query.childAgeMonths !== "all"
        ? parseInt(req.query.childAgeMonths as string, 10)
        : NaN;
    const ageMonths = Number.isFinite(parsedAge) ? parsedAge : undefined;
    const weather = normalizeWeatherCondition(req.query.weatherCondition as string | undefined);

    try {
      console.log(`[API] Fetching activities - Age: ${ageMonths}, Weather: ${weather}`);

      let activities = await storage.getWeatherActivities(ageMonths, weather);

      // Smart fallback logic
      if (activities.length === 0) {
        if (weather && ageMonths !== undefined) {
          console.log(`[API] No exact matches. Falling back to weather: ${weather}`);
          activities = await storage.getWeatherActivities(undefined, weather);
        }
        
        if (activities.length === 0 && ageMonths !== undefined) {
          console.log(`[API] Still no matches. Falling back to age: ${ageMonths}`);
          activities = await storage.getWeatherActivities(ageMonths, undefined);
        }

        if (activities.length === 0) {
          console.log(`[API] Final fallback: returning all activities`);
          activities = await storage.getWeatherActivities();
        }
      }

      if (activities.length === 0) {
        activities = getFallbackWeatherActivities(weatherActivityFallbackCatalog, ageMonths, weather);
      }

      res.json(activities);
    } catch (error) {
      console.error("Error fetching weather activities:", error);
      res.json(getFallbackWeatherActivities(weatherActivityFallbackCatalog, ageMonths, weather));
    }
  });

  // Storybooks API
  app.get("/api/storybooks", isAuthenticatedEither, async (req: any, res) => {
    try {
      const { partnershipId } = req.query;
      if (!partnershipId) {
        return res.status(400).json({ message: "Partnership ID required" });
      }
      const books = await storage.getStorybooks(partnershipId as string);
      res.json(books);
    } catch (error) {
      console.error("Error fetching storybooks:", error);
      res.status(500).json({ message: "Failed to fetch storybooks" });
    }
  });

  app.post("/api/storybooks", isAuthenticatedEither, async (req: any, res) => {
    try {
      const book = await storage.createStorybook(req.body);
      res.json(book);
    } catch (error) {
      console.error("Error creating storybook:", error);
      res.status(500).json({ message: "Failed to create storybook" });
    }
  });

  app.get("/api/storybooks/:id/pages", isAuthenticatedEither, async (req: any, res) => {
    try {
      const pages = await storage.getStoryPages(req.params.id);
      res.json(pages);
    } catch (error) {
      console.error("Error fetching story pages:", error);
      res.status(500).json({ message: "Failed to fetch story pages" });
    }
  });

  app.post("/api/storybooks/:id/pages", isAuthenticatedEither, async (req: any, res) => {
    try {
      const page = await storage.createStoryPage({ ...req.body, storyId: req.params.id });
      // Update storybook timestamp
      await storage.updateStorybook(req.params.id, {});
      res.json(page);
    } catch (error) {
      console.error("Error creating story page:", error);
      res.status(500).json({ message: "Failed to create story page" });
    }
  });

  app.patch("/api/story-pages/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const page = await storage.updateStoryPage(req.params.id, req.body);
      res.json(page);
    } catch (error) {
      console.error("Error updating story page:", error);
      res.status(500).json({ message: "Failed to update story page" });
    }
  });

  // Shopping lists API - supports both auth methods
  app.get("/api/shopping-lists", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { partnershipId } = req.query;
      if (!partnershipId) {
        return res.status(400).json({ message: "Partnership ID required" });
      }
      const lists = await storage.getShoppingLists(partnershipId as string);
      res.json(lists);
    } catch (error) {
      console.error("Error fetching shopping lists:", error);
      res.status(500).json({ message: "Failed to fetch shopping lists" });
    }
  });

  app.post("/api/shopping-lists", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const list = await storage.createShoppingList(req.body);
      res.json(list);
    } catch (error) {
      console.error("Error creating shopping list:", error);
      res.status(500).json({ message: "Failed to create shopping list" });
    }
  });

  app.get("/api/shopping-lists/:id/items", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const items = await storage.getShoppingItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shopping items:", error);
      res.status(500).json({ message: "Failed to fetch shopping items" });
    }
  });

  app.post("/api/shopping-lists/:id/items", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const item = await storage.createShoppingItem({ ...req.body, listId: req.params.id });
      res.json(item);
    } catch (error) {
      console.error("Error creating shopping item:", error);
      res.status(500).json({ message: "Failed to create shopping item" });
    }
  });

  app.patch("/api/shopping-items/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const item = await storage.updateShoppingItem(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating shopping item:", error);
      res.status(500).json({ message: "Failed to update shopping item" });
    }
  });

  app.delete("/api/shopping-items/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await storage.deleteShoppingItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shopping item:", error);
      res.status(500).json({ message: "Failed to delete shopping item" });
    }
  });

  // Beta Feedback API
  app.post("/api/feedback", rateLimiters.standard, async (req: any, res) => {
    try {
      // Allow both authenticated and guest users to submit feedback
      const userId = req.user?.claims?.sub || null;

      // Sanitize user input
      const sanitizedBody = {
        ...req.body,
        subject: sanitizeInput(req.body.subject),
        description: sanitizeInput(req.body.description),
        userId,
        deviceInfo: req.headers["user-agent"] || "",
        appVersion: "1.0.0-beta", // Will update this dynamically later
        url: req.body.url || req.headers.referer || "",
      };

      const parsed = insertFeedbackSchema.parse(sanitizedBody);
      const feedback = await storage.createFeedback(parsed);

      console.log("[Feedback] New feedback received:", feedback.type, feedback.category);
      res.json(feedback);
    } catch (error: any) {
      console.error("Error creating feedback:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid feedback data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  // Admin: Get all users
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();

      // Sort by created date descending (newest first)
      const sortedUsers = allUsers.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      res.json(sortedUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.query;
      const feedbackList = status
        ? await storage.getFeedbackByStatus(status as string)
        : await storage.getAllFeedback();

      res.json(feedbackList);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.patch("/api/admin/feedback/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { status, adminNotes } = req.body;
      const updated = await storage.updateFeedbackStatus(req.params.id, status, adminNotes);
      res.json(updated);
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  // Admin dashboard statistics API
  // NOTE: During beta, any authenticated user can access admin stats since all users are beta testers
  // TODO: Before production launch, implement proper role-based authorization (admin flag or allowlist)
  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  // Admin partnerships list
  app.get("/api/admin/partnerships", isAuthenticated, async (req: any, res) => {
    try {
      const allPartnerships = await storage.getAllPartnerships();
      
      // Enrich with user details
      const enrichedPartnerships = await Promise.all(
        allPartnerships.map(async (p: any) => {
          const user1 = await storage.getUser(p.userId);
          const user2 = await storage.getUser(p.partnerId);
          return {
            ...p,
            user1Name: user1?.displayName || user1?.email || 'Unknown',
            user1Email: user1?.email || null,
            user2Name: user2?.displayName || user2?.email || 'Unknown',
            user2Email: user2?.email || null,
          };
        })
      );
      
      res.json(enrichedPartnerships);
    } catch (error) {
      console.error("Error fetching partnerships:", error);
      res.status(500).json({ message: "Failed to fetch partnerships" });
    }
  });

  // Admin messages list with stats
  app.get("/api/admin/messages", isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getMessages();
      
      // Get last 100 messages for display, sorted by date descending
      const sortedMessages = messages
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 100);
      
      // Enrich with sender info
      const enrichedMessages = await Promise.all(
        sortedMessages.map(async (m: any) => {
          const sender = await storage.getUser(m.senderId);
          return {
            id: m.id,
            content: m.content?.substring(0, 100) || '[No content]',
            senderId: m.senderId,
            senderName: sender?.displayName || 'Unknown',
            partnershipId: m.partnershipId,
            createdAt: m.createdAt,
            toneLabel: m.toneLabel,
            conflictScore: m.conflictEscalationScore,
          };
        })
      );
      
      res.json({
        total: messages.length,
        messages: enrichedMessages,
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/admin/web-update-metrics", isAuthenticated, (req: any, res) => {
    try {
      const windowInput = typeof req.query?.window === "string" ? req.query.window : 24;
      const metrics = getWebUpdateMetrics(windowInput);
      return res.json(metrics);
    } catch (error) {
      console.error("Error fetching web update metrics:", error);
      return res.status(500).json({ message: "Failed to fetch web update metrics" });
    }
  });

  // Gamification API routes
  // Get user stats
  app.get("/api/gamification/stats", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { partnershipId } = req.query;
      const stats = await storage.getUserStats(userId, partnershipId || undefined);

      // If no stats exist yet, return default zeros
      if (!stats) {
        return res.json({
          userId,
          partnershipId: partnershipId || null,
          totalMessagesSent: 0,
          positiveMessagesSent: 0,
          calendarEventsCreated: 0,
          tasksCompleted: 0,
          expensesLogged: 0,
          conchSessionsCompleted: 0,
        });
      }

      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Get user streaks
  app.get("/api/gamification/streaks", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { partnershipId } = req.query;
      const streaks = await storage.getStreaks(userId, partnershipId || undefined);
      res.json(streaks);
    } catch (error) {
      console.error("Error fetching streaks:", error);
      res.status(500).json({ message: "Failed to fetch streaks" });
    }
  });

  // Get all available achievements
  app.get("/api/gamification/achievements", async (req: any, res) => {
    try {
      const achievements = await storage.getAchievements();
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Get user's earned achievements
  app.get("/api/gamification/user-achievements", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { partnershipId } = req.query;
      const userAchievements = await storage.getUserAchievements(
        userId,
        partnershipId || undefined
      );
      res.json(userAchievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch user achievements" });
    }
  });

  // Safety Plan routes
  // Get user's safety plan
  app.get("/api/safety-plan", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const plan = await storage.getSafetyPlan(userId);
      if (!plan) {
        return res.status(404).json({ message: "No safety plan found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Error fetching safety plan:", error);
      res.status(500).json({ message: "Failed to fetch safety plan" });
    }
  });

  // Create safety plan (encrypted)
  app.post("/api/safety-plan", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user already has a plan
      const existingPlan = await storage.getSafetyPlan(userId);
      if (existingPlan) {
        return res.status(400).json({ message: "Safety plan already exists. Use PUT to update." });
      }

      // No validation needed - just accept the safety plan data and encrypt it
      const plan = await storage.createSafetyPlan(userId, req.body);

      broadcastSafetyPlanUpdate(userId, "created");

      res.json(plan);
    } catch (error: any) {
      console.error("Error creating safety plan:", error);
      res.status(400).json({ message: error.message || "Failed to create safety plan" });
    }
  });

  // Update safety plan (encrypted)
  app.put("/api/safety-plan", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // No validation needed - just accept the safety plan data and encrypt it
      const plan = await storage.updateSafetyPlan(userId, req.body);

      broadcastSafetyPlanUpdate(userId, "updated");

      res.json(plan);
    } catch (error: any) {
      console.error("Error updating safety plan:", error);
      res.status(400).json({ message: error.message || "Failed to update safety plan" });
    }
  });

  // Delete safety plan
  app.delete("/api/safety-plan", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await storage.deleteSafetyPlan(userId);

      broadcastSafetyPlanUpdate(userId, "deleted");

      res.json({ message: "Safety plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting safety plan:", error);
      res.status(500).json({ message: "Failed to delete safety plan" });
    }
  });

  // ==================== ROGERIAN ACTIVE LISTENING ROUTES ====================

  // Validate a summary against original content using AI
  app.post("/api/summaries/validate", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { originalContent, summaryText, context } = req.body;

      if (!originalContent || !summaryText) {
        return res.status(400).json({ message: "originalContent and summaryText are required" });
      }

      const validationInput: SummaryValidationInput = {
        originalContent: sanitizeInput(originalContent),
        summaryText: sanitizeInput(summaryText),
        context: context ? sanitizeInput(context) : undefined,
      };

      const result = await validateSummary(validationInput);
      res.json(result);
    } catch (error) {
      console.error("Error validating summary:", error);
      res.status(500).json({ message: "Failed to validate summary" });
    }
  });

  // Create and store a message summary
  app.post("/api/summaries", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const partnershipId = req.headers["x-partnership-id"] as string;
      if (!partnershipId) {
        return res.status(400).json({ message: "Partnership ID is required" });
      }

      // Verify user has access to this partnership
      const userPartnerships = await storage.getPartnerships(userId);
      const hasAccess = userPartnerships.some((p) => p.id === partnershipId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this partnership" });
      }

      const sanitizedBody = sanitizeObject(req.body);
      const parsed = insertMessageSummarySchema.safeParse({
        ...sanitizedBody,
        createdBy: userId,
        partnershipId,
      });

      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: "Invalid summary data", errors: parsed.error.flatten() });
      }

      const summary = await storage.createMessageSummary(parsed.data);

      // Track achievements and streak
      let newAchievements: any[] = [];
      let streakInfo = null;

      // Update user stats for understanding streak if validation passed
      if (parsed.data.validationScore && parsed.data.validationScore >= 60) {
        try {
          await storage.incrementUserStat(userId, "summariesValidated", 1, partnershipId);
          await storage.incrementStreak(userId, "understanding", partnershipId);

          // Get updated streak
          streakInfo = await storage.getStreak(userId, "understanding", partnershipId);

          // Get total summaries for achievement checks
          const userSummaries = await storage.getMessageSummariesByUser(userId);
          const totalSummaries = userSummaries.length;

          // Check listening count achievements
          const countAchievements = [
            { code: "first_listen", requirement: 1 },
            { code: "listen_3", requirement: 3 },
            { code: "listen_10", requirement: 10 },
            { code: "listen_25", requirement: 25 },
          ];

          for (const achievement of countAchievements) {
            if (totalSummaries >= achievement.requirement) {
              const hasIt = await storage.hasAchievement(userId, achievement.code, partnershipId);
              if (!hasIt) {
                const awarded = await storage.awardAchievement(
                  userId,
                  achievement.code,
                  partnershipId
                );
                if (awarded) {
                  const achievementDetails = await storage.getAchievementByCode(achievement.code);
                  if (achievementDetails) {
                    newAchievements.push(achievementDetails);
                  }
                }
              }
            }
          }

          // Check streak achievements
          if (streakInfo) {
            const streakAchievements = [
              { code: "listen_streak_3", requirement: 3 },
              { code: "listen_streak_7", requirement: 7 },
              { code: "listen_streak_14", requirement: 14 },
            ];

            for (const achievement of streakAchievements) {
              if (streakInfo.currentStreak >= achievement.requirement) {
                const hasIt = await storage.hasAchievement(userId, achievement.code, partnershipId);
                if (!hasIt) {
                  const awarded = await storage.awardAchievement(
                    userId,
                    achievement.code,
                    partnershipId
                  );
                  if (awarded) {
                    const achievementDetails = await storage.getAchievementByCode(achievement.code);
                    if (achievementDetails) {
                      newAchievements.push(achievementDetails);
                    }
                  }
                }
              }
            }
          }

          // Check perfect score achievement (90%+)
          if (parsed.data.validationScore >= 90) {
            const hasIt = await storage.hasAchievement(userId, "perfect_score", partnershipId);
            if (!hasIt) {
              const awarded = await storage.awardAchievement(
                userId,
                "perfect_score",
                partnershipId
              );
              if (awarded) {
                const achievementDetails = await storage.getAchievementByCode("perfect_score");
                if (achievementDetails) {
                  newAchievements.push(achievementDetails);
                }
              }
            }
          }
        } catch (statError) {
          console.error("Error updating understanding stats:", statError);
        }
      }

      res.json({
        ...summary,
        streak: streakInfo,
        newAchievements,
      });
    } catch (error) {
      console.error("Error creating message summary:", error);
      res.status(500).json({ message: "Failed to create message summary" });
    }
  });

  // Get user's listening stats
  app.get("/api/summaries/stats/:userId", isAuthenticatedEither, async (req: any, res) => {
    try {
      const currentUserId = getUserId(req);
      if (!currentUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const targetUserId = req.params.userId;

      // Only allow users to view their own stats
      if (targetUserId !== currentUserId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const partnershipId = req.headers["x-partnership-id"] as string;

      // Verify user has access to this partnership if provided
      if (partnershipId) {
        const userPartnerships = await storage.getPartnerships(targetUserId);
        const hasAccess = userPartnerships.some((p) => p.id === partnershipId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied to this partnership" });
        }
      }

      const [userStats, understandingStreak, recentSummaries] = await Promise.all([
        storage.getUserStats(targetUserId, partnershipId),
        storage.getStreak(targetUserId, "understanding", partnershipId),
        storage.getMessageSummariesByUser(targetUserId, 10),
      ]);

      const validatedCount = recentSummaries.filter(
        (s) => s.validationScore && s.validationScore >= 60
      ).length;
      const avgScore =
        recentSummaries.length > 0
          ? Math.round(
              recentSummaries.reduce((sum, s) => sum + (s.validationScore || 0), 0) /
                recentSummaries.length
            )
          : 0;

      res.json({
        summariesValidated: userStats?.summariesValidated || 0,
        understandingStreak: understandingStreak?.currentStreak || 0,
        longestUnderstandingStreak: understandingStreak?.longestStreak || 0,
        recentValidatedCount: validatedCount,
        recentAverageScore: avgScore,
      });
    } catch (error) {
      console.error("Error fetching listening stats:", error);
      res.status(500).json({ message: "Failed to fetch listening stats" });
    }
  });

  // Get listening settings
  app.get("/api/listening-settings", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const settings = await storage.getListeningSettings(userId);

      // Return default settings if none exist
      if (!settings) {
        return res.json({
          userId,
          enableConchModeSummary: true,
          enableChatUnderstandingCheck: true,
          emotionalMessageThreshold: 60,
          showUnderstandingStreak: true,
        });
      }

      res.json(settings);
    } catch (error) {
      console.error("Error fetching listening settings:", error);
      res.status(500).json({ message: "Failed to fetch listening settings" });
    }
  });

  // Update listening settings
  app.put("/api/listening-settings", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const sanitizedBody = sanitizeObject(req.body);
      const parsed = insertListeningSettingsSchema.safeParse({
        ...sanitizedBody,
        userId,
      });

      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: "Invalid settings data", errors: parsed.error.flatten() });
      }

      const settings = await storage.upsertListeningSettings(parsed.data);
      res.json(settings);
    } catch (error) {
      console.error("Error updating listening settings:", error);
      res.status(500).json({ message: "Failed to update listening settings" });
    }
  });

  // Detect if a message is emotional (for chat understanding check feature)
  app.post("/api/summaries/detect-emotional", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: "content is required" });
      }

      const result = await detectEmotionalMessage(sanitizeInput(content));
      res.json(result);
    } catch (error) {
      console.error("Error detecting emotional message:", error);
      res.status(500).json({ message: "Failed to detect emotional message" });
    }
  });

  // ============================================
  // AGENT MEMORY & INTELLIGENCE API
  // ============================================

  // Get relationship context for current conversation
  app.get("/api/agent/context", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res.status(400).json({ message: "No active partnership" });
      }

      const { query, limit = 10 } = req.query;
      const embeddingService = await import('./services/embeddingService');
      
      if (query) {
        const memories = await embeddingService.findSimilarMemories(
          user.activePartnershipId,
          String(query),
          Number(limit)
        );
        return res.json({ memories });
      }

      const summary = await embeddingService.getRelationshipSummary(user.activePartnershipId);
      const patterns = await embeddingService.detectRecurringPatterns(user.activePartnershipId);
      
      res.json({ summary, patterns });
    } catch (error) {
      console.error("Error getting agent context:", error);
      res.status(500).json({ message: "Failed to get agent context" });
    }
  });

  // Get relationship memories with filters
  app.get("/api/agent/memories", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res.status(400).json({ message: "No active partnership" });
      }

      const { dayOfWeek, timeOfDay, memoryType, minConflictScore } = req.query;
      
      const memories = await storage.getRelationshipMemoriesByPattern(
        user.activePartnershipId,
        {
          dayOfWeek: dayOfWeek ? Number(dayOfWeek) : undefined,
          timeOfDay: timeOfDay ? String(timeOfDay) : undefined,
          memoryType: memoryType ? String(memoryType) : undefined,
          minConflictScore: minConflictScore ? Number(minConflictScore) : undefined,
        }
      );

      res.json(memories);
    } catch (error) {
      console.error("Error getting memories:", error);
      res.status(500).json({ message: "Failed to get memories" });
    }
  });

  // Get conflict patterns
  app.get("/api/agent/patterns", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res.status(400).json({ message: "No active partnership" });
      }

      const patterns = await storage.getConflictPatterns(user.activePartnershipId);
      res.json(patterns);
    } catch (error) {
      console.error("Error getting patterns:", error);
      res.status(500).json({ message: "Failed to get patterns" });
    }
  });

  // Get agent interventions history
  app.get("/api/agent/interventions", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res.status(400).json({ message: "No active partnership" });
      }

      const { limit = 50 } = req.query;
      const interventions = await storage.getAgentInterventions(
        user.activePartnershipId,
        Number(limit)
      );
      res.json(interventions);
    } catch (error) {
      console.error("Error getting interventions:", error);
      res.status(500).json({ message: "Failed to get interventions" });
    }
  });

  // Update intervention response
  app.put("/api/agent/interventions/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { userResponse, responseDetails } = req.body;

      const updated = await storage.updateAgentIntervention(id, {
        userResponse,
        responseDetails,
        respondedAt: new Date(),
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating intervention:", error);
      res.status(500).json({ message: "Failed to update intervention" });
    }
  });

  // Get/update agent settings
  app.get("/api/agent/settings", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let settings = await storage.getAgentSettings(userId);
      if (!settings) {
        settings = await storage.upsertAgentSettings({ userId });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error getting agent settings:", error);
      res.status(500).json({ message: "Failed to get agent settings" });
    }
  });

  app.put("/api/agent/settings", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const settings = await storage.upsertAgentSettings({
        userId,
        ...req.body,
      });
      res.json(settings);
    } catch (error) {
      console.error("Error updating agent settings:", error);
      res.status(500).json({ message: "Failed to update agent settings" });
    }
  });

  // Get agent recommendations (proactive insights)
  app.get("/api/agent/recommendations", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res.status(400).json({ message: "No active partnership" });
      }

      const agentOrchestrator = await import('./services/agentOrchestrator');
      const recommendations = await agentOrchestrator.getAgentRecommendations(
        user.activePartnershipId,
        userId
      );

      res.json(recommendations);
    } catch (error) {
      console.error("Error getting agent recommendations:", error);
      res.status(500).json({ message: "Failed to get agent recommendations" });
    }
  });

  // ============================================
  // SUMMARIES & REPORTS API
  // ============================================

  // Get daily summary
  app.get("/api/summaries/daily", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res.status(400).json({ message: "No active partnership" });
      }

      const summaryService = await import('./services/summaryService');
      const summary = await summaryService.generateDailySummary(user.activePartnershipId);
      res.json(summary);
    } catch (error) {
      console.error("Error generating daily summary:", error);
      res.status(500).json({ message: "Failed to generate daily summary" });
    }
  });

  // Get weekly report
  app.get("/api/summaries/weekly", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res.status(400).json({ message: "No active partnership" });
      }

      const summaryService = await import('./services/summaryService');
      const report = await summaryService.generateWeeklyReport(user.activePartnershipId);
      res.json(report);
    } catch (error) {
      console.error("Error generating weekly report:", error);
      res.status(500).json({ message: "Failed to generate weekly report" });
    }
  });

  // Generate court-ready log
  app.post("/api/summaries/court-log", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res.status(400).json({ message: "No active partnership" });
      }

      const { startDate, endDate } = req.body;
      const start = new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = new Date(endDate || Date.now());

      const summaryService = await import('./services/summaryService');
      const log = await summaryService.generateCourtReadyLog(
        user.activePartnershipId,
        userId,
        start,
        end
      );
      res.json(log);
    } catch (error) {
      console.error("Error generating court-ready log:", error);
      res.status(500).json({ message: "Failed to generate court-ready log" });
    }
  });

  // Generate negotiation proposal
  app.post("/api/summaries/negotiation", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user?.activePartnershipId) {
        return res.status(400).json({ message: "No active partnership" });
      }

      const { type, details } = req.body;
      const summaryService = await import('./services/summaryService');
      const proposal = await summaryService.generateNegotiationProposal(
        user.activePartnershipId,
        userId,
        type || 'schedule_change',
        details || {}
      );
      res.json({ proposal });
    } catch (error) {
      console.error("Error generating negotiation proposal:", error);
      res.status(500).json({ message: "Failed to generate negotiation proposal" });
    }
  });

  // ============================================
  // PREP CHAT API
  // ============================================

  // Create new prep chat session
  // PrepChat works as a solo tool - no partnership required
  app.post("/api/prep-chat/sessions", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      const { topic, customTopic, emotionalStateStart } = req.body;

      const session = await storage.createPrepChatSession({
        userId,
        partnershipId: user?.activePartnershipId || null,
        topic,
        customTopic,
        emotionalStateStart,
        messages: [],
      });

      // Increment prep chat counters
      if (user) {
        try {
          await storage.upsertUser({
            ...user,
            prepChatSessionCount: (user.prepChatSessionCount ?? 0) + 1,
            firstPrepChatAt: user.firstPrepChatAt ?? new Date(),
          });
        } catch (err) {
          console.warn("[PrepChat] Failed to update prep chat counters:", err);
        }
      }

      res.json(session);
    } catch (error) {
      console.error("Error creating prep chat session:", error);
      res.status(500).json({ message: "Failed to create prep chat session" });
    }
  });

  // Get prep chat sessions
  app.get("/api/prep-chat/sessions", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { limit = 20 } = req.query;
      const sessions = await storage.getPrepChatSessions(userId, Number(limit));
      res.json(sessions);
    } catch (error) {
      console.error("Error getting prep chat sessions:", error);
      res.status(500).json({ message: "Failed to get prep chat sessions" });
    }
  });

  // Get specific prep chat session
  app.get("/api/prep-chat/sessions/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const session = await storage.getPrepChatSession(req.params.id);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error getting prep chat session:", error);
      res.status(500).json({ message: "Failed to get prep chat session" });
    }
  });

  // Update prep chat session (add message, update draft, etc.)
  app.put("/api/prep-chat/sessions/:id", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const session = await storage.getPrepChatSession(req.params.id);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ message: "Session not found" });
      }

      const updated = await storage.updatePrepChatSession(req.params.id, req.body);

      // Track draft-to-send conversions
      if (req.body.sentToChat === true) {
        try {
          const user = await storage.getUser(userId);
          if (user) {
            await storage.upsertUser({
              ...user,
              draftToSendCount: (user.draftToSendCount ?? 0) + 1,
            });
          }
        } catch (err) {
          console.warn("[PrepChat] Failed to update draftToSendCount:", err);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating prep chat session:", error);
      res.status(500).json({ message: "Failed to update prep chat session" });
    }
  });

  // Add message to prep chat (AI coaching interaction)
  app.post("/api/prep-chat/sessions/:id/messages", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const session = await storage.getPrepChatSession(req.params.id);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ message: "Session not found" });
      }

      const { content } = req.body;
      const user = await storage.getUser(userId);
      const partnership = user?.activePartnershipId 
        ? await storage.getPartnership(user.activePartnershipId) 
        : null;

      // Get co-parent info for personalized coaching
      const coParentId = partnership?.user1Id === userId 
        ? partnership?.user2Id 
        : partnership?.user1Id;
      const coParent = coParentId ? await storage.getUser(coParentId) : null;

      const messages = (session.messages as Array<{role: "user" | "coach"; content: string; timestamp: string}>) || [];
      
      // Add user message
      messages.push({
        role: 'user',
        content: sanitizeInput(content),
        timestamp: new Date().toISOString(),
      });

      // Generate AI coach response
      // Use session-stored personality for solo mode, or partnership co-parent's personality
      const userPersonality = session.userPersonalityType || user?.personalityType || undefined;
      const coParentPersonality = session.coParentPersonalityType || coParent?.personalityType || undefined;
      
      const coachResponse = await generatePrepChatCoaching(
        session.topic,
        messages,
        userPersonality,
        coParentPersonality
      );

      messages.push({
        role: 'coach',
        content: coachResponse,
        timestamp: new Date().toISOString(),
      });

      const updated = await storage.updatePrepChatSession(req.params.id, { messages });
      res.json({ 
        session: updated,
        coachMessage: coachResponse 
      });
    } catch (error) {
      console.error("Error adding prep chat message:", error);
      res.status(500).json({ message: "Failed to add message" });
    }
  });

  app.post("/api/prep-chat/sessions/:id/draft", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const session = await storage.getPrepChatSession(req.params.id);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ message: "Session not found" });
      }

      const user = await storage.getUser(userId);
      const partnership = user?.activePartnershipId
        ? await storage.getPartnership(user.activePartnershipId)
        : null;
      const coParentId = partnership?.user1Id === userId
        ? partnership?.user2Id
        : partnership?.user1Id;
      const coParent = coParentId ? await storage.getUser(coParentId) : null;

      const messages = (session.messages as Array<{role: "user" | "coach"; content: string; timestamp: string}>) || [];
      const userPersonality = session.userPersonalityType || user?.personalityType || undefined;
      const coParentPersonality = session.coParentPersonalityType || coParent?.personalityType || undefined;

      const result = await generatePrepChatDraft(
        session.customTopic || session.topic,
        messages,
        userPersonality,
        coParentPersonality,
      );

      const updated = await storage.updatePrepChatSession(req.params.id, {
        draftedMessage: result.draft,
      });

      res.json({
        session: updated,
        draft: result.draft,
        note: result.note,
      });
    } catch (error) {
      console.error("Error generating prep chat draft:", error);
      res.status(500).json({ message: "Failed to generate draft" });
    }
  });

  // Analyze draft message tone
  app.post("/api/prep-chat/analyze-draft", isAuthenticatedEither, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { draft, coParentPersonality, userPersonality } = req.body;
      const normalizePersonalityPayload = (value: unknown): string | undefined => {
        if (typeof value !== "string") return undefined;
        const normalized = value.trim().toUpperCase();
        return /^[EI][NS][TF][JP]$/.test(normalized) ? normalized : undefined;
      };

      const normalizedCoParentPersonality = normalizePersonalityPayload(coParentPersonality);
      const normalizedUserPersonality = normalizePersonalityPayload(userPersonality);

      if (typeof coParentPersonality === "string" && coParentPersonality.trim() && !normalizedCoParentPersonality) {
        console.warn("[PrepChat] Ignoring invalid coParentPersonality payload", { userId, coParentPersonality });
      }
      if (typeof userPersonality === "string" && userPersonality.trim() && !normalizedUserPersonality) {
        console.warn("[PrepChat] Ignoring invalid userPersonality payload", { userId, userPersonality });
      }

      const analysis = await analyzeDraftTone(
        sanitizeInput(draft),
        normalizedCoParentPersonality,
        normalizedUserPersonality
      );

      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing draft:", error);
      res.status(500).json({ message: "Failed to analyze draft" });
    }
  });

  const httpServer = createServer(app);

  // Set up WebRTC signaling server
  setupWebRTCSignaling(httpServer);

  return httpServer;
}
