import { chromium } from "playwright";

const callbackUrl =
  "https://gardencleaners.ca/auth/callback?product=garden&returnTo=%2Fgarden-cleaners%2Fportal%23portal-access";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  await page.goto(callbackUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("body").waitFor({ state: "visible", timeout: 15000 });

  const body = await page.locator("body").innerText();
  const hasGlobalCrash = /An unexpected error occurred|SOMETHING WENT WRONG/i.test(body);
  const hasAttentionHeading = /Sign-in needs attention/i.test(body);
  const hasConfiguredMessage = /not configured for this deployment/i.test(body);
  const hasOpenPortalCta = (await page.getByRole("link", { name: /open portal/i }).count()) > 0;

  const primaryLabel = hasOpenPortalCta ? /open portal/i : /open admin dashboard/i;
  const secondaryLabel = hasOpenPortalCta ? /back to home/i : /open workspace/i;

  const primaryLink = page.getByRole("link", { name: primaryLabel }).first();
  const secondaryLink = page.getByRole("link", { name: secondaryLabel }).first();

  const primaryHref = await primaryLink.getAttribute("href");
  const secondaryHref = await secondaryLink.getAttribute("href");

  await primaryLink.click({ force: true });
  await page.waitForTimeout(1200);
  const afterPrimary = page.url();

  await page.goto(callbackUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
  const secondaryLinkAfterReload = page.getByRole("link", { name: secondaryLabel }).first();
  await secondaryLinkAfterReload.click({ force: true });
  await page.waitForTimeout(1200);
  const afterSecondary = page.url();

  const result = {
    callbackUrl,
    hasGlobalCrash,
    hasAttentionHeading,
    hasConfiguredMessage,
    primaryHref,
    secondaryHref,
    afterPrimary,
    afterSecondary,
    errors,
  };

  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  const gardenPortalPattern = /gardencleaners\.ca\/(?:garden-cleaners\/)?portal#(?:admin|portal-access|customer|staff)$/i;
  const primaryHrefOk = typeof primaryHref === "string" && gardenPortalPattern.test(primaryHref);
  const secondaryHrefOk = typeof secondaryHref === "string" && gardenPortalPattern.test(secondaryHref);
  const primaryNavigated = gardenPortalPattern.test(afterPrimary);
  const secondaryNavigated = gardenPortalPattern.test(afterSecondary);

  if (hasGlobalCrash || !primaryHrefOk || !secondaryHrefOk || !primaryNavigated || !secondaryNavigated) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
