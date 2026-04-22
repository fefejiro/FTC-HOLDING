declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
    };
  }
}

const DEFAULT_DEV_API_BASE_URL = "http://127.0.0.1:8001";
const CANONICAL_WEB_ORIGIN = "https://saywetin.app";
const DEFAULT_PROD_API_BASE_URL = "https://ftcpeacepad-extension-production.up.railway.app";
const API_PREFIXES = ["/api", "/health", "/__health"] as const;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const RAILWAY_APP_NOT_FOUND = "application not found";

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase();
}

export function isLegacyWebHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return normalized === "www.saywetin.app" || normalized.endsWith("saywetin-pages.pages.dev");
}

export function isSaywetinHostedWebHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return (
    normalized === "saywetin.app" ||
    normalized === "www.saywetin.app" ||
    normalized.endsWith("saywetin-pages.pages.dev")
  );
}

export function getCanonicalWebOrigin(): string {
  return CANONICAL_WEB_ORIGIN;
}

export function getCanonicalUrlForCurrentLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const { hostname, pathname, search, hash } = window.location;
  const normalizedHost = normalizeHostname(hostname);
  if (LOCAL_HOSTS.has(normalizedHost) || !isLegacyWebHost(normalizedHost)) {
    return null;
  }

  return `${CANONICAL_WEB_ORIGIN}${pathname}${search}${hash}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function isApiPath(path: string): boolean {
  const normalizedPath = normalizePath(path);
  return API_PREFIXES.some(
    (prefix) =>
      normalizedPath === prefix ||
      normalizedPath.startsWith(`${prefix}/`) ||
      normalizedPath.startsWith(`${prefix}?`),
  );
}

export function getApiBaseUrl(): string {
  const configured = trimTrailingSlash((import.meta.env.VITE_API_BASE_URL || "").trim());
  if (configured) {
    return configured;
  }

  if (import.meta.env.DEV) {
    return DEFAULT_DEV_API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    try {
      const normalizedHost = normalizeHostname(window.location.hostname || "");
      if (LOCAL_HOSTS.has(normalizedHost)) {
        return trimTrailingSlash(window.location.origin);
      }
    } catch {
      return DEFAULT_PROD_API_BASE_URL;
    }
  }

  return DEFAULT_PROD_API_BASE_URL;
}

export function getProdFallbackApiBaseUrl(): string {
  return DEFAULT_PROD_API_BASE_URL;
}

async function shouldFallbackToProdRailway(res: Response): Promise<boolean> {
  if (res.status !== 404) {
    return false;
  }

  if ((res.headers.get("x-railway-fallback") || "").toLowerCase() === "true") {
    return true;
  }

  try {
    const payload = await res.clone().json();
    const message =
      (typeof payload?.message === "string" ? payload.message : "") ||
      (typeof payload?.error === "string" ? payload.error : "") ||
      (typeof payload?.error?.message === "string" ? payload.error.message : "");

    return message.toLowerCase().includes(RAILWAY_APP_NOT_FOUND);
  } catch {
    return false;
  }
}

function toFallbackUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getProdFallbackApiBaseUrl()}${normalizedPath}`;
}

async function fetchWithRailwayFallback(
  nativeFetch: typeof fetch,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const primaryUrl = getApiUrl(path);
  const fallbackBase = getProdFallbackApiBaseUrl();

  let response = await nativeFetch(primaryUrl, init);
  if (
    import.meta.env.PROD &&
    fallbackBase &&
    !primaryUrl.startsWith(fallbackBase) &&
    (await shouldFallbackToProdRailway(response))
  ) {
    response = await nativeFetch(toFallbackUrl(path), init);
  }

  return response;
}

export function getApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform();
}

export function getApiBaseUrlSource(): "env" | "dev-default" | "window-origin" | "prod-default" {
  const configured = trimTrailingSlash((import.meta.env.VITE_API_BASE_URL || "").trim());
  if (configured) {
    return "env";
  }

  if (import.meta.env.DEV) {
    return "dev-default";
  }

  if (typeof window !== "undefined") {
    try {
      const normalizedHost = normalizeHostname(window.location.hostname || "");
      if (LOCAL_HOSTS.has(normalizedHost)) {
        return "window-origin";
      }
    } catch {
      return "prod-default";
    }
  }

  return "prod-default";
}

let fetchPatched = false;

/**
 * Patch browser fetch so direct fetch('/api/...') calls route to the API origin.
 */
export function installApiFetchPatch(): void {
  if (typeof window === "undefined" || fetchPatched) {
    return;
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/") && isApiPath(input)) {
      return fetchWithRailwayFallback(nativeFetch, input, init);
    }

    if (input instanceof URL && input.origin === window.location.origin) {
      const normalized = `${input.pathname}${input.search}${input.hash}`;
      if (isApiPath(normalized)) {
        return fetchWithRailwayFallback(nativeFetch, normalized, init);
      }
    }

    return nativeFetch(input, init);
  }) as typeof window.fetch;

  fetchPatched = true;
}
