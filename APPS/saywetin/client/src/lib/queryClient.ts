import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl, getProdFallbackApiBaseUrl } from "./api-config";

const RAILWAY_APP_NOT_FOUND = "application not found";

async function shouldFallbackToProdRailway(res: Response): Promise<boolean> {
  if (res.status !== 404) {
    return false;
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return false;
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

async function fetchWithRailwayFallback(path: string, init: RequestInit): Promise<Response> {
  const primaryUrl = getApiUrl(path);
  let res = await fetch(primaryUrl, init);

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return res;
  }

  const fallbackBase = getProdFallbackApiBaseUrl();
  const fallbackUrl = `${fallbackBase}${path.startsWith("/") ? path : `/${path}`}`;

  if (
    fallbackBase &&
    fallbackBase.length > 0 &&
    !primaryUrl.startsWith(fallbackBase) &&
    (await shouldFallbackToProdRailway(res))
  ) {
    res = await fetch(fallbackUrl, init);
  }

  return res;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const json = await res.json();
      const errorMessage =
        (typeof json?.error === "string" ? json.error : undefined) ||
        (typeof json?.error?.message === "string" ? json.error.message : undefined) ||
        (typeof json?.message === "string" ? json.message : undefined) ||
        res.statusText;
      throw new Error(errorMessage);
    }
    const text = (await res.text()) || res.statusText;
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      throw new Error('Connection issue - please check your internet');
    }
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const requestInit: RequestInit = {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  };

  const res = await fetchWithRailwayFallback(url, requestInit);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const res = await fetchWithRailwayFallback(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
