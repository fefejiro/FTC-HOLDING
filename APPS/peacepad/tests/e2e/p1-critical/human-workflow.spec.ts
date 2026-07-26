import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const APP_ORIGIN = process.env.PLAYWRIGHT_BASE_URL || "https://peacepad.ca";

type PeacePadUser = {
  id: string;
  displayName?: string | null;
  inviteCode?: string | null;
  activePartnershipId?: string | null;
  isGuest?: boolean;
};

type Partnership = {
  id: string;
  partnerName?: string | null;
};

async function apiFetch<T>(
  page: Page,
  path: string,
  options: { method?: string; body?: unknown; expectedStatus?: number | number[] } = {},
): Promise<T> {
  const statuses = Array.isArray(options.expectedStatus)
    ? options.expectedStatus
    : [options.expectedStatus ?? 200];

  return await page.evaluate(
    async ({ path, method, body, statuses }) => {
      const response = await fetch(path, {
        method,
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;

      if (!statuses.includes(response.status)) {
        throw new Error(`Expected ${statuses.join(", ")} from ${path}, got ${response.status}: ${text}`);
      }

      return payload;
    },
    {
      path,
      method: options.method ?? "GET",
      body: options.body,
      statuses,
    },
  );
}

async function openFreshGuest(page: Page, startPath = "/compose"): Promise<void> {
  await page.context().clearCookies();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP_ORIGIN });
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("lastSeenChangelogVersion", "1.0.9");
  });

  await page.goto(startPath);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByText(/PeacePad/i).first()).toBeVisible({ timeout: 15000 });
  const whatsNew = page.getByTestId("dialog-whats-new");
  if (await whatsNew.isVisible().catch(() => false)) {
    await page.getByTestId("button-got-it").click();
    await expect(whatsNew).toBeHidden({ timeout: 10000 });
  }
}

async function ensureGuestUser(page: Page): Promise<PeacePadUser> {
  await page.goto("/compose");
  await expect(page.getByTestId("textarea-compose-message")).toBeVisible({ timeout: 30000 });

  const existingUser = await expect
    .poll(
      async () => {
        try {
          const user = await apiFetch<PeacePadUser>(page, "/api/auth/user");
          return user?.inviteCode ? user : null;
        } catch {
          return null;
        }
      },
      {
        timeout: 10000,
        message: "app should auto-create a guest user when possible",
      },
    )
    .toBeTruthy()
    .then(async () => await apiFetch<PeacePadUser>(page, "/api/auth/user"))
    .catch(() => null);

  if (!existingUser?.inviteCode) {
    await apiFetch<{ user?: PeacePadUser }>(page, "/api/auth/guest", {
      method: "POST",
      body: {
        source: "human-workflow-e2e",
        hasAcceptedConsent: true,
        aiMessageConsent: false,
        aiCallConsent: false,
      },
      expectedStatus: [200, 201],
    }).catch(() => null);
  }

  await expect
    .poll(
      async () => {
        try {
          const user = await apiFetch<PeacePadUser>(page, "/api/auth/user");
          return user?.inviteCode ? user : null;
        } catch {
          return null;
        }
      },
      {
        timeout: 30000,
        message: "guest user with invite code should be available",
      },
    )
    .not.toBeNull();

  const user = await apiFetch<PeacePadUser>(page, "/api/auth/user");
  expect(user.isGuest).toBeTruthy();
  expect(user.inviteCode).toMatch(/^[A-Z0-9]{6}$/);
  return user;
}

async function createGuestContext(browser: Browser, startPath = "/compose"): Promise<{ context: BrowserContext; page: Page; user: PeacePadUser }> {
  const context = await browser.newContext();
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP_ORIGIN });
  const page = await context.newPage();
  await openFreshGuest(page, startPath);
  const user = await ensureGuestUser(page);
  return { context, page, user };
}

function enterPartnerCodeButton(page: Page) {
  return page.getByTestId("button-guest-enter-partner-code").or(page.getByRole("button", { name: /enter (a )?partner code/i }));
}

async function dismissKnownDialogs(page: Page): Promise<void> {
  const termsDialog = page.getByRole("dialog", { name: /terms of service/i });
  await termsDialog.waitFor({ state: "visible", timeout: 2000 }).catch(() => null);
  if (await termsDialog.isVisible().catch(() => false)) {
    await page.getByRole("checkbox", { name: /i agree/i }).check({ force: true });
    await page.getByRole("button", { name: /accept/i }).click({ force: true });
    await expect(termsDialog).toBeHidden({ timeout: 10000 });
  }

  const dismissers = [
    page.getByTestId("button-got-it"),
    page.getByTestId("button-close-tutorial"),
    page.getByRole("button", { name: /^Close$/i }),
    page.getByRole("button", { name: /got it/i }),
  ];

  for (const dismiss of dismissers) {
    if (await dismiss.first().isVisible().catch(() => false)) {
      await dismiss.first().click({ force: true }).catch(() => null);
    }
  }

  await page.keyboard.press("Escape").catch(() => null);
}

async function openJoinPartnershipDialog(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await dismissKnownDialogs(page);
    const trigger = enterPartnerCodeButton(page).first();
    await trigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await trigger.click({ force: true }).catch(async () => {
      await trigger.evaluate((element: HTMLElement) => element.click());
    });
    if (!(await page.getByTestId("dialog-join-partnership").isVisible().catch(() => false))) {
      await trigger.evaluate((element: HTMLElement) => element.click());
      await page.waitForTimeout(150);
    }
    if (await page.getByTestId("dialog-join-partnership").isVisible().catch(() => false)) {
      return;
    }
  }

  await expect(page.getByTestId("dialog-join-partnership")).toBeVisible();
}

