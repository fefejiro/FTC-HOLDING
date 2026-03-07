import { test, expect } from "@playwright/test";

test.describe("P1 Critical: Web update lifecycle", () => {
  test("shows update prompt, allows Later, and re-shows on next resume", async ({ page }) => {
    let activeBuildId = "web-build-new";

    await page.route("**/_peacepad/build-meta.json*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "cache-control": "no-cache, no-store, must-revalidate",
        },
        body: JSON.stringify({
          webBuildId: activeBuildId,
          deployedAt: new Date().toISOString(),
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem("peacepad_web_build_id", "web-build-old");
      localStorage.removeItem("peacepad_update_deferred");
      localStorage.removeItem("peacepad_update_force_after");
      localStorage.removeItem("peacepad_pending_web_build_id");
    });

    await page.goto("/onboarding");

    const updatePrompt = page.getByTestId("notification-update-available");
    await expect(updatePrompt).toBeVisible();

    await page.getByTestId("button-update-later").click();
    await expect(updatePrompt).toBeHidden();

    await page.evaluate(() => {
      window.dispatchEvent(new Event("peacepad:web-update-detected"));
    });
    await expect(updatePrompt).toBeHidden();

    await page.evaluate(() => {
      window.dispatchEvent(new Event("peacepad:app-background"));
      window.dispatchEvent(new Event("peacepad:app-resume"));
    });
    await expect(updatePrompt).toBeVisible();
  });

  test("forces update after 24h deferral window", async ({ page }) => {
    const currentBuild = "web-build-current";

    await page.route("**/_peacepad/build-meta.json*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "cache-control": "no-cache, no-store, must-revalidate",
        },
        body: JSON.stringify({
          webBuildId: currentBuild,
          deployedAt: new Date().toISOString(),
        }),
      });
    });

    await page.addInitScript(({ currentBuildId }) => {
      localStorage.setItem("peacepad_web_build_id", "web-build-old");
      localStorage.setItem("peacepad_pending_web_build_id", currentBuildId);
      localStorage.setItem("peacepad_update_deferred", "true");
      localStorage.setItem("peacepad_update_force_after", String(Date.now() - 1000));
    }, { currentBuildId: currentBuild });

    await page.goto("/onboarding");

    await page.waitForFunction(
      ({ buildId }) => {
        const known = localStorage.getItem("peacepad_web_build_id");
        const deferred = localStorage.getItem("peacepad_update_deferred");
        const forceAfter = localStorage.getItem("peacepad_update_force_after");
        return known === buildId && deferred === null && forceAfter === null;
      },
      { buildId: currentBuild },
      { timeout: 15000 },
    );
  });
});
