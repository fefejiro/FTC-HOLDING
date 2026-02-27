import { defineConfig, devices } from '@playwright/test';
import { PORTS } from '@ftc/config';

export default defineConfig({
  testDir: './tests',
  webServer: {
    command: `npm run dev -- -p ${PORTS.FTC}`,
    url: `http://localhost:${PORTS.FTC}`,
    reuseExistingServer: process.env.CI ? false : true,
    timeout: 30 * 1000,
  },
  use: {
    baseURL: `http://localhost:${PORTS.FTC}`,
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
});