async function visibleInviteCode(page: Page): Promise<string> {
  await expect(page.locator("body")).toContainText(/\/join\/[A-Z0-9]{6}/);
  const bodyText = await page.locator("body").innerText();
  const match = bodyText.match(/\/join\/([A-Z0-9]{6})/);
  expect(match?.[1]).toMatch(/^[A-Z0-9]{6}$/);
  return match![1];
}

async function getPartnerships(page: Page): Promise<Partnership[]> {
  return await apiFetch<Partnership[]>(page, "/api/partnerships");
}

async function cleanupPartnerships(page: Page): Promise<void> {
  const partnerships = await getPartnerships(page).catch(() => []);
  for (const partnership of partnerships) {
    await apiFetch(page, `/api/partnerships/${partnership.id}`, {
      method: "DELETE",
      expectedStatus: [200, 204],
    }).catch(() => null);
  }
}

test.describe("PeacePad human workflow", () => {
  test("solo guest can draft first, invite a partner later, and clean up the shared workspace", async ({ browser }) => {
    const owner = await createGuestContext(browser);
    let partner: { context: BrowserContext; page: Page; user: PeacePadUser } | null = null;

    try {
      await owner.page.route("**/api/messages/preview", async (route) => {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "tone preview temporarily unavailable" }),
        });
      });

      await owner.page.getByTestId("textarea-compose-message").fill(
        "You always ignore pickup time and I am tired of explaining the same thing.",
      );
      await expect(owner.page.getByText(/Tone check is unavailable right now/i)).toBeVisible({ timeout: 15000 });

      const copyButton = owner.page.getByTestId("button-compose-copy-send");
      await expect(copyButton).toBeEnabled();
      await copyButton.click();
      await expect(owner.page.getByText(/^Copied$/i)).toBeVisible({ timeout: 10000 });

      await owner.page.getByRole("link", { name: /invite partner/i }).click();
      await expect(owner.page).toHaveURL(/\/settings$/);
      await expect(owner.page.getByText(/Invite a partner when you are ready/i)).toBeVisible();
      await expect(owner.page.locator("body")).toContainText(/https:\/\/peacepad\.ca\/join\/[A-Z0-9]{6}/);

      await openJoinPartnershipDialog(owner.page);
      await owner.page.getByTestId("input-invite-code").fill("ABC");
      await expect(owner.page.getByTestId("button-submit-invite-code")).toBeDisabled();
      await owner.page.keyboard.press("Escape").catch(() => null);

      const selfCode = await apiFetch<{ message: string }>(owner.page, "/api/partnerships/join", {
        method: "POST",
        body: { inviteCode: owner.user.inviteCode },
        expectedStatus: 400,
      });
      expect(selfCode.message).toMatch(/your own invite code/i);

      const missingCode = await apiFetch<{ message: string }>(owner.page, "/api/partnerships/join", {
        method: "POST",
        body: { inviteCode: "ZZZZZZ" },
        expectedStatus: 404,
      });
      expect(missingCode.message).toMatch(/invalid invite code/i);
      await expect(await getPartnerships(owner.page)).toHaveLength(0);

      const ownerInviteCode = await visibleInviteCode(owner.page);
      partner = await createGuestContext(browser);

      await partner.page.goto("/settings");
      await openJoinPartnershipDialog(partner.page);
      await partner.page.getByTestId("input-invite-code").fill(ownerInviteCode);
      await expect(partner.page.getByTestId("button-submit-invite-code")).toBeEnabled();
      await partner.page.getByTestId("button-submit-invite-code").click({ force: true });

      await partner.page.waitForURL(/\/chat$/, { timeout: 30000 });

      await expect
        .poll(
          async () => {
            const [ownerUser, partnerUser] = await Promise.all([
              apiFetch<PeacePadUser>(owner.page, "/api/auth/user"),
              apiFetch<PeacePadUser>(partner!.page, "/api/auth/user"),
            ]);
            return Boolean(ownerUser.activePartnershipId && ownerUser.activePartnershipId === partnerUser.activePartnershipId);
          },
          {
            timeout: 30000,
            message: "both guests should share the same active partnership after code entry",
          },
        )
        .toBe(true);

      await expect(await getPartnerships(owner.page)).toHaveLength(1);
      await expect(await getPartnerships(partner.page)).toHaveLength(1);
    } finally {
      if (partner) {
        await cleanupPartnerships(partner.page);
        await partner.context.close();
      }
      await owner.context.close();
    }
  });

  test("direct join links preserve the code and hand off unauthenticated users to onboarding", async ({ page }) => {
    const inviteCode = "ABC123";

    const context = await page.context().browser()!.newContext();
    const joiner = await context.newPage();

    try {
      await joiner.goto(`/join/${inviteCode}`);
      await joiner.waitForURL(/\/onboarding$/, { timeout: 15000 });

      const pendingCode = await joiner.evaluate(() => localStorage.getItem("pending_join_code"));
      expect(pendingCode).toBe(inviteCode);
      await expect(joiner.getByText(/start/i).first()).toBeVisible({ timeout: 15000 });
    } finally {
      await context.close();
    }
  });
});
