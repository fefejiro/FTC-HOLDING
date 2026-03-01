import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { logApiError, logNetworkError, getCurrentUserContext } from "./errorLogger";
import { checkAndNotifyRateLimit, extractRateLimitError, formatRetryTime } from "./rateLimitUtils";

const DEFAULT_DEV_API_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_PROD_API_BASE_URL = "https://api.peacepad.ca";
const API_PREFIXES = ["/api", "/health", "/__replit_health"];

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isApiPath(path: string): boolean {
  return API_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function rewriteApiPath(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalized = normalizePath(path);
  return isApiPath(normalized) ? `${getApiBaseUrl()}${normalized}` : normalized;
}

/**
 * Get the full URL for API calls.
 * Uses VITE_API_BASE_URL if provided.
 * Defaults to 127.0.0.1 in development and api.peacepad.ca in production.
 */
export function getApiBaseUrl(): string {
  const configured = trimTrailingSlash((import.meta.env.VITE_API_BASE_URL || "").trim());
  if (configured) {
    return configured;
  }

  return import.meta.env.DEV ? DEFAULT_DEV_API_BASE_URL : DEFAULT_PROD_API_BASE_URL;
}

export function getApiUrl(path: string): string {
  // If already an absolute URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // For native app, use API base for all relative paths
  if (Capacitor.isNativePlatform()) {
    return `${getApiBaseUrl()}${normalizePath(path)}`;
  }

  // For web, rewrite API/health paths; keep other relative paths unchanged
  return rewriteApiPath(path);
}

let fetchPatched = false;

/**
 * Patch browser fetch so direct fetch('/api/...') calls are routed to API origin.
 * This keeps legacy fetch usage working when frontend and backend are on different domains.
 */
export function installApiFetchPatch(): void {
  if (typeof window === "undefined" || fetchPatched) {
    return;
  }

  const nativeFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") {
      return nativeFetch(rewriteApiPath(input), init);
    }

    if (input instanceof URL && input.origin === window.location.origin) {
      return nativeFetch(rewriteApiPath(`${input.pathname}${input.search}${input.hash}`), init);
    }

    return nativeFetch(input, init);
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
    
    const text = (await res.text()) || res.statusText;
    const error = new Error(`${res.status}: ${text}`);
    
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
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : 'unknown';
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
