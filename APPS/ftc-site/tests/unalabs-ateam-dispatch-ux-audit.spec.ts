import { expect, test, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

type Priority = "P1" | "P2" | "P3";
type Category =
  | "Functional"
  | "Interaction"
  | "Accessibility"
  | "Content"
  | "Performance"
  | "Reliability";

type Surface = "Unalabs" | "ATEAM" | "Dispatch";

type Finding = {
  priority: Priority;
  category: Category;
  surface: Surface;
  title: string;
  details: string;
  evidence?: string;
};

const PRIORITY_RANK: Record<Priority, number> = {
  P1: 3,
  P2: 2,
  P3: 1,
};

const NAV_TIMEOUT_MS = 10_000;

function resolveFailThreshold(): Priority {
  const raw = String(process.env.PLAYWRIGHT_UX_FAIL_ON || "P2").toUpperCase();
  if (raw === "P1" || raw === "P2" || raw === "P3") return raw;
  return "P2";
}

function summarizeFindings(findings: Finding[]) {
  const byPriority: Record<Priority, number> = { P1: 0, P2: 0, P3: 0 };
  for (const finding of findings) byPriority[finding.priority] += 1;
  return byPriority;
}

function toMarkdown(findings: Finding[]) {
  if (!findings.length) {
    return [
      "# UX Audit Summary",
      "",
      "No issues found across Unalabs, ATEAM, and Dispatch in this test run.",
    ].join("\n");
  }

  const lines = ["# UX Audit Summary", ""];
  const counts = summarizeFindings(findings);
  lines.push(`- P1: ${counts.P1}`);
  lines.push(`- P2: ${counts.P2}`);
  lines.push(`- P3: ${counts.P3}`);
  lines.push("");

  for (const finding of findings) {
    lines.push(
      `- [${finding.priority}] [${finding.surface}] [${finding.category}] ${finding.title} - ${finding.details}`,
    );
    if (finding.evidence) {
      lines.push(`  Evidence: ${finding.evidence}`);
    }
  }

  return lines.join("\n");
}

async function saveSummaryArtifacts(testInfo: TestInfo, findings: Finding[]) {
  const outputDir = path.resolve(process.cwd(), "test-results");
  await fs.mkdir(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, "unalabs-ateam-dispatch-ux-findings.json");
  const mdPath = path.join(outputDir, "unalabs-ateam-dispatch-ux-summary.md");

  await fs.writeFile(jsonPath, JSON.stringify({ findings, generatedAt: new Date().toISOString() }, null, 2));
  await fs.writeFile(mdPath, toMarkdown(findings));

  await testInfo.attach("ux-audit-summary", {
    body: Buffer.from(toMarkdown(findings), "utf8"),
    contentType: "text/markdown",
  });
}

async function checkForConsoleErrors(page: Page, findings: Finding[]) {
  let errors: string[] = [];
  try {
    errors = await page.evaluate(() => {
      return (window as Window & { __uxAuditConsoleErrors?: string[] }).__uxAuditConsoleErrors || [];
    });
  } catch {
    return;
  }
  if (errors.length) {
    findings.push({
      priority: "P2",
      category: "Reliability",
      surface: "Unalabs",
      title: "Client-side console errors were captured",
      details: "At least one browser console error appeared during UX flow execution.",
      evidence: errors.slice(0, 3).join(" | "),
    });
  }
}

async function checkMojibake(page: Page, surface: Surface, findings: Finding[]) {
  let brokenText: string[] = [];
  try {
    brokenText = await page.evaluate(() => {
      const suspicious = ["â€", "â€”", "â†", "Â·", "â€¦", "â€œ", "â€�", "âœ", "â—", "â¬"];
      const values: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null = walker.nextNode();
      while (node) {
        const value = node.textContent?.replace(/\s+/g, " ").trim() || "";
        if (value && suspicious.some((token) => value.includes(token))) {
          values.push(value.slice(0, 120));
        }
        if (values.length >= 5) break;
        node = walker.nextNode();
      }
      return values;
    });
  } catch {
    return;
  }

  if (brokenText.length) {
    findings.push({
      priority: "P2",
      category: "Content",
      surface,
      title: "Encoding/legibility issue detected in rendered text",
      details: "The page contains mojibake-like sequences that hurt readability.",
      evidence: brokenText.join(" | "),
    });
  }
}

async function checkUnlabeledInputs(page: Page, surface: Surface, findings: Finding[]) {
  let unlabeled: string[] = [];
  try {
    unlabeled = await page.evaluate(() => {
      const controls = Array.from(document.querySelectorAll("input, textarea, select"));
      const visible = controls.filter((control) => {
        const el = control as HTMLElement;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      const misses = visible
        .filter((control) => {
          const id = control.getAttribute("id");
          const ariaLabel = control.getAttribute("aria-label");
          const ariaLabelledBy = control.getAttribute("aria-labelledby");
          const title = control.getAttribute("title");
          const wrappedByLabel = Boolean(control.closest("label"));
          const hasForLabel = Boolean(id && document.querySelector(`label[for="${id}"]`));
          return !ariaLabel && !ariaLabelledBy && !title && !wrappedByLabel && !hasForLabel;
        })
        .map((control) => {
          const tag = control.tagName.toLowerCase();
          const type = control.getAttribute("type") || "";
          const name = control.getAttribute("name") || "";
          const placeholder = control.getAttribute("placeholder") || "";
          return `${tag}${type ? `[type=${type}]` : ""}${name ? `[name=${name}]` : ""}${placeholder ? ` placeholder="${placeholder.slice(0, 30)}"` : ""}`;
        });

      return misses.slice(0, 6);
    });
  } catch {
    return;
  }

  if (unlabeled.length) {
    findings.push({
      priority: "P2",
      category: "Accessibility",
      surface,
      title: "Form controls missing programmatic labels",
      details: "Some inputs are visible but do not expose a robust accessible label.",
      evidence: unlabeled.join(", "),
    });
  }
}

async function measureDcl(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return null;
    return nav.domContentLoadedEventEnd;
  });
}

test.describe("Unalabs + ATEAM + Dispatch UX audit", () => {
  test("captures functional and UX findings with P1/P2/P3 priorities", async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    const findings: Finding[] = [];

    await page.addInitScript(() => {
      (window as unknown as Window & { __uxAuditConsoleErrors: string[] }).__uxAuditConsoleErrors = [];
      window.addEventListener("error", (event) => {
        const bucket = (window as unknown as Window & { __uxAuditConsoleErrors: string[] }).__uxAuditConsoleErrors;
        bucket.push(event.message || "Unknown window error");
      });
      const originalError = console.error.bind(console);
      console.error = (...args: unknown[]) => {
        const bucket = (window as unknown as Window & { __uxAuditConsoleErrors: string[] }).__uxAuditConsoleErrors;
        bucket.push(args.map((v) => String(v)).join(" "));
        originalError(...args);
      };
    });

    await test.step("Unalabs home and product navigation", async () => {
      const homeResponse = await page
        .goto("/", { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS })
        .catch(() => null);
      if (!homeResponse || !homeResponse.ok()) {
        findings.push({
          priority: "P1",
          category: "Reliability",
          surface: "Unalabs",
          title: "Unalabs home route did not load successfully",
          details: "Expected HTTP success on /.",
          evidence: homeResponse ? `HTTP ${homeResponse.status()}` : "No response",
        });
        return;
      }

      const homeDcl = await measureDcl(page);
      if (typeof homeDcl === "number" && homeDcl > 4500) {
        findings.push({
          priority: "P3",
          category: "Performance",
          surface: "Unalabs",
          title: "Home page load feels slow",
          details: "domContentLoaded exceeded 4.5s.",
          evidence: `${Math.round(homeDcl)}ms`,
        });
      }

      const heroOk = await page
        .locator("h1")
        .first()
        .textContent()
        .then((text) => (text || "").trim().length >= 12)
        .catch(() => false);
      if (!heroOk) {
        findings.push({
          priority: "P1",
          category: "Functional",
          surface: "Unalabs",
          title: "Home hero heading is missing or empty",
          details: "Primary H1 should be visible with meaningful value proposition text.",
        });
      }

      const navProducts = page
        .getByLabel("Main navigation")
        .getByRole("link", { name: "Products", exact: true })
        .first();
      if (!(await navProducts.isVisible().catch(() => false))) {
        findings.push({
          priority: "P1",
          category: "Interaction",
          surface: "Unalabs",
          title: "Main Products navigation is not visible",
          details: "Users may not be able to reach core product pages from home.",
        });
      } else {
        await navProducts.click({ force: true });
        await page.waitForURL(/\/products$/, { timeout: 6_000 }).catch(() => undefined);
        const onProducts = /\/products$/.test(page.url());
        if (!onProducts) {
          findings.push({
            priority: "P2",
            category: "Interaction",
            surface: "Unalabs",
            title: "Products navigation did not route correctly",
            details: "Clicking Products should land on /products.",
            evidence: page.url(),
          });
        }
      }

      await checkMojibake(page, "Unalabs", findings);
      await checkUnlabeledInputs(page, "Unalabs", findings);
    });

    await test.step("ATEAM workflow UX checks", async () => {
      const canonicalBase = (process.env.PLAYWRIGHT_BASE_URL || "https://www.unalabs.cloud").replace(/\/$/, "");
      const candidateTargets = [
        process.env.PLAYWRIGHT_ATEAM_URL,
        "https://ateam.unalabs.cloud/office",
        "https://ateam.unalabs.cloud/",
        `${canonicalBase}/ateam`
      ].filter((value): value is string => Boolean(value));

      let resolvedAteamUrl = "";
      let response: Awaited<ReturnType<Page["goto"]>> | null = null;
      const attempts: string[] = [];

      for (const candidate of candidateTargets) {
        const target = candidate;
        const r = await page.goto(target, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS }).catch(() => null);
        attempts.push(`${target} => ${r ? r.status() : "no response"}`);
        if (r && r.ok()) {
          response = r;
          resolvedAteamUrl = target;
          break;
        }
      }

      if (!response || !response.ok()) {
        findings.push({
          priority: "P1",
          category: "Reliability",
          surface: "ATEAM",
          title: "ATEAM route did not load successfully",
          details: "Expected at least one canonical ATEAM route to return HTTP success.",
          evidence: attempts.join(" | "),
        });
        return;
      }

      const h1 = await page.locator("h1").first().textContent().catch(() => "");
      if (!/Drop an idea/i.test(h1 || "")) {
        findings.push({
          priority: "P1",
          category: "Functional",
          surface: "ATEAM",
          title: "ATEAM intake headline is missing",
          details: "The guided intake entry point should clearly present the ATEAM workflow.",
          evidence: `${resolvedAteamUrl} | ${String(h1 || "No H1 found")}`,
        });
      }

      const ideaInput = page.locator("#wf-idea");
      if (!(await ideaInput.isVisible().catch(() => false))) {
        findings.push({
          priority: "P1",
          category: "Interaction",
          surface: "ATEAM",
          title: "Idea text area is not visible",
          details: "Users cannot start the workflow if the primary input is hidden.",
        });
      } else {
        await ideaInput.fill("short");
        const startButton = page.getByRole("button", { name: /Start ATEAM/i });
        const startEnabled = await startButton.isEnabled().catch(() => false);
        if (!startEnabled) {
          findings.push({
            priority: "P2",
            category: "Reliability",
            surface: "ATEAM",
            title: "ATEAM start action was disabled during intake validation",
            details: "Users may be blocked from beginning a run when service status is not ready.",
            evidence: "Start ATEAM button remained disabled",
          });
        } else {
          await startButton.click();
          const alertText = await page.getByRole("alert").first().textContent().catch(() => "");
          const hasExpectedFeedback =
            /connecting|add a bit more detail|offline|try again/i.test(alertText || "");
          if (!hasExpectedFeedback) {
            findings.push({
              priority: "P2",
              category: "Interaction",
              surface: "ATEAM",
              title: "Validation/feedback message was not clear after Start",
              details: "The user should receive immediate guidance when Start fails or cannot proceed.",
              evidence: String(alertText || "No alert text captured"),
            });
          }
        }
      }

      const expectItems = await page.locator(".wf-expect-item").count();
      if (expectItems < 4) {
        findings.push({
          priority: "P3",
          category: "Content",
          surface: "ATEAM",
          title: "Output expectation framing is incomplete",
          details: "ATEAM should show all four expected deliverable blocks in intake mode.",
          evidence: `Found ${expectItems} item(s)`,
        });
      }

      await checkMojibake(page, "ATEAM", findings);
      await checkUnlabeledInputs(page, "ATEAM", findings);
    });

    await test.step("Unalabs Dispatch product page checks", async () => {
      const response = await page
        .goto("/products/dispatch", { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS })
        .catch(() => null);
      if (!response || !response.ok()) {
        findings.push({
          priority: "P1",
          category: "Reliability",
          surface: "Unalabs",
          title: "Dispatch product page did not load",
          details: "Expected HTTP success on /products/dispatch.",
          evidence: response ? `HTTP ${response.status()}` : "No response",
        });
        return;
      }

      const header = await page.locator("h1").first().textContent().catch(() => "");
      if (!/Dispatch/i.test(header || "")) {
        findings.push({
          priority: "P1",
          category: "Functional",
          surface: "Unalabs",
          title: "Dispatch product heading is missing",
          details: "The route should clearly identify Dispatch.",
          evidence: String(header || "No heading captured"),
        });
      }

      const demoLink = page.getByRole("link", { name: "Try Dispatch Demo" }).first();
      if (!(await demoLink.isVisible().catch(() => false))) {
        findings.push({
          priority: "P1",
          category: "Interaction",
          surface: "Unalabs",
          title: "Dispatch demo CTA is not visible",
          details: "Users cannot enter the demo loop without this CTA.",
        });
      } else {
        const href = await demoLink.getAttribute("href");
        const target = await demoLink.getAttribute("target");
        const rel = await demoLink.getAttribute("rel");
        if (!href || !href.includes("dispatch.unalabs.cloud/request?mode=demo")) {
          findings.push({
            priority: "P1",
            category: "Functional",
            surface: "Unalabs",
            title: "Dispatch demo CTA points to an unexpected destination",
            details: "The demo CTA should route directly to Dispatch demo request flow.",
            evidence: String(href),
          });
        }
        if (target !== "_blank" || !/\bnoopener\b/.test(rel || "") || !/\bnoreferrer\b/.test(rel || "")) {
          findings.push({
            priority: "P3",
            category: "Accessibility",
            surface: "Unalabs",
            title: "External Dispatch CTA link safety metadata is incomplete",
            details: "External links should use target and rel attributes safely and consistently.",
            evidence: `target=${target || "none"}, rel=${rel || "none"}`,
          });
        }
      }
    });

    await test.step("Dispatch live demo UX checks", async () => {
      const dispatchBase = process.env.PLAYWRIGHT_DISPATCH_BASE_URL || "https://dispatch.unalabs.cloud";
      const dispatchOrigin = dispatchBase.replace(/\/$/, "");
      const operatorLoginUrl = `${dispatchOrigin}/operator?mode=demo`;
      const privateAdminUrl = "https://dispatch-admin.unalabs.cloud/admin";

      const operatorResponse = await page.goto(operatorLoginUrl, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      }).catch(() => null);

      if (!operatorResponse || !operatorResponse.ok()) {
        findings.push({
          priority: "P2",
          category: "Reliability",
          surface: "Dispatch",
          title: "Dispatch operator login route could not be fully exercised",
          details: "The role-switch UX could not be validated on operator login route.",
          evidence: operatorResponse
            ? `HTTP ${operatorResponse.status()} at ${operatorLoginUrl}`
            : `No response at ${operatorLoginUrl}`,
        });
      } else {
        const roleSwitch = page.getByRole("navigation", { name: "Login role switch" });
        const operatorLink = roleSwitch.getByRole("link", { name: "Operator", exact: true });
        const adminLink = roleSwitch.getByRole("link", { name: "Admin", exact: true });
        const operatorPinInput = page.locator('input[autocomplete="current-password"]');
        const operatorSignIn = page.getByRole("button", { name: "Sign In" });

        if (!(await roleSwitch.isVisible().catch(() => false))) {
          findings.push({
            priority: "P1",
            category: "Interaction",
            surface: "Dispatch",
            title: "Operator login role switch is missing",
            details: "Operator login should expose a clear Operator/Admin switch.",
          });
        } else {
          const operatorCurrent = await operatorLink.getAttribute("aria-current");
          const adminHref = await adminLink.getAttribute("href");
          if (operatorCurrent !== "page") {
            findings.push({
              priority: "P2",
              category: "Interaction",
              surface: "Dispatch",
              title: "Operator tab is not marked as active on operator login",
              details: "Current role should be visually and semantically active.",
              evidence: `aria-current=${operatorCurrent || "none"}`,
            });
          }
          if (adminHref !== privateAdminUrl) {
            findings.push({
              priority: "P1",
              category: "Functional",
              surface: "Dispatch",
              title: "Operator login admin switch does not target private admin host",
              details: "Admin switch from public host must point to dispatch-admin host.",
              evidence: `href=${adminHref || "none"}`,
            });
          }
        }

        if (
          !(await operatorPinInput.isVisible().catch(() => false)) ||
          !(await operatorSignIn.isVisible().catch(() => false))
        ) {
          findings.push({
            priority: "P1",
            category: "Functional",
            surface: "Dispatch",
            title: "Operator login auth controls are missing",
            details: "PIN input and Sign In action must remain available after role-switch update.",
          });
        }
      }

      const adminResponse = await page.goto(privateAdminUrl, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      }).catch(() => null);

      if (!adminResponse || !adminResponse.ok()) {
        findings.push({
          priority: "P2",
          category: "Reliability",
          surface: "Dispatch",
          title: "Dispatch private admin login route could not be fully exercised",
          details: "The role-switch UX could not be validated on private admin host.",
          evidence: adminResponse ? `HTTP ${adminResponse.status()} at ${privateAdminUrl}` : `No response at ${privateAdminUrl}`,
        });
      } else {
        const roleSwitch = page.getByRole("navigation", { name: "Login role switch" });
        if (await roleSwitch.isVisible().catch(() => false)) {
          const operatorLink = roleSwitch.getByRole("link", { name: "Operator", exact: true });
          const adminLink = roleSwitch.getByRole("link", { name: "Admin", exact: true });
          const operatorHref = await operatorLink.getAttribute("href");
          const adminCurrent = await adminLink.getAttribute("aria-current");
          if (adminCurrent !== "page") {
            findings.push({
              priority: "P2",
              category: "Interaction",
              surface: "Dispatch",
              title: "Admin tab is not marked as active on admin login",
              details: "Current role should be visually and semantically active.",
              evidence: `aria-current=${adminCurrent || "none"}`,
            });
          }
          if (operatorHref !== `${dispatchOrigin}/operator`) {
            findings.push({
              priority: "P1",
              category: "Functional",
              surface: "Dispatch",
              title: "Admin login operator switch does not target public operator host",
              details: "Operator switch from private host must point back to public operator URL.",
              evidence: `href=${operatorHref || "none"}`,
            });
          }
        }

        const adminPinInput = page.getByPlaceholder("Admin PIN");
        const adminContinue = page.getByRole("button", { name: "Continue" });
        if (
          !(await adminPinInput.isVisible().catch(() => false)) ||
          !(await adminContinue.isVisible().catch(() => false))
        ) {
          findings.push({
            priority: "P1",
            category: "Functional",
            surface: "Dispatch",
            title: "Admin login auth controls are missing",
            details: "Admin PIN input and Continue action must remain available after role-switch update.",
          });
        }
      }

      const dispatchUrl = `${dispatchOrigin}/request?mode=demo`;
      const response = await page.goto(dispatchUrl, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      }).catch(() => null);

      if (!response || !response.ok()) {
        findings.push({
          priority: "P2",
          category: "Reliability",
          surface: "Dispatch",
          title: "Dispatch live demo could not be fully exercised",
          details: "The test could not confirm live request flow due route availability/network.",
          evidence: response ? `HTTP ${response.status()} at ${dispatchUrl}` : `No response at ${dispatchUrl}`,
        });
        return;
      }

      const needHelpHeading = page.getByRole("heading", { name: /Need help/i }).first();
      if (!(await needHelpHeading.isVisible().catch(() => false))) {
        findings.push({
          priority: "P1",
          category: "Functional",
          surface: "Dispatch",
          title: "Dispatch request form heading is missing",
          details: "Users should land on a clear request screen.",
        });
      }

      await page.getByRole("button", { name: "Gas Delivery" }).click();
      await page.locator('input[autocomplete="name"]').fill("Dispatch2026 Demo Client");
      await page.locator('input[autocomplete="tel"]').fill("613-555-0199");
      await page.locator('input[placeholder*="Ottawa"]').fill("350 Sparks St, Ottawa");
      await page
        .locator("textarea")
        .first()
        .fill("UX test request to validate the Dispatch demo journey and feedback loop.");
      await page.getByRole("button", { name: /Create Demo Request/i }).click();

      const successHeading = page.getByRole("heading", { name: /Demo request created/i });
      const reachedSuccess = await successHeading
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
      if (!reachedSuccess) {
        findings.push({
          priority: "P1",
          category: "Functional",
          surface: "Dispatch",
          title: "Dispatch demo request did not reach success state",
          details: "A complete request should show success confirmation and next-step actions.",
        });
      } else {
        const operatorLink = page.getByRole("link", { name: /Open operator demo/i });
        if (await operatorLink.isVisible().catch(() => false)) {
          const href = await operatorLink.getAttribute("href");
          if (!href || !/\/operator\?mode=demo/i.test(href)) {
            findings.push({
              priority: "P2",
              category: "Interaction",
              surface: "Dispatch",
              title: "Operator follow-through link is unclear or malformed",
              details: "Post-request UX should provide a direct operator continuation route.",
              evidence: String(href || "No href"),
            });
          }
        } else {
          findings.push({
            priority: "P2",
            category: "Interaction",
            surface: "Dispatch",
            title: "No visible operator continuation CTA after demo request",
            details: "The demo flow should guide the user into operator testing immediately.",
          });
        }
      }

      await checkMojibake(page, "Dispatch", findings);
      await checkUnlabeledInputs(page, "Dispatch", findings);
    });

    await checkForConsoleErrors(page, findings);
    await saveSummaryArtifacts(testInfo, findings);

    const failThreshold = resolveFailThreshold();
    const thresholdRank = PRIORITY_RANK[failThreshold];
    const gateFindings = findings.filter(
      (finding) => PRIORITY_RANK[finding.priority] >= thresholdRank,
    );

    expect(
      gateFindings.length,
      `Blocking UX issues found (>= ${failThreshold}):\n${toMarkdown(gateFindings)}`,
    ).toBe(0);
  });
});
