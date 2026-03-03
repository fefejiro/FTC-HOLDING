export const NATIVE_API_BASE_FALLBACK_URL = "https://api.peacepad.ca";
export const API_PREFIXES = ["/api", "/health", "/__replit_health"] as const;

export type ApiBaseUrlSource = "env" | "same-origin" | "native-fallback";

export interface ApiBaseUrlResolution {
  baseUrl: string;
  source: ApiBaseUrlSource;
}

export interface ResolveApiBaseUrlOptions {
  configuredBaseUrl?: string | null;
  isNativePlatform: boolean;
  webOrigin?: string | null;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function normalizeApiBaseUrl(value: string | null | undefined): string {
  return trimTrailingSlash((value || "").trim());
}

export function resolveApiBaseUrl({
  configuredBaseUrl,
  isNativePlatform,
  webOrigin,
}: ResolveApiBaseUrlOptions): ApiBaseUrlResolution {
  const normalizedConfigured = normalizeApiBaseUrl(configuredBaseUrl);

  if (normalizedConfigured) {
    return {
      baseUrl: normalizedConfigured,
      source: "env",
    };
  }

  if (isNativePlatform) {
    return {
      baseUrl: NATIVE_API_BASE_FALLBACK_URL,
      source: "native-fallback",
    };
  }

  const normalizedWebOrigin = normalizeApiBaseUrl(webOrigin);

  return {
    baseUrl: normalizedWebOrigin,
    source: "same-origin",
  };
}

export function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function isApiPath(path: string): boolean {
  const normalized = normalizePath(path);
  return API_PREFIXES.some(
    (prefix) =>
      normalized === prefix ||
      normalized.startsWith(`${prefix}/`) ||
      normalized.startsWith(`${prefix}?`),
  );
}

export function isAbsoluteHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function formatApiBaseForLog(baseUrl: string): string {
  return baseUrl || "(same-origin)";
}

export function isApiPeacepadBaseUrl(baseUrl: string): boolean {
  const normalized = normalizeApiBaseUrl(baseUrl);
  if (!normalized) {
    return false;
  }

  try {
    return new URL(normalized).hostname === "api.peacepad.ca";
  } catch {
    return normalized === NATIVE_API_BASE_FALLBACK_URL;
  }
}

const PLATFORM_FALLBACK_HEADER_NAMES = [
  "x-platform-fallback",
  "x-peacepad-platform-fallback",
  "x-fallback-response",
];

function hasPlatformFallbackHeader(response: Response): boolean {
  return PLATFORM_FALLBACK_HEADER_NAMES.some((headerName) => {
    const value = response.headers.get(headerName);
    if (!value) {
      return false;
    }

    const normalizedValue = value.toLowerCase();
    return (
      normalizedValue === "1" ||
      normalizedValue === "true" ||
      normalizedValue.includes("fallback")
    );
  });
}

function tryGetPathname(url: string): string | null {
  try {
    return new URL(url, "https://peacepad.invalid").pathname;
  } catch {
    return null;
  }
}

export function isPlatformFallbackResponse(requestUrl: string, response: Response): boolean {
  if (hasPlatformFallbackHeader(response)) {
    return true;
  }

  const requestPath = tryGetPathname(requestUrl);
  if (!requestPath || !isApiPath(requestPath)) {
    return false;
  }

  if (response.redirected) {
    const responsePath = tryGetPathname(response.url);
    if (responsePath && !isApiPath(responsePath)) {
      return true;
    }
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  return contentType.includes("text/html");
}
