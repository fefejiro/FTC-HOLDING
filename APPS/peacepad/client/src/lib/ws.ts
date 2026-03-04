/**
 * WebSocket Utility
 * 
 * Provides robust WebSocket URL construction and creation
 * to prevent issues like "wss://localhost:undefined"
 */
import { resolveApiBaseUrl } from "./apiBaseUrl";
import { Capacitor } from "@capacitor/core";

export interface WebSocketConfig {
  path: string;
  params?: Record<string, string>;
}

/**
 * Creates a properly formatted WebSocket URL from the current window location
 * 
 * @param config - WebSocket configuration with path and optional query parameters
 * @returns A valid WebSocket URL
 * 
 * @example
 * ```ts
 * const url = createWebSocketUrl({ 
 *   path: '/ws/signaling', 
 *   params: { sessionId: '123', userId: '456' }
 * });
 * // Returns: "wss://example.com/ws/signaling?sessionId=123&userId=456"
 * ```
 */
export function createWebSocketUrl(config: WebSocketConfig): string {
  if (typeof window === 'undefined') {
    throw new Error('createWebSocketUrl can only be called in browser environment');
  }

  const resolution = resolveApiBaseUrl({
    configuredBaseUrl: import.meta.env.VITE_API_BASE_URL,
    isNativePlatform: Capacitor.isNativePlatform(),
    webOrigin: window.location.origin,
  });

  const resolvedBase = resolution.baseUrl || window.location.origin;
  const normalizedPath = config.path.startsWith("/") ? config.path : `/${config.path}`;

  let baseUrl: URL;
  try {
    baseUrl = new URL(resolvedBase, window.location.origin);
  } catch (error) {
    console.error("[WebSocket] Invalid base URL for connection:", resolvedBase, error);
    throw new Error("Invalid base URL for WebSocket connection");
  }

  const wsProtocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  let url = `${wsProtocol}//${baseUrl.host}${normalizedPath}`;
  
  // Add query parameters if provided
  if (config.params && Object.keys(config.params).length > 0) {
    const queryString = Object.entries(config.params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  console.log("[WebSocket] Created URL:", url);
  return url;
}

/**
 * Creates a WebSocket connection with proper error handling
 * 
 * Note: This creates a raw WebSocket. For auto-reconnecting WebSockets,
 * use the useReconnectingWebSocket hook instead.
 * 
 * @param config - WebSocket configuration
 * @returns A WebSocket instance
 */
export function createWebSocket(config: WebSocketConfig): WebSocket {
  const url = createWebSocketUrl(config);
  
  try {
    const ws = new WebSocket(url);
    
    // Clear any previous handlers to prevent duplicates across HMR/re-mounts
    ws.onopen = null;
    ws.onclose = null;
    ws.onmessage = null;
    ws.onerror = null;
    
    return ws;
  } catch (error) {
    console.error('[WebSocket] Failed to create WebSocket:', error);
    throw error;
  }
}

/**
 * Safely closes a WebSocket connection
 * 
 * @param ws - WebSocket to close
 * @param code - Close code (default: 1000 = normal closure)
 * @param reason - Human-readable close reason
 */
export function closeWebSocket(ws: WebSocket | null, code = 1000, reason = 'Client disconnect'): void {
  if (!ws) return;
  
  try {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(code, reason);
      console.log('[WebSocket] Closed connection:', reason);
    }
  } catch (error) {
    console.error('[WebSocket] Error closing connection:', error);
  }
}
