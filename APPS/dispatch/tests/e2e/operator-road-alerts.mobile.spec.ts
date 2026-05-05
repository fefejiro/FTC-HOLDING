import { expect, test } from '@playwright/test';

const OPERATOR_NAME = process.env.DISPATCH_TEST_OPERATOR_NAME || 'Ottawa Operator';
const OPERATOR_PIN = process.env.DISPATCH_TEST_OPERATOR_PIN || '9090';
const VALID_ROAD_ALERT_STATE_PATTERNS = [
  /Loading Ottawa roadside alerts/i,
  /Roadside alerts are temporarily unavailable/i,
  /No roadside alerts right now/i,
  /Still monitoring Ottawa incident sources/i,
  /Qualified Ottawa signal/i,
  /Official Ottawa traffic feed/i,
  /Official Ottawa transit feed/i,
  /Official regional feed/i,
] as const;

test.describe('operator mobile road alerts', () => {
  test('renders a non-blank road alerts state and surfaces runtime errors', async ({ page, context }) => {
    await context.clearPermissions();

    const browserErrors: string[] = [];

    page.on('pageerror', (error) => {
      browserErrors.push(`pageerror: ${error.message}`);
    });

    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (/Failed to load resource:.*favicon/i.test(text)) return;
      browserErrors.push(`console: ${text}`);
    });

    // Railway/Cloudflare occasionally returns a transient 502 for a few seconds.
    // Retry the initial login navigation before treating it as a product regression.
    let loginReady = false;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await page.goto('/login?mode=operator', { waitUntil: 'domcontentloaded' });

      const badGatewayHeading = page.getByRole('heading', { name: /Bad gateway/i });
      if (await badGatewayHeading.count()) {
        if (attempt === 3) {
          throw new Error('Dispatch operator login is unavailable after 3 attempts (Cloudflare 502).');
        }
        continue;
      }

      await expect(page.getByLabel('PIN')).toBeVisible();
      loginReady = true;
      break;
    }

    expect(loginReady).toBe(true);


    const operatorSelect = page.locator('select').first();
    await expect(operatorSelect).toBeVisible();
    await operatorSelect.selectOption({ label: OPERATOR_NAME }).catch(async () => {
      const availableOptions = await operatorSelect.locator('option').allTextContents();
      const fallback = availableOptions.find((label) => label.trim() && !/No team members found/i.test(label));
      if (!fallback) {
        throw new Error(`No operator option available. Saw: ${availableOptions.join(', ')}`);
      }
      await operatorSelect.selectOption({ label: fallback });
    });

    await page.getByLabel('PIN').fill(OPERATOR_PIN);
    await page.getByRole('button', { name: /Open field workspace/i }).click();

    await expect(page.getByText(/Live feed connected|Reconnecting live feed/i)).toBeVisible();
    await page.getByRole('button', { name: /Roadside alerts/i }).click();

    const roadAlertsRegion = page.locator('div').filter({
      has: page.getByText(/Ottawa-only live scope\. Out-of-area roadside signals are hidden from this workflow\./i),
    }).first();

    await expect(roadAlertsRegion).toBeVisible();
    await expect(
      page.getByText(new RegExp(VALID_ROAD_ALERT_STATE_PATTERNS.map((pattern) => pattern.source).join('|'), 'i')).first(),
    ).toBeVisible();

    expect(
      browserErrors.filter((entry) => /ReferenceError|TypeError|fmtOptional|Cannot read|is not defined/i.test(entry)),
      `Unexpected runtime errors after opening Roadside alerts:\n${browserErrors.join('\n')}`,
    ).toEqual([]);
  });
});
