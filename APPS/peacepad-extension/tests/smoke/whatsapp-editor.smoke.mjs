import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const fixturePath = path.resolve(process.cwd(), "tests/fixtures/whatsapp-editor.html");
const fixtureUrl = pathToFileURL(fixturePath).href;
const suggestion = "I'm upset right now. Let's pause and focus on what needs to happen for the kids.";

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.goto(fixtureUrl);

  await page.evaluate(() => {
    window.fixtureApi.resetDraft();
  });

  await page.evaluate((value) => {
    window.fixtureApi.rawDomReplace(value);
  }, suggestion);
  await page.waitForTimeout(75);

  const revertedText = await page.evaluate(() => window.fixtureApi.getText());
  if (revertedText !== "fuck you") {
    throw new Error(`Expected raw DOM reset to revert to original draft, received: ${revertedText}`);
  }

  await page.evaluate(() => {
    window.fixtureApi.resetDraft();
  });

  await page.evaluate((value) => {
    window.fixtureApi.rangeInsertWithValueInput(value);
  }, suggestion);
  await page.waitForTimeout(75);

  const duplicatedText = await page.evaluate(() => window.fixtureApi.getText());
  if (duplicatedText !== `${suggestion}${suggestion}`) {
    throw new Error(`Expected range insert with value input to duplicate suggestion, received: ${duplicatedText}`);
  }

  await page.evaluate(() => {
    window.fixtureApi.resetDraft();
  });

  await page.evaluate((value) => {
    window.fixtureApi.rangeInsertWithPlainInput(value);
  }, suggestion);
  await page.waitForTimeout(75);

  const safeRangeText = await page.evaluate(() => window.fixtureApi.getText());
  if (safeRangeText !== suggestion) {
    throw new Error(`Expected range insert with plain input to persist suggestion once, received: ${safeRangeText}`);
  }

  await page.evaluate((value) => {
    window.fixtureApi.browserInsert(value);
  }, suggestion);
  await page.waitForTimeout(75);

  const insertedText = await page.evaluate(() => window.fixtureApi.getText());
  if (insertedText !== suggestion) {
    throw new Error(`Expected browser insert to persist suggestion, received: ${insertedText}`);
  }

  const activeId = await page.evaluate(() => document.activeElement?.id || "");
  if (activeId !== "composer") {
    throw new Error(`Expected composer focus after insertion, active element: ${activeId || "<none>"}`);
  }

  const caretOffset = await page.evaluate(() => window.fixtureApi.getCaretOffset());
  if (caretOffset !== suggestion.length) {
    throw new Error(`Expected caret at end (${suggestion.length}), received ${caretOffset}`);
  }

  await page.locator("#composer").type(" More detail", { delay: 5 });
  const editedText = await page.evaluate(() => window.fixtureApi.getText());
  if (editedText !== `${suggestion} More detail`) {
    throw new Error(`Expected fixture text to remain editable, received: ${editedText}`);
  }

  console.log("WhatsApp editor fixture smoke passed");
} finally {
  await browser.close();
}
