import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const baseUrl = 'http://localhost:5000';

const screenshots = [
  { name: 'screenshot_01_chat', path: '/chat', description: 'Home/Chat Screen' },
  { name: 'screenshot_02_conch_mode', path: '/conch-mode', description: 'Conch Mode' },
  { name: 'screenshot_03_progress', path: '/progress', description: 'Progress Dashboard' },
  { name: 'screenshot_04_calendar', path: '/scheduling', description: 'Shared Calendar' },
  { name: 'screenshot_05_ai_tone', path: '/chat', description: 'AI Tone Analysis', action: async (page) => {
    // Try to trigger AI tone analysis by typing a message
    const input = await page.locator('textarea, input[type="text"]').first();
    if (await input.isVisible()) {
      await input.fill('This is frustrating and I need you to listen!');
      await page.waitForTimeout(1000);
    }
  }},
  { name: 'screenshot_06_expenses', path: '/expenses', description: 'Expense Tracking' },
  { name: 'screenshot_07_tasks', path: '/tasks', description: 'Tasks & To-Dos' },
  { name: 'screenshot_08_settings', path: '/settings', description: 'Settings/Profile' },
];

async function captureScreenshots() {
  console.log('🎬 Starting screenshot capture...\n');
  
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  try {
    // First, try to navigate to the app to check if it's running
    console.log(`🔗 Connecting to ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 10000 });
    console.log('✅ App is running!\n');

    // Wait a bit for the app to fully load
    await page.waitForTimeout(2000);

    for (const screenshot of screenshots) {
      console.log(`📸 Capturing: ${screenshot.description}`);
      
      // Navigate to the path
      await page.goto(`${baseUrl}${screenshot.path}`, { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
      
      // Wait for content to load
      await page.waitForTimeout(1500);

      // Run custom action if provided
      if (screenshot.action) {
        await screenshot.action(page);
      }

      // Capture screenshot
      const outputPath = join(__dirname, 'play_store_assets', 'screenshots', `${screenshot.name}.png`);
      await page.screenshot({
        path: outputPath,
        fullPage: false,
      });
      
      console.log(`   ✓ Saved: ${screenshot.name}.png\n`);
    }

    console.log('🎉 All screenshots captured successfully!');
    
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error.message);
    console.log('\n⚠️  Make sure the app is running on http://localhost:5000');
  } finally {
    await browser.close();
  }
}

captureScreenshots();
