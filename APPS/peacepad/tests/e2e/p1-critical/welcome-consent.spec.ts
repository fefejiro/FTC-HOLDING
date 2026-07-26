import { expect, test, type Page } from "@playwright/test";

async function mockPublicEntryNetwork(page: Page) {
  let guestRequests = 0;
  let guestConsent: boolean | undefined;

  await page.route("**/api/auth/user", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "No active session" }),
    });
  });

  await page.route("**/api/auth/guest", async (route) => {
    guestRequests += 1;
    const requestBody = route.request().postDataJSON() as { hasAcceptedConsent?: boolean };
    guestConsent = requestBody.hasAcceptedConsent;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        user: {
          id: "welcome-consent-guest",
          displayName: "PeacePad Guest",
          isGuest: true,
          privacyAccepted: true,
          aiMessageConsent: false,
          aiCallConsent: false,
          termsAcceptedAt: new Date().toISOString(),
        },
        sessionId: "welcome-consent-session",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
  });

  return {
    getGuestRequests: () => guestRequests,
    getGuestConsent: () => guestConsent,
  };
}

test.describe("premium first-run welcome and explicit consent", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("lastSeenChangelogVersion", "1.0.9");
    });
  });

  test("creates no guest session until required policy choices are explicit", async ({ page }) => {
    const network = await mockPublicEntryNetwork(page);

    await page.goto("/");

    await expect(page.getByTestId("peacepad-welcome")).toBeVisible();
    await expect(page.getByText("A calmer way through hard co-parenting moments.")).toBeVisible();
    await expect(page.getByTestId("link-welcome-privacy")).toHaveAttribute("href", "/privacy");
    await expect(page.getByTestId("link-welcome-terms")).toHaveAttribute("href", "/terms");
    await expect(page.getByTestId("link-welcome-support")).toHaveAttribute("href", "/support");
    expect(network.getGuestRequests()).toBe(0);

    await page.getByTestId("button-try-peacepad").click();
    await expect(page).toHaveURL(/\/compose$/);
    await expect(page.getByRole("heading", { name: "Before we save anything" })).toBeVisible();
    await expect(page.getByTestId("checkbox-ai-message-consent")).not.toBeChecked();
    await expect(page.getByTestId("button-accept-terms")).toBeDisabled();
    expect(network.getGuestRequests()).toBe(0);

    await page.getByTestId("checkbox-accept-terms").click();
    await expect(page.getByTestId("button-accept-terms")).toBeDisabled();
    await page.getByTestId("checkbox-acknowledge-privacy").click();
    await expect(page.getByTestId("button-accept-terms")).toBeEnabled();
    await page.getByTestId("button-accept-terms").click();

    await expect(page.getByText("What happened?")).toBeVisible({ timeout: 15000 });
    await expect.poll(network.getGuestRequests).toBe(1);
    expect(network.getGuestConsent()).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem("aiMessageConsent"))).toBe("false");
  });

  test("routes the existing-account action to supplied account access", async ({ page }) => {
    await mockPublicEntryNetwork(page);
    await page.goto("/");

    await page.getByTestId("button-existing-account").click();

    await expect(page).toHaveURL(/\/account-access$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("hasSeenIntro"))).toBe("true");
  });
});
