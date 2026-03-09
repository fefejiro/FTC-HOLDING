declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
    };
  }
}

const DEFAULT_DEV_API_BASE_URL = "http://127.0.0.1:8001";
const DEFAULT_PROD_API_BASE_URL = "https://api.saywetin.app";
const API_PREFIXES = ["/api", "/health", "/__health"] as const;

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

  if (isNativeApp()) {
    return DEFAULT_PROD_API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    try {
      // Web should default to same-origin so production calls stay on the live app host.
      return trimTrailingSlash(window.location.origin);
    } catch {
      return DEFAULT_PROD_API_BASE_URL;
    }
  }

  return DEFAULT_PROD_API_BASE_URL;
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

let fetchPatched = false;

/**
 * Patch browser fetch so direct fetch('/api/...') calls route to the API origin.
 */
export function installApiFetchPatch(): void {
  if (typeof window === "undefined" || fetchPatched) {
    return;
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/") && isApiPath(input)) {
      return nativeFetch(getApiUrl(input), init);
    }

    if (input instanceof URL && input.origin === window.location.origin) {
      const normalized = `${input.pathname}${input.search}${input.hash}`;
      if (isApiPath(normalized)) {
        return nativeFetch(getApiUrl(normalized), init);
      }
    }

    return nativeFetch(input, init);
  }) as typeof window.fetch;

  fetchPatched = true;
}
