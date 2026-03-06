import { describe, expect, it, vi } from "vitest";
import {
  WEB_BUILD_ID_KEY,
  WEB_FORCE_UPDATE_DELAY_MS,
  WEB_PENDING_BUILD_ID_KEY,
  WEB_UPDATE_DEFERRED_KEY,
  WEB_UPDATE_FORCE_AFTER_KEY,
  applyWebUpdateNow,
  checkForWebUpdate,
  deferWebUpdate,
  fetchWebBuildMeta,
} from "../../client/src/lib/webUpdateManager";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.has(key) ? this.values.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function createFetch(webBuildId?: string) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({ webBuildId }),
  })) as unknown as typeof fetch;
}

describe("webUpdateManager", () => {
  it("stores first-seen web build and does not prompt update", async () => {
    const storage = new MemoryStorage();
    const status = await checkForWebUpdate({
      storage,
      fetchImpl: createFetch("web-build-1"),
      nowMs: 1000,
    });

    expect(status.updateAvailable).toBe(false);
    expect(storage.getItem(WEB_BUILD_ID_KEY)).toBe("web-build-1");
  });

  it("flags update when deployed web build differs from known build", async () => {
    const storage = new MemoryStorage();
    storage.setItem(WEB_BUILD_ID_KEY, "web-build-old");

    const status = await checkForWebUpdate({
      storage,
      fetchImpl: createFetch("web-build-new"),
      nowMs: 5000,
    });

    expect(status.updateAvailable).toBe(true);
    expect(status.forceUpdateRequired).toBe(false);
    expect(storage.getItem(WEB_PENDING_BUILD_ID_KEY)).toBe("web-build-new");
    expect(Number(storage.getItem(WEB_UPDATE_FORCE_AFTER_KEY))).toBe(5000 + WEB_FORCE_UPDATE_DELAY_MS);
  });

  it("forces update after 24 hours if user deferred", async () => {
    const storage = new MemoryStorage();
    storage.setItem(WEB_BUILD_ID_KEY, "web-build-old");

    await checkForWebUpdate({
      storage,
      fetchImpl: createFetch("web-build-new"),
      nowMs: 100,
    });

    deferWebUpdate(storage, 100);
    const forceAfter = Number(storage.getItem(WEB_UPDATE_FORCE_AFTER_KEY));

    const status = await checkForWebUpdate({
      storage,
      fetchImpl: createFetch("web-build-new"),
      nowMs: forceAfter + 1,
    });

    expect(storage.getItem(WEB_UPDATE_DEFERRED_KEY)).toBe("true");
    expect(status.updateAvailable).toBe(true);
    expect(status.forceUpdateRequired).toBe(true);
  });

  it("clears deferred flags and applies pending build when update is accepted", async () => {
    const storage = new MemoryStorage();
    storage.setItem(WEB_BUILD_ID_KEY, "web-build-old");
    storage.setItem(WEB_PENDING_BUILD_ID_KEY, "web-build-new");
    storage.setItem(WEB_UPDATE_DEFERRED_KEY, "true");
    storage.setItem(WEB_UPDATE_FORCE_AFTER_KEY, String(Date.now() + 1000));

    const refresh = vi.fn(async () => {});
    await applyWebUpdateNow(storage, refresh);

    expect(storage.getItem(WEB_BUILD_ID_KEY)).toBe("web-build-new");
    expect(storage.getItem(WEB_PENDING_BUILD_ID_KEY)).toBeNull();
    expect(storage.getItem(WEB_UPDATE_DEFERRED_KEY)).toBeNull();
    expect(storage.getItem(WEB_UPDATE_FORCE_AFTER_KEY)).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("ignores invalid build metadata responses", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ webBuildId: "" }),
    })) as unknown as typeof fetch;

    const meta = await fetchWebBuildMeta(fetchImpl, 2000);
    expect(meta).toBeNull();
  });
});
