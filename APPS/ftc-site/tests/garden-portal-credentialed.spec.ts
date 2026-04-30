import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";
const url = (path) => new URL(path, baseUrl).toString();

const qaPassword = process.env.GARDEN_QA_PASSWORD;

const accounts = {
  customer: process.env.GARDEN_QA_CUSTOMER_EMAIL || "garden.customer.qa@unalabs.cloud",
  staff: process.env.GARDEN_QA_STAFF_EMAIL || "garden.staff.qa@gardencleaners.ca",
  admin: process.env.GARDEN_QA_ADMIN_EMAIL || "hello@unalabs.cloud",
};

test.describe("Garden portal credentialed QA", () => {
  test.skip(!qaPassword, "GARDEN_QA_PASSWORD is required for credentialed portal QA.");

  async function signIn(page, email) {
    await page.goto(url("/garden-cleaners/portal"), { waitUntil: "domcontentloaded" });
    await expect
      .poll(
        async () => {
          if ((await page.getByText(/Portal auth unavailable/i).count()) > 0) {
            return "unavailable";
          }
          if ((await page.getByLabel("Password").count()) > 0) {
            return "ready";
          }
          return "loading";
        },
        { timeout: 15000 }
      )
      .toBe("ready");
    await page.locator('input[name="portalEmail"]').fill(email);
    await page.locator('input[name="portalPassword"]').fill(qaPassword || "");
    await page.getByRole("button", { name: /sign in to portal/i }).click();
  }

  test("customer can sign in and see seeded Garden record", async ({ page }) => {
    await signIn(page, accounts.customer);

    await expect(page.getByText(/Signed in as client/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(accounts.customer)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Your Jobs/i })).toBeVisible();
    await expect(page.getByText(/Garden Cleaners QA Portal Seed - Oshawa/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Mark triaged/i })).toHaveCount(0);
  });

  test("staff can sign in but admin-only region controls stay hidden", async ({ page }) => {
    await signIn(page, accounts.staff);

    await expect(page.getByText(/Signed in as staff/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(accounts.staff)).toBeVisible();
    await expect(page.getByRole("button", { name: /Save region/i })).toHaveCount(0);
  });

  test("admin can sign in and see operator queue controls", async ({ page }) => {
    await signIn(page, accounts.admin);

    await expect(page.getByText(/Signed in as admin/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(accounts.admin)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Job Queue/i })).toBeVisible();
    await expect(page.getByText(/Garden Cleaners QA Portal Seed - Oshawa/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Staff Profile ID/i).first()).toBeVisible();
  });
});
