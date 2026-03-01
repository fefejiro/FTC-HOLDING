import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { queryClient } from "@/lib/queryClient";

interface WebRTCMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-session' | 'leave-session' | 'session-users' | 'peer-joined' | 'call-end';
  sessionId: string;
  sessionCode?: string; // For call-end messages
  payload?: any;
  candidate?: RTCIceCandidate;
  from?: string;
}

// Media permission state - Enhanced FSM
type MediaState = 'idle' | 'requesting' | 'granted' | 'receive-only' | 'denied' | 'error';

// Media readiness token - required before creating peer connections
interface MediaReadinessToken {
  state: MediaState;
  stream: MediaStream | null;
  canSend: boolean;
  canReceive: boolean;
  timestamp: number;
}

// Peer connection request queue item
interface PeerConnectionRequest {
  peerId: string;
  role: 'caller' | 'callee';
  shouldCreateOffer: boolean;
  constraints?: MediaStreamConstraints;
  resolve: (pc: RTCPeerConnection) => void;
  reject: (error: Error) => void;
}

interface MediaController {
  state: MediaState;
  stream: MediaStream | null;
  pendingOffers: Map<string, RTCSessionDescriptionInit>;
  requestResolvers: Array<{ resolve: (stream: MediaStream) => void; reject: (error: Error) => void }>;
  // New: Media readiness tokens
  currentToken: MediaReadinessToken | null;
  tokenResolvers: Array<{ resolve: (token: MediaReadinessToken) => void; reject: (error: Error) => void }>;
  // New: Peer connection queue
  peerConnectionQueue: PeerConnectionRequest[];
  activePeerConnections: Map<string, RTCPeerConnection>;
  creatingPeers: Set<string>; // Mutex for preventing duplicate creation
}

interface WebRTCContextType {
  sendSignal: (message: WebRTCMessage) => void;
  joinSession: (sessionId: string) => void;
  leaveSession: (sessionId: string) => void;
  currentSessionId: string | null;
  
  // Media permission management
  ensureMediaReady: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
  supplyPendingOffer: (peerId: string, offer: RTCSessionDescriptionInit) => void;
  flushPendingOffer: (peerId: string) => RTCSessionDescriptionInit | null;
  hasMedia: boolean;
  isRequestingMedia: boolean;
  releaseMedia: () => void;
  
  // New: Enhanced media-first connection pipeline
  awaitMedia: (options?: { requireSendTracks?: boolean; constraints?: MediaStreamConstraints }) => Promise<MediaReadinessToken>;
  createPeerConnectionRequest: (peerId: string, role: 'caller' | 'callee', options?: { shouldCreateOffer?: boolean }) => Promise<RTCPeerConnection>;
  getPeerConnection: (peerId: string) => RTCPeerConnection | undefined;
}

const WebRTCContext = createContext<WebRTCContextType | null>(null);

interface WebRTCProviderProps {
  children: ReactNode;
  websocket: WebSocket | null;
  sendMessage: (data: string) => boolean;
}

