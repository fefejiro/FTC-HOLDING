import { Capacitor } from "@capacitor/core";
import { getApiUrl } from "./queryClient";
import type { User } from "@shared/schema";

export const AUTH_BOOTSTRAP_TIMEOUT_MS = 8000;
export const AUTH_BOOTSTRAP_LOADER_GRACE_MS = 4500;

export type AuthBootstrapIssueKind = "timeout" | "error" | "slow";

export type AuthBootstrapIssue = {
  kind: AuthBootstrapIssueKind;
  message: string;
};

let lastAuthBootstrapIssue: AuthBootstrapIssue | null = null;

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone,
    );
  } catch {
    return false;
  }
}

export function getAuthBootstrapLogMeta(context: string) {
  if (typeof window === "undefined") {
    return { context, platform: "server" };
  }

  return {
    context,
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    isStandalone: isStandaloneDisplayMode(),
    path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    userAgent: window.navigator.userAgent,
  };
}

function setLastAuthBootstrapIssue(issue: AuthBootstrapIssue | null) {
  lastAuthBootstrapIssue = issue;
}

export function getLastAuthBootstrapIssue() {
  return lastAuthBootstrapIssue;
}

export function clearLastAuthBootstrapIssue() {
  setLastAuthBootstrapIssue(null);
}

export async function fetchCurrentUserSnapshot(
  context = "bootstrap",
): Promise<User | null> {
  const meta = getAuthBootstrapLogMeta(context);
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeoutId = window.setTimeout(() => controller.abort(), AUTH_BOOTSTRAP_TIMEOUT_MS);

  console.info("[AuthBootstrap] start", meta);

  try {
    const res = await fetch(getApiUrl("/api/auth/user"), {
      credentials: "include",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });

    if (res.status === 401) {
      console.info("[AuthBootstrap] 401", {
        ...meta,
        durationMs: Date.now() - startedAt,
      });
      setLastAuthBootstrapIssue(null);
      return null;
    }

    if (!res.ok) {
      console.warn("[AuthBootstrap] unexpected-status", {
        ...meta,
        durationMs: Date.now() - startedAt,
        status: res.status,
      });
      setLastAuthBootstrapIssue({
        kind: "error",
        message: "PeacePad could not restore your session. You can keep going and retry anytime.",
      });
      return null;
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/json")) {
      console.error("[AuthBootstrap] non-json-response", {
        ...meta,
        durationMs: Date.now() - startedAt,
        status: res.status,
        contentType,
        responseUrl: res.url,
      });
      setLastAuthBootstrapIssue({
        kind: "error",
        message: "PeacePad could not confirm your session. You can keep going and retry anytime.",
      });
      return null;
    }

    const userData = (await res.json()) as User;
    console.info("[AuthBootstrap] success", {
      ...meta,
      durationMs: Date.now() - startedAt,
      userId: userData.id,
    });
    setLastAuthBootstrapIssue(null);
    return userData;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    if (error instanceof DOMException && error.name === "AbortError") {
      console.warn("[AuthBootstrap] timeout", {
        ...meta,
        durationMs,
        timeoutMs: AUTH_BOOTSTRAP_TIMEOUT_MS,
      });
      setLastAuthBootstrapIssue({
        kind: "timeout",
        message: "PeacePad took too long to restore your session. You can continue and retry sign-in later.",
      });
      return null;
    }

    console.error("[AuthBootstrap] exception", {
      ...meta,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });
    setLastAuthBootstrapIssue({
      kind: "error",
      message: "PeacePad hit a startup connection problem. You can continue and retry anytime.",
    });
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
