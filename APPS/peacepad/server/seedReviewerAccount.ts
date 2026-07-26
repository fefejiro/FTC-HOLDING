import { pool } from "./db";
import { getReviewerAuthConfig } from "./reviewerAuth";
import { storage } from "./storage";

async function seedReviewerAccount(): Promise<void> {
  const config = getReviewerAuthConfig();
  if (!config) {
    throw new Error("Reviewer login must be enabled before seeding the synthetic account.");
  }

  await storage.upsertUser({
    id: config.userId,
    email: config.email,
    firstName: "Apple",
    lastName: "Review",
    displayName: "Apple App Review",
    isGuest: false,
    isAdmin: false,
    consentAcceptedAt: null,
    termsAcceptedAt: null,
    privacyAccepted: false,
    aiMessageConsent: false,
    aiCallConsent: false,
    isDeactivated: false,
    deletedAt: null,
    onboardingCompletedAt: new Date(),
    onboardingStep: 4,
    activePartnershipId: null,
  });

  console.log("[Reviewer Seed] Synthetic, non-admin reviewer account is ready.");
}

seedReviewerAccount()
  .catch((error) => {
    console.error(
      "[Reviewer Seed] Failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
