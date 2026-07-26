import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("premium welcome and consent guardrails", () => {
  it("keeps the welcome copy factual and links account access and public policies", () => {
    const welcome = readSource("../../client/src/components/SingleSlideWelcome.tsx");
    const app = readSource("../../client/src/App.tsx");

    expect(welcome).toContain("A calmer way through hard co-parenting moments.");
    expect(welcome).toContain("Try PeacePad");
    expect(welcome).toContain("Existing account");
    expect(welcome).toContain('href="/privacy"');
    expect(welcome).toContain('href="/terms"');
    expect(welcome).toContain('href="/support"');
    expect(welcome).not.toMatch(/not stored for ai training/i);
    expect(welcome).not.toMatch(/confidential|encrypted|predicts conflict/i);
    expect(app).toContain('"/account-access"');
  });

  it("requires separate policy choices and keeps AI consent optional", () => {
    const dialog = readSource("../../client/src/components/TermsAcceptanceDialog.tsx");

    expect(dialog).toContain('data-testid="checkbox-accept-terms"');
    expect(dialog).toContain('data-testid="checkbox-acknowledge-privacy"');
    expect(dialog).toContain('data-testid="checkbox-ai-message-consent"');
    expect(dialog).toContain("const [aiMessageConsent, setAiMessageConsent] = useState(false)");
    expect(dialog).toContain("termsAgreed && privacyAcknowledged");
  });

  it("never auto-grants consent while creating a guest session", () => {
    const guestSession = readSource("../../client/src/lib/guestSession.ts");
    const softAuth = readSource("../../server/softAuth.ts");

    expect(guestSession).not.toContain('localStorage.setItem("hasAcceptedConsent", "true")');
    expect(guestSession).not.toContain('localStorage.setItem("aiMessageConsent", "true")');
    expect(guestSession).not.toMatch(/hasAcceptedConsent:\s*true/);
    expect(guestSession).toContain("hasAcceptedConsent: consent.requiredAccepted");
    expect(guestSession).toContain("aiMessageConsent: consent.aiMessageConsent");
    expect(softAuth).toContain('code: "CONSENT_REQUIRED"');
    expect(softAuth).toContain("req.body?.hasAcceptedConsent !== true");
    expect(softAuth).toContain("privacyAccepted: hasAcceptedConsent");
    expect(softAuth).toContain("aiMessageConsent: req.body?.aiMessageConsent === true");
  });

  it("preserves first-run completion across logout", () => {
    const auth = readSource("../../client/src/hooks/useAuth.ts");
    const removalBlock = auth.match(/const keysToRemove = \[[\s\S]*?\];/)?.[0] ?? "";

    expect(removalBlock).not.toContain('"hasSeenIntro"');
    expect(auth).toContain("window.location.href = '/'");
  });
});
