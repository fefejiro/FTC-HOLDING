import { useEffect, useRef, useState, useCallback } from 'react';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface UseReconnectingWebSocketProps {
  url: string;
  onMessage: (event: MessageEvent) => void;
  enabled?: boolean;
  maxRetries?: number;
  baseDelay?: number;
}

interface PendingMessage {
  data: string;
  timestamp: number;
}

export function useReconnectingWebSocket({
  url,
  onMessage,
  enabled = true,
  maxRetries = 10,
  baseDelay = 1000,
}: UseReconnectingWebSocketProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [retryCount, setRetryCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessagesRef = useRef<PendingMessage[]>([]);
  const isIntentionalClose = useRef(false);
  const retryCountRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  const listenersRef = useRef<Array<{ type: string; fn: EventListener }>>([]);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const removeAllListeners = useCallback(() => {
    if (!wsRef.current) return;
    
    for (const { type, fn } of listenersRef.current) {
      wsRef.current.removeEventListener(type, fn);
    }
    listenersRef.current = [];
  }, []);

  const addListener = useCallback((type: string, fn: EventListener) => {
    if (!wsRef.current) return;
    wsRef.current.addEventListener(type, fn);
    listenersRef.current.push({ type, fn });
  }, []);

  const sendMessage = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
      return true;
    } else {
      pendingMessagesRef.current.push({
        data,
        timestamp: Date.now(),
      });
      console.log('Message queued while WebSocket is disconnected');
      return false;
    }
  }, []);

  const flushPendingMessages = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && pendingMessagesRef.current.length > 0) {
      console.log(`Flushing ${pendingMessagesRef.current.length} pending messages`);
      
      const failedMessages: PendingMessage[] = [];
      
      pendingMessagesRef.current.forEach((msg) => {
        try {
          wsRef.current?.send(msg.data);
        } catch (error) {
          console.error('Failed to send queued message:', error);
          failedMessages.push(msg);
        }
      });
      
      pendingMessagesRef.current = failedMessages;
      
      if (failedMessages.length === 0) {
        console.log('All pending messages sent successfully');
      } else {
        console.log(`${failedMessages.length} messages failed to send, will retry`);
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !url) {
      console.warn('[WS_HOOK] Connection skipped - enabled:', enabled, 'url:', url);
      return;
    }

    if (wsRef.current) {
      isIntentionalClose.current = true;
      removeAllListeners();
      wsRef.current.close();
    }

    try {
      console.log('[WS_INIT] Attempting to connect to:', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;
      console.log('[WS_INIT] WebSocket instance created successfully');

      const handleOpen = (event: Event) => {
        console.log('[WS] Connected ✅');
        setStatus('connected');
        setRetryCount(0);
        retryCountRef.current = 0;
        isIntentionalClose.current = false;
        flushPendingMessages();
        
        // CRITICAL FIX: Start heartbeat mechanism to prevent stale connection detection
        const heartbeatInterval = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ 
              type: 'heartbeat', 
              timestamp: Date.now() 
            }));
            console.log('[WebSocket] 💓 Heartbeat sent');
          }
        }, 5000); // Send heartbeat every 5 seconds
        
        // Store interval ID for cleanup
        (wsRef.current as any).__heartbeatInterval = heartbeatInterval;
        console.log('[WebSocket] 💓 Heartbeat mechanism started');
      };

      const handleMessage = (event: Event) => {
        const messageEvent = event as MessageEvent;
        console.log('[WS_HOOK] Message received; calling handler');
        onMessageRef.current(messageEvent);
        console.log('[WS_HOOK] Handler called successfully');
      };

      const handleError = (event: Event) => {
        console.error('[WS_ERROR] Connection error occurred', event);
      };

      const handleClose = (event: Event) => {
        const closeEvent = event as CloseEvent;
        console.warn('[WS] Disconnected - Code:', closeEvent.code, 'Reason:', closeEvent.reason || 'None');
        
        // CRITICAL FIX: Clean up heartbeat interval
        if (wsRef.current && (wsRef.current as any).__heartbeatInterval) {
          clearInterval((wsRef.current as any).__heartbeatInterval);
          console.log('[WebSocket] 💔 Heartbeat mechanism stopped');
        }
        
        // CRITICAL FIX: Handle both network disconnect codes
        // - 1006: Abnormal closure (client-side network issue)
        // - 1001: Going Away (server-initiated stale connection close)
        // Both should trigger immediate call cleanup to prevent "stuck on call" states
        if ((closeEvent.code === 1006 || closeEvent.code === 1001) && !isIntentionalClose.current) {
          console.warn(`[WS] ⚠️ Network disconnect detected (code ${closeEvent.code}) - ${
            closeEvent.code === 1006 ? 'abnormal closure' : 'server stale connection cleanup'
          }`);
          
          // Emit a network disconnect event that can be handled by call components
          // This ensures immediate local UI update without waiting for server
          const networkDisconnectEvent = new CustomEvent('network-disconnect', {
            detail: {
              code: closeEvent.code,
              reason: closeEvent.reason || (
                closeEvent.code === 1001 
                  ? 'Server detected stale connection (heartbeat timeout)' 
                  : 'Network connection lost'
              )
            }
          });
          window.dispatchEvent(networkDisconnectEvent);
        }
        
        removeAllListeners();
        wsRef.current = null;

        if (!isIntentionalClose.current && enabled) {
          setStatus('reconnecting');

          if (retryCountRef.current < maxRetries) {
            const delay = Math.min(baseDelay * Math.pow(2, retryCountRef.current), 30000);
            console.log(`[WS_HOOK] Reconnecting in ${delay}ms (attempt ${retryCountRef.current + 1}/${maxRetries})`);

            reconnectTimeoutRef.current = setTimeout(() => {
              retryCountRef.current += 1;
              setRetryCount(retryCountRef.current);
              connect();
            }, delay);
          } else {
            console.error('[WS_HOOK] Max reconnection attempts reached - giving up');
            setStatus('disconnected');
            
            // Also emit network disconnect event when max retries reached
            const networkFailureEvent = new CustomEvent('network-failure', {
              detail: {
                code: closeEvent.code,
                reason: 'Max reconnection attempts reached'
              }
            });
            window.dispatchEvent(networkFailureEvent);
          }
        } else {
          setStatus('disconnected');
        }
      };

      addListener('open', handleOpen);
      addListener('error', handleError);
      addListener('close', handleClose);

      // CRITICAL FIX: Use ONLY addEventListener (not dual listeners)
      // Previous dual listener (onmessage + addEventListener) caused every message
      // to fire TWICE, creating duplicate offers and breaking WebRTC negotiation.
      // addEventListener is the reliable, standards-compliant approach for all browsers.
      addListener('message', handleMessage);
      console.log('[WS_FIX] Single message listener attached (duplicate listener bug fixed) ✅');

    } catch (error) {
      console.error('[WS_INIT] WebSocket creation failed:', error);
      if (error instanceof Error) {
        console.error('[WS_INIT] Error message:', error.message);
        console.error('[WS_INIT] Stack trace:', error.stack);
      }
      setStatus('disconnected');
      
      // Retry connection if not at max retries
      if (enabled && retryCountRef.current < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, retryCountRef.current), 30000);
        console.log(`[WS_INIT] Retrying after error in ${delay}ms`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          retryCountRef.current += 1;
          setRetryCount(retryCountRef.current);
          connect();
        }, delay);
      }
    }
  }, [url, enabled, maxRetries, baseDelay, flushPendingMessages, addListener, removeAllListeners]);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setRetryCount(0);
    retryCountRef.current = 0;
    isIntentionalClose.current = false;
    
    connect();
  }, [connect]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      isIntentionalClose.current = true;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      removeAllListeners();
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enabled, url, connect, removeAllListeners]);

  return {
    status,
    retryCount,
    maxRetries,
    sendMessage,
    reconnect,
    pendingCount: pendingMessagesRef.current.length,
    websocket: wsRef.current,
  };
}
