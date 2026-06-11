
import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";
const url = (path: string) => new URL(path, baseUrl).toString();
const hasQuotePersistenceEnv = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
);

const gardenRoutes = [
  { path: "/garden-cleaners", heading: /Professional Cleaning Services You Can Trust in Oshawa/i, hasMedia: true },
  { path: "/garden-cleaners/about", heading: /About Garden Cleaners/i, hasMedia: true },
  { path: "/garden-cleaners/services", heading: /Cleaning Services/i, hasMedia: true },
  { path: "/garden-cleaners/quote", heading: /Tell us what needs cleaning/i, hasMedia: true },
  { path: "/garden-cleaners/contact", heading: /Contact Garden Cleaners/i, hasMedia: true },
  { path: "/garden-cleaners/portal", heading: /Garden Cleaners portal/i, hasMedia: false }
] as const;

test.describe("Garden Cleaners public QA", () => {
  for (const route of gardenRoutes) {
    test(`${route.path} renders Garden branding and primary content`, async ({ page }) => {
      await page.goto(url(route.path), { waitUntil: "domcontentloaded" });

      await expect(page.locator("header .brand")).toContainText("Garden Cleaners");
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();

      if (route.hasMedia) {
        await expect(page.locator('img[src*="/images/garden-cleaners/"]').first()).toBeVisible();
      }
    });
  }

  test("desktop navigation exposes the Garden IA", async ({ page }) => {
    await page.goto(url("/garden-cleaners"));
    const nav = page.getByLabel("Main navigation");

    await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "/garden-cleaners");
    await expect(nav.getByRole("link", { name: "Regional Portal", exact: true })).toHaveAttribute("href", "/garden-cleaners/portal");
    await expect(nav.getByRole("link", { name: "About", exact: true })).toHaveAttribute("href", "/garden-cleaners/about");
    await expect(nav.getByRole("link", { name: "Services", exact: true })).toHaveAttribute("href", "/garden-cleaners/services");
    await expect(nav.getByRole("link", { name: "Contact", exact: true })).toHaveAttribute("href", "/garden-cleaners/contact");
    await expect(nav.getByRole("link", { name: "Get a Quote", exact: true })).toHaveAttribute("href", "/garden-cleaners/quote");
  });

  test("custom domain uses clean public Garden paths", async ({ request }) => {
    const hostHeaders = { host: "gardencleaners.ca", "x-forwarded-host": "gardencleaners.ca" };

    const root = await request.get(url("/"), { headers: hostHeaders });
    expect(root.status()).toBe(200);
    expect(await root.text()).toContain("Garden Cleaners");

    const cleanServices = await request.get(url("/services"), { headers: hostHeaders });
    expect(cleanServices.status()).toBe(200);
    expect(await cleanServices.text()).toContain("Cleaning Services");

    const prefixedServices = await request.get(url("/garden-cleaners/services"), {
      headers: hostHeaders
    });
    expect(prefixedServices.status()).toBe(200);
    expect(await prefixedServices.text()).toContain("Cleaning Services");
  });

  test("mobile navigation routes to quote page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url("/garden-cleaners"), { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
    await page.getByRole("button", { name: "Menu" }).click();
    const mobileDialog = page.getByRole("dialog", { name: "Mobile navigation" });
    await expect(mobileDialog).toBeVisible();

    await mobileDialog.getByRole("link", { name: "Get a Quote" }).click();
    await expect(page).toHaveURL(url("/garden-cleaners/quote"));
    await expect(page.getByRole("heading", { level: 1, name: /Tell us what needs cleaning/i })).toBeVisible();
  });

  test("quote form accepts a valid lead", async ({ page }) => {
    test.skip(!hasQuotePersistenceEnv, "Supabase public env is required for quote persistence QA.");

    await page.goto(url("/garden-cleaners/quote"));

    await page.getByLabel("Full Name").fill("Garden QA Tester");
    await page.getByLabel("Email").fill("garden-qa@example.com");
    await page.getByLabel("Phone").fill("9055550100");
    await page.getByLabel("Property Type").selectOption("House");
    await page.getByLabel("Service Needed").selectOption("Residential Cleaning");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Service Address").fill("123 QA Street");
    await page.getByLabel("City").fill("Oshawa");
    await page.getByLabel("Postal Code").fill("L1H 1A1");
    await page.getByLabel("Preferred Date").fill("2026-05-05");
    await page.getByLabel("Preferred Time").selectOption("Morning");
    await page.getByLabel("Frequency").selectOption("One-time");
    await page
      .getByLabel("Message")
      .fill("Please verify this Garden Cleaners QA request can pass through the public quote form.");

    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Request Quote" }).click();
    await expect(page.getByText(/Garden Cleaners received your quote request/i)).toBeVisible({ timeout: 15000 });
  });

  test("Garden custom domain blocks role route leakage", async ({ request }) => {
    const response = await request.get(url("/garden-cleaners/staff"), {
      headers: { host: "gardencleaners.ca" }
    });

    expect(response.status()).toBe(404);
  });
});
