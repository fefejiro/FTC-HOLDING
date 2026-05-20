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

  await page.goto(callbackUrl, { waitUntil: "networkidle", timeout: 60000 });

  const body = await page.locator("body").innerText();
  const hasGlobalCrash = /An unexpected error occurred|SOMETHING WENT WRONG/i.test(body);
  const hasAttentionHeading = /Sign-in needs attention/i.test(body);
  const hasConfiguredMessage = /not configured for this deployment/i.test(body);

  const primaryLabel = hasConfiguredMessage ? /open portal/i : /open admin dashboard/i;
  const secondaryLabel = hasConfiguredMessage ? /contact support/i : /open workspace/i;

  const primaryLink = page.getByRole("link", { name: primaryLabel });
  const secondaryLink = page.getByRole("link", { name: secondaryLabel });

  const primaryHref = await primaryLink.getAttribute("href");
  const secondaryHref = await secondaryLink.getAttribute("href");

  await primaryLink.click();
  await page.waitForLoadState("networkidle");
  const afterPrimary = page.url();

  await page.goto(callbackUrl, { waitUntil: "networkidle", timeout: 60000 });
  await secondaryLink.click();
  await page.waitForLoadState("networkidle");
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

  if (hasGlobalCrash) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
