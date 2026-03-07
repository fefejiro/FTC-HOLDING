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

test.describe("P1 Critical: Public Onboarding Flow", () => {
  test("public onboarding goes directly from terms acceptance to prep chat", async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto("/onboarding");
    await page.waitForLoadState("domcontentloaded");

    await completeIntroAndConsent(page);
    await page.waitForURL(/\/prep-chat|\/chat|\/dashboard/, { timeout: 30000 });

    await expect(page.getByText(/private beta/i)).toHaveCount(0);
    await expect(page.getByText(/continue as guest/i)).toHaveCount(0);
  });

  test("public flow does not render guest expiry banner", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("banner-guest-expiry")).toHaveCount(0);
  });
});

