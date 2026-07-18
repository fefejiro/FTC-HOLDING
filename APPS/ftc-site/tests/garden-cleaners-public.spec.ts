
import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";
const url = (path: string) => new URL(path, baseUrl).toString();

const gardenRoutes = [
  {
    path: "/garden-cleaners",
    heading: /Professional cleaning that feels dependable before the first visit\./i,
    hasMedia: true,
    hasHeaderBrand: true
  },
  { path: "/garden-cleaners/about", heading: /About Garden Cleaners/i, hasMedia: true, hasHeaderBrand: false },
  { path: "/garden-cleaners/services", heading: /Cleaning Services/i, hasMedia: true, hasHeaderBrand: true },
  { path: "/garden-cleaners/quote", heading: /Tell us what needs cleaning\./i, hasMedia: true, hasHeaderBrand: false },
  { path: "/garden-cleaners/contact", heading: /Contact Garden Cleaners/i, hasMedia: true, hasHeaderBrand: true },
  {
    path: "/garden-cleaners/portal",
    heading: /Regional service coverage, client intake, and operations routing/i,
    hasMedia: false,
    hasHeaderBrand: true
  }
] as const;

test.describe("Garden Cleaners public QA", () => {
  for (const route of gardenRoutes) {
    test(`${route.path} renders Garden branding and primary content`, async ({ page }) => {
      await page.goto(url(route.path), { waitUntil: "domcontentloaded" });

      if (route.hasHeaderBrand) {
        await expect(page.locator("header .brand")).toContainText("Garden Cleaners");
      }

      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();

      if (route.hasMedia) {
        await expect(page.locator('img[src*="/images/garden-cleaners/"]').first()).toBeVisible();
      }
    });
  }

  test("large Garden image panels use high-resolution source assets", async ({ page }) => {
    const imageRoutes = gardenRoutes.filter((route) => route.hasMedia);

    for (const route of imageRoutes) {
      await page.goto(url(route.path), { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();

      const panels = page.locator(".garden-image-panel img");
      const count = await panels.count();
      expect(count, `${route.path} should render Garden image panels`).toBeGreaterThan(0);

      for (let index = 0; index < count; index += 1) {
        const image = panels.nth(index);
        await expect(image).toBeVisible();
        const metadata = await image.evaluate((element) => ({
          src: element.getAttribute("src") || "",
          width: Number(element.getAttribute("data-garden-image-width") || 0),
          height: Number(element.getAttribute("data-garden-image-height") || 0)
        }));

        expect(metadata.width, `${route.path} image ${metadata.src} width`).toBeGreaterThanOrEqual(1000);
        expect(metadata.height, `${route.path} image ${metadata.src} height`).toBeGreaterThanOrEqual(800);
      }
    }
  });

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

    const quoteLink = mobileDialog.getByRole("link", { name: "Get a Quote", exact: true });
    await expect(quoteLink).toHaveAttribute("href", "/garden-cleaners/quote");
    await Promise.all([page.waitForURL(url("/garden-cleaners/quote")), quoteLink.click({ force: true })]);
    await expect(page).toHaveURL(url("/garden-cleaners/quote"));
    await expect(page.getByRole("heading", { level: 1, name: /Tell us what needs cleaning\./i })).toBeVisible();
  });

  test("quote form exposes the required intake controls without submitting data", async ({ page }) => {
    await page.goto(url("/garden-cleaners/quote"));

    await expect(page.getByLabel("Full Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Phone")).toBeVisible();
    await expect(page.getByLabel("Property Type")).toBeVisible();
    await expect(page.getByLabel("Service Needed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("Garden custom domain blocks role route leakage", async ({ request }) => {
    const response = await request.get(url("/garden-cleaners/staff"), {
      headers: { host: "gardencleaners.ca" }
    });

    expect(response.status()).toBe(404);
  });
});
