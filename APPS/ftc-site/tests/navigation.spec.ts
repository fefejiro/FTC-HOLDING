import { expect, test } from "@playwright/test";

test.describe("FTC site routes", () => {
  const routeChecks = [
    { path: "/", title: "Intelligent software. Creative AI. Real-world systems." },
    { path: "/capabilities", title: "Capabilities" },
    { path: "/work", title: "Work" },
    { path: "/products", title: "Products" },
    { path: "/about", title: "About FTC" },
    { path: "/work-with-ftc", title: "Work With FTC" }
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
      { label: "Capabilities", expectedPath: "/capabilities" },
      { label: "Work", expectedPath: "/work" },
      { label: "Products", expectedPath: "/products" },
      { label: "About", expectedPath: "/about" },
      { label: "Work With FTC", expectedPath: "/work-with-ftc" }
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
      await page.goto(redirect.from);
      await expect(page).toHaveURL(redirect.to);
    }
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
    expect(robotsText || "").toContain("Sitemap: https://ftc.peacepad.ca/sitemap.xml");

    const sitemap = await page.goto("/sitemap.xml");
    expect(sitemap?.status()).toBe(200);
    const sitemapText = await sitemap?.text();
    expect(sitemapText || "").toContain("https://ftc.peacepad.ca/work/peacepad");
  });
});
