import { defineConfig, devices } from '@playwright/test';
import { PORTS } from '@ftc/config';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORTS.FTC}`;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

export default defineConfig({
  testDir: './tests',
  webServer: skipWebServer
    ? undefined
    : {
        command: `npm run dev -- -p ${PORTS.FTC}`,
        url: `http://localhost:${PORTS.FTC}`,
        reuseExistingServer: process.env.CI ? false : true,
        timeout: 30 * 1000,
      },
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
});
