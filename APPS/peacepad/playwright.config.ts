import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://peacepad.ca';
const isLocalTesting = baseURL.includes('localhost');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: 1,
  
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 45000,
  },

  projects: [
    {
      name: 'setup',
      testDir: './tests/e2e/setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    // ==================== DESKTOP BROWSERS ====================
    {
      name: 'p1-critical-chromium',
      testDir: './tests/e2e/p1-critical',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'p1-critical-firefox',
      testDir: './tests/e2e/p1-critical',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'p1-critical-webkit',
      testDir: './tests/e2e/p1-critical',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    
    // ==================== P2/P3/P4/PERFORMANCE (Chrome only for speed) ====================
    {
      name: 'p2-important-chromium',
      testDir: './tests/e2e/p2-important',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'p3-nice-to-have-chromium',
      testDir: './tests/e2e/p3-nice-to-have',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'p4-staging-chromium',
      testDir: './tests/e2e/p4-staging',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'performance',
      testDir: './tests/e2e/performance',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    
    // ==================== MOBILE - iOS DEVICES ====================
    {
      name: 'mobile-iphone-14',
      testDir: './tests/e2e/p1-critical',
      use: { 
        ...devices['iPhone 14'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-iphone-13',
      testDir: './tests/e2e/p1-critical',
      use: { 
        ...devices['iPhone 13'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-iphone-se',
      testDir: './tests/e2e/p1-critical',
      use: { 
        ...devices['iPhone SE'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    
    // ==================== MOBILE - ANDROID DEVICES ====================
    {
      name: 'mobile-galaxy-s21',
      testDir: './tests/e2e/p1-critical',
      use: { 
        ...devices['Galaxy S9+'],  // Closest to S21 in Playwright's device list
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-pixel-7',
      testDir: './tests/e2e/p1-critical',
      use: { 
        ...devices['Pixel 7'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-pixel-5',
      testDir: './tests/e2e/p1-critical',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    
    // ==================== TABLET DEVICES ====================
    {
      name: 'tablet-ipad-pro',
      testDir: './tests/e2e/p1-critical',
      use: { 
        ...devices['iPad Pro 11'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'tablet-ipad-mini',
      testDir: './tests/e2e/p1-critical',
      use: { 
        ...devices['iPad Mini'],
        storageState: 'tests/.auth/guest.json',
      },
      dependencies: ['setup'],
    },
  ],

  ...(isLocalTesting && {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  }),
});
