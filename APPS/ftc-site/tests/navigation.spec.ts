import { expect, test } from "@playwright/test";
import { SITE_URL } from "../lib/site";

test.describe("Una Labs site routes", () => {
  const routeChecks = [
    { path: "/", title: "Intelligent software. Creative AI. Real-world systems." },
    { path: "/capabilities", title: "Studio" },
    { path: "/work", title: "Work" },
    { path: "/products", title: "Products" },
    { path: "/about", title: "About Una Labs" },
    { path: "/work-with-ftc", title: "Start a Project" },
    { path: "/connect", title: "Fejiro Efiuvwere" }
  ];

  routeChecks.forEach((route) => {
    test(`visiting ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator("h1")).toHaveText(route.title);
    });
  });

  test("header links hit the new IA routes", async ({ page }) => {
    await page.goto("/");
    const navTargets: Array<{ label: string; expectedPath: string }> = [
      { label: "Home", expectedPath: "/" },
      { label: "Studio", expectedPath: "/capabilities" },
      { label: "Work", expectedPath: "/work" },
      { label: "Products", expectedPath: "/products" },
      { label: "About", expectedPath: "/about" },
      { label: "Start a Project", expectedPath: "/work-with-ftc" }
    ];

    for (const target of navTargets) {
      await page.goto("/");
      await page.locator("header").getByRole("link", { name: target.label }).first().click();
      await expect(page).toHaveURL(target.expectedPath);
    }
  });

  test("legacy routes redirect to new routes", async ({ page }) => {
    const redirects: Array<{ from: string; to: string }> = [
      { from: "/services", to: "/capabilities" },
      { from: "/case-studies", to: "/work" },
      { from: "/contact", to: "/work-with-ftc" }
    ];

    for (const redirect of redirects) {
      const response = await page.request.fetch(redirect.from, { maxRedirects: 0 });
      expect([301, 308]).toContain(response.status());
      expect(response.headers().location).toBe(redirect.to);

      await page.goto(redirect.from);
      await expect(page).toHaveURL(redirect.to);
    }
  });

  test("connect alias redirects to /connect", async ({ page }) => {
    const response = await page.request.fetch("/c", { maxRedirects: 0 });
    expect([301, 308]).toContain(response.status());
    expect(response.headers().location).toBe("/connect");

    await page.goto("/c");
    await expect(page).toHaveURL("/connect");
  });

  test("connect routes expose vcard and qr", async ({ page }) => {
    const vcard = await page.request.get("/connect/vcard");
    expect(vcard.status()).toBe(200);
    expect(vcard.headers()["content-type"] || "").toContain("text/vcard");
    const vcardBody = await vcard.text();
    expect(vcardBody).toContain("BEGIN:VCARD");
    expect(vcardBody).toContain("FN:Fejiro Efiuvwere");

    const qr = await page.request.get("/connect/qr.svg");
    expect(qr.status()).toBe(200);
    expect(qr.headers()["content-type"] || "").toContain("image/svg+xml");
    const qrBody = await qr.text();
    expect(qrBody).toContain("<svg");
  });

  test("connect page keeps Start a Project action", async ({ page }) => {
    await page.goto("/connect");
    const cta = page.getByRole("link", { name: "Start a Project" }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/work-with-ftc");
  });

  test("case study detail route works", async ({ page }) => {
    await page.goto("/work/peacepad");
    await expect(page.locator("h1")).toHaveText("PeacePad");
    await expect(page.getByRole("heading", { name: "Problem" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Outcome" })).toBeVisible();
  });

  test("robots and sitemap are exposed", async ({ page }) => {
    const robots = await page.goto("/robots.txt");
    expect(robots?.status()).toBe(200);
    const robotsText = await robots?.text();
    expect(robotsText || "").toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);

    const sitemap = await page.goto("/sitemap.xml");
    expect(sitemap?.status()).toBe(200);
    const sitemapText = await sitemap?.text();
    expect(sitemapText || "").toContain(`${SITE_URL}/work/peacepad`);
  });

  test("homepage keeps Start a Project as primary conversion action", async ({ page }) => {
    await page.goto("/");
    const ctas = page.getByRole("link", { name: "Start a Project" });
    const count = await ctas.count();
    expect(count).toBeGreaterThanOrEqual(3);
    await expect(ctas.first()).toBeVisible();
  });

  test("intake API accepts valid lead payload", async ({ page }) => {
    const response = await page.request.post("/api/intake", {
      data: {
        name: "Integration Test",
        email: "integration-test@example.com",
        projectIdea:
          "Need an AI-assisted workflow to route intake requests and automate status updates.",
        budgetRange: "5k-15k",
        timeline: "6-12-weeks",
        companyWebsite: "",
        startedAt: Date.now() - 3_000
      }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBeTruthy();
  });
});
