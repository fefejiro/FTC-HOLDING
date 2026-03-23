import { expect, test } from "@playwright/test";

test.describe("Public journey", () => {
  test("home to products to client launches keeps the public story clear", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Fast websites, lead systems, and AI-assisted workflows." })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Try ATEAM Demo" }).first()).toBeVisible();

    await page.getByRole("link", { name: "Products" }).first().click();
    await expect(page).toHaveURL("/products");
    await expect(page.getByRole("heading", { name: "ATEAM" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Try ATEAM demo", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Client Launches" }).first().click();
    await expect(page).toHaveURL("/work");
    await expect(page.getByRole("heading", { name: "Emergency Prompt" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View onboarding snapshot" })).toBeVisible();
  });

  test("ATEAM demo carries output into Start a Project and submits successfully", async ({ page }) => {
    await page.goto("/ateam");

    await page.getByRole("textbox", { name: "Describe the idea" }).fill(
      "Build a fast website and lead follow-up system for a home services business that needs more booked calls."
    );
    await page.getByLabel("Category").selectOption("lead-automation");
    await page.getByRole("button", { name: "Generate demo output" }).click();

    await expect(page.getByRole("heading", { name: "Reviewing your idea and building a scoped next step" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Clear next step for your idea" })).toBeVisible({ timeout: 7000 });

    await page.getByRole("link", { name: "Continue with this idea" }).click();
    await expect(page).toHaveURL(/\/work-with-ftc\?from=ateam/);

    await expect(page.getByText("Prefilled from your ATEAM demo. Edit anything before submitting.")).toBeVisible();
    await expect(page.getByLabel("Project brief")).toContainText(
      "Recommended lane: Local Services Lead Engine"
    );

    await page.getByLabel("Name", { exact: true }).fill("Integration Tester");
    await page.getByLabel("Email", { exact: true }).fill("hello@unalabs.cloud");
    await page.getByLabel("Company or project name", { exact: true }).fill("Home Service Growth");
    await page.getByLabel("Timeline").selectOption("2-4-weeks");
    await page.getByLabel("Budget range").selectOption("2500-5000");
    await page.getByRole("textbox", { name: "Optional notes" }).fill(
      "Need the first phase to focus on booked-call conversion."
    );

    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Submit project request" }).click();

    const successCard = page.getByRole("status");
    await expect(successCard.getByRole("heading", { name: "Una Labs has your project brief." })).toBeVisible();
    await expect(successCard.getByText("Expected reply: within 1 business day.")).toBeVisible();
    await expect(successCard.getByText(/^UL-\d{8}-/)).toBeVisible();
    await expect(successCard.getByText("Local Services Lead Engine", { exact: true })).toBeVisible();
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
      page.getByRole("heading", { name: "ATEAM is the AI lab where rough ideas become clear next steps." })
    ).toBeVisible();
  });
});
