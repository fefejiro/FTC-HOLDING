import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex, `Missing source marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `Missing source marker after ${start}: ${end}`).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

function findClosingBrace(source: string, openingBrace: number): number {
  let depth = 0;

  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return index;
  }

  return -1;
}

function monitorRoutesAreExcludedFromProduction(source: string): boolean {
  const hasGlobalProductionGate =
    /const\s+testMonitorEnabled\s*=[\s\S]{0,240}NODE_ENV\s*!==\s*["']production["'][\s\S]{0,500}app\.use\(\s*["']\/api\/test-monitor["'][\s\S]{0,400}if\s*\(\s*!testMonitorEnabled\s*\)[\s\S]{0,200}status\(404\)/.test(
      source,
    );
  if (hasGlobalProductionGate) return true;

  const routeIndexes = [
    ...source.matchAll(/app\.(?:get|post|patch|delete)\(\s*["']\/api\/test-monitor\//g),
  ].map((match) => match.index);

  if (routeIndexes.length === 0) return true;

  const developmentGuard =
    /if\s*\(\s*process\.env\.NODE_ENV\s*!==\s*["']production["']\s*\)\s*\{/g;

  for (const match of source.matchAll(developmentGuard)) {
    const openingBrace = source.indexOf("{", match.index);
    const closingBrace = findClosingBrace(source, openingBrace);
    if (
      closingBrace > openingBrace &&
      routeIndexes.every((routeIndex) => routeIndex > openingBrace && routeIndex < closingBrace)
    ) {
      return true;
    }
  }

  return routeIndexes.every((routeIndex) => {
    const handlerStart = source.indexOf("=>", routeIndex);
    if (handlerStart < 0) return false;
    const routeSignature = source.slice(routeIndex, handlerStart);
    return /\bisAdmin\b/.test(routeSignature);
  });
}

describe("latest iOS review privacy and security contracts", () => {
  it("gives authenticated users an optional third-party AI message-processing control", () => {
    const settings = readSource("../../client/src/pages/settings.tsx");
    const guestBranch = settings.indexOf("if (user?.isGuest)");
    const optionalAiCopy = settings.indexOf("Optional AI processing", guestBranch);

    expect(guestBranch).toBeGreaterThanOrEqual(0);
    expect(optionalAiCopy).toBeGreaterThan(guestBranch);
    expect(settings).toContain("third-party AI processor");
    expect(settings).toContain("/api/user/consent");
    expect(settings).toMatch(/aiMessageConsent/);
    expect(settings).toMatch(/checked=\{[^}]*aiMessageConsent[^}]*\}/);
    expect(settings).toMatch(
      /(?:onCheckedChange|onChange)=\{[\s\S]{0,300}(?:aiMessageConsent|updateAiMessageConsent)/,
    );
  });

  it("never persists AI consent without current Terms and Privacy acceptance", () => {
    const routes = readSource("../../server/routes.ts");
    const consentRoute = sliceBetween(
      routes,
      'app.patch("/api/user/consent"',
      'app.get("/api/user/export"',
    );

    expect(consentRoute).toContain("storage.getUser(userId)");
    expect(consentRoute).toMatch(
      /(?:requiredConsent|canEnableAi|mayEnableAi|hasRequiredConsent)[\s\S]{0,500}(?:privacy|Privacy)[\s\S]{0,500}(?:terms|Terms)/,
    );
    expect(consentRoute).toMatch(/ndaAccepted\s*===\s*false/);
    expect(consentRoute).toMatch(/termsAcceptedAt:\s*nextTermsAcceptedAt/);
    expect(consentRoute).toMatch(
      /if\s*\(\s*!(?:requiredConsent|canEnableAi|mayEnableAi|hasRequiredConsent)[^)]*\)\s*\{[\s\S]{0,500}updateData\.aiMessageConsent\s*=\s*false[\s\S]{0,500}updateData\.aiCallConsent\s*=\s*false/,
    );
  });

  it("does not expose test-monitor reads or ingestion publicly", () => {
    const routes = readSource("../../server/routes.ts");

    expect(monitorRoutesAreExcludedFromProduction(routes)).toBe(true);
  });

  it("serves uploads only through authenticated, record-aware routes with MIME-owned names", () => {
    const routes = readSource("../../server/routes.ts");
    const executableRoutes = stripComments(routes);
    const uploadNaming = sliceBetween(
      routes,
      "const SAFE_UPLOAD_EXTENSION_BY_MIME",
      "const uploadDir =",
    );

    expect(executableRoutes).not.toMatch(
      /(?:app\.use|express\.static)\s*\([^)]*["'`]\/?uploads(?:\/|["'`])/i,
    );
    expect(uploadNaming).toContain("SAFE_UPLOAD_EXTENSION_BY_MIME[file.mimetype]");
    expect(uploadNaming).not.toMatch(/image\/svg\+xml|\.svg/i);
    expect(uploadNaming).not.toMatch(
      /path\.extname\(\s*file\.originalname|file\.originalname\.(?:split|slice|substring)/,
    );

    const recordingRoute = sliceBetween(
      routes,
      '["/uploads/recordings/:filename"',
      "// Protected chat file serving",
    );
    expect(recordingRoute).toContain('"/uploads/recordings/:ownerKey/:filename"');
    expect(recordingRoute).toContain("isAuthenticatedEither");
    expect(recordingRoute).toContain("storage.getCallRecordingByUrl");

    const chatRoute = sliceBetween(
      routes,
      '["/uploads/chat/:filename"',
      '["/uploads/receipts/:filename"',
    );
    expect(chatRoute).toContain('"/uploads/chat/:ownerKey/:filename"');
    expect(chatRoute).toContain("isAuthenticatedEither");
    expect(chatRoute).toContain("storage.getMessageByFileUrl");

    const receiptRoute = sliceBetween(
      routes,
      '["/uploads/receipts/:filename"',
      '["/uploads/profiles/:filename"',
    );
    expect(receiptRoute).toContain('"/uploads/receipts/:ownerKey/:filename"');
    expect(receiptRoute).toContain("isAuthenticatedEither");
    expect(receiptRoute).toContain("storage.getExpenseByReceiptUrl");

    const profileRoute = sliceBetween(
      routes,
      '["/uploads/profiles/:filename"',
      "// Call recording routes",
    );
    expect(profileRoute).toContain('"/uploads/profiles/:ownerKey/:filename"');
    expect(profileRoute).toContain("isAuthenticatedEither");
    expect(profileRoute).toContain("storage.getUserByProfileImagePath");
  });

  it("stores voice notes without automatically invoking Whisper", () => {
    const routes = readSource("../../server/routes.ts");
    const voiceNoteRoute = sliceBetween(
      routes,
      '"/api/voice-notes"',
      "// Receipt upload endpoint",
    );

    expect(voiceNoteRoute).not.toMatch(
      /getTranscribedText|transcribeAudio|transcribeFromBase64|audio\.transcriptions|whisper/i,
    );
    expect(voiceNoteRoute).toMatch(/transcript:\s*["']{2}/);
    expect(voiceNoteRoute).toMatch(/aiProcessed:\s*false/);
  });
});