export function WebRTCProvider({ children, websocket, sendMessage }: WebRTCProviderProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const messageBufferRef = useRef<MessageEvent[]>([]);
  const isReadyRef = useRef(false);
  
  // Track which sessions we've already joined to prevent duplicates
  const joinedSessionsRef = useRef<Set<string>>(new Set());
  
  // MediaController state - manages browser-agnostic media permission flow
  const mediaControllerRef = useRef<MediaController>({
    state: 'idle',
    stream: null,
    pendingOffers: new Map(),
    requestResolvers: [],
    // Enhanced FSM fields
    currentToken: null,
    tokenResolvers: [],
    peerConnectionQueue: [],
    activePeerConnections: new Map(),
    creatingPeers: new Set()
  });
  
  // Store last requested constraints for video preservation
  const lastConstraintsRef = useRef<MediaStreamConstraints>({ audio: true, video: false });
  
  // Track Safari quirk: user previously granted permission (for tab-level persistence detection)
  const wasGrantedRef = useRef(false);
  
  const [hasMedia, setHasMedia] = useState(false);
  const [isRequestingMedia, setIsRequestingMedia] = useState(false);

  // Ensure media is ready - handles browser-agnostic permission timing
  const ensureMediaReady = useCallback(async (constraints?: MediaStreamConstraints): Promise<MediaStream> => {
    const controller = mediaControllerRef.current;
    
    // Already have media - return immediately
    if (controller.state === 'granted' && controller.stream) {
      console.log('[MediaController] Media already granted, returning existing stream');
      return controller.stream;
    }
    
    // Permission denied - reset for retry and clear UI flags
    if (controller.state === 'denied') {
      console.log('[MediaController] Permission previously denied, resetting for retry');
      controller.state = 'idle';
      setHasMedia(false);
      setIsRequestingMedia(false);
    }
    
    // Already requesting - queue this request
    if (controller.state === 'requesting') {
      console.log('[MediaController] Media request already in progress, queuing...');
      return new Promise((resolve, reject) => {
        controller.requestResolvers.push({ resolve, reject });
      });
    }
    
    // Start new request - use caller's constraints or preserve last known preferences
    const requestConstraints: MediaStreamConstraints = constraints || lastConstraintsRef.current;
    
    // Store constraints for future calls (preserve video preference)
    if (constraints) {
      lastConstraintsRef.current = constraints;
    }
    
    console.log('[MediaController] Requesting media with constraints:', requestConstraints);
    controller.state = 'requesting';
    setIsRequestingMedia(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(requestConstraints);
      console.log('[MediaController] ✅ Permission granted, stream ready:', stream.id);
      
      // Update state
      controller.state = 'granted';
      controller.stream = stream;
      wasGrantedRef.current = true; // Track for Safari quirk detection
      setHasMedia(true);
      setIsRequestingMedia(false);
      
      // Resolve all queued requests
      controller.requestResolvers.forEach(({ resolve }) => resolve(stream));
      controller.requestResolvers = [];
      
      // Dispatch event for renegotiation if needed
      window.dispatchEvent(new CustomEvent('media-granted', { detail: { stream } }));
      
      return stream;
    } catch (error) {
      console.error('[MediaController] ❌ Permission error:', error);
      
      // Classify errors - comprehensive browser coverage including Safari quirks
      const isTransient = error instanceof Error && (
        error.name === 'AbortError' ||           // User cancelled
        error.name === 'NotFoundError' ||        // Device not found
        error.name === 'OverconstrainedError' || // Constraints too strict
        error.name === 'NotReadableError' ||     // Device in use by another app
        // Safari quirk: NotAllowedError when user previously granted (tab-level persistence)
        (error.name === 'NotAllowedError' && wasGrantedRef.current)
      );
      
      if (isTransient) {
        console.log('[MediaController] Transient error, resetting to idle for retry');
        controller.state = 'idle';
        setHasMedia(false);
      } else {
        console.log('[MediaController] Permission denied, marking as denied (can retry on next call)');
        controller.state = 'denied';
        setHasMedia(false);
      }
      
      setIsRequestingMedia(false);
      
      // Reject all queued requests
      const err = error instanceof Error ? error : new Error('Media permission denied');
      controller.requestResolvers.forEach(({ reject }) => reject(err));
      controller.requestResolvers = [];
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('media-denied', { detail: { error } }));
      
      throw err;
    }
  }, []);

  // Supply a pending offer that arrived before media was ready
  const supplyPendingOffer = useCallback((peerId: string, offer: RTCSessionDescriptionInit) => {
    const existingOffer = mediaControllerRef.current.pendingOffers.get(peerId);
    if (existingOffer) {
      console.warn(`[MediaController] ⚠️ Overwriting existing pending offer from ${peerId} (churn detected)`);
    }
    console.log(`[MediaController] Storing pending offer from ${peerId}, total pending: ${mediaControllerRef.current.pendingOffers.size + 1}`);
    mediaControllerRef.current.pendingOffers.set(peerId, offer);
  }, []);

  // Flush a pending offer once media is ready
  const flushPendingOffer = useCallback((peerId: string): RTCSessionDescriptionInit | null => {
    const offer = mediaControllerRef.current.pendingOffers.get(peerId);
    if (offer) {
      console.log(`[MediaController] Flushing pending offer from ${peerId}`);
      mediaControllerRef.current.pendingOffers.delete(peerId);
    }
    return offer || null;
  }, []);

  // Release media stream and reset state
  const releaseMedia = useCallback(() => {
    const controller = mediaControllerRef.current;
    
    if (controller.stream) {
      console.log('[MediaController] Releasing media stream');
      controller.stream.getTracks().forEach(track => track.stop());
      controller.stream = null;
    }
    
    // Close and clear all peer connections
    controller.activePeerConnections.forEach((pc, peerId) => {
      console.log(`[MediaController] Closing peer connection for ${peerId}`);
      pc.close();
    });
    controller.activePeerConnections.clear();
    controller.creatingPeers.clear();
    
    // Reject any queued resolvers (handles mid-request cleanup)
    if (controller.requestResolvers.length > 0) {
      console.log(`[MediaController] Rejecting ${controller.requestResolvers.length} queued requests`);
      const releaseError = new Error('Media stream released before permission granted');
      controller.requestResolvers.forEach(({ reject }) => reject(releaseError));
      controller.requestResolvers = [];
    }
    
    // Reject any queued token resolvers
    if (controller.tokenResolvers.length > 0) {
      const tokenError = new Error('Media released before token granted');
      controller.tokenResolvers.forEach(({ reject }) => reject(tokenError));
      controller.tokenResolvers = [];
    }
    
    controller.state = 'idle';
    controller.currentToken = null;
    controller.pendingOffers.clear();
    controller.peerConnectionQueue = [];
    
    // Reset constraints to default (prevents video:false from sticking)
    lastConstraintsRef.current = { audio: true, video: false };
    
    setHasMedia(false);
    setIsRequestingMedia(false);
    
    // Notify listeners that media was released
    window.dispatchEvent(new CustomEvent('media-released'));
  }, []);

  // New: Enhanced media-first connection pipeline
  // Await media readiness with proper token generation
  const awaitMedia = useCallback(async (options?: { 
    requireSendTracks?: boolean; 
    constraints?: MediaStreamConstraints 
  }): Promise<MediaReadinessToken> => {
    const controller = mediaControllerRef.current;
    const { requireSendTracks = true, constraints } = options || {};
    
    // Return existing token if media is ready and matches requirements
    if (controller.currentToken) {
      const tokenValid = (!requireSendTracks || controller.currentToken.canSend) &&
                        (Date.now() - controller.currentToken.timestamp < 30000); // 30s validity
      if (tokenValid) {
        console.log('[MediaController] Returning existing media token');
        return controller.currentToken;
      }
    }
    
    // If permission denied and we don't require send tracks, go receive-only
    if (controller.state === 'denied' && !requireSendTracks) {
      console.log('[MediaController] Permission denied but receive-only allowed');
      const token: MediaReadinessToken = {
        state: 'receive-only',
        stream: null,
        canSend: false,
        canReceive: true,
        timestamp: Date.now()
      };
      controller.currentToken = token;
      controller.state = 'receive-only';
      return token;
    }
    
    // Queue if already requesting
    if (controller.state === 'requesting') {
      console.log('[MediaController] Media request in progress, queuing token request');
      return new Promise((resolve, reject) => {
        controller.tokenResolvers.push({ resolve, reject });
      });
    }
    
    try {
      // Request media if we need send tracks
      if (requireSendTracks) {
        const stream = await ensureMediaReady(constraints);
        const token: MediaReadinessToken = {
          state: 'granted',
          stream,
          canSend: true,
          canReceive: true,
          timestamp: Date.now()
        };
        controller.currentToken = token;
        
        // Resolve queued token requests
        controller.tokenResolvers.forEach(({ resolve }) => resolve(token));
        controller.tokenResolvers = [];
        
        return token;
      } else {
        // Receive-only mode
        const token: MediaReadinessToken = {
          state: 'receive-only',
          stream: null,
          canSend: false,
          canReceive: true,
          timestamp: Date.now()
        };
        controller.currentToken = token;
        controller.state = 'receive-only';
        return token;
      }
    } catch (error) {
      console.error('[MediaController] Failed to get media token:', error);
      
      // If permission denied but receive-only is acceptable
      if (!requireSendTracks) {
        const token: MediaReadinessToken = {
          state: 'receive-only',
          stream: null,
          canSend: false,
          canReceive: true,
          timestamp: Date.now()
        };
        controller.currentToken = token;
        controller.state = 'receive-only';
        return token;
      }
      
      // Permission required but denied
      controller.state = 'denied';
      const errorToken: MediaReadinessToken = {
        state: 'denied',
        stream: null,
        canSend: false,
        canReceive: true, // Can still receive
        timestamp: Date.now()
      };
      
      // Reject queued resolvers
      controller.tokenResolvers.forEach(({ reject }) => reject(error as Error));
      controller.tokenResolvers = [];
      
      throw error;
    }
  }, [ensureMediaReady]);
  
  // Centralized peer connection creation with duplicate guards
  const createPeerConnectionRequest = useCallback(async (
    peerId: string, 
    role: 'caller' | 'callee', 
    options?: { shouldCreateOffer?: boolean }
  ): Promise<RTCPeerConnection> => {
    const controller = mediaControllerRef.current;
    
    // Check if peer connection already exists
    const existing = controller.activePeerConnections.get(peerId);
    if (existing) {
      console.log(`[WebRTC] Peer connection already exists for ${peerId}`);
      return existing;
    }
    
    // Check if already creating (mutex)
    if (controller.creatingPeers.has(peerId)) {
      console.log(`[WebRTC] Already creating peer connection for ${peerId}, waiting...`);
      // Wait for creation to complete
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          const pc = controller.activePeerConnections.get(peerId);
          if (pc) {
            clearInterval(checkInterval);
            resolve(pc);
          }
          if (!controller.creatingPeers.has(peerId) && !pc) {
            clearInterval(checkInterval);
            reject(new Error(`Failed to create peer connection for ${peerId}`));
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error(`Timeout waiting for peer connection ${peerId}`));
        }, 5000);
      });
    }
    
    // Mark as creating (mutex)
    controller.creatingPeers.add(peerId);
    
    try {
      // CRITICAL: Await media readiness before creating peer connection
      const token = await awaitMedia({ 
        requireSendTracks: role === 'caller',
        constraints: { audio: true, video: false } 
      });
      
      console.log(`[WebRTC] Creating peer connection for ${peerId} with token:`, token);
      
      // Create RTCPeerConnection
      const configuration: RTCConfiguration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      };
      
      const pc = new RTCPeerConnection(configuration);
      
      // Add local tracks if we have permission
      if (token.canSend && token.stream) {
        // CRITICAL: Always add tracks in consistent order (audio first, then video)
        // This prevents "m-line order doesn't match" errors during renegotiation
        const audioTracks = token.stream.getAudioTracks();
        const videoTracks = token.stream.getVideoTracks();
        
        // Add audio tracks first
        audioTracks.forEach(track => {
          pc.addTrack(track, token.stream!);
          console.log(`[WebRTC] Added audio track to peer connection`);
        });
        
        // Then add video tracks
        videoTracks.forEach(track => {
          pc.addTrack(track, token.stream!);
          console.log(`[WebRTC] Added video track to peer connection`);
        });
      } else if (token.canReceive && !token.canSend) {
        // Receive-only: Add recvonly transceivers in consistent order
        pc.addTransceiver('audio', { direction: 'recvonly' });
        pc.addTransceiver('video', { direction: 'recvonly' });
        console.log('[WebRTC] Set up receive-only transceivers');
      }
      
      // Store peer connection
      controller.activePeerConnections.set(peerId, pc);
      
      // Clear creating flag
      controller.creatingPeers.delete(peerId);
      
      console.log(`[WebRTC] ✅ Peer connection created for ${peerId}`);
      return pc;
      
    } catch (error) {
      // Clear creating flag on error
      controller.creatingPeers.delete(peerId);
      console.error(`[WebRTC] Failed to create peer connection for ${peerId}:`, error);
      throw error;
    }
  }, [awaitMedia]);
  
  // Get existing peer connection
  const getPeerConnection = useCallback((peerId: string): RTCPeerConnection | undefined => {
    return mediaControllerRef.current.activePeerConnections.get(peerId);
  }, []);

  const sendSignal = useCallback((message: WebRTCMessage) => {
    console.log('[WebRTCContext] Sending WebRTC signal:', message.type);
    
    const serverMessage: any = {
      type: message.type,
    };
    
    if (message.payload?.to) {
      serverMessage.to = message.payload.to;
    }

    // Add connection-directed delivery support (precise socket routing)
    if (message.payload?.toConnectionId) {
      serverMessage.toConnectionId = message.payload.toConnectionId;
    }

    // Add session code for session-scoped delivery
    if (message.sessionId) {
      serverMessage.sessionCode = message.sessionId;
    }
    
    if (message.type === 'ice-candidate' && message.candidate) {
      serverMessage.payload = message.candidate;
      if (message.payload?.to) {
        serverMessage.to = message.payload.to;
      }
      if (message.payload?.toConnectionId) {
        serverMessage.toConnectionId = message.payload.toConnectionId;
      }
    } else {
      serverMessage.payload = message.payload;
    }
    
    const sent = sendMessage(JSON.stringify(serverMessage));
    
    if (sent) {
      console.log('[WebRTCContext] Signal sent successfully');
    } else {
      console.log('[WebRTCContext] Signal queued (WebSocket not ready yet)');
    }
  }, [sendMessage]);

  const joinSession = useCallback((sessionCode: string) => {
    // CRITICAL: Prevent joining the same session multiple times
    if (joinedSessionsRef.current.has(sessionCode)) {
      console.log(`[WebRTCContext] ⏭️ SKIPPING duplicate join for session: ${sessionCode} (already joined)`);
      return;
    }
    
    console.log('[WebRTCContext] Joining session:', sessionCode);
    joinedSessionsRef.current.add(sessionCode);
    setCurrentSessionId(sessionCode);
    
    const message = JSON.stringify({
      type: 'join-session',
      payload: { sessionCode },
    });
    
    const sent = sendMessage(message);
    if (sent) {
      console.log('[WebRTCContext] Join session message sent');
    } else {
      console.log('[WebRTCContext] Join session message queued');
    }
  }, [sendMessage]);

  const leaveSession = useCallback((sessionCode: string) => {
    console.log('[WebRTCContext] Leaving session:', sessionCode);
    
    // Remove from joined sessions set
    joinedSessionsRef.current.delete(sessionCode);
    
    const message = JSON.stringify({
      type: 'leave-session',
    });
    
    sendMessage(message);
    
    if (currentSessionId === sessionCode) {
      setCurrentSessionId(null);
    }
  }, [sendMessage, currentSessionId]);

  const processMessage = useCallback((event: MessageEvent) => {
    console.log('[WebRTCContext] 🎯 processMessage CALLED with raw data:', event.data?.substring?.(0, 200));
    try {
      const data = JSON.parse(event.data);
      console.log('[WebRTCContext] 🎯 Parsed message type:', data.type);
      
      // CRITICAL FIX: Forward ALL call-related messages to V2 engine via webrtc-signal event
      // This includes incoming-call, call-accepted, and all WebRTC signaling messages
      const messagesForV2 = [
        'offer', 'answer', 'ice-candidate', 'session-users', 'peer-joined',
        'incoming-call', 'call-accepted', 'call-rejected', 'call-ended',
        'peer-left', 'call-declined'
      ];
      
      if (messagesForV2.includes(data.type)) {
        console.log('[WebRTCContext] 📡 Forwarding to V2 engine:', data.type);
        
        window.dispatchEvent(new CustomEvent('webrtc-signal', {
          detail: data
        }));
      } else if (data.type === 'new-message') {
        const convId = data.conversationId;
        if (convId) {
          queryClient.invalidateQueries({ queryKey: ["/api/conversations", convId, "messages"] });
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        }
      } else if (data.type === 'tone-update') {
        const convId = data.conversationId;
        if (convId) {
          queryClient.invalidateQueries({ queryKey: ["/api/conversations", convId, "messages"] });
        }
      } else if (data.type === 'message-delivered' || data.type === 'message-read') {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      }
    } catch (error) {
      console.error('[WebRTCContext] Error handling WebSocket message:', error);
    }
  }, []);

  const flushMessageBuffer = useCallback(() => {
    if (messageBufferRef.current.length > 0) {
      console.log('[WebRTCContext] Flushing', messageBufferRef.current.length, 'buffered messages');
      messageBufferRef.current.forEach(processMessage);
      messageBufferRef.current = [];
    }
  }, [processMessage]);

  useEffect(() => {
    if (!websocket) {
      isReadyRef.current = false;
      messageBufferRef.current = [];
      // Clear joined sessions on WebSocket disconnect/unmount
      joinedSessionsRef.current.clear();
      console.log('[WebRTCContext] WebSocket disconnected - cleared joined sessions');
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      console.log('[WebRTCContext] 🎯 handleMessage CALLED! Ready:', isReadyRef.current, 'Data:', event.data?.substring?.(0, 100));
      // Buffer messages until WebSocket is fully ready
      if (!isReadyRef.current) {
        console.log('[WebRTCContext] Buffering message (not ready yet)');
        messageBufferRef.current.push(event);
        return;
      }
      
      console.log('[WebRTCContext] 🎯 Calling processMessage...');
      processMessage(event);
      console.log('[WebRTCContext] 🎯 processMessage returned');
    };

    // WEBRTC SIGNALING DEBUG: Add diagnostic listeners for offer/answer/ICE
    // This helps track WebRTC handshake reliability on mobile browsers
    const debugHandler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (!data?.type) return;
        
        switch (data.type) {
          case 'offer':
            console.log('[SIGNAL_DEBUG] OFFER received', {
              from: data.from,
              sessionId: data.sessionId,
              hasDescription: !!data.payload?.description
            });
            break;
          case 'answer':
            console.log('[SIGNAL_DEBUG] ANSWER received', {
              from: data.from,
              sessionId: data.sessionId,
              hasDescription: !!data.payload?.description
            });
            break;
          case 'ice-candidate':
            console.log('[SIGNAL_DEBUG] ICE-CANDIDATE received', {
              from: data.from,
              candidate: data.payload?.candidate?.candidate?.substring(0, 50) + '...'
            });
            break;
          default:
            // Other message types handled by main handler
            break;
        }
      } catch (err) {
        // Ignore parse errors from non-JSON messages
      }
    };

    // Handle CONNECTING → OPEN race condition for iOS Safari
    if (websocket.readyState === WebSocket.OPEN) {
      console.log('[WebRTCContext] WebSocket already open, attaching listener');
      websocket.addEventListener('message', handleMessage);
      websocket.addEventListener('message', debugHandler); // Add debug listener
      console.log('[SIGNAL_DEBUG] WebRTC signaling listeners active 🎧');
      isReadyRef.current = true;
      flushMessageBuffer();
    } else {
      console.log('[WebRTCContext] WebSocket connecting, waiting for open');
      const handleOpen = () => {
        console.log('[WebRTCContext] WebSocket opened, now ready');
        isReadyRef.current = true;
        flushMessageBuffer();
        websocket.removeEventListener('open', handleOpen);
      };
      
      websocket.addEventListener('open', handleOpen);
      websocket.addEventListener('message', handleMessage);
      websocket.addEventListener('message', debugHandler); // Add debug listener
      console.log('[SIGNAL_DEBUG] WebRTC signaling listeners active 🎧');
      
      // Safety: also check readyState after a microtask (iOS Safari timing fix)
      setTimeout(() => {
        if (websocket.readyState === WebSocket.OPEN && !isReadyRef.current) {
          console.log('[WebRTCContext] WebSocket ready via setTimeout check');
          isReadyRef.current = true;
          flushMessageBuffer();
        }
      }, 0);
    }

    return () => {
      websocket.removeEventListener('message', handleMessage);
      isReadyRef.current = false;
      messageBufferRef.current = [];
      // Clear joined sessions on WebSocket change/unmount
      joinedSessionsRef.current.clear();
      console.log('[WebRTCContext] Cleaning up - cleared joined sessions');
    };
  }, [websocket, processMessage, flushMessageBuffer]);

  // Handle visibility change for iOS Safari (flush messages when app becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isReadyRef.current) {
        console.log('[WebRTCContext] App visible, flushing any buffered messages');
        flushMessageBuffer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [flushMessageBuffer]);

  const contextValue: WebRTCContextType = useMemo(() => ({
    sendSignal,
    joinSession,
    leaveSession,
    currentSessionId,
    ensureMediaReady,
    supplyPendingOffer,
    flushPendingOffer,
    hasMedia,
    isRequestingMedia,
    releaseMedia,
    // New enhanced methods
    awaitMedia,
    createPeerConnectionRequest,
    getPeerConnection,
  }), [sendSignal, joinSession, leaveSession, currentSessionId, ensureMediaReady, supplyPendingOffer, flushPendingOffer, hasMedia, isRequestingMedia, releaseMedia, awaitMedia, createPeerConnectionRequest, getPeerConnection]);

  return (
    <WebRTCContext.Provider value={contextValue}>
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTC() {
  const context = useContext(WebRTCContext);
  
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  
  return context;
}
