import { expect, test } from "@playwright/test";

test.describe("Public journey", () => {
  test("home to products to client launches keeps the public story clear", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Turn a rough idea into a/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Start ATEAM/i }).first()).toBeVisible();

    await page.getByRole("link", { name: "Products", exact: true }).first().click({ force: true });
    await expect(page).toHaveURL("/products");
    await expect(page.getByRole("img", { name: "PeacePad logo" })).toBeVisible();
    await expect(page.getByRole("img", { name: "SayWetin logo" })).toBeVisible();
    const dispatchLogo = page.getByRole("img", { name: "Dispatch logo" });
    await dispatchLogo.scrollIntoViewIfNeeded();
    await expect(dispatchLogo).toBeVisible();
    await expect(page.getByText("Early Access", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Private Beta", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "ATEAM" }).first()).toBeVisible();
    await expect(page.locator('a[href="/ateam"]').first()).toBeVisible();

    await page.getByRole("link", { name: "Client Launches" }).first().click();
    await expect(page).toHaveURL("/work");
    await expect(page.getByRole("heading", { name: "Emergency Prompt" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View onboarding snapshot" })).toBeVisible();
  });

  test("ATEAM route exposes the cloud-native workflow surface", async ({ page }) => {
    await page.goto("/ateam");

    await expect(
      page.getByRole("heading", {
        name: /Turn a rough idea into a/
      })
    ).toBeVisible();
    await expect(page.getByText("Private Beta", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Start ATEAM/i })).toBeVisible();
    await expect(page.getByText("Idea in", { exact: true })).toBeAttached();
    await expect(page.getByText("Decision pack", { exact: true })).toBeAttached();
  });

  test("mobile navigation still exposes the core public routes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.getByRole("button", { name: "Menu" }).click();
    const mobileDialog = page.getByRole("dialog", { name: "Mobile navigation" });
    await expect(mobileDialog).toBeVisible();

    await mobileDialog.getByRole("link", { name: "ATEAM" }).first().click();
    await expect(page).toHaveURL("/ateam");
    await expect(
      page.getByRole("heading", {
        name: /Turn a rough idea into a/
      })
    ).toBeVisible();
  });
});
