import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";
const url = (path: string) => new URL(path, baseUrl).toString();

const ogRoutes = [
  {
    path: "/og-trades-academy",
    heading: /Learn forex with more structure, mentorship, and g/i
  },
  {
    path: "/og-trades-academy/about",
    heading: /Meet OG Trades, founder and lead instruc/i
  },
  {
    path: "/og-trades-academy/course",
    heading: /8 Week Beginner Forex Course/i
  },
  {
    path: "/og-trades-academy/community",
    heading: /Stay connected with OG Trades Academy betw/i
  },
  {
    path: "/og-trades-academy/resources",
    heading: /Free resources and video lessons to help y/i
  },
  {
    path: "/og-trades-academy/contact",
    heading: /Contact OG Trades Academy and get guidan/i
  }
] as const;

test.describe("OG Trades Academy public QA", () => {
  for (const route of ogRoutes) {
    test(`${route.path} renders OG Trades branding and primary content`, async ({ page }) => {
      await page.goto(url(route.path), { waitUntil: "domcontentloaded" });

      // Brand visible in header
      await expect(page.locator("header")).toContainText(/OG.Trades Academy/i);

      // H1 matches expected heading
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
    });
  }

  test("desktop navigation exposes the OG Trades IA", async ({ page }) => {
    await page.goto(url("/og-trades-academy"), { waitUntil: "domcontentloaded" });
    const nav = page.getByLabel("Main navigation");

    await expect(nav.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "About", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Programs", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Resources", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Community", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Contact", exact: true })).toBeVisible();
  });

  test("home primary CTA is visible", async ({ page }) => {
    await page.goto(url("/og-trades-academy"), { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("link", { name: "Join the Academy", exact: true }).first()
    ).toBeVisible();
  });

  test("enrollment form submits to /api/og-trades-leads and returns 200", async ({
    page,
    context
  }) => {
    await page.goto(url("/og-trades-academy/contact"), { waitUntil: "domcontentloaded" });

    // Wait for React to hydrate: the submit button must be visible and stable before we
    // start the anti-bot timing window. The API rejects any submission under ~800ms from
    // startedAtRef.current (set at component mount, NOT at domcontentloaded).
    await page.getByRole("button", { name: /Submit|Send|Request/i }).waitFor({ state: "visible" });
    await page.waitForTimeout(1000);

    // Intercept the API call before filling the form.
    // Accept any response from the URL so we can assert the exact status code.
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/og-trades-leads"),
        { timeout: 15000 }
      ),
      (async () => {
        await page.getByLabel(/^Name$/i).fill("OG QA Tester");
        await page.getByLabel(/Email/i).fill("og-qa@example.com");
        // Select index 1 for each required dropdown; labels match the actual form text.
        await page.getByLabel(/What are you interested in/i).selectOption({ index: 1 });
        await page.getByLabel(/Experience level/i).selectOption({ index: 1 });
        await page.getByLabel(/Main goal/i).selectOption({ index: 1 });
        await page.getByLabel(/When do you want to start/i).selectOption({ index: 1 });
        await page.getByRole("button", { name: /Submit|Send|Request/i }).click();
      })()
    ]);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  test("custom domain renders OG Trades shell on ogtradesacademy.com host", async ({
    request
  }) => {
    const hostHeaders = { host: "www.ogtradesacademy.com" };

    const root = await request.get(url("/og-trades-academy"), { headers: hostHeaders });
    expect(root.status()).toBe(200);
    const text = await root.text();
    expect(text).toMatch(/OG.Trades Academy/i);
  });

  test("safety blocklist — gardencleaners.ca host does not render OG Trades shell", async ({
    request
  }) => {
    const hostHeaders = { host: "gardencleaners.ca" };
    const res = await request.get(url("/og-trades-academy"), { headers: hostHeaders });
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).not.toMatch(/og-hero|og-brand-mark/i);
  });
});
