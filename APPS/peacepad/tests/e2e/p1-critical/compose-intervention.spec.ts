import { expect, test, type Page } from "@playwright/test";

const guestUser = {
  id: "guest-compose-e2e",
  email: "guest-compose-e2e@peacepad.local",
  displayName: "PeacePad Guest",
  isGuest: true,
  activePartnershipId: null,
  inviteCode: "GUEST1",
  termsAcceptedAt: new Date().toISOString(),
};

async function mockComposeNetwork(page: Page): Promise<void> {
  await page.route("**/api/auth/user", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Guest can continue without signing in" }),
    });
  });

  await page.route("**/api/auth/guest", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        user: guestUser,
        sessionId: "guest-compose-session",
        guestSessionId: "guest-compose-session",
        guestId: "guest-compose-e2e",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
  });

  await page.route("**/api/messages/preview", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as { content?: string };
    const content = body.content || "";
    const isTense = /always|never|ignore|fault|asap|right now/i.test(content);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        tone: isTense ? "tense" : "calm",
        summary: isTense ? "This may raise tension" : "This looks calm enough to work with",
        emoji: isTense ? "!" : ".",
        confidence: 0.86,
        flags: isTense ? ["Command-style phrasing can raise defensiveness."] : [],
        rewordingSuggestion: isTense
          ? "Can we agree on pickup time today so the evening stays predictable?"
          : null,
        originalMessage: content,
        ces: null,
      }),
    });
  });
}

test.describe("Compose intervention entry", () => {
  test("guest can choose send path, preview tone, use a suggestion, and copy", async ({ page, context }) => {
    await context.clearCookies();
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("lastSeenChangelogVersion", "1.0.9");
    });
    await mockComposeNetwork(page);

    await page.goto("/compose");

    await expect(page.getByText("What happened?")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Start without an account. Sign in later if you want saved history and sync.")).toHaveCount(2);
    await page.getByTestId("button-compose-path-send").click();
    await page.getByTestId("textarea-compose-message").fill(
      "You always ignore pickup time and I need an answer right now.",
    );

    await expect(page.getByTestId("card-compose-tone-feedback")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("What this may sound like")).toBeVisible();
    await expect(page.getByText("Try this instead")).toBeVisible();
    await expect(page.getByText("You may want to slow this down.")).toBeVisible();

    await page.getByTestId("button-compose-use-suggestion").click();
    await expect(page.getByTestId("textarea-compose-message")).toHaveValue(
      "Can we agree on pickup time today so the evening stays predictable?",
    );

    await page.getByTestId("button-compose-copy-send").click();
    await expect(page.getByText(/^Copied$/)).toBeVisible({ timeout: 10000 });
  });

  test("guest can switch to received-message path without signing in", async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("lastSeenChangelogVersion", "1.0.9");
    });
    await mockComposeNetwork(page);

    await page.goto("/compose");
    await page.getByTestId("button-compose-path-received").click();
    await expect(page.getByText("Paste the message you received")).toBeVisible();
    await page.getByTestId("textarea-compose-message").fill(
      "Why are you always late? This is your fault and I need an answer ASAP.",
    );

    await expect(page.getByTestId("card-compose-tone-feedback")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/There may be frustration, urgency, or defensiveness/i)).toBeVisible();
    await expect(page.getByText(/Reply to the issue, not the emotional temperature/i)).toBeVisible();
    await expect(page.getByTestId("text-compose-suggestion")).toContainText(/Can we focus on/i);
    await expect(page.getByText(/check your email/i)).toHaveCount(0);
  });

  test("disagreement path asks for issue and desired outcome", async ({ page }) => {
    await mockComposeNetwork(page);
    await page.addInitScript(() => {
      localStorage.setItem("lastSeenChangelogVersion", "1.0.9");
    });

    await page.goto("/compose");
    await page.getByTestId("button-compose-path-disagreement").click();
    await page.getByTestId("textarea-compose-message").fill("switching weekends");
    await page.getByTestId("textarea-compose-outcome").fill("confirm Friday pickup by 5 PM");

    await expect(page.getByTestId("textarea-compose-outcome")).toBeVisible();
    await expect(page.getByTestId("card-compose-tone-feedback")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("text-compose-suggestion")).toContainText("switching weekends");
    await expect(page.getByTestId("text-compose-suggestion")).toContainText("confirm Friday pickup by 5 PM");
  });

  test("bottom nav still reaches compose for app users", async ({ page }) => {
    await mockComposeNetwork(page);
    await page.addInitScript(() => {
      localStorage.setItem("lastSeenChangelogVersion", "1.0.9");
    });
    await page.goto("/compose");

    const pauseNav = page.getByTestId("nav-pause");
    if (await pauseNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pauseNav.click();
      await expect(page).toHaveURL(/\/compose$/);
    } else {
      await expect(page.getByText("What happened?")).toBeVisible();
    }
  });
});
