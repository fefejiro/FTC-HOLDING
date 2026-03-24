import { expect, test } from "@playwright/test";

test.describe("Public journey", () => {
  test("home to products to client launches keeps the public story clear", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1").first()).toContainText(
      "Fast websites, lead systems, and AI-assisted workflows."
    );
    await expect(page.getByRole("link", { name: "Open ATEAM" }).first()).toBeVisible();

    await page
      .getByLabel("Main navigation")
      .getByRole("link", { name: "Products", exact: true })
      .first()
      .click({ force: true });
    await expect(page).toHaveURL("/products");
    await expect(page.getByRole("heading", { name: "ATEAM" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Open ATEAM", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Client Launches" }).first().click();
    await expect(page).toHaveURL("/work");
    await expect(page.getByRole("heading", { name: "Emergency Prompt" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View onboarding snapshot" })).toBeVisible();
  });

  test("ATEAM route exposes the real local surface shell", async ({ page }) => {
    await page.goto("/ateam");

    await expect(
      page.getByRole("heading", {
        name: "ATEAM inside Una Labs opens the actual local product, not a fake demo."
      })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Memory/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Factory/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry local ATEAM" })).toBeVisible();

    await page.goto("/ateam/factory");
    await expect(page).toHaveURL("/ateam/factory");
    await expect(page.getByRole("link", { name: /Factory/i })).toHaveAttribute("aria-current", "page");
  });

  test("mobile navigation still exposes the core public routes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.getByRole("button", { name: "Menu" }).click();
    const mobileDialog = page.getByRole("dialog", { name: "Mobile navigation" });
    await expect(mobileDialog).toBeVisible();

    await mobileDialog.getByRole("link", { name: "ATEAM" }).click();
    await expect(page).toHaveURL("/ateam");
    await expect(
      page.getByRole("heading", {
        name: "ATEAM inside Una Labs opens the actual local product, not a fake demo."
      })
    ).toBeVisible();
  });
});
