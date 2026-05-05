import { expect, test } from "@playwright/test";
import { SITE_URL } from "../lib/site";

test.describe("Site routes", () => {
  const routeChecks = [
    { path: "/", title: "Fast websites, lead systems, and AI-assisted workflows." },
    { path: "/about", title: "About Una Labs" },
    { path: "/capabilities", title: "Studio" },
    { path: "/work", title: "Live delivery snapshots, kept separate from products." },
    { path: "/products", title: "Products" },
    { path: "/work-with-ftc", title: "Turn the idea into a scoped next step." },
    { path: "/connect", title: "Fejiro Efiuvwere" }
  ];

  const polarRouteChecks = [
    { path: "/polar-anchor", title: "End-to-End Freight and Logistics Solutions You Can Rely On" },
    { path: "/polar-anchor/about", title: "About Polar Anchor" },
    { path: "/polar-anchor/services", title: "Logistics Services" },
    { path: "/polar-anchor/contact", title: "Contact Polar Anchor" },
    { path: "/polar-anchor/quote", title: "Tell us what needs to move." }
  ];

  routeChecks.forEach((route) => {
    test(`visiting ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator("h1").first()).toContainText(route.title);
    });
  });

  polarRouteChecks.forEach((route) => {
    test(`visiting ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator("h1").first()).toContainText(route.title);
    });
  });

  test("header links hit the polar anchor IA routes", async ({ page }) => {
    await page.goto("/polar-anchor");
    const navTargets: Array<{ label: string; expectedPath: string }> = [
      { label: "Home", expectedPath: "/polar-anchor" },
      { label: "About", expectedPath: "/polar-anchor/about" },
      { label: "Services", expectedPath: "/polar-anchor/services" },
      { label: "Contact", expectedPath: "/polar-anchor/contact" },
      { label: "Request Quote", expectedPath: "/polar-anchor/quote" }
    ];

    for (const target of navTargets) {
      await page.goto("/polar-anchor");
      await page.locator("header").getByRole("link", { name: target.label }).first().click();
      await expect(page).toHaveURL(target.expectedPath);
    }
  });

  test("polar routes keep Polar Anchor branding visible across pages", async ({ page }) => {
    const titleChecks = [
      "/polar-anchor",
      "/polar-anchor/about",
      "/polar-anchor/services",
      "/polar-anchor/contact",
      "/polar-anchor/quote"
    ];

    for (const path of titleChecks) {
      await page.goto(path);
      await expect(page.locator("header .brand")).toContainText("Polar Anchor");
    }
  });

  test("mobile navigation opens and closes on polar routes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/polar-anchor");

    const menuButton = page.getByRole("button", { name: "Menu" });
    await expect(menuButton).toBeVisible();
    await menuButton.click({ force: true });

    const mobileDialog = page.locator("#mobile-nav-panel");
    await expect(mobileDialog).toHaveClass(/is-open/);
    await mobileDialog.getByRole("link", { name: "Services" }).click();
    await expect(page).toHaveURL("/polar-anchor/services");

    await page.goto("/polar-anchor");
    await page.getByRole("button", { name: "Menu" }).click({ force: true });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.locator("#mobile-nav-panel")).not.toHaveClass(/is-open/);
  });

  test("polar footer keeps quote and contact details visible", async ({ page }) => {
    await page.goto("/polar-anchor");
    const footer = page.locator("footer");

    await expect(footer.getByText("Polar Anchor")).toBeVisible();
    await expect(footer.getByRole("link", { name: "Request Quote" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "+1 (647) 000-0000" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "hello@unalabs.cloud" })).toBeVisible();
    await expect(footer.getByText("Serving Canada logistics clients")).toBeVisible();
  });

  test("legacy routes redirect to new routes", async ({ page }) => {
    const redirects: Array<{ from: string; to: string }> = [
      { from: "/services", to: "/capabilities" },
      { from: "/contact", to: "/work-with-ftc" },
      { from: "/quote", to: "/polar-anchor/quote" },
      { from: "/case-studies", to: "/work" }
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
    expect(vcard.headers()["content-type"] || "").toMatch(/text\/(x-)?vcard/i);
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
    await expect(page).toHaveURL("/products/peacepad");
    await expect(page.locator("h1")).toHaveText("PeacePad");
    await expect(
      page.getByRole("heading", { name: "PeacePad keeps high-stakes communication calm before it is sent." })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Install on Google Play" }).first()).toBeVisible();
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
    expect(sitemapText || "").toContain(`${SITE_URL}/polar-anchor`);
  });

  test("polar homepage keeps Request a Quote as primary conversion action", async ({ page }) => {
    await page.goto("/polar-anchor");
    const ctas = page.getByRole("link", { name: "Request a Quote" });
    const count = await ctas.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await expect(ctas.first()).toBeVisible();
  });

  test("polar anchor quote API accepts valid lead payload", async ({ page }) => {
    const response = await page.request.post("/api/polar-anchor-quote", {
      data: {
        fullName: "Integration Test",
        email: "integration-test@example.com",
        phone: "+1 (647) 000-0000",
        companyName: "Polar Anchor Prospect",
        shipmentType: "Commercial goods",
        serviceNeeded: "Freight Forwarding",
        origin: "Shanghai",
        destination: "Toronto",
        preferredDate: "2026-04-01",
        preferredTimeline: "This month",
        message:
          "Need freight forwarding and customs support for a commercial shipment moving into Canada.",
        website: "",
        startedAt: Date.now() - 3_000
      }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBeTruthy();
  });

  test("quote form submits successfully", async ({ page }) => {
    await page.goto("/polar-anchor/quote");
    await page.getByLabel("Full Name").fill("Integration Test");
    await page.getByLabel("Email").fill("integration-test@example.com");
    await page.getByLabel("Phone").fill("+1 (647) 000-0000");
    await page.getByLabel("Company Name").fill("Northern Trade Co.");
    await page.getByLabel("Shipment Type").selectOption("Commercial goods");
    await page.getByLabel("Service Needed").selectOption("Freight Forwarding");
    await page.getByLabel("Origin").fill("Shanghai");
    await page.getByLabel("Destination").fill("Toronto");
    await page.getByLabel("Preferred Date").fill("2026-04-01");
    await page.getByLabel("Preferred Timeline").selectOption("This month");
    await page
      .getByLabel("Message")
      .fill("Need support coordinating freight forwarding, customs, and inland delivery for a commercial shipment.");
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Request Quote" }).click();
    await expect(page.getByText("Polar Anchor received your quote request")).toBeVisible();
  });

  test("intake API accepts valid lead payload", async ({ page }) => {
    const response = await page.request.post("/api/intake", {
      data: {
        name: "Integration Test",
        email: "integration-test@example.com",
        projectIdea:
          "Need an AI-assisted workflow to route intake requests and automate status updates.",
        budgetRange: "5000-10000",
        timeline: "8-12-weeks",
        projectName: "Integration Test Project",
        projectType: "AI workflow",
        notes: "Please focus on intake routing first.",
        companyWebsite: "",
        startedAt: Date.now() - 3_000
      }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBeTruthy();
  });
});
