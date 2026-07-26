import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("iOS privacy release guard", () => {
  it("ships a first-party versioned mobile privacy policy without unsupported promises", () => {
    const privacy = readSource("../../client/src/pages/privacy.tsx");

    expect(privacy).toContain('const POLICY_VERSION = "1.0"');
    expect(privacy).toContain('const EFFECTIVE_DATE = "July 25, 2026"');
    expect(privacy).toContain("PeacePad mobile app and website");
    expect(privacy).toContain("AI suggestions are advisory");
    expect(privacy).toContain("not end-to-end encrypted");
    expect(privacy).not.toMatch(/termsfeed/i);
    expect(privacy).not.toMatch(/encrypted in transit and at rest/i);
    expect(privacy).not.toMatch(/comply with GDPR/i);
    expect(privacy).not.toMatch(/predictions are generated locally/i);
    expect(privacy).toContain(
      "External AI processing for live calls and Conch summaries, court-log generation",
    );
    expect(privacy).toContain("disabled or unavailable in this release");
  });

  it("does not load Google Analytics or provide a PostHog collection path", () => {
    const html = readSource("../../client/index.html");
    const analytics = readSource("../../client/src/lib/analytics.ts");
    const server = readSource("../../server/index.ts");

    expect(html).not.toMatch(/googletagmanager|google-analytics|G-TNTMYM1B8N/i);
    expect(server).not.toMatch(/googletagmanager|google-analytics/i);
    expect(analytics).toContain("ANALYTICS_COLLECTION_ENABLED = false");
    expect(analytics).not.toMatch(/posthog\.com|\/capture\/|\.capture\(|\.identify\(/i);
  });

  it("keeps IP geolocation disabled and message notification bodies private", () => {
    const routes = readSource("../../server/routes.ts");

    expect(routes).not.toMatch(/ip-api\.com/i);
    expect(routes).toContain("IP-based location is disabled");
    expect(routes).toContain("body: buildPrivateMessageNotificationBody(");
    expect(routes).not.toMatch(/body:\s*parsed\.content/i);
    expect(routes).not.toMatch(/Transcription complete:",\s*transcript/i);
    expect(routes).not.toMatch(/Content:\s*"\$\{content\}"/i);
  });

  it("requests sensitive device permissions only from feature actions", () => {
    const app = readSource("../../client/src/App.tsx");
    const notifications = readSource(
      "../../client/src/utils/capacitor-notifications.ts",
    );
    const weather = readSource("../../client/src/pages/weather-activities.tsx");
    const therapist = readSource("../../client/src/pages/therapist-directory.tsx");

    expect(notifications).toContain("if (isNativeApp())");
    expect(notifications).toContain("Native push must be user-initiated");
    expect(app).not.toMatch(/requestNativePushConsent\(\)/);
    expect(weather).toContain("onClick={useCurrentWeather}");
    expect(weather).not.toMatch(/useEffect\([\s\S]{0,800}getCurrentPosition/);
    expect(therapist).not.toContain("Auto-detect location on page load");
    expect(therapist).toContain("handleUseMyLocation");
  });

  it("preserves local message preview and gates external AI processing on persisted consent", () => {
    const routes = readSource("../../server/routes.ts");

    expect(routes).toMatch(
      /app\.post\("\/api\/messages\/preview"[\s\S]*?analyzeRuleBasedTone\(sanitizedContent\)/,
    );
    expect(routes).toContain("const hasAiConsent = await checkAiMessageConsent(userId)");
    expect(routes).toContain("if (hasAiConsent) {");
    expect(routes).toContain("async function analyzeTone(content: string)");
    expect(routes).not.toContain("RECENT CONVERSATION HISTORY (for context)");
    expect(routes).toContain("if (!(await checkAiMessageConsent(userId)))");
    expect(routes).toContain("if (!(await checkAiCallConsent(userId)))");
    expect(routes).toContain("AI_MESSAGE_CONSENT_REQUIRED_CODE");
    expect(routes).toContain("AI_CALL_CONSENT_REQUIRED_CODE");
    for (const marker of [
      '"/api/analyze-message"',
      '"/api/detect-conflict"',
      '"/api/suggest-response"',
    ]) {
      const start = routes.indexOf(marker);
      const end = routes.indexOf("\n  );", start);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeGreaterThan(start);
      const route = routes.slice(start, end);
      expect(route).toContain("checkAiMessageConsent(userId)");
      expect(route).toContain("res.status(403).json");
      expect(route).toContain("AI_MESSAGE_CONSENT_REQUIRED_CODE");
    }
  });

  it("keeps shared-call, court-log, event, and location release paths off external AI", () => {
    const routes = readSource("../../server/routes.ts");
    const conch = readSource("../../server/conchContentAnalyzer.ts");
    const emotion = readSource("../../server/emotionAnalyzer.ts");
    const summaryValidator = readSource("../../server/summaryValidator.ts");
    const summaries = readSource("../../server/services/summaryService.ts");

    expect(conch).toContain("const EXTERNAL_CONCH_AI_ENABLED = false");
    expect(emotion).toContain("const EXTERNAL_EMOTION_AI_ENABLED = false");
    expect(summaryValidator).toContain(
      "const EXTERNAL_SHARED_MESSAGE_AI_ENABLED = false",
    );
    expect(routes).toContain("generateConchTurnSummary([transcript], speakerName)");
    expect(routes).toContain("buildLocalCallIntervention(currentEmotion)");
    expect(routes).toContain("Live audio analysis is unavailable in this release.");
    expect(routes).toContain("buildLocalCallSessionSummary(emotionTimeline)");
    expect(routes).not.toMatch(/generateEmotionIntervention\(/);
    expect(routes).not.toMatch(/transcribeFromBase64\(/);
    expect(summaries).not.toMatch(/OpenAI|chat\.completions|embeddings\.create/);
    expect(summaries).toContain("generated locally from the system records listed below");
  });

  it("protects V2 AI routes and disables pattern learning by default", () => {
    const routes = readSource("../../server/routes.ts");
    const schema = readSource("../../shared/schema.ts");
    const envExample = readSource("../../.env.example");

    expect(routes).toMatch(
      /"\/v2\/conversation\/orchestrate"[\s\S]*?isAuthenticatedEither[\s\S]*?requireV2AiMessageConsent/,
    );
    expect(routes).toMatch(
      /"\/v2\/modules\/rewrite-message"[\s\S]*?isAuthenticatedEither[\s\S]*?requireV2AiMessageConsent/,
    );
    expect(routes).toContain(
      'process.env.PEACEPAD_ENABLE_V2_EXTERNAL_AI === "true"',
    );
    expect(routes).toContain("This AI route is unavailable in this release.");
    expect(routes).toContain(
      'process.env.PEACEPAD_ENABLE_PATTERN_LEARNING === "true"',
    );
    expect(routes).toContain("settings?.allowPatternLearning === true");
    expect(routes).toContain("PATTERN_LEARNING_DISABLED_CODE");
    expect(routes.match(/checkPatternLearningConsent\(userId\)/g)?.length ?? 0).toBeGreaterThanOrEqual(
      4,
    );
    expect(schema).toContain(
      'allowPatternLearning: boolean("allow_pattern_learning").notNull().default(false)',
    );
    expect(envExample).toContain("PEACEPAD_ENABLE_V2_EXTERNAL_AI=false");
    expect(envExample).toContain("PEACEPAD_ENABLE_PATTERN_LEARNING=false");
  });

  it("does not send co-parent profile context to Prep Chat providers", () => {
    const routes = readSource("../../server/routes.ts");

    expect(routes).not.toMatch(/coParent\?\.personalityType/);
    expect(routes).not.toMatch(/normalizedCoParentPersonality/);
    expect(routes).toMatch(
      /generatePrepChatCoaching\([\s\S]*?userPersonality,\s*undefined\s*\)/,
    );
    expect(routes).toMatch(
      /generatePrepChatDraft\([\s\S]*?userPersonality,\s*undefined,\s*\)/,
    );
  });

  it("does not place private response bodies, draft snippets, or message text in logs", () => {
    const server = readSource("../../server/index.ts");
    const prepChat = readSource("../../server/services/prepChatService.ts");
    const routes = readSource("../../server/routes.ts");
    const pushNotifications = readSource("../../server/push-notifications.ts");
    const callEngine = readSource("../../server/call-engine-v2/CallEngineV2.ts");
    const signaling = readSource("../../server/webrtc-signaling.ts");
    const videoCall = readSource("../../client/src/components/VideoCallDialog.tsx");
    const auth = readSource("../../server/replitAuth.ts");

    expect(server).toContain("Never append response payloads here");
    expect(server).not.toMatch(/capturedJsonResponse|resBody|JSON\.stringify\(responseBody\)/);
    expect(server).toContain('status >= 500 ? "Internal Server Error"');
    expect(prepChat).not.toMatch(/draft\.substring|draft\.slice/);
    expect(prepChat).toContain("characterCount: draft.length");
    expect(routes).toContain("(message) => message.senderId === userId");
    expect(routes).not.toMatch(/body:\s*parsed\.content/i);
    expect(routes).not.toMatch(/Profile Upload.*file\.path|Profile Upload.*originalname/);
    expect(pushNotifications).not.toMatch(/device:\s*\$\{sub\.deviceToken\}/);
    expect(pushNotifications).not.toMatch(/token:\s*\$\{sub\.deviceToken\}/);
    expect(callEngine).not.toMatch(/console\.log\([^\n]*event\.payload/);
    expect(callEngine).not.toMatch(/console\.(?:log|warn|error)\([^\n]*\$\{sessionCode\}/);
    expect(signaling).not.toMatch(
      /console\.(?:log|warn|error)\([^\n]*(?:\$\{sessionCode\}|payload\.sessionCode)/,
    );
    expect(videoCall).not.toMatch(
      /console\.(?:log|warn|error)\([^\n]*(?:callContext\.call\.sessionCode|data\.sessionCode|sessionCodeProp\}|sessionCode\))/,
    );
    expect(auth).not.toMatch(/stateParam\?\.substring|mobileState\.substring/);
  });
});
