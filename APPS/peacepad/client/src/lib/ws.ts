/**
 * WebSocket Utility
 * 
 * Provides robust WebSocket URL construction and creation
 * to prevent issues like "wss://localhost:undefined"
 */

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

  const { protocol, host } = window.location;
  
  // Validate that we have a proper host
  if (!host || host === 'undefined' || host.includes('undefined')) {
    console.error('[WebSocket] Invalid host detected:', host);
    throw new Error('Invalid host for WebSocket connection');
  }

  // Determine WebSocket protocol based on HTTP protocol
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  
  // Build base URL
  let url = `${wsProtocol}//${host}${config.path}`;
  
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

  console.log('[WebSocket] Created URL:', url);
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
