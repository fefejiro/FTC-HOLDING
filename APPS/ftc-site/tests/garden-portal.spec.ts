
import { test, expect } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";
const url = (path) => new URL(path, baseUrl).toString();
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

test.describe("Garden portal smoke", () => {
  test.skip(skipWebServer, "Web server is not running; skipping smoke tests.");

  test("public portal loads with key lanes and CTAs", async ({ page }) => {
    await page.goto(url("/garden-cleaners/portal"), { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1, name: /regional service coverage/i })).toBeVisible();
    await expect(page.getByText(/client lane/i)).toBeVisible();
    await expect(page.getByText(/operations lane/i)).toBeVisible();

    await expect(page.getByRole("link", { name: /request regional quote/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /contact operations/i })).toBeVisible();
  });

  test("region card routes to quote with region query", async ({ page }) => {
    await page.goto(url("/garden-cleaners/portal"), { waitUntil: "domcontentloaded" });

    const oshawaLink = page.getByRole("link", { name: /get same-week quote/i });
    await expect(oshawaLink).toBeVisible();

    await oshawaLink.click();
    await expect(page).toHaveURL(/\/garden-cleaners\/quote\?region=Oshawa/);
    await expect(page.getByLabel("Service Region")).toHaveValue("Oshawa");
  });
});
