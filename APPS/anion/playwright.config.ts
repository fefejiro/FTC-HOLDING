import { defineConfig } from '@playwright/test';

const port = 4178;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: `npm run dev -- -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 90_000,
        env: {
          // Placeholder values keep the Supabase client happy for unauthenticated
          // smoke tests. Real credentials are NOT required — all tested routes
          // either require no auth (login, pricing) or redirect to /login before
          // any Supabase network call is made.
          NEXT_PUBLIC_SUPABASE_URL:
            process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key-for-smoke',
        },
      },
});
