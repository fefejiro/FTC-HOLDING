import { expect, test, type Page } from "@playwright/test";

async function startFreshGuestFlow(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.goto("/");
  await page.waitForURL(/\/prep-chat$/, { timeout: 30000 });
  await expect(page.getByTestId("text-prep-chat-title")).toBeVisible({ timeout: 15000 });
}

async function createPrepChatSession(page: Page, draft: string): Promise<void> {
  await startFreshGuestFlow(page);
  await page.getByTestId("button-prep-chat-received").click();
  await page.getByTestId("textarea-prep-chat-topic").fill(draft);
  await page.getByTestId("button-prep-chat-start").click();
  await expect(page.getByText("Coach")).toBeVisible({ timeout: 30000 });
}

test.describe("Guest-first critical path", () => {
  test("first run lands on Prep Chat without auth", async ({ page }) => {
    await startFreshGuestFlow(page);

    await expect(page.getByTestId("button-prep-chat-received")).toBeVisible();
    await expect(page.getByTestId("button-prep-chat-sending")).toBeVisible();
    await expect(page.getByText(/check your email/i)).toHaveCount(0);
  });

  test("guest can paste a message and get coaching", async ({ page }) => {
    await createPrepChatSession(
      page,
      "They just sent a sharp message about pickup time and I need help replying calmly.",
    );

    await expect(page.getByTestId("textarea-prep-chat-composer")).toBeVisible();
    await expect(page.getByText(/what brought you here/i)).toHaveCount(0);
  });

  test("guest can generate a calmer draft suggestion", async ({ page }) => {
    await createPrepChatSession(
      page,
      "I need to respond to a message about switching weekends without escalating things.",
    );

    await page.getByTestId("button-prep-chat-draft").click();
    await expect(page.getByTestId("card-prep-chat-draft")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/your draft/i)).toBeVisible();
  });

  test("guest hits a sign-in gate for account surfaces", async ({ page }) => {
    await startFreshGuestFlow(page);
    await page.goto("/settings");

    await expect(page.getByTestId("button-guest-upgrade-sign-in")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/saved history, cross-device sync/i)).toBeVisible();
    await expect(page.getByText(/^Profile$/)).toHaveCount(0);
  });
});
