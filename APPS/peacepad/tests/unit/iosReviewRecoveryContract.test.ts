import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  // Keep source-contract assertions stable across Windows and Linux runners.
  return readFileSync(new URL(relativePath, import.meta.url), "utf8").replace(/\r\n/g, "\n");
}

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex, `Missing source marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `Missing source marker after ${start}: ${end}`).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe("PeacePad iOS review recovery contract", () => {
  it("exposes only the isolated reviewer-session flow from account access", () => {
    const app = readSource("../../client/src/App.tsx");
    const accountAccess = readSource("../../client/src/pages/account-access.tsx");
    const auth = readSource("../../client/src/hooks/useAuth.ts");
    const softAuth = readSource("../../server/softAuth.ts");
    const reviewerSeed = readSource("../../server/seedReviewerAccount.ts");
    const login = sliceBetween(auth, "const login = () => {", "const logout = async");
    const reviewerRoute = sliceBetween(
      softAuth,
      'app.post(\n    "/api/auth/reviewer-session"',
      'app.get("/api/auth/me"',
    );

    expect(app).toContain('<Route path="/account-access" component={AccountAccessPage} />');
    expect(accountAccess).toContain('getApiUrl("/api/auth/reviewer-session")');
    expect(accountAccess).toContain("New public account registration is not");
    expect(accountAccess).not.toMatch(/google|supabase|oauth|\/api\/login(?:\/mobile)?/i);

    // All legacy sign-in buttons use this hook. During review it must not
    // expose the unreliable OAuth/Supabase paths hidden from the welcome page.
    expect(login).toContain("/account-access");
    expect(login).not.toMatch(
      /supabaseAuth|startGoogleOAuthSignIn|hasSupabaseAuthConfig|\/api\/login(?:\/mobile)?/i,
    );

    expect(reviewerRoute).toContain("reviewerLoginRateLimiter");
    expect(reviewerRoute).toContain("getReviewerAuthConfig()");
    expect(reviewerRoute).toContain("return res.status(404)");
    expect(reviewerRoute).toContain("reviewerCredentialsMatch(config, email, password)");
    expect(reviewerRoute).toContain("storage.getUser(config.userId)");
    expect(reviewerRoute).not.toContain("storage.upsertUser");
    expect(reviewerSeed).toMatch(/isGuest:\s*false/);
    expect(reviewerSeed).toMatch(/isAdmin:\s*false/);
    expect(reviewerSeed).toMatch(/aiMessageConsent:\s*false/);
    expect(reviewerSeed).toMatch(/aiCallConsent:\s*false/);
    expect(reviewerRoute).not.toMatch(/console\.(?:log|warn|error)\([^)]*(?:email|password)/is);
  });

  it("requires exact confirmation and immediately invokes permanent deletion", () => {
    const client = readSource("../../client/src/pages/delete-account.tsx");
    const routes = readSource("../../server/routes.ts");
    const deletionRoute = sliceBetween(
      routes,
      'app.delete("/api/user/account"',
      'app.post("/api/users/accept-terms"',
    );

    expect(client).toContain('confirmation !== "DELETE"');
    expect(client).toContain("JSON.stringify({ confirmation: confirmedValue })");
    expect(client).not.toMatch(/deactivat|grace period|30[- ]day/i);

    expect(deletionRoute).toMatch(/app\.delete\("\/api\/user\/account",\s*isAuthenticatedEither/);
    expect(deletionRoute).toMatch(/confirmation\s*!==\s*["']DELETE["']/);
    expect(deletionRoute).toContain("storage.deleteUser(userId)");
    expect(deletionRoute).toContain("quarantineUserOwnedUploadFiles");
    expect(deletionRoute).toContain("restoreQuarantinedUploadFiles");
    expect(deletionRoute).toContain("commitQuarantinedUploadDeletion");
    expect(deletionRoute).not.toMatch(/deactivateUser|reactivateUser|isDeactivated|grace period/i);
  });

  it("keeps invitation deep links without replaying intro or revoking consent", () => {
    const app = readSource("../../client/src/App.tsx");
    const join = readSource("../../client/src/pages/join-partnership.tsx");

    expect(app).toContain('<Route path="/join/:code" component={JoinPartnershipPage} />');
    expect(join).toContain('localStorage.setItem("pending_join_code", code)');
    expect(join).not.toContain('localStorage.removeItem("hasSeenIntro")');
    expect(join).not.toContain('localStorage.removeItem("hasAcceptedConsent")');
    expect(join).not.toContain('localStorage.removeItem("peacepad_required_consent_v2")');
  });

  it("lets either supported authenticated session export its own data", () => {
    const routes = readSource("../../server/routes.ts");

    expect(routes).toMatch(/app\.get\("\/api\/user\/export",\s*isAuthenticatedEither,\s*async/);
    expect(routes).not.toMatch(/app\.get\("\/api\/user\/export",\s*requireAuthOnly,\s*async/);
  });

  it("does not log API response payloads or message-body excerpts", () => {
    const server = readSource("../../server/index.ts");
    const chat = readSource("../../client/src/components/ChatInterface.tsx");
    const webSocket = readSource("../../client/src/hooks/useReconnectingWebSocket.ts");

    expect(server).not.toMatch(/capturedJsonResponse|JSON\.stringify\(bodyJson\)/);
    expect(chat).not.toMatch(/console\.log\([^)]*(?:message|tone)[^)]*content\.substring/is);
    expect(webSocket).not.toMatch(/console\.log\([^)]*messageEvent\.data\??\.substring/is);
  });

  it("keeps local preview available while gating or disabling external AI paths", () => {
    const routes = readSource("../../server/routes.ts");
    const privacyControls = readSource("../../server/lib/privacyControls.ts");

    expect(routes).toMatch(
      /app\.post\("\/api\/messages\/preview"[\s\S]*?analyzeRuleBasedTone\(sanitizedContent\)/,
    );
    expect(routes).toMatch(
      /app\.use\(\s*"\/v2\/conversation\/orchestrate",\s*isAuthenticatedEither,\s*requireV2AiMessageConsent/s,
    );
    expect(routes).toMatch(
      /app\.use\(\s*"\/v2\/modules\/rewrite-message",\s*isAuthenticatedEither,\s*requireV2AiMessageConsent/s,
    );
    expect(routes).toMatch(/app\.get\("\/api\/geocode\/ip"[\s\S]*?IP-based location is disabled/);
    expect(routes).toMatch(
      /app\.post\("\/api\/location\/ai-enhance"[\s\S]*?aiProcessed:\s*false[\s\S]*?aiDisabled:\s*true/,
    );
    expect(privacyControls).toContain(
      'export const AI_MESSAGE_CONSENT_REQUIRED_CODE = "AI_MESSAGE_CONSENT_REQUIRED"',
    );
    expect(privacyControls).toContain(
      'export const AI_CALL_CONSENT_REQUIRED_CODE = "AI_CALL_CONSENT_REQUIRED"',
    );
  });
});
