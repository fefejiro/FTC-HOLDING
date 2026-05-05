import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { logApiError, logNetworkError, getCurrentUserContext } from "./errorLogger";
import { checkAndNotifyRateLimit, extractRateLimitError, formatRetryTime } from "./rateLimitUtils";
import {
  formatApiBaseForLog,
  isAbsoluteHttpUrl,
  isApiPath,
  isApiPeacepadBaseUrl,
  isPlatformFallbackResponse,
  normalizePath,
  resolveApiBaseUrl,
} from "./apiBaseUrl";

function rewriteApiPath(path: string): string {
  if (isAbsoluteHttpUrl(path)) {
    return path;
  }

  const normalized = normalizePath(path);
  if (!isApiPath(normalized)) {
    return normalized;
  }

  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${normalized}` : normalized;
}

function getWebOrigin(): string {
  if (typeof window === "undefined" || !window.location?.origin) {
    return "";
  }
  return window.location.origin;
}

function resolveRuntimeApiBaseUrl() {
  return resolveApiBaseUrl({
    configuredBaseUrl: import.meta.env.VITE_API_BASE_URL,
    isNativePlatform: Capacitor.isNativePlatform(),
    webOrigin: getWebOrigin(),
  });
}

/**
 * Single source of truth for API base URL resolution.
 * - Uses VITE_API_BASE_URL when configured
 * - Defaults to window.location.origin for web
 * - Falls back to api.peacepad.ca only on native Capacitor builds
 */
export function getApiBaseUrl(): string {
  return resolveRuntimeApiBaseUrl().baseUrl;
}

export function getApiUrl(path: string): string {
  if (isAbsoluteHttpUrl(path)) {
    return path;
  }

  const normalizedPath = normalizePath(path);

  // Native requests always resolve against the API base URL.
  if (Capacitor.isNativePlatform()) {
    const baseUrl = getApiBaseUrl();
    return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
  }

  // Web defaults to same-origin and only rewrites known API/health paths.
  return rewriteApiPath(normalizedPath);
}

let fetchPatched = false;
let apiBaseLogged = false;
const warnedPlatformFallbackRequests = new Set<string>();

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }

  return "";
}

function maybeWarnPlatformFallback(requestUrl: string, response: Response): void {
  const baseUrl = getApiBaseUrl();
  if (!isApiPeacepadBaseUrl(baseUrl)) {
    return;
  }

  const targetUrl = requestUrl || response.url;
  if (!targetUrl || !isPlatformFallbackResponse(targetUrl, response)) {
    return;
  }

  const warningKey = `${targetUrl}|${response.status}`;
  if (warnedPlatformFallbackRequests.has(warningKey)) {
    return;
  }

  warnedPlatformFallbackRequests.add(warningKey);
  console.warn("[API] Platform fallback response detected while using api.peacepad.ca base URL.", {
    requestUrl: targetUrl,
    responseUrl: response.url,
    status: response.status,
  });
}

function logResolvedApiBaseUrlOnce(): void {
  if (apiBaseLogged || typeof window === "undefined") {
    return;
  }

  apiBaseLogged = true;
  const resolution = resolveRuntimeApiBaseUrl();
  console.info("[API] Runtime configuration", {
    baseUrl: formatApiBaseForLog(resolution.baseUrl),
    source: resolution.source,
    capacitorDetected: Capacitor.isNativePlatform(),
  });
}

/**
 * Patch browser fetch so direct fetch('/api/...') calls are routed to API origin.
 * This keeps legacy fetch usage working when frontend and backend are on different domains.
 */
export function installApiFetchPatch(): void {
  if (typeof window === "undefined" || fetchPatched) {
    return;
  }

  logResolvedApiBaseUrlOnce();
  const nativeFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    let rewrittenInput: RequestInfo | URL = input;
    let requestUrl = getRequestUrl(input);

    if (typeof input === "string") {
      const rewritten = rewriteApiPath(input);
      rewrittenInput = rewritten;
      requestUrl = rewritten;
    } else if (input instanceof URL && input.origin === window.location.origin) {
      const rewritten = rewriteApiPath(`${input.pathname}${input.search}${input.hash}`);
      rewrittenInput = rewritten;
      requestUrl = rewritten;
    }

    return nativeFetch(rewrittenInput, init).then((response) => {
      maybeWarnPlatformFallback(requestUrl, response);
      return response;
    });
  }) as typeof window.fetch;

  fetchPatched = true;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Special handling for rate limit errors (429)
    if (res.status === 429) {
      const rateLimitError = await extractRateLimitError(res.clone());
      if (rateLimitError) {
        const errorMessage = rateLimitError.retryAfter 
          ? `${rateLimitError.message} (retry in ${formatRetryTime(rateLimitError.retryAfter)})`
          : rateLimitError.message;
        
        const error = new Error(errorMessage);
        (error as any).retryAfter = rateLimitError.retryAfter;
        (error as any).isRateLimit = true;
        throw error;
      }
    }
    
    const rawText = (await res.text()) || res.statusText;
    let userMessage = rawText;
    let parsedBody: unknown;

    if (rawText) {
      try {
        parsedBody = JSON.parse(rawText);
        if (
          parsedBody &&
          typeof parsedBody === "object" &&
          "message" in parsedBody &&
          typeof (parsedBody as { message?: unknown }).message === "string"
        ) {
          userMessage = ((parsedBody as { message: string }).message || rawText).trim();
        }
      } catch {
        userMessage = rawText;
      }
    }

    const error = new Error(`${res.status}: ${userMessage || res.statusText}`);
    (error as any).status = res.status;
    if (parsedBody !== undefined) {
      (error as any).responseBody = parsedBody;
    }
    
    // Log API errors (except 401/403 which are expected for unauthenticated users)
    if (res.status !== 401 && res.status !== 403) {
      const { userId, partnershipId } = getCurrentUserContext();
      logApiError(error, res.url, userId, partnershipId);
    }
    
    throw error;
  }
}

// Wrapped fetch to catch network errors
async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    // Network error (offline, DNS failure, etc.)
    const err = error instanceof Error ? error : new Error(String(error));
    const url = getRequestUrl(input) || "unknown";
    logNetworkError(err, url);
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = getApiUrl(url);
  const res = await safeFetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Check rate limit headers on successful responses
  checkAndNotifyRateLimit(res);
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = getApiUrl(queryKey.join("/") as string);
    const res = await safeFetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Check rate limit headers on successful responses
    checkAndNotifyRateLimit(res);
    
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Allow queries to refetch when data changes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
