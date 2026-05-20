/**
 * Debug scraper - captures page HTML snapshot and screenshot for each source
 * Run: npx tsx scripts/debug-scraper.ts
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "tmp", "scraper-debug");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function debugPage(url: string, label: string) {
  console.log(`\n[${label}] Launching headless browser...`);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(4000); // let JS render

    const screenshotPath = path.join(OUT_DIR, `${label}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`[${label}] Screenshot saved: ${screenshotPath}`);

    // Dump relevant DOM: all unique element tag+class combos that might be job cards
    const domInfo = await page.evaluate(() => {
      const body = document.body.innerHTML;
      const title = document.title;
      const textLen = document.body.innerText.length;

      // Find likely job-related elements
      const jobKeywords = ["job", "card", "result", "listing", "position", "role"];
      const found: string[] = [];
      const allEls = document.querySelectorAll("*");
      const seen = new Set<string>();

      allEls.forEach((el) => {
        const cls = el.className?.toString() || "";
        const id = el.id || "";
        const attr = Array.from(el.attributes)
          .map((a) => `${a.name}="${a.value}"`)
          .join(" ");

        if (
          jobKeywords.some(
            (k) =>
              cls.toLowerCase().includes(k) ||
              id.toLowerCase().includes(k) ||
              attr.toLowerCase().includes(k)
          )
        ) {
          const key = `<${el.tagName.toLowerCase()} class="${cls.substring(0, 80)}"...>`;
          if (!seen.has(key)) {
            seen.add(key);
            found.push(key);
          }
        }
      });

      return { title, textLen, jobElements: found.slice(0, 30), bodySnippet: body.substring(0, 3000) };
    });

    const htmlPath = path.join(OUT_DIR, `${label}.json`);
    fs.writeFileSync(htmlPath, JSON.stringify(domInfo, null, 2));
    console.log(`[${label}] Page title: "${domInfo.title}"`);
    console.log(`[${label}] Body text length: ${domInfo.textLen} chars`);
    console.log(`[${label}] Job-related elements found (${domInfo.jobElements.length}):`);
    domInfo.jobElements.forEach((el) => console.log("   ", el));
  } finally {
    await browser.close();
  }
}

async function main() {
  await debugPage(
    "https://www.dice.com/jobs?q=technical+program+manager&location=&country=US&radius=30&radiusUnit=mi&page=1&pageSize=20&language=en",
    "dice"
  );
  await debugPage(
    "https://www.indeed.com/jobs?q=technical+program+manager&l=Canada&sort=date",
    "indeed"
  );
}

main().catch(console.error);
