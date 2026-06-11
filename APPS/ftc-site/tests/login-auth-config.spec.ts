import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";
const url = (path: string) => new URL(path, baseUrl).toString();
const hasPublicAuthEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

test.describe("Una login auth configuration", () => {
  test.skip(!hasPublicAuthEnv, "Public Supabase auth env is required for configured login QA.");

  test("configured Una login exposes Google OAuth instead of unavailable fallback", async ({ page }) => {
    await page.goto(url("/login"), { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /Una Labs login/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByText(/Login is temporarily unavailable/i)).toHaveCount(0);
  });
});

test("Una login can hydrate Google auth from runtime Pages config", async ({ page }) => {
  await page.route("**/api/public-auth-config", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        configured: true,
        config: {
          supabaseUrl: "https://example.supabase.co",
          supabaseAnonKey: "test-public-anon-key"
        }
      })
    });
  });

  await page.goto(url("/login"), { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: /Una Labs login/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
  await expect(page.getByText(/Login is temporarily unavailable/i)).toHaveCount(0);
});
