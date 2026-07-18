import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";
const url = (path: string) => new URL(path, baseUrl).toString();

test.describe("Garden quote edge cases", () => {
  test("requires email before moving to service details", async ({ page }) => {
    await page.goto(url("/garden-cleaners/quote"), { waitUntil: "domcontentloaded" });

    await page.getByLabel("Full Name").fill("Garden Edge Tester");
    await page.getByLabel("Phone").fill("9055550199");
    await page.getByLabel("Property Type").selectOption("House");
    await page.getByLabel("Service Needed").selectOption("Residential Cleaning");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeFocused();
    await expect(page.getByRole("button", { name: "Request Quote" })).toHaveCount(0);
  });

  test("keeps the high-resolution modern office image on the quote page", async ({ page }) => {
    await page.goto(url("/garden-cleaners/quote"), { waitUntil: "domcontentloaded" });

    const image = page.locator('img[src*="/images/garden-cleaners/commercial-cleaner"]').first();
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("alt", /modern office with greenery/i);
    await expect(image).toHaveAttribute("data-garden-image-width", "3840");
  });
});
