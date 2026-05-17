import { test, expect } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";
const url = (path: string) => new URL(path, baseUrl).toString();

const adminEmail = process.env.UNA_QA_ADMIN_EMAIL;
const adminPassword = process.env.UNA_QA_ADMIN_PASSWORD;

test.describe("Una Labs admin credentialed QA", () => {
  test.skip(!adminEmail || !adminPassword, "UNA_QA_ADMIN_EMAIL and UNA_QA_ADMIN_PASSWORD are required for Una admin credentialed QA.");

  test("Una admin can sign in and reach admin dashboard", async ({ page }) => {
    // Start from Una login surface
    await page.goto(url("/login"), { waitUntil: "domcontentloaded" });

    // Confirm product context is una (observable via heading or brand class)
    await expect(page.locator("body")).toHaveClass(/brand-una/);
    await expect(page.getByRole("heading", { name: /Sign in to Una Labs/i })).toBeVisible();

    // Fill in credentials (if form-based; skip if only Google OAuth is available)
    if (await page.getByLabel("Email").count() > 0) {
      await page.getByLabel("Email").fill(adminEmail!);
      await page.getByLabel("Password").fill(adminPassword!);
      await page.getByRole("button", { name: /sign in/i }).click();
    } else {
      test.skip(true, "No form-based login available for Una admin QA.");
    }

    // Confirm final destination is Una admin/dashboard (observable via route or heading)
    await expect(page).toHaveURL(/\/products|\/dashboard|\/admin/);
    await expect(page.locator("body")).toHaveClass(/brand-una/);

    // Confirm no Garden portal route leakage
    await expect(page.locator("body")).not.toHaveClass(/brand-garden/);
    await expect(page.locator("header")).not.toContainText("Garden Cleaners");
  });
});
