import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const executablePath = process.env.CHROME_EXECUTABLE_PATH
  || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(root, "scripts", "product-preview-fixture.html")).href);
  await page.screenshot({ path: path.join(root, "public", "product-preview.png") });
} finally {
  await browser.close();
}
