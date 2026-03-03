import { expect, test } from "@playwright/test";

async function completeIntroAndConsent(page: import("@playwright/test").Page): Promise<void> {
  await expect(page.getByTestId("button-start-conversation")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("button-start-conversation").click();

  await expect(page.getByTestId("button-accept-terms")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(750);

  const requiredCheckboxes = [
    "checkbox-accept-terms",
    "checkbox-accept-privacy",
    "checkbox-accept-nda",
  ];

  for (const testId of requiredCheckboxes) {
    await page.getByTestId(testId).click({ force: true });
  }

  await expect(page.getByTestId("button-accept-terms")).toBeEnabled({ timeout: 5000 });
  await page.getByTestId("button-accept-terms").click();
}

test.describe("P1 Critical: Guest-First Onboarding", () => {
  test("guest flow works from first visit", async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto("/onboarding");
    await page.waitForLoadState("domcontentloaded");

    await completeIntroAndConsent(page);

    await expect(page.getByTestId("onboarding-auth-choice")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("button-onboarding-sign-in")).toBeVisible();
    await expect(page.getByTestId("button-onboarding-continue-guest")).toBeVisible();

    await page.getByTestId("button-onboarding-continue-guest").click();
    await expect(page.getByTestId("button-enter-peacepad")).toBeVisible({ timeout: 10000 });

    const guestResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/guest") &&
        response.request().method() === "POST",
    );

    await page.getByTestId("input-display-name").fill("Playwright Guest");
    await page.getByTestId("button-enter-peacepad").click();

    const guestResponse = await guestResponsePromise;
    expect(guestResponse.ok()).toBeTruthy();

    await page.waitForURL(/\/prep-chat|\/chat|\/dashboard/, { timeout: 30000 });

    const sessionId = await page.evaluate(() => localStorage.getItem("peacepad_session_id"));
    expect(sessionId).toBeTruthy();
  });

  test("shows sign-in prompt when guest session is near expiry", async ({ page }) => {
    const userResponse = await page.request.get("/api/auth/user");
    const user = userResponse.ok() ? await userResponse.json() : null;
    test.skip(!user?.isGuest, "Expected guest storage state for this test.");

    const nearExpiryIso = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    await page.route("**/api/auth/guest-session-info*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          expiresAt: nearExpiryIso,
          daysRemaining: 1,
        }),
      });
    });

    await page.goto("/chat");
    await page.waitForLoadState("domcontentloaded");

    const banner = page.getByTestId("banner-guest-expiry");
    await expect(banner).toBeVisible({ timeout: 15000 });
    await expect(banner).toContainText(/Guest data expires/i);
    await expect(page.getByTestId("button-upgrade-account")).toBeVisible();
  });
});
