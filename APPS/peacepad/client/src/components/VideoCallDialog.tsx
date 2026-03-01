import { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Circle,
  Copy,
  Check,
  Share2,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useActivity } from "@/components/ActivityProvider";
import { MoodRing } from "@/components/MoodRing";
import { SessionMoodTracker } from "@/lib/sessionMoodTracker";
import { useRingtone, useOutgoingRingTone } from "@/hooks/use-ringtone";
import { PostMissedCallDialog } from "@/components/PostMissedCallDialog";
import { useWebRTC } from "@/contexts/WebRTCContext";
import { useSafeViewport } from "@/hooks/useSafeViewport";
import { useCallContext } from "@/contexts/CallContext";
import { stopRingtone } from "@/call/audio";
import { bindRemoteTrack } from "@/call/remoteAudioManager";
import { useCallEngineV2, CallEngineV2Actions } from "@/hooks/useCallEngineV2";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";

// Format call duration to MM:SS
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

interface VideoCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId?: string;
  callType: "audio" | "video";
  isIncoming?: boolean;
  callerId?: string;
  callId?: string; // Database call ID (for direct calls from chat)
  sessionCodeProp?: string;
  initialCameraEnabled?: boolean;
  initialMicEnabled?: boolean;
  autoAccepted?: boolean; // True when user tapped "Answer" on push notification
}

function VideoCallDialog({
  isOpen,
  onClose,
  recipientId,
  callType,
  isIncoming = false,
  callerId,
  callId,
  sessionCodeProp,
  initialCameraEnabled = true,
  initialMicEnabled = true,
  autoAccepted = false,
}: VideoCallDialogProps) {
  // Set up safe viewport handling for Samsung and other devices
  useSafeViewport();

  const { user } = useAuth();
  const { toast } = useToast();
  const { trackActivity, endActivity } = useActivity();
  const {
    sendSignal,
    joinSession,
    leaveSession,
    currentSessionId,
    ensureMediaReady,
    supplyPendingOffer,
    flushPendingOffer,
    hasMedia: contextHasMedia,
    releaseMedia,
    createPeerConnectionRequest,
    getPeerConnection,
  } = useWebRTC();

  // CallContext - single source of truth for call state and ringtone management
  const callContext = useCallContext();

  // CRITICAL: Get call role to determine WebRTC negotiation behavior
  // Fallback: if CallContext doesn't have role, infer from isIncoming prop
  const callRole = callContext.call?.callRole || (isIncoming ? 'callee' : 'caller');

  // Note: Join tracking now handled globally in WebRTCContext.joinSession()

  // Detect mobile viewport safely using matchMedia
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)"); // < lg breakpoint
    setIsMobileViewport(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) =>
      setIsMobileViewport(e.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(!initialMicEnabled);
  const [isVideoOff, setIsVideoOff] = useState(
    callType === "audio" || !initialCameraEnabled,
  );
  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(
    callContext.call?.sessionCode || sessionCodeProp || null
  );
  const [codeCopied, setCodeCopied] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isMediaReady, setIsMediaReady] = useState(false);

  // Error handling state - prevents premature dialog closure
  const [acceptError, setAcceptError] = useState<{
    message: string;
    canRetry: boolean;
    technicalDetails?: string;
  } | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // AI Listening state
  const [aiListeningEnabled, setAiListeningEnabled] = useState(false);
  const [remoteAiConsent, setRemoteAiConsent] = useState(false);
  const [currentMood, setCurrentMood] = useState<
    "calm" | "cooperative" | "neutral" | "frustrated" | "tense" | "defensive"
  >("neutral");
  const [moodConfidence, setMoodConfidence] = useState(0);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 30-second timeout for unanswered calls
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map()); // Track remote streams by userId
  const pendingPeersRef = useRef<
    Array<{ peerId: string; shouldOffer: boolean }>
  >([]); // Peers waiting for media
  
  // Per-peer negotiation state tracking for perfect negotiation pattern
  interface PeerNegotiationState {
    makingOffer: boolean;
    ignoreOffer: boolean;
    isSettingRemoteAnswerPending: boolean;
  }
  const peerNegotiationStatesRef = useRef<Map<string, PeerNegotiationState>>(new Map());
  
  // Get or create negotiation state for a peer
  const getPeerNegotiationState = (peerId: string): PeerNegotiationState => {
    if (!peerNegotiationStatesRef.current.has(peerId)) {
      peerNegotiationStatesRef.current.set(peerId, {
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
      });
    }
    return peerNegotiationStatesRef.current.get(peerId)!;
  };
  
  const moodTrackerRef = useRef<SessionMoodTracker | null>(null);
  const aiConsentRef = useRef<boolean>(false); // Ref to store latest consent value (avoids closure issues)
  const mediaWaitIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval for waiting on media initialization
  const shouldCleanupRef = useRef<boolean>(false); // Flag to control when cleanup should actually run
  const autoAnswerEnabledRef = useRef<boolean>(false); // Auto-answer preference from localStorage
  const handleCallAcceptedRef = useRef<(() => Promise<void>) | null>(null); // Ref to latest accept handler
  const autoAcceptTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout for auto-accept delay
  const lastCallEndedEventTimeRef = useRef<number>(0); // Track last 'call-ended' event to deduplicate
  const endCallInProgressRef = useRef<boolean>(false); // CRITICAL: Prevent duplicate endCall() execution
  const acceptButtonRef = useRef<HTMLButtonElement | null>(null); // Ref to Accept button for focus management
  // CRITICAL FIX: Sync sessionCode from CallContext to local state
  // This ensures V2 engine has sessionCode when callee accepts call
  useEffect(() => {
    if (callContext.call?.sessionCode && !sessionCode) {
      console.log('[VideoCallDialog] 🔑 Syncing sessionCode from CallContext:', callContext.call.sessionCode);
      setSessionCode(callContext.call.sessionCode);
    }
  }, [callContext.call?.sessionCode, sessionCode]);

  // Ringtone hooks (outgoing only - incoming uses ringManager)
  const { play: playOutgoingRing, stop: stopOutgoingRing } =
    useOutgoingRingTone();

  // Call status state
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "incoming" | "connecting" | "connected" | "ending" | "ended"
  >("idle");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  // Camera flip state (for mobile video calls)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user"); // "user" = front, "environment" = back
  const lastTapRef = useRef<number>(0);

  // Post-missed call followup state
  const [showPostMissedDialog, setShowPostMissedDialog] = useState(false);
  const [missedCallId, setMissedCallId] = useState<string | null>(null);
  
  // V2 Call Engine Integration (when enabled)
  // CRITICAL FIX: Use state for adapter to trigger re-render when ready
  const [wsAdapter, setWsAdapter] = useState<WebSocket | null>(null);
  const wsAdapterRef = useRef<WebSocket | null>(null);
  const peerConnectionMapRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const v2MessageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  
  // Initialize V2 Call Engine - CRITICAL: Use ref not state to avoid closure issues
  // CRITICAL FIX: Pass getLocalMediaStream function so V2 can add audio tracks
  const v2CallEngine = useCallEngineV2(
    wsAdapterRef, // CRITICAL: Pass ref so V2 can access current value
    peerConnectionMapRef,
    () => localStreamRef.current // Provide access to local media stream
  );
  const [v2State, v2Actions] = v2CallEngine || [{}, {} as CallEngineV2Actions];
  
  // CRITICAL FIX: Create ref to track live V2 state for adapter access
  const v2StateRef = useRef(v2State);
  useEffect(() => {
    v2StateRef.current = v2State;
  }, [v2State]);
  
  // Create WebSocket adapter for V2 engine (bridges to sendSignal)
  useEffect(() => {
    // CRITICAL FIX: Create adapter immediately when dialog opens (not just when sessionCode exists)
    // This ensures callee can send join-session message when accepting call
    if (isOpen && !wsAdapterRef.current) {
      console.log('[V2] Setting up WebSocket adapter for V2 engine (session:', sessionCodeProp || 'pending', ')');
      console.log('[V2] 🔍 Debug - Checking catch-up conditions:', {
        hasSessionCode: !!callContext.call?.sessionCode,
        hasCallId: !!callContext.call?.callId,
        isIncoming,
        hasProcessMessage: !!v2Actions.processMessage,
        sessionCode: callContext.call?.sessionCode,
        callId: callContext.call?.callId
      });
      
      // CRITICAL FIX: If there's already a sessionCode in CallContext (incoming call), 
      // manually trigger incoming-call processing since the window event already fired before dialog opened
      if (callContext.call?.sessionCode && callContext.call?.callId && isIncoming && v2Actions.processMessage) {
        console.log('[V2] 🔥 CRITICAL FIX: Processing missed incoming-call event for sessionCode:', callContext.call.sessionCode);
        
        // Directly call V2 engine's processMessage with incoming-call data
        v2Actions.processMessage({
          type: 'incoming-call',
          payload: {
            callId: callContext.call.callId,
            sessionCode: callContext.call.sessionCode,
            callerId: callContext.call.callerId,
            callerName: callContext.call.callerName,
            callType: callContext.call.callType
          },
          sequence: Date.now()
        });
        
        console.log('[V2] ✅ Manually injected incoming-call into V2 engine state');
      }
      
      // Create message handler that transforms window events to WebSocket events
      const messageHandler = (event: Event) => {
        console.log('[V2 Adapter] 🎯 messageHandler called! Has handler:', !!v2MessageHandlerRef.current);
        const customEvent = event as CustomEvent;
        const message = customEvent.detail;
        console.log('[V2 Adapter] Received webrtc-signal event:', message.type, message);
        
        // Transform legacy messages to V2 format
        let v2Message: any = null;
        
        // Map common WebRTC signals to V2 format
        switch (message.type) {
          case 'incoming-call':
            // CRITICAL FIX: Forward incoming-call to V2 engine so it stores sessionCode
            v2Message = { 
              type: 'incoming-call',
              payload: message,
              sequence: Date.now()
            };
            console.log('[V2] Forwarding incoming-call to V2 engine:', message);
            break;
          case 'call-accepted':
            // Forward call-accepted to V2 engine
            v2Message = {
              type: 'call-accepted',
              payload: message,
              sequence: Date.now()
            };
            console.log('[V2] Forwarding call-accepted to V2 engine:', message);
            break;
          case 'offer':
            v2Message = { 
              type: 'v2:webrtc_offer', 
              payload: { offer: message.payload, from: message.from },
              sequence: Date.now()
            };
            break;
          case 'answer':
            v2Message = { 
              type: 'v2:webrtc_answer', 
              payload: { answer: message.payload, from: message.from },
              sequence: Date.now()
            };
            break;
          case 'ice-candidate':
            v2Message = { 
              type: 'v2:webrtc_candidate', 
              payload: { candidate: message.candidate || message.payload, from: message.from },
              sequence: Date.now()
            };
            break;
          case 'session-users':
            console.log('[V2 Adapter] 🔄 Transforming session-users to v2:session_joined');
            console.log('[V2 Adapter] Users in session:', message.payload.users);
            v2Message = {
              type: 'v2:session_joined',
              payload: { users: message.payload.users || [], sessionCode: sessionCode || sessionCodeProp },
              sequence: Date.now()
            };
            break;
          case 'user-joined':
            v2Message = {
              type: 'v2:participant_joined',
              payload: message.payload,
              sequence: Date.now()
            };
            break;
          case 'user-left':
            v2Message = {
              type: 'v2:participant_left',
              payload: { userId: message.from || message.payload?.userId },
              sequence: Date.now()
            };
            break;
          case 'call:join-session':
            // CRITICAL FIX: Transform caller's join-session message for V2 engine
            v2Message = {
              type: 'v2:call:join-session',
              payload: { sessionCode: message.sessionCode || message.sessionId || message.payload?.sessionCode },
              sequence: Date.now()
            };
            console.log('[V2 Adapter] 📡 Transforming call:join-session to V2 format:', v2Message);
            break;
        }
        
        if (v2Message && v2MessageHandlerRef.current) {
          console.log('[V2 Adapter] ✅ Forwarding to V2 engine:', v2Message.type, v2Message);
          // Create a MessageEvent-like object for the V2 engine
          const messageEvent = {
            data: JSON.stringify(v2Message)
          } as MessageEvent;
          
          console.log('[V2 Adapter] 📤 Calling V2 handler with MessageEvent...');
          try {
            v2MessageHandlerRef.current(messageEvent);
            console.log('[V2 Adapter] 📤 V2 handler call completed');
          } catch (e) {
            console.error('[V2 Adapter] 📤 V2 handler call failed:', e);
          }
        } else if (v2Message && !v2MessageHandlerRef.current) {
          console.error('[V2 Adapter] ❌ Message ready but no V2 handler registered!', v2Message.type);
        }
      };
      
      // Create a WebSocket-like adapter
      const adapter: any = {
        readyState: WebSocket.OPEN,
        send: (data: string) => {
          const parsed = JSON.parse(data);
          console.log('[V2] Sending via adapter:', parsed.type, 'payload:', parsed.payload);
          
          // CRITICAL FIX: Read from v2StateRef.current to get LIVE state (not stale closure)
          const liveV2State = v2StateRef.current as any;
          const currentSessionCode = liveV2State?.sessionCode || sessionCodeProp || '';
          
          // Defensive logging for empty sessionId
          if (!currentSessionCode) {
            console.error('[V2] ❌ CRITICAL: Adapter trying to send without sessionId!', {
              messageType: parsed.type,
              liveSessionCode: liveV2State?.sessionCode,
              sessionCodeProp,
              liveV2State
            });
            // CRITICAL: Do not send if we have no sessionCode
            return;
          } else {
            console.log('[V2] ✅ Adapter sending with sessionId:', currentSessionCode);
          }
          
          // CRITICAL FIX: Route messages correctly for V2 engine
          let signalType = parsed.type;
          let signalPayload = parsed.payload;
          
          // V2 engine on server expects specific message types:
          // - v2:* messages for call control (preserved as-is)
          // - webrtc:* messages for WebRTC signaling (transformed from v2:send_*)
          if (parsed.type === 'v2:send_offer') {
            signalType = 'webrtc:offer'; // V2 engine expects webrtc:offer
            // CRITICAL FIX: Wrap offer properly - server expects {offer: {...}, to: userId}
            signalPayload = { 
              offer: parsed.payload.offer,
              to: parsed.payload.targetUserId 
            };
          } else if (parsed.type === 'v2:send_answer') {
            signalType = 'webrtc:answer'; // V2 engine expects webrtc:answer
            // CRITICAL FIX: Wrap answer properly - server expects {answer: {...}, to: userId}
            signalPayload = { 
              answer: parsed.payload.answer,
              to: parsed.payload.targetUserId 
            };
          } else if (parsed.type === 'v2:send_candidate') {
            signalType = 'webrtc:ice-candidate'; // V2 engine expects webrtc:ice-candidate
            // CRITICAL FIX: Wrap candidate properly - server expects {candidate: {...}, to: userId}
            signalPayload = { 
              candidate: parsed.payload.candidate,
              to: parsed.payload.targetUserId 
            };
          }
          // All other v2:* messages (like v2:call:join-session) are preserved as-is
          
          sendSignal({
            type: signalType,
            sessionId: currentSessionCode,
            payload: signalPayload
          });
        },
        addEventListener: (event: string, handler: Function) => {
          console.log('[V2 Adapter] addEventListener called for:', event);
          if (event === 'message') {
            console.log('[V2 Adapter] ✅ Registering V2 message handler');
            v2MessageHandlerRef.current = handler as (event: MessageEvent) => void;
            
            // CRITICAL DEBUG: Test the handler immediately
            console.log('[V2 Adapter] 🧪 Testing handler registration...');
            const testEvent = {
              data: JSON.stringify({ type: 'v2:test', payload: {} })
            } as MessageEvent;
            try {
              if (v2MessageHandlerRef.current) {
                console.log('[V2 Adapter] 🧪 Handler exists, calling test...');
                v2MessageHandlerRef.current(testEvent);
                console.log('[V2 Adapter] 🧪 Test call completed');
              } else {
                console.error('[V2 Adapter] 🧪 Handler is null after registration!');
              }
            } catch (e) {
              console.error('[V2 Adapter] 🧪 Test call failed:', e);
            }
            
            window.addEventListener('webrtc-signal', messageHandler);
            // CRITICAL FIX: Also listen for call-accepted events from App.tsx!
            window.addEventListener('call-accepted', messageHandler);
            console.log('[V2 Adapter] ✅ Listening for both webrtc-signal AND call-accepted events');
          }
        },
        removeEventListener: (event: string, handler: Function) => {
          if (event === 'message') {
            window.removeEventListener('webrtc-signal', messageHandler);
            window.removeEventListener('call-accepted', messageHandler);
            v2MessageHandlerRef.current = null;
          }
        },
        close: () => {
          window.removeEventListener('webrtc-signal', messageHandler);
          window.removeEventListener('call-accepted', messageHandler);
        }
      };
      
      wsAdapterRef.current = adapter;
      setWsAdapter(adapter); // CRITICAL: Set state to trigger V2 engine re-render
      console.log('[V2] WebSocket adapter ready and set in both ref and state');
      
      // This state change will trigger V2 engine's useEffect to set up the listener
      console.log('[V2] Adapter set - V2 engine will now receive it');
    }
    
    return () => {
      if (wsAdapterRef.current) {
        console.log('[V2] Cleaning up adapter for call:', callId);
        wsAdapterRef.current.close();
        wsAdapterRef.current = null;
        setWsAdapter(null); // Clear state too
      }
    };
  }, [isOpen, callId]); // CRITICAL FIX: Re-create adapter for each new callId (stable component key prevents unmount)

  // Lifecycle logging - track component mounting/unmounting
  useEffect(() => {
    if (isOpen) {
      console.log("[VideoCallDialog] ==== COMPONENT OPENED ====");
      console.log("[VideoCallDialog] Props:", {
        isOpen,
        isIncoming,
        callerId,
        callId,
        recipientId,
        callType,
        sessionCodeProp,
        autoAccepted,
      });

      // SERVER-SIDE DEBUG: Log that dialog opened (will appear in server logs)
      fetch("/api/test-monitor/interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: `VIDEOCALL_DIALOG_OPENED`,
          details: JSON.stringify({
            isIncoming,
            callId: callId || "NULL",
            callerId: callerId || "NULL",
            recipientId: recipientId || "NULL",
          }),
        }),
        credentials: "include",
      }).catch((e) => console.error("Failed to log:", e));
    }

    // Track component unmounting
    return () => {
      if (isOpen) {
        console.log("[VideoCallDialog] ==== COMPONENT CLOSING/UNMOUNTING ====");
        console.log("[VideoCallDialog] State at unmount:", {
          callStatus,
          isConnected,
          hasAcceptError: !!acceptError,
          retryCount: retryCountRef.current,
        });

        // Reset retry counter for next call
        retryCountRef.current = 0;

        // Clear any accept errors
        setAcceptError(null);
      }
    };
  }, [isOpen, isIncoming, callerId, callId, recipientId, callType, sessionCodeProp, autoAccepted]); // FIXED: Removed state vars (callStatus, isConnected, acceptError) to prevent re-runs during call

  // CRITICAL FIX: Dedicated useEffect to inject incoming-call state into V2 engine
  // This runs separately from adapter setup to ensure it catches the incoming call data
  useEffect(() => {
    if (!isIncoming || !isOpen) return;
    
    // Check if V2 engine already has the call state
    if (v2State.currentCallId && v2State.sessionCode) {
      console.log('[V2] ✅ V2 engine already has call state, skipping injection');
      return;
    }
    
    // If we have incoming call data but V2 engine doesn't, inject it
    if (callContext.call?.sessionCode && callContext.call?.callId && v2Actions.processMessage) {
      console.log('[V2] 🚀 DEDICATED EFFECT: Injecting incoming-call into V2 engine', {
        callId: callContext.call.callId,
        sessionCode: callContext.call.sessionCode,
        v2StateEmpty: !v2State.currentCallId
      });
      
      v2Actions.processMessage({
        type: 'incoming-call',
        payload: {
          callId: callContext.call.callId,
          sessionCode: callContext.call.sessionCode,
          callerId: callContext.call.callerId,
          callerName: callContext.call.callerName,
          callType: callContext.call.callType
        },
        sequence: Date.now()
      });
      
      console.log('[V2] ✅ Injection complete via dedicated effect');
    } else {
      console.log('[V2] ⏳ Waiting for call data to inject into V2 engine', {
        hasSessionCode: !!callContext.call?.sessionCode,
        hasCallId: !!callContext.call?.callId,
        hasProcessMessage: !!v2Actions.processMessage
      });
    }
  }, [isIncoming, isOpen, callContext.call, v2State.currentCallId, v2State.sessionCode, v2Actions]);

  // Cleanup function - MEDIA-ONLY teardown (ringtone managed by FSM)
  // NOTE: Handlers must dispatch callContext actions BEFORE calling cleanup()
  const cleanup = useCallback(() => {
    // Stop outgoing ringback tone (caller-side only)
    stopOutgoingRing();

    // Clear all timers
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    if (mediaWaitIntervalRef.current) {
      clearInterval(mediaWaitIntervalRef.current);
      mediaWaitIntervalRef.current = null;
    }

    // Stop recording if active
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    // Cleanup mood tracker
    if (moodTrackerRef.current) {
      moodTrackerRef.current.cleanup();
      moodTrackerRef.current = null;
    }

    // Release media via MediaController (handles track stopping, queued requests & events)
    // Clear local ref to stay in sync with MediaController
    localStreamRef.current = null;
    releaseMedia(); // This also handles peer connection cleanup in WebRTCContext

    // Clear remote streams tracking
    remoteStreamsRef.current.clear();

    // Leave WebRTC session
    const code = sessionCode || sessionCodeProp;
    if (code) {
      leaveSession(code);
    }

    // Note: Join tracking cleared automatically in WebRTCContext on cleanup

    // End call activity tracking
    endActivity("call");
  }, [
    stopOutgoingRing,
    isRecording,
    sessionCode,
    sessionCodeProp,
    leaveSession,
    endActivity,
    releaseMedia,
  ]);

  // Ringback tone effect - play when calling, stop when connected/ended
  useEffect(() => {
    console.log('[RINGTONE] 🔔 Effect triggered. CallStatus:', callStatus, 'isIncoming:', isIncoming);
    
    if (callStatus === "calling") {
      console.log('[RINGTONE] 📞 Caller should hear DIAL TONE - calling playOutgoingRing()');
      playOutgoingRing();
      console.log('[RINGTONE] ✅ playOutgoingRing() called');
    } else {
      console.log('[RINGTONE] 🔇 Stopping outgoing dial tone. CallStatus:', callStatus);
      stopOutgoingRing();
    }

    return () => {
      console.log('[RINGTONE] 🧹 Cleanup - stopping outgoing dial tone');
      stopOutgoingRing();
    };
  }, [callStatus, playOutgoingRing, stopOutgoingRing, isIncoming]);

  // Call timeout - auto-end call after 30 seconds if no answer (like Snapchat/phone apps)
  // Note: onClose is intentionally excluded from dependencies to prevent timer resets on parent re-renders
  useEffect(() => {
    if (callStatus === "calling") {
      // Start 30-second timeout
      callTimeoutRef.current = setTimeout(async () => {
        console.log(
          "[Call Timeout] 30 seconds elapsed, no answer - ending call",
        );

        // Update backend if we have a callId
        if (callId) {
          try {
            await fetch(`/api/calls/${callId}/end`, {
              method: "PATCH",
              credentials: "include",
            });
          } catch (error) {
            console.error("Failed to end call on backend:", error);
          }
        }

        // CRITICAL: Dispatch FSM action to stop ringtone
        callContext.endCall("timeout");

        setCallStatus("ended");
        toast({
          title: "No answer",
          description: "Call ended - they didn't pick up",
          duration: 4000,
        });

        // Show post-missed call dialog to send a follow-up message
        if (callId) {
          setMissedCallId(callId);
          setShowPostMissedDialog(true);
        }

        shouldCleanupRef.current = true;
        cleanup();
        onClose();
      }, 30000); // 30 seconds
    } else {
      // Clear timeout if status changes (call answered, declined, etc.)
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    }

    return () => {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus, callId, stopOutgoingRing, cleanup]);

  // Load auto-answer preference when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    const autoAnswerEnabled =
      localStorage.getItem("auto_answer_calls") === "true";
    autoAnswerEnabledRef.current = autoAnswerEnabled;
    console.log(
      "[VideoCallDialog] Auto-answer preference loaded:",
      autoAnswerEnabled,
    );
  }, [isOpen]);

  // PUSH NOTIFICATION AUTO-ACCEPT: User tapped "Answer" button on notification
  useEffect(() => {
    // Only auto-accept if:
    // 1. autoAccepted prop is true (from push notification Answer button)
    // 2. Status is "incoming" (not already connecting/connected)
    // 3. This is an incoming call
    // 4. Handler is ready
    if (
      autoAccepted &&
      callStatus === "incoming" &&
      isIncoming &&
      handleCallAcceptedRef.current
    ) {
      console.log(
        "[VideoCallDialog] 📲 Push notification auto-accept - joining call immediately",
      );

      // Log push auto-accept for debugging
      fetch("/api/test-monitor/interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: `PUSH_AUTO_ACCEPT_TRIGGERED`,
          details: JSON.stringify({ callId: callId || "NULL" }),
        }),
        credentials: "include",
      }).catch(() => {});

      // Set connecting status and join call
      setCallStatus("connecting");
      handleCallAcceptedRef.current();
    }
  }, [autoAccepted, callStatus, isIncoming, callId]);

  // Set call status to "incoming" when receiving a call
  // CRITICAL FIX: Force "incoming" state for pre-accept statuses to fix Samsung bug
  // BUT prevent regression from connecting/connected/ended states
  useEffect(() => {
    console.log("[VideoCallDialog] Incoming status check:", {
      isOpen,
      isIncoming,
      callStatus,
      willSetToIncoming:
        isOpen &&
        isIncoming &&
        !["connecting", "connected", "ended"].includes(callStatus),
    });

    // Only transition to incoming if we're in a pre-accept state
    // This fixes Samsung bug where callStatus starts as "calling" instead of "idle"
    // while preventing regression from later states (connecting/connected/ended)
    const isPreAcceptState =
      callStatus !== "connecting" &&
      callStatus !== "connected" &&
      callStatus !== "ended";

    if (isOpen && isIncoming && isPreAcceptState) {
      console.log(
        `[VideoCallDialog] ✅ Setting call status to 'incoming' (was: ${callStatus})`,
      );

      // SERVER-SIDE DEBUG: Log that status changed to incoming (will appear in server logs)
      fetch("/api/test-monitor/interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: `CALL_STATUS_INCOMING`,
          details: JSON.stringify({
            callId: callId || "NULL",
            previousStatus: callStatus,
          }),
        }),
        credentials: "include",
      }).catch((e) => console.error("Failed to log:", e));

      setCallStatus("incoming");
    }
  }, [isOpen, isIncoming, callStatus, callId]);

  // Auto-accept incoming calls if preference is enabled
  useEffect(() => {
    // Clear any pending auto-accept timeout if call status changes
    if (callStatus !== "incoming" && autoAcceptTimeoutRef.current) {
      clearTimeout(autoAcceptTimeoutRef.current);
      autoAcceptTimeoutRef.current = null;
    }

    // Only auto-accept if:
    // 1. Status is "incoming" (not already connecting/connected)
    // 2. Auto-answer is enabled in localStorage
    // 3. This is an incoming call
    if (
      callStatus === "incoming" &&
      autoAnswerEnabledRef.current &&
      isIncoming
    ) {
      console.log("[VideoCallDialog] 🤖 Auto-accepting incoming call");

      // Log auto-accept action for debugging
      fetch("/api/test-monitor/interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: `AUTO_ACCEPT_TRIGGERED`,
          details: JSON.stringify({ callId: callId || "NULL" }),
        }),
        credentials: "include",
      }).catch(() => {});

      // Trigger accept handler via ref (defined later via useCallback)
      // CRITICAL: Transition to "connecting" INSIDE timeout to prevent early cleanup
      // Store timeout ref to allow cleanup if call is cancelled
      autoAcceptTimeoutRef.current = setTimeout(() => {
        console.log("[VideoCallDialog] 🤖 Auto-accept timeout fired");
        // Set connecting status before calling handler
        setCallStatus("connecting");

        if (handleCallAcceptedRef.current) {
          handleCallAcceptedRef.current();
        }
        autoAcceptTimeoutRef.current = null;
      }, 50); // 50ms delay to ensure state stabilizes
    }

    return () => {
      // Cleanup timeout on unmount
      if (autoAcceptTimeoutRef.current) {
        clearTimeout(autoAcceptTimeoutRef.current);
        autoAcceptTimeoutRef.current = null;
      }
    };
  }, [callStatus, isIncoming, callId]);

  // CRITICAL: Use session code from props (provided by /api/calls response or incoming-call message)
  // NEVER create a new session here - that causes session code mismatch between caller and callee
  useEffect(() => {
    if (!isOpen || !user) return;

    // Use the session code provided via props (from backend /api/calls response or incoming-call notification)
    if (sessionCodeProp) {
      console.log(`[VideoCallDialog] Using sessionCode from props: ${sessionCodeProp}`);
      setSessionCode(sessionCodeProp);
      return;
    }

    // If no sessionCode provided, this is an error - log it clearly
    console.error("[VideoCallDialog] ⚠️ No sessionCode provided! Call will fail. SessionCode must come from /api/calls response or incoming-call message.");
  }, [isOpen, user, sessionCodeProp]);

  // Check AI listening setting from localStorage
  useEffect(() => {
    if (!isOpen) return;

    const aiEnabled = localStorage.getItem("ai_listening_enabled") === "true";
    setAiListeningEnabled(aiEnabled);
    aiConsentRef.current = aiEnabled; // Update ref for WebSocket handlers
    console.log("[AI Listening] Loaded consent from localStorage:", aiEnabled);
  }, [isOpen]);

  // Broadcast AI consent whenever it changes
  useEffect(() => {
    const code = sessionCode || sessionCodeProp;
    if (!code) return;

    // Update ref and broadcast
    aiConsentRef.current = aiListeningEnabled;
    console.log(
      "[AI Listening] Broadcasting consent status:",
      aiListeningEnabled,
    );
    sendSignal({
      type: "ai-consent" as any,
      sessionId: code,
      payload: { aiListeningEnabled },
    });
  }, [aiListeningEnabled, sessionCode, sessionCodeProp, sendSignal]);

  // Start/stop AI listening based on dual consent
  useEffect(() => {
    if (!isConnected || !localStreamRef.current || !sessionCode || !user)
      return;

    const bothConsented = aiListeningEnabled && remoteAiConsent;

    if (bothConsented && !moodTrackerRef.current) {
      console.log("Starting AI listening - both participants consented");

      // Initialize SessionMoodTracker
      moodTrackerRef.current = new SessionMoodTracker({
        sessionId: sessionCode,
        userId: user.id,
        onEmotionUpdate: (emotionSnapshot) => {
          setCurrentMood(emotionSnapshot.emotion);
          setMoodConfidence(emotionSnapshot.confidence);
        },
        onError: (error) => {
          console.error("Mood tracking error:", error);
        },
      });

      moodTrackerRef.current.startTracking(localStreamRef.current);
    } else if (!bothConsented && moodTrackerRef.current) {
      console.log("Stopping AI listening - consent withdrawn");
      moodTrackerRef.current.stopTracking();
      moodTrackerRef.current = null;
      setCurrentMood("neutral");
    }
  }, [isConnected, aiListeningEnabled, remoteAiConsent, sessionCode, user]);

  // Initialize media first (but don't auto-join session - that happens explicitly in caller flow or handleAccept)
  useEffect(() => {
    if (!isOpen || !user) return;

    const code = sessionCode || sessionCodeProp;
    if (!code) return;

    // Initialize media if not already ready
    if (!isMediaReady && !localStreamRef.current) {
      initializeLocalMedia();
    }
  }, [isOpen, user, sessionCode, sessionCodeProp, isMediaReady]);

  // CRITICAL FIX: Caller should NOT join session until callee accepts
  // This prevents premature offer/answer negotiation
  // Session join is now handled in:
  // - CALLER: call-accepted event listener (line ~667)
  // - CALLEE: handleCallAccepted function (line ~1533)

  // Cleanup ONLY when truly ending the call or component unmounts
  useEffect(() => {
    if (!isOpen) return;

    // Reset cleanup flag when dialog opens
    shouldCleanupRef.current = false;

    // This cleanup only runs when dialog closes or component unmounts
    return () => {
      // Only cleanup if we've explicitly set the flag (e.g., user hangs up, call ends)
      // or if the component is truly unmounting (not just parent hiding dialog temporarily)
      if (shouldCleanupRef.current) {
        cleanup();
      }
    };
  }, [isOpen]);

  // Initialize media and setup direct call when dialog opens
  useEffect(() => {
    if (!isOpen || !user) return;

    // CRITICAL: For incoming calls, DO NOT initialize media until user accepts
    // This prevents permission prompts from blocking the UI
    const shouldInitializeMedia =
      !isIncoming && !localStreamRef.current && !isMediaReady;

    if (shouldInitializeMedia) {
      console.log(
        "[VideoCallDialog] Initializing local media for outgoing call",
      );
      initializeLocalMedia();
    } else if (isIncoming) {
      console.log(
        "[VideoCallDialog] Incoming call - deferring media init until accept",
      );
    }

    // Direct 1:1 call (P2P without session)
    if (!sessionCode && !sessionCodeProp && !isIncoming && recipientId) {
      console.log(
        `[VideoCallDialog] DIRECT CALL: Starting outgoing call to ${recipientId} (${callType})`,
      );
      console.log(
        `[VideoCallDialog] Current media state - isMediaReady: ${isMediaReady}, localStream exists: ${!!localStreamRef.current}`,
      );

      // Declare sid variable for both paths
      const sid = callId || recipientId; // Use callId if available, otherwise recipientId

      // Use V2 engine (UNIFIED: no legacy path)
      console.log('[V2] Initiating call via V2 engine');
      v2Actions.initiateCall(recipientId, {
        hasVideo: callType === 'video',
        reason: 'direct_call'
      });
      setCallStatus("calling");

      // Clear any existing interval first
      if (mediaWaitIntervalRef.current) {
        clearInterval(mediaWaitIntervalRef.current);
        mediaWaitIntervalRef.current = null;
      }
    }

    // Incoming call - wait for caller to initiate
    if (isIncoming && callerId) {
      console.log(
        `[VideoCallDialog] INCOMING CALL: Received call from ${callerId}, waiting for peer connection`,
      );
    }
  }, [
    isOpen,
    user,
    recipientId,
    callType,
    isIncoming,
    sessionCode,
    sessionCodeProp,
    callId,
    sendSignal,
  ]);

  // Listen for backend-driven call ending (timeouts, remote hangup, etc.)
  useEffect(() => {
    const handleCallEnded = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      console.log("[VideoCallDialog] Received call-ended event:", data);

      // Deduplicate identical events within a short timeframe
      const now = Date.now();
      if (now - lastCallEndedEventTimeRef.current < 500) {
        console.log("[VideoCallDialog] ⏭️ Deduplicating call-ended event");
        return;
      }
      lastCallEndedEventTimeRef.current = now;

      // Only handle if this is our call
      if (data.callId === callId) {
        console.log(
          "[VideoCallDialog] Call ended remotely by backend, cleaning up",
        );
        toast({
          title: "Call Ended",
          description:
            data.endedBy === "timeout"
              ? "Call timed out"
              : "Call ended by other party",
          duration: 4000,
        });
        shouldCleanupRef.current = true;
        cleanup();
        onClose();
      }
    };

    window.addEventListener("call-ended", handleCallEnded);

    return () => {
      window.removeEventListener("call-ended", handleCallEnded);
    };
  }, [callId, cleanup, onClose, toast]);

  // Listen for call acceptance (when receiver accepts the call)
  useEffect(() => {
    const handleCallAcceptedSignal = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      console.log("[VideoCallDialog] 🎉 Received call-accepted event:", data);
      console.log("[VideoCallDialog] Current state - isIncoming:", isIncoming, "recipientId:", recipientId, "callRole:", callRole, "callStatus:", callStatus);
      console.log("[VideoCallDialog] SessionCode from event:", data.sessionCode);

      // CRITICAL: Ignore call-accepted if we're already ending/ended the call
      if (callStatus === "ended" || shouldCleanupRef.current) {
        console.log("[VideoCallDialog] ⏭️ Ignoring call-accepted - call is ending/ended");
        return;
      }

      // Validate sessionCode
      if (!data.sessionCode) {
        console.error("[VideoCallDialog] ❌ call-accepted event missing sessionCode - cannot join WebRTC session");
        return;
      }

      // CALLER: Join WebRTC session and initiate offer when receiver accepts
      if (!isIncoming && recipientId) {
        console.log(
          `[VideoCallDialog] ✅ I am CALLER - Joining WebRTC session after acceptance`,
        );
        console.log(`[VideoCallDialog] SessionCode: ${data.sessionCode}`);

        // Stop outgoing ring tone
        stopOutgoingRing();

        // CRITICAL: Update session code in state so UI shows it
        setSessionCode(data.sessionCode);

        // Update UI to connecting state first (will transition to connected when peer connects)
        setCallStatus("connecting");
        setIsConnected(false);

        // Join WebRTC session - duplicate prevention handled in WebRTCContext.joinSession()
        // UNIFIED: V2 engine handles session joining
        console.log(`[VideoCallDialog] 🎬 V2 CALLER: Dispatching call:join-session event for V2 adapter`);
        window.dispatchEvent(new CustomEvent('webrtc-signal', {
          detail: {
            type: 'call:join-session',
            sessionCode: data.sessionCode,
            payload: { sessionCode: data.sessionCode }
          }
        }));

        // Start timer immediately so caller sees duration
        startCallTimer();
      }
      // CALLEE: Join session and transition to connected state
      else if (isIncoming) {
        console.log("[VideoCallDialog] ✅ I am CALLEE - Joining session and transitioning to connected state");
        
        // CRITICAL FIX: Callee must also join the WebRTC session!
        if (data.sessionCode) {
          console.log(`[VideoCallDialog] 📞 CALLEE session code: ${data.sessionCode}`);
          setSessionCode(data.sessionCode);
          
          // UNIFIED: V2 engine handles session joining
          console.log(`[VideoCallDialog] 📞 V2 CALLEE - session join handled by V2 engine`);
        }
        
        setCallStatus("connected");
        setIsConnected(true);
        startCallTimer();
      } else {
        console.log(
          "[VideoCallDialog] ⏭️ Ignoring call-accepted (isIncoming:", isIncoming, ", recipientId:", recipientId, ")",
        );
      }
    };

    window.addEventListener("call-accepted", handleCallAcceptedSignal);

    return () => {
      window.removeEventListener("call-accepted", handleCallAcceptedSignal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIncoming, recipientId, stopOutgoingRing, callRole, callStatus]);
  // Note: joinSession intentionally omitted from deps to prevent re-registering listener

  // UNIFIED: V2 engine handles ALL remote track binding
  useEffect(() => {
    const handleRemoteTrack = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { peerId, stream, track } = customEvent.detail;
      console.log(`[VideoCallDialog] 🔊 Binding remote audio from ${peerId}`);
      bindRemoteTrack(track, stream, callType === 'video' ? 'video' : 'audio');
    };
    
    window.addEventListener('remote-track-received', handleRemoteTrack);
    console.log('[VideoCallDialog] ✅ Remote track listener registered for V2 engine');
    
    return () => {
      window.removeEventListener('remote-track-received', handleRemoteTrack);
    };
  }, [callType]);

  // Ringtone is now managed by FSM - no component-level ringtone triggers
  // (FSM handles ringtone via App.tsx WebSocket handler -> callContext.incomingCall/outgoingCall)

  // Audio unlock is now handled globally by FSM
  // (audio.ts will re-trigger ringtone if FSM phase is still 'ringing')

  // Initialize local media (camera/microphone) using browser-agnostic MediaController
  const initializeLocalMedia = async () => {
    // Prevent duplicate initialization
    if (isMediaReady || localStreamRef.current) {
      console.log("Media already initialized, skipping");
      return;
    }

    try {
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      console.log(
        "[VideoCallDialog] Requesting media via MediaController with constraints:",
        constraints,
      );

      // Use MediaController to handle browser-agnostic permission timing
      const stream = await ensureMediaReady(constraints);
      localStreamRef.current = stream;

      // Set initial track states based on preview settings
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = initialMicEnabled;
        console.log(
          "[VideoCallDialog] Audio track enabled:",
          audioTrack.enabled,
          "ID:",
          audioTrack.id,
        );
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = initialCameraEnabled;
        console.log(
          "[VideoCallDialog] Video track enabled:",
          videoTrack.enabled,
          "ID:",
          videoTrack.id,
        );
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      console.log(
        "[VideoCallDialog] Local media initialized successfully with",
        stream.getTracks().length,
        "tracks",
      );
      setIsMediaReady(true);

      // Track call activity
      trackActivity("call");

      // NOTE: Session joining is now handled explicitly in:
      // - handleCallAccepted for incoming calls (line 1533)
      // - useEffect for outgoing calls when isMediaReady becomes true (line 516)
      // This prevents the !currentSessionId guard bug where stale session IDs block joining

      // Process any pending peer connections now that media is ready
      if (pendingPeersRef.current.length > 0) {
        console.log(
          `Processing ${pendingPeersRef.current.length} pending peer connections`,
        );
        for (const { peerId, shouldOffer } of pendingPeersRef.current) {
          try {
            const pc = await createPeerConnectionRequest(peerId, callRole, { shouldCreateOffer: shouldOffer });
            setupPeerConnectionHandlers(pc, peerId);
            
            // Create and send offer if needed
            if (shouldOffer && callRole === 'caller') {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              const sid = sessionCode || sessionCodeProp || callId || peerId;
              sendSignal({
                type: "offer",
                sessionId: sid,
                payload: { ...offer, to: peerId },
              });
              console.log(`[VideoCallDialog] ✅ Sent initial offer to ${peerId}`);
            }
          } catch (error) {
            console.error(`[VideoCallDialog] Failed to create peer connection for ${peerId}:`, error);
          }
        }
        pendingPeersRef.current = [];
      }
    } catch (error) {
      console.error("Failed to initialize local media:", error);

      const errorMessage =
        error instanceof Error && error.name === "NotAllowedError"
          ? "Camera/microphone access denied. Please allow access to join the call."
          : "Could not access camera/microphone. You can still share the session code.";

      setMediaError(errorMessage);

      toast({
        title: "Media Access Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Set up WebRTC event handlers for a peer connection
  const setupPeerConnectionHandlers = (pc: RTCPeerConnection, peerId: string) => {
    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log("[VideoCallDialog] 🎵 Received track from", peerId);

      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];

        // Store remote stream
        remoteStreamsRef.current.set(peerId, stream);

        // Use unified manager for audio tracks
        if (event.track.kind === 'audio') {
          bindRemoteTrack(event.track, stream, callType);
        }

        // Video tracks bind to video element
        if (event.track.kind === 'video' && remoteVideoRef.current) {
          console.log("[VideoCallDialog] 🎥 Setting video element srcObject");
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.volume = 1.0;
          remoteVideoRef.current.play().catch((err) => {
            console.error("[VideoCallDialog] ❌ Video play failed:", err);
          });
        }

        // ✅ Dispatch CALL_ACTIVE to FSM when remote media connects
        console.log("[VideoCallDialog] 🎵 Remote track connected - dispatching CALL_ACTIVE");
        callContext.activateCall();

        setIsConnected(true);
        setCallStatus("connected");
        startCallTimer();

        console.log("[VideoCallDialog] ✅ Call Active - audio should be playing");
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const sid = sessionCode || sessionCodeProp || callId || peerId;
        sendSignal({
          type: "ice-candidate",
          sessionId: sid,
          candidate: event.candidate,
          payload: { to: peerId },
        });
        console.log(`Sent ICE candidate to ${peerId}`);
      }
    };

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log("[VideoCallDialog] 🔌 ICE connection state:", pc.iceConnectionState, "for peer:", peerId);

      if (pc.iceConnectionState === "failed") {
        console.error("[VideoCallDialog] ❌ ICE connection failed for peer:", peerId);
      }

      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        console.log("[VideoCallDialog] ✅ ICE connection established!");
        setIsConnected(true);
      }
    };

    // Monitor overall connection state
    pc.onconnectionstatechange = () => {
      console.log("[VideoCallDialog] 🔗 Connection state:", pc.connectionState, "for peer:", peerId);
    };

    // Handle renegotiation with perfect negotiation pattern
    pc.onnegotiationneeded = async () => {
      const state = getPeerNegotiationState(peerId);
      console.log(`[VideoCallDialog] 🔔 onnegotiationneeded for ${peerId}`, {
        callRole,
        signalingState: pc.signalingState,
        makingOffer: state.makingOffer
      });

      // PERFECT NEGOTIATION: Both peers can create offers!
      // This allows both sides to initiate renegotiation
      // Collisions are handled in handleOffer using the polite/impolite peer logic

      // Skip if already making an offer to this peer
      if (state.makingOffer) {
        console.log(`[VideoCallDialog] Skipping - already making offer to ${peerId}`);
        return;
      }

      try {
        state.makingOffer = true;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sid = sessionCode || sessionCodeProp || callId || peerId;
        sendSignal({
          type: "offer",
          sessionId: sid,
          payload: { ...offer, to: peerId },
        });
        console.log(`[VideoCallDialog] ✅ Sent offer to ${peerId} (role=${callRole})`);
      } catch (error) {
        console.error(`[VideoCallDialog] Failed to create offer for ${peerId}:`, error);
      } finally {
        state.makingOffer = false;
      }
    };
  };

  // OLD createPeerConnection function has been REMOVED and replaced with:
  // - createPeerConnectionRequest() from WebRTCContext for creating new connections
  // - getPeerConnection() from WebRTCContext for getting existing connections
  // - setupPeerConnectionHandlers() for attaching event handlers

  // Close peer connection
  const closePeerConnection = (peerId: string) => {
    const pc = getPeerConnection(peerId);
    if (pc) {
      pc.close();
      // Note: WebRTCContext will handle cleanup of the connection from its internal map
    }
    remoteStreamsRef.current.delete(peerId);
    console.log(`Closed connection to ${peerId}`);
  };

  const handleOffer = async (
    offer: RTCSessionDescriptionInit,
    from: string,
  ) => {
    try {
      // PERFECT NEGOTIATION PATTERN
      const polite = callRole === 'callee'; // Callee is polite, caller is impolite
      const state = getPeerNegotiationState(from);
      
      let pc = getPeerConnection(from);

      // If peer connection doesn't exist yet, create it and process the offer
      if (!pc) {
        console.log(`[VideoCallDialog] Peer connection not ready for ${from}, creating and processing offer`);
        
        // Supply pending offer to WebRTCContext for processing after media is ready
        supplyPendingOffer(from, offer);
        
        try {
          // Create peer connection (callee role, no initial offer)
          pc = await createPeerConnectionRequest(from, 'callee', { shouldCreateOffer: false });
          setupPeerConnectionHandlers(pc, from);
          
          // Process the pending offer now that connection is created
          const pendingOffer = flushPendingOffer(from);
          if (pendingOffer) {
            await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            const sid = sessionCode || sessionCodeProp || callId || from;
            sendSignal({
              type: "answer",
              sessionId: sid,
              payload: { ...answer, to: from },
            });
            console.log(`[VideoCallDialog] ✅ Sent answer to ${from} (from pending offer)`);
          }
        } catch (error) {
          console.error(`[VideoCallDialog] Failed to create peer connection for offer from ${from}:`, error);
        }
        return;
      }

      // COLLISION DETECTION
      const offerCollision = (state.makingOffer || pc.signalingState !== 'stable');
      
      console.log(`[WebRTC] Offer from ${from}:`, {
        polite,
        offerCollision,
        signalingState: pc.signalingState,
        makingOffer: state.makingOffer
      });

      // IMPOLITE PEER: Ignore offer during collision
      state.ignoreOffer = !polite && offerCollision;
      if (state.ignoreOffer) {
        console.log(`[WebRTC] ⚠️ Impolite peer (${callRole}) ignoring offer due to collision from ${from}`);
        return;
      }

      // CRITICAL FIX: Ensure remote audio element exists BEFORE setting remote description
      const audioEl = document.getElementById('webrtc-remote-audio') as HTMLAudioElement;
      if (!audioEl) {
        console.error('[WebRTC] ❌ CRITICAL: Remote audio element missing during offer handling!');
        toast({
          title: "Audio Setup Error",
          description: "Audio element not ready. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }

      // HANDLE OFFER (with collision resolution if polite)
      try {
        state.isSettingRemoteAnswerPending = false; // Clear any pending answer flag
        
        if (offerCollision) {
          // POLITE PEER: Rollback local offer and apply remote offer
          console.log(`[WebRTC] 🔄 Polite peer (${callRole}) rolling back local offer to handle incoming offer from ${from}`);
          await Promise.all([
            pc.setLocalDescription({ type: "rollback" }),
            pc.setRemoteDescription(new RTCSessionDescription(offer))
          ]);
        } else {
          // No collision: normal offer processing
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
        }

        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const sid = sessionCode || sessionCodeProp || callId || from;
        sendSignal({
          type: "answer",
          sessionId: sid,
          payload: { ...answer, to: from },
        });
        console.log(`📡 [WebRTC] ✅ Answer sent to ${from} (role=${callRole}, polite=${polite})`);
      } catch (negotiationError) {
        // Handle specific negotiation errors
        console.error(`[WebRTC] Negotiation error with ${from}:`, negotiationError);
        
        // Reset state flags on error
        state.isSettingRemoteAnswerPending = false;
        state.ignoreOffer = false;
      }
    } catch (error) {
      console.error("Failed to handle offer:", error);
      // Only show toast if this is NOT an InvalidStateError (duplicate offer is expected)
      if (error instanceof Error && !error.message.includes('InvalidStateError')) {
        toast({
          title: "Connection Error",
          description: "Failed to establish peer connection",
          variant: "destructive",
          duration: 5000,
        });
      }
    }
  };

  const handleAnswer = async (
    answer: RTCSessionDescriptionInit,
    from: string,
  ) => {
    console.log(`📡 Received answer from: ${from} (role=${callRole})`);

    const state = getPeerNegotiationState(from);
    const pc = getPeerConnection(from);
    
    if (!pc) {
      console.warn(
        `❌ [WebRTC] No peer connection found for ${from}, cannot apply answer`,
      );
      return;
    }

    // PERFECT NEGOTIATION: More flexible answer handling
    try {
      // Mark that we're setting remote answer
      state.isSettingRemoteAnswerPending = true;

      // CRITICAL: Check if we're ignoring offers (collision detected)
      // If we're ignoring offers due to collision, we should also ignore the answer
      if (state.ignoreOffer) {
        console.log(`[WebRTC] ⚠️ Ignoring answer during offer collision from ${from}`);
        state.isSettingRemoteAnswerPending = false;
        return;
      }

      // Apply answer regardless of role in perfect negotiation
      // The signaling state check ensures we're in the right state
      if (pc.signalingState !== 'have-local-offer') {
        console.warn(
          `[WebRTC] ⚠️ Received answer in unexpected state: ${pc.signalingState} from ${from}`,
          `This might indicate a race condition or late answer`
        );
        
        // Don't apply the answer if not in correct state
        state.isSettingRemoteAnswerPending = false;
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`✅ Remote description set. Call should now have audio.`);
      console.log(`📡 [WebRTC] ✅ Applied SDP answer from ${from} (role=${callRole}, state=${pc.signalingState})`);
    } catch (error) {
      console.error(
        `[WebRTC] ❌ Failed to set remote answer description from ${from}:`,
        error
      );
    } finally {
      // Always reset the pending flag
      state.isSettingRemoteAnswerPending = false;
      state.ignoreOffer = false; // Clear ignore flag after processing answer
    }
  };

  const handleIceCandidate = async (
    candidate: RTCIceCandidateInit,
    from: string,
  ) => {
    const pc = getPeerConnection(from);
    if (!pc) {
      console.warn(`No peer connection for ${from}, ignoring ICE candidate`);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(`Added ICE candidate from ${from}`);
    } catch (error) {
      console.error(`Failed to add ICE candidate from ${from}:`, error);
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    // If we have a local stream with audio, apply the mute state to the track
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !newMutedState;
        console.log(`[Audio] Microphone ${newMutedState ? 'muted' : 'unmuted'}`);
      } else {
        console.log(`[Audio] No audio track available, UI state updated to ${newMutedState ? 'muted' : 'unmuted'}`);
      }
    } else {
      console.log(`[Audio] No local stream, UI state updated to ${newMutedState ? 'muted' : 'unmuted'}`);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const toggleSpeaker = async () => {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);
    
    // Get the remote audio element (not video element!)
    const audioEl = document.getElementById('webrtc-remote-audio') as HTMLAudioElement;
    
    if (audioEl) {
      // On mobile, try to switch audio output device
      if ('setSinkId' in audioEl && typeof (audioEl as any).setSinkId === 'function') {
        try {
          if (newSpeakerState) {
            // Route to speaker (empty string = default/speaker)
            await (audioEl as any).setSinkId('');
            console.log('[SPEAKER] Routed audio to speakerphone');
          } else {
            // Try to route to earpiece (not all browsers support this)
            // Some browsers may not have earpiece option
            const devices = await navigator.mediaDevices.enumerateDevices();
            const earpiece = devices.find(d => 
              d.kind === 'audiooutput' && 
              (d.label.toLowerCase().includes('earpiece') || 
               d.label.toLowerCase().includes('receiver'))
            );
            
            if (earpiece) {
              await (audioEl as any).setSinkId(earpiece.deviceId);
              console.log('[SPEAKER] Routed audio to earpiece');
            } else {
              // Fallback: just lower volume for "earpiece" mode
              audioEl.volume = newSpeakerState ? 1.0 : 0.3;
              console.log('[SPEAKER] No earpiece found, adjusted volume instead');
            }
          }
        } catch (err) {
          console.warn('[SPEAKER] Could not switch audio output:', err);
          // Fallback to volume control
          audioEl.volume = newSpeakerState ? 1.0 : 0.3;
        }
      } else {
        // Fallback for browsers without setSinkId: adjust volume
        audioEl.volume = newSpeakerState ? 1.0 : 0.3;
        console.log('[SPEAKER] setSinkId not supported, using volume control');
      }
      
      // Always ensure audio is not muted
      audioEl.muted = false;
    }
    
    // Also handle video element if it exists (for video calls)
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false; // Never mute, just control routing
      remoteVideoRef.current.volume = newSpeakerState ? 1.0 : 0.3;
    }
  };

  // Flip camera (switch between front and back camera for mobile)
  const flipCamera = async () => {
    if (callType !== "video" || !localStreamRef.current) return;

    try {
      const newFacingMode = facingMode === "user" ? "environment" : "user";

      // Stop current video track
      const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (currentVideoTrack) {
        currentVideoTrack.stop();
        localStreamRef.current.removeTrack(currentVideoTrack);
      }

      // Get new video stream with flipped camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // CRITICAL: Respect current video on/off state for privacy
      newVideoTrack.enabled = !isVideoOff;

      // Add new track to local stream
      localStreamRef.current.addTrack(newVideoTrack);

      // Update local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      // Replace video track in all peer connections
      // Always replace with the new track; privacy is controlled via enabled state
      // NOTE: We track connected peers via remoteStreamsRef
      remoteStreamsRef.current.forEach((_, peerId) => {
        const pc = getPeerConnection(peerId);
        if (pc) {
          const senders = pc.getSenders();
          const videoSender = senders.find(
            (sender) => sender.track?.kind === "video",
          );
          if (videoSender && newVideoTrack) {
            videoSender.replaceTrack(newVideoTrack);
          }
        }
      });

      setFacingMode(newFacingMode);
      console.log(`[VideoCallDialog] Camera flipped to ${newFacingMode}`);

      toast({
        title: newFacingMode === "user" ? "Front Camera" : "Back Camera",
        duration: 1500,
      });
    } catch (error) {
      console.error("Failed to flip camera:", error);
      toast({
        title: "Camera Flip Failed",
        description: "Could not switch camera",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Handle double-tap on video to flip camera
  const handleVideoTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      // Double-tap within 300ms
      flipCamera();
    }

    lastTapRef.current = now;
  };

  const toggleMinimize = async () => {
    if (
      !isMinimized &&
      callType === "video" &&
      remoteVideoRef.current &&
      document.pictureInPictureEnabled
    ) {
      try {
        await remoteVideoRef.current.requestPictureInPicture();
        setIsMinimized(true);
      } catch (error) {
        console.error("Failed to enter PiP:", error);
        setIsMinimized(!isMinimized);
      }
    } else if (isMinimized && document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
        setIsMinimized(false);
      } catch (error) {
        console.error("Failed to exit PiP:", error);
        setIsMinimized(!isMinimized);
      }
    } else {
      setIsMinimized(!isMinimized);
    }
  };

  // Wire up the mini video preview when minimized or when remote stream becomes available
  useEffect(() => {
    if (isMinimized && pipVideoRef.current && remoteVideoRef.current) {
      const remoteStream = remoteVideoRef.current.srcObject;
      if (remoteStream && pipVideoRef.current.srcObject !== remoteStream) {
        pipVideoRef.current.srcObject = remoteStream;
        console.log(
          "[VideoCallDialog] Wired mini video preview to remote stream",
        );
      }
    }
  }, [isMinimized, isConnected]);

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      if (!localStreamRef.current) return;

      const stream = localStreamRef.current;
      const options = { mimeType: "video/webm;codecs=vp9" };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = "video/webm";
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });

        // Download locally
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `call-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        // Save to backend
        try {
          const formData = new FormData();
          formData.append("file", blob, `recording-${Date.now()}.webm`);
          const sessionId = recipientId || callerId || "";
          formData.append(
            "sessionCode",
            `call-${user?.id}-${sessionId}-${Date.now()}`,
          );
          formData.append("recordingType", isVideoOff ? "audio" : "video");
          formData.append("duration", callDuration.toString());

          await fetch("/api/call-recordings", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          toast({
            title: "Recording Saved",
            description: "Your call recording has been saved and downloaded",
            duration: 3000,
          });
        } catch (error) {
          console.error("Failed to save recording:", error);
          toast({
            title: "Recording Downloaded",
            description:
              "Recording saved locally but failed to upload to cloud",
            duration: 4000,
          });
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: "Call is being recorded",
        duration: 4000,
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast({
        title: "Recording Failed",
        description: "Could not start call recording",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const copySessionCode = async () => {
    if (!sessionCode) return;

    try {
      await navigator.clipboard.writeText(sessionCode);
      setCodeCopied(true);
      toast({
        title: "Session Code Copied!",
        description: `Share code ${sessionCode} with others to join this call`,
        duration: 3000,
      });
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
      toast({
        title: "Copy Failed",
        description: "Could not copy session code to clipboard",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const copyShareableLink = async () => {
    if (!sessionCode) return;

    const shareableUrl = `${window.location.origin}/join/${sessionCode}`;

    try {
      await navigator.clipboard.writeText(shareableUrl);
      toast({
        title: "Link Copied!",
        description: "Share this link with others to join the call",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast({
        title: "Copy Failed",
        description: "Could not copy link to clipboard",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const shareViaSystem = async () => {
    if (!sessionCode) return;

    const shareableUrl = `${window.location.origin}/join/${sessionCode}`;
    const shareData = {
      title: "Join my PeacePad call",
      text: `Join my ${callType} call on PeacePad. Session code: ${sessionCode}`,
      url: shareableUrl,
    };

    try {
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare(shareData)
      ) {
        await navigator.share(shareData);
        toast({
          title: "Shared Successfully!",
          description: "Invitation sent",
          duration: 3000,
        });
      } else {
        // Fallback to copying link
        await copyShareableLink();
      }
    } catch (error) {
      // User cancelled or share failed
      if ((error as Error).name !== "AbortError") {
        console.error("Failed to share:", error);
      }
    }
  };

  // End call handler - supports both local (user-initiated) and remote (peer-initiated) ends
  // isRemoteEnd: true = responding to "call-ended" from remote peer, false = user clicked "End Call"
  const endCall = async (isRemoteEnd: boolean = false) => {
    console.log("[VideoCallDialog] endCall called", { isRemoteEnd, alreadyInProgress: endCallInProgressRef.current });

    // CRITICAL: Prevent duplicate execution - only allow one endCall() to run
    if (endCallInProgressRef.current) {
      console.log("[VideoCallDialog] ⏭️ Skipping duplicate endCall() - already in progress");
      return;
    }
    endCallInProgressRef.current = true;

    // ACCESSIBILITY FIX: Blur any focused element before closing dialog
    // This prevents aria-hidden warnings when the dialog closes with focus still inside
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur) {
      activeElement.blur();
    }

    // CRITICAL: Set cleanup flag IMMEDIATELY to block race conditions
    shouldCleanupRef.current = true;
    setCallStatus("ending"); // Set to "ending" first to disable buttons immediately

    if (isRecording) {
      stopRecording();
    }

    // Generate session summary if AI listening was active
    if (moodTrackerRef.current) {
      try {
        moodTrackerRef.current
          .generateSummary()
          .then((summary) => {
            setSessionSummary(summary);
            toast({
              title: "Session Summary",
              description: summary,
              duration: 8000,
            });
          })
          .catch((error) => {
            console.error("Failed to generate session summary:", error);
          });
      } catch (error) {
        console.error("Failed to generate session summary:", error);
      }
    }

    // CENTRALIZED: Use CallContext to handle API call (prevents duplicate 400 errors)
    // CallContext ensures only the initiator calls the API, not both parties
    await callContext.endCall(isRemoteEnd ? "remote hang-up" : "user hang-up", {
      isRemoteEnd,
      callId: callId || undefined,
      skipApi: false
    });

    // Send WebSocket "call-end" signal to notify session peers (for multi-user calls)
    // This is separate from the backend API call
    const code = sessionCode || sessionCodeProp;
    if (code && !isRemoteEnd) {
      try {
        console.log("[VideoCallDialog] Sending call-end signal to session:", code);
        sendSignal({
          type: "call-end",
          sessionId: code, // CRITICAL: Use sessionId (not sessionCode) to match interface
        });
      } catch (error) {
        console.error("[VideoCallDialog] Failed to send call-end signal:", error);
      }
    }

    // Now cleanup media/peer connections
    // Note: FSM action already dispatched via centralized endCall above
    cleanup();
    setCallStatus("ended"); // Final status after cleanup
    onClose();
    
    // Reset the guard for next call (immediate reset after cleanup completes)
    // Note: setTimeout ensures state updates finish before resetting
    setTimeout(() => {
      endCallInProgressRef.current = false;
      console.log("[VideoCallDialog] ✅ End call guard reset - ready for next call");
    }, 500);
  };

  // ✅ WhatsApp-Style Accept Handler - Single gesture flow
  const handleCallAccepted = useCallback(async () => {
    try {
      console.log("✅ [CALL] Accept clicked");

      // 1️⃣ Stop ringtone immediately (gesture-safe for iOS)
      stopRingtone();

      // 2️⃣ Transition to connecting state - CRITICAL: Must happen immediately to dismiss incoming notification
      setCallStatus("connecting");
      
      // Force a re-render to ensure incoming notification is dismissed
      console.log("[CALL] Status transitioned from incoming to connecting");

      // 3️⃣ Get session code FIRST (before media) so we can join regardless of media permission
      let incomingSessionCode =
        callContext?.call?.sessionCode || sessionCodeProp || null;

      if (!incomingSessionCode) {
        throw new Error("No session code available for incoming call");
      }

      // 4️⃣ Try to get media permissions (non-fatal - call continues even if denied)
      console.log("📱 [CALL] Requesting media permissions for incoming call");
      const constraints = { audio: true, video: callType === "video" };
      let mediaPermissionDenied = false;
      let permissionError: Error | null = null;

      try {
        const stream = await ensureMediaReady(constraints);
        localStreamRef.current = stream;

        // Set initial track states
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = initialMicEnabled;
          console.log("[CALL] Audio track enabled:", audioTrack.enabled);
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = initialCameraEnabled;
          console.log("[CALL] Video track enabled:", videoTrack.enabled);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setIsMediaReady(true);
        console.log(
          "✅ [CALL] Media ready with",
          stream.getTracks().length,
          "tracks",
        );
      } catch (mediaErr) {
        console.warn("⚠️ [CALL] Media permission error (non-fatal, continuing with call):", mediaErr);
        mediaPermissionDenied = true;
        permissionError = mediaErr instanceof Error ? mediaErr : new Error(String(mediaErr));

        // Show user-friendly message based on error type
        const errorName = permissionError.name;
        let userMessage = "Microphone access denied";

        if (errorName === "NotAllowedError") {
          userMessage = "Please allow microphone access in your device settings to be heard";
        } else if (errorName === "NotFoundError") {
          userMessage = "No microphone found on this device";
        } else if (errorName === "NotReadableError") {
          userMessage = "Microphone is being used by another app";
        }

        setAcceptError({
          message: userMessage,
          canRetry: true,
          technicalDetails: `${errorName}: ${permissionError.message}`,
        });
      }

      // 5️⃣ Join WebRTC session - CRITICAL: Do this even if media failed
      console.log(
        `🔗 [CALL] RECEIVER: Joining WebRTC session: ${incomingSessionCode} (currentSessionId: ${currentSessionId}, callRole: ${callRole}, mediaReady: ${!mediaPermissionDenied})`,
      );
      
      // Use V2 engine for incoming calls
      if (v2CallEngine) {
        console.log('[V2] Accepting incoming call via V2 engine');
        
        // CRITICAL FIX: Check CallContext as primary source (always reliable), not v2State (async update)
        // V2 state might still be updating, but CallContext always has the data available immediately
        const hasCallDataInContext = !!callContext.call?.callId && !!callContext.call?.sessionCode;
        const hasCallDataInV2State = !!v2State?.currentCallId && !!v2State?.sessionCode;
        
        if (!hasCallDataInContext && !hasCallDataInV2State) {
          console.error('[V2] ❌ CRITICAL: No call data available in either CallContext or V2 state!');
          throw new Error('Missing call data - cannot accept call');
        }
        
        // Re-inject only if V2 state is missing but CallContext has it (state update race condition)
        if (!hasCallDataInV2State && hasCallDataInContext) {
          console.warn('[V2] ⚠️ V2 state is empty but CallContext has data - re-injecting...');
          console.warn('[V2] Current V2 state:', v2State);
          
          // Re-inject call data if we have it in CallContext
          if (callContext.call?.callId && callContext.call?.sessionCode && v2Actions.processMessage) {
            console.log('[V2] 🔥 EMERGENCY RE-INJECTION: Processing incoming-call before answer');
            v2Actions.processMessage({
              type: 'incoming-call',
              payload: {
                callId: callContext.call.callId,
                sessionCode: callContext.call.sessionCode,
                callerId: callContext.call.callerId,
                callerName: callContext.call.callerName,
                callType: callContext.call.callType
              },
              sequence: Date.now()
            });
            console.log('[V2] ✅ Emergency re-injection complete');
            
            // Give state a moment to update
            await new Promise(resolve => setTimeout(resolve, 50));
          } else {
            console.error('[V2] ❌ CRITICAL: Cannot re-inject - missing call data in CallContext!', {
              hasCallId: !!callContext.call?.callId,
              hasSessionCode: !!callContext.call?.sessionCode,
              hasProcessMessage: !!v2Actions.processMessage
            });
          }
        }
        
        // CRITICAL: Make sure adapter is ready before answering (check REF not state - refs update immediately!)
        if (!wsAdapterRef.current) {
          console.error('[V2] ❌ WebSocket adapter not ready! Waiting for adapter...');
          // The adapter should be created soon by the useEffect, so we'll rely on that
          // For now, store the intent to answer in a ref so we can process it when adapter is ready
          setTimeout(() => {
            if (wsAdapterRef.current) {
              console.log('[V2] ✅ Adapter now ready, answering call');
              v2Actions.answerCall({
                hasVideo: callType === 'video' && !mediaPermissionDenied
              });
            } else {
              console.error('[V2] ❌ Adapter still not ready after delay!');
            }
          }, 100);
          return;
        }
        
        // V2 engine handles session joining internally
        v2Actions.answerCall({
          hasVideo: callType === 'video' && !mediaPermissionDenied
        });
        console.log(
          "✅ [V2] RECEIVER: Call accepted via V2 engine, ready for connection",
        );
      } else {
        // Legacy path: Join session directly
        await joinSession(incomingSessionCode);
        console.log(
          "✅ [CALL] RECEIVER: Successfully joined WebRTC session, ready to receive offers from caller",
        );
        console.log(`[CALL] RECEIVER: My userId: ${user?.id}, waiting for offer from caller`);
      }

      // 6️⃣ Send accept to backend (notify caller)
      if (callId) {
        console.log(`📡 [CALL] Sending accept to backend for call ${callId}`);
        const response = await fetch(`/api/calls/${callId}/accept`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`API failed: ${response.status}`);
        }

        const result = await response.json();
        console.log("📡 [CALL] Accept API result:", result);
      }

      // 7️⃣ Update FSM
      callContext.acceptCall();

      // 8️⃣ UI will transition to "connected" automatically when remote track arrives (ontrack handler)
      // Don't set "connected" here - let the peer connection establish first
      console.log(
        "✅ [CALL] Call acceptance flow complete, waiting for peer connection...",
      );

      // If media permission was denied, show persistent reminder
      if (mediaPermissionDenied) {
        console.warn("⚠️ [CALL] Call accepted but microphone access denied - user won't be heard");
      } else {
        // Clear any previous media errors if permissions were granted
        setMediaError(null);
      }
    } catch (err) {
      console.error("❌ [CALL] Accept failed:", err);

      // Detailed error logging to track what's failing
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;

      console.error("[CALL ERROR] Full error details:", {
        message: errorMessage,
        stack: errorStack,
        callId,
        sessionCode: sessionCode || sessionCodeProp,
        retryCount: retryCountRef.current,
        hasLocalStream: !!localStreamRef.current,
        currentSessionId,
      });

      // Determine if error is retryable
      const isRetryable =
        errorMessage.includes("network") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("NotReadableError") || // Camera/mic in use
        errorMessage.includes("AbortError") || // Media permission dialog closed
        (errorMessage.includes("API failed") && !errorMessage.includes("404")); // Server errors but not NotFound

      const canRetry = isRetryable && retryCountRef.current < MAX_RETRIES;

      // Show error in UI instead of closing dialog
      setAcceptError({
        message: canRetry
          ? `Connection failed: ${errorMessage}. You can try again.`
          : `Could not connect: ${errorMessage}`,
        canRetry,
        technicalDetails: errorStack,
      });

      // Stop ringtone (but keep dialog open)
      stopRingtone();

      // Cleanup local stream if we got it
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      // Only close dialog and decline call if this is NOT retryable
      if (!canRetry) {
        console.error("[CALL ERROR] Non-retryable error, declining call");
        callContext.declineCall();

        toast({
          title: "Call Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });

        // Give user 2 seconds to see the error before closing
        setTimeout(() => {
          onClose();
          setCallStatus("ended");
        }, 2000);
      } else {
        console.warn(`[CALL ERROR] Retryable error (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`);
        retryCountRef.current++;
      }
    }
  }, [
    callId,
    callType,
    callContext,
    toast,
    onClose,
    setCallStatus,
    ensureMediaReady,
    joinSession,
    currentSessionId,
    initialMicEnabled,
    initialCameraEnabled,
  ]);

  // CRITICAL FIX: Assign ref synchronously during render to avoid timing bugs
  // Previously used useEffect which ran after paint, causing null ref on quick clicks
  handleCallAcceptedRef.current = handleCallAccepted;

  // CRITICAL FIX: Call handleCallAccepted directly to avoid null ref timing bug
  // Previous ref pattern failed because useEffect runs after paint, so ref was null on quick clicks
  const handleAcceptClick = useCallback(() => {
    console.log("[CALL FLOW] Accept button clicked");

    // ACCESSIBILITY FIX: Blur focus from Accept button before state changes
    // This prevents aria-hidden warnings when the dialog transitions
    if (acceptButtonRef.current) {
      acceptButtonRef.current.blur();
    }
    
    // Also blur any active element as a fallback
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur) {
      activeElement.blur();
    }

    // Safety check: Ensure handler is initialized before calling
    if (typeof handleCallAccepted !== "function") {
      console.error("[CALL ERROR] handleCallAccepted not initialized yet");
      return;
    }

    console.log(
      "[VideoCallDialog] Accept button clicked - calling handler directly",
    );
    handleCallAccepted();
  }, [handleCallAccepted]);

  // Retry handler for failed call acceptance
  const handleRetryAccept = useCallback(() => {
    console.log("[CALL] Retrying call acceptance...");

    // Clear error state
    setAcceptError(null);

    // Reset status back to incoming
    setCallStatus("incoming");

    // Retry the acceptance
    handleCallAccepted();
  }, [handleCallAccepted]);

  const handleCallDeclined = useCallback(async () => {
    // ACCESSIBILITY FIX: Blur any focused element before closing dialog
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur) {
      activeElement.blur();
    }

    // For direct 1:1 calls, decline via REST API which notifies caller
    if (isIncoming && callId) {
      try {
        console.log(`[VideoCallDialog] Declining call via API: ${callId}`);
        await fetch(`/api/calls/${callId}/decline`, {
          method: "PATCH",
          credentials: "include",
        });
        console.log(
          `[VideoCallDialog] Call declined - backend will notify caller`,
        );
      } catch (error) {
        console.error(
          `[VideoCallDialog] Failed to decline call via API:`,
          error,
        );
      }
    }

    // CRITICAL: Dispatch FSM action BEFORE cleanup (stops ringtone via FSM)
    callContext.declineCall();

    // Now cleanup media/peer connections
    shouldCleanupRef.current = true;
    cleanup();
    onClose();
    setCallStatus("ended");
  }, [isIncoming, callId, onClose, cleanup, callContext]);

  // Initialize media for incoming calls (before showing dialog)
  // This code was incorrectly placed outside useEffect - removed as media init
  // is now properly handled in the handleCallAccepted function

  // Track if we've initiated WebRTC setup
  const setupInitiatedRef = useRef(false);

  // Start WebRTC setup immediately after joining session
  useEffect(() => {
    if (!isOpen || !sessionCode || setupInitiatedRef.current) return;

    // Wait a bit for both users to join the session
    const setupTimer = setTimeout(async () => {
      console.log('[VideoCallDialog] Initiating WebRTC setup after session join');
      setupInitiatedRef.current = true;

      try {
        // Get media first
        const stream = await ensureMediaReady({
          audio: true,
          video: callType === 'video'
        });

        // Caller creates offer
        if (!isIncoming) {
          console.log('[VideoCallDialog] 🎤 CALLER: Creating WebRTC offer');
          await setupWebRTC();
        } else {
          console.log('[VideoCallDialog] 🎧 CALLEE: Waiting for offer from caller');
        }
      } catch (error) {
        console.error('[VideoCallDialog] WebRTC setup failed:', error);
        toast({
          title: "Connection Error",
          description: "Failed to set up audio/video connection",
          variant: "destructive"
        });
      }
    }, 1000); // 1 second delay to ensure both users are in session

    return () => {
      clearTimeout(setupTimer);
      setupInitiatedRef.current = false;
    };
  }, [isOpen, sessionCode, isIncoming, callType, ensureMediaReady, toast]);

  // Make setupWebRTC function async and ensure it waits for media
  const setupWebRTC = useCallback(async () => {
    if (!sessionCode) {
      console.error('[VideoCallDialog] Cannot setup WebRTC: missing sessionCode');
      return;
    }

    console.log('[VideoCallDialog] Setting up WebRTC connection for session:', sessionCode);

    // Create peer connection with recipient
    // CRITICAL: Caller creates offer (shouldOffer = true)
    // Wait for session-users message to arrive (handled by WebRTC signal listener)
    // The listener will create peer connections when it receives session-users or peer-joined
    // This logic was moved to the WebRTC signal listener for correct handling of multiple peers and race conditions.
    // The caller's responsibility is now to ensure media is ready and then wait for the signal listener to create the peer connection.

    console.log('[VideoCallDialog] Waiting for WebRTC signal listener to create peer connection...');

    // No explicit peerId here, as the listener handles it based on session-users or peer-joined events.
    // If this was a direct 1:1 call without a session, createPeerConnection would be called directly with recipientId.
  }, [sessionCode]); // Removed dependencies that were causing issues

  return (
    <>
      {/* Floating Minimized Widget */}
      {isMinimized &&
        isOpen &&
        (callStatus === "connected" || callStatus === "calling") && (
          <div
            className="fixed bottom-4 right-4 z-50 bg-card border-primary/30 rounded-lg shadow-2xl w-80 sm:w-96"
            data-testid="floating-call-widget"
          >
            {/* Widget Header */}
            <div className="p-3 border-b flex items-center justify-between gap-2 bg-primary/5">
              <div className="flex items-center gap-2">
                {callStatus === "connected" && (
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
                {callStatus === "calling" && (
                  <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                )}
                <span className="text-sm font-medium">
                  {callStatus === "connected" ? "On Call" : "Calling..."}
                </span>
                <span className="text-sm font-mono text-muted-foreground">
                  {formatDuration(callDuration)}
                </span>
                {/* Connection Quality in minimized view */}
                {callStatus === "connected" && v2State.connectionStats && (
                  <ConnectionIndicator 
                    stats={v2State.connectionStats} 
                    size="sm"
                  />
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMinimize}
                aria-label="Maximize call window"
                data-testid="button-maximize-call"
                className="h-6 w-6"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Mini Video Preview */}
            {callType === "video" && (
              <div className="relative h-48 bg-muted">
                <video
                  ref={pipVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Mini Controls */}
            <div className="p-3 flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant={isMuted ? "destructive" : "secondary"}
                onClick={toggleMute}
                data-testid="button-mini-toggle-mute"
                className="gap-1"
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>

              {callType === "video" && (
                <Button
                  size="sm"
                  variant={isVideoOff ? "destructive" : "secondary"}
                  onClick={toggleVideo}
                  data-testid="button-mini-toggle-video"
                  className="gap-1"
                >
                  {isVideoOff ? (
                    <VideoOff className="h-4 w-4" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                </Button>
              )}

              <Button
                size="sm"
                variant="destructive"
                onClick={() => endCall(false)}
                data-testid="button-mini-end-call"
                className="gap-1"
              >
                <PhoneOff className="h-4 w-4" />
                End
              </Button>
            </div>
          </div>
        )}

      <Dialog
        open={isOpen && !isMinimized}
        onOpenChange={(open) => {
          // During active calls, clicking X minimizes instead of closing
          if (
            !open &&
            (callStatus === "connected" || callStatus === "calling")
          ) {
            setIsMinimized(true);
          } else if (!open) {
            // Only allow closing if call hasn't started yet
            onClose();
          }
        }}
      >
        <DialogContent
          className="max-w-4xl w-[95vw] sm:w-auto bg-gradient-to-br from-slate-950/95 via-purple-950/90 to-slate-900/95 backdrop-blur-xl border-primary/30 text-white grid grid-rows-[auto_1fr_auto]"
          data-testid="dialog-video-call"
          style={{
            height:
              "min(calc(var(--app-viewport-height, 100vh) - 2rem), 600px)",
            maxHeight: "calc(var(--app-viewport-height, 100vh) - 2rem)",
          }}
        >
          <DialogHeader className="shrink-0 p-4 sm:p-6">
            <DialogTitle className="flex items-center justify-between gap-2 sm:gap-4 min-h-[2.5rem]">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                {/* Connection Status Indicator - UNIFIED for all call types */}
                {callStatus === "connected" && (
                  <Badge
                    variant="outline"
                    className="gap-1 sm:gap-2 bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 shrink-0"
                    data-testid="badge-call-connected"
                  >
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs sm:text-sm">Connected</span>
                  </Badge>
                )}
                {(callStatus === "calling" || callStatus === "connecting") && (
                  <Badge
                    variant="outline"
                    className="gap-1 sm:gap-2 bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 shrink-0"
                    data-testid="badge-call-connecting"
                  >
                    <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="text-xs sm:text-sm">
                      {callStatus === "connecting" ? "Connecting..." : "Calling..."}
                    </span>
                  </Badge>
                )}
                {callStatus === "incoming" && (
                  <Badge
                    variant="outline"
                    className="gap-1 sm:gap-2 bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 shrink-0"
                    data-testid="badge-call-incoming"
                  >
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs sm:text-sm">Incoming Call</span>
                  </Badge>
                )}

                {/* Call Timer - ALWAYS visible when connected */}
                {callStatus === "connected" && (
                  <span
                    className="text-sm sm:text-base font-mono text-foreground shrink-0"
                    data-testid="text-call-duration"
                  >
                    {formatDuration(callDuration)}
                  </span>
                )}
                
                {/* Connection Quality Indicator */}
                {callStatus === "connected" && v2State.connectionStats && (
                  <ConnectionIndicator 
                    stats={v2State.connectionStats} 
                    size="sm"
                    className="shrink-0"
                  />
                )}
              </div>

              {/* Minimize Button */}
              {(callStatus === "connected" || callStatus === "calling") && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMinimize}
                  aria-label={isMinimized ? "Maximize call window" : "Minimize call window"}
                  data-testid="button-toggle-minimize"
                  className="shrink-0 h-9 w-9"
                >
                  {isMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {callStatus === "connected"
                ? "Active video call session"
                : callStatus === "incoming"
                  ? "Incoming call - choose to accept or decline"
                  : callStatus === "calling"
                    ? "Initiating video call connection"
                    : "Call session"}
            </DialogDescription>

            {/* Media Error Display - ALWAYS show when there's an error, regardless of call type */}
            {mediaError && callStatus !== "connected" && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                <svg
                  className="h-5 w-5 text-destructive mt-0.5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive mb-1">
                    Media Access Error
                  </p>
                  <p className="text-xs text-destructive/80">
                    {mediaError}
                  </p>
                </div>
              </div>
            )}

            {/* Session Code Display - Only for multi-user join sessions, NOT for direct 1:1 partner calls */}
            {sessionCode && sessionCodeProp && !callId && (callStatus === "calling" || callStatus === "incoming") && (
              <div className="mt-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-xs text-muted-foreground mb-3">
                  Share to invite others to this call:
                </p>

                {/* Session Code */}
                <div className="mb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground mb-1">
                        Session Code:
                      </p>
                      <span
                        className="text-2xl font-mono font-bold text-primary tracking-widest"
                        data-testid="text-session-code"
                      >
                        {sessionCode}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copySessionCode}
                      data-testid="button-copy-session-code"
                      className="gap-2"
                    >
                      {codeCopied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Code
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Shareable Link */}
                <div className="pt-3 border-t border-primary/20">
                  <p className="text-xs font-medium text-foreground mb-1">
                    Or share this link:
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div
                      className="flex-1 px-3 py-2 bg-background/50 rounded border border-border text-sm font-mono text-muted-foreground overflow-hidden"
                      data-testid="text-shareable-link"
                    >
                      <span className="hidden sm:inline">
                        {window.location.origin}/join/
                      </span>
                      <span className="sm:hidden">peacepad.com/join/</span>
                      <span className="font-bold text-primary">
                        {sessionCode}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={shareViaSystem}
                        data-testid="button-share"
                        className="gap-2 flex-1 sm:flex-none"
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyShareableLink}
                        data-testid="button-copy-link"
                        className="gap-2 flex-1 sm:flex-none"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Audio-only calls use ensureRemoteAudio (no element needed here) */}

          <div className="overflow-y-auto p-4 relative">
            {/* UNIFIED layout - same structure for video and audio calls */}
            {callType === "video" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className="relative bg-muted rounded-lg overflow-hidden"
                  data-testid="video-remote"
                >
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!isConnected && callStatus !== "incoming" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-muted-foreground">
                        Waiting for connection...
                      </p>
                    </div>
                  )}
                  {callStatus === "incoming" && !isMediaReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-muted-foreground">Incoming call...</p>
                    </div>
                  )}
                </div>

                <div
                  className="relative bg-muted rounded-lg overflow-hidden"
                  data-testid="video-local"
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    onClick={handleVideoTap}
                    className={`w-full h-full object-cover ${isVideoOff ? "opacity-0" : "opacity-100"} cursor-pointer`}
                  />
                  {isVideoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <VideoOff className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}

                  {/* AI Listening Mood Ring */}
                  {aiListeningEnabled && remoteAiConsent && (
                    <div className="absolute bottom-3 left-3">
                      <MoodRing
                        emotion={currentMood}
                        confidence={moodConfidence}
                        isActive={true}
                        showLabel={false}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Audio call layout - UNIFIED grid structure matching video */
              <div className="max-w-2xl mx-auto">
                <div className="bg-muted rounded-lg p-8" data-testid="audio-call-container">
                  <div className="flex flex-col items-center justify-center gap-6">
                    {/* Partner Avatar/Icon */}
                    <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="w-16 h-16 text-primary" />
                    </div>

                    {/* Call Status - matches video call status positioning */}
                    <div className="text-center">
                      {callStatus === "incoming" && (
                        <p className="text-lg font-medium">Incoming audio call...</p>
                      )}
                      {(callStatus === "calling" || callStatus === "connecting") && (
                        <p className="text-lg font-medium">
                          {callStatus === "connecting" ? "Connecting..." : "Calling..."}
                        </p>
                      )}
                      {callStatus === "connected" && (
                        <p className="text-lg font-medium text-primary">Audio Call Active</p>
                      )}
                    </div>

                    {/* Audio visualizer - only when connected */}
                    {callStatus === "connected" && (
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-primary rounded-full animate-pulse"
                            style={{
                              height: `${Math.random() * 20 + 10}px`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* AI Listening Mood Ring - consistent with video placement */}
                    {aiListeningEnabled && remoteAiConsent && callStatus === "connected" && (
                      <div className="mt-4">
                        <MoodRing
                          emotion={currentMood}
                          confidence={moodConfidence}
                          isActive={true}
                          showLabel={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Call Controls - UNIFIED layout for all call states */}
          <div
            className="shrink-0 flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-6 px-4 lg:pb-8 bg-gradient-to-t from-black/40 to-black/20 backdrop-blur-md border-t border-white/10"
            style={{
              paddingBottom: isMobileViewport
                ? `calc(4rem + max(env(safe-area-inset-bottom, 0px), 1rem))` // Mobile: Bottom nav (4rem/64px) + safe-area
                : undefined, // Desktop uses lg:pb-8 from className
            }}
          >
            {/* Error Display - Shows instead of buttons when there's an accept error */}
            {acceptError && (
              <div className="w-full max-w-md mx-auto mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <PhoneOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-destructive">
                        Connection Failed
                      </p>
                      <p className="text-xs text-destructive/80">
                        {acceptError.message}
                      </p>
                      {acceptError.technicalDetails && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Technical details
                          </summary>
                          <pre className="text-xs mt-1 p-2 bg-black/20 rounded overflow-x-auto">
                            {acceptError.technicalDetails}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCallDeclined}
                      data-testid="button-decline-after-error"
                    >
                      Cancel
                    </Button>
                    {acceptError.canRetry && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleRetryAccept}
                        data-testid="button-retry-accept"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Try Again
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Accept/Decline buttons - only show for manual acceptance (not during auto-answer "connecting") */}
            {callStatus === "incoming" && !acceptError && (
              <>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleCallDeclined}
                  data-testid="button-decline-call"
                  className="gap-2 min-w-[140px] shadow-lg"
                >
                  <PhoneOff className="h-5 w-5" />
                  <span>Decline</span>
                </Button>
                <Button
                  ref={acceptButtonRef}
                  size="lg"
                  variant="default"
                  onClick={handleAcceptClick}
                  data-testid="button-accept-call"
                  className="gap-2 min-w-[140px] shadow-lg bg-green-600 hover:bg-green-700"
                >
                  <Phone className="h-5 w-5" />
                  <span>Accept</span>
                </Button>
              </>
            )}

            {callStatus !== "incoming" && (
              <>
                {/* Video Camera Toggle (video calls only) - only show when not minimized */}
                {callType === "video" && !isMinimized && (
                  <Button
                    size="lg"
                    variant={isVideoOff ? "destructive" : "secondary"}
                    onClick={toggleVideo}
                    data-testid="button-toggle-video"
                    className="gap-3 min-w-[150px] shadow-lg bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    {isVideoOff ? (
                      <VideoOff className="h-6 w-6" />
                    ) : (
                      <Video className="h-6 w-6" />
                    )}
                    <span className="font-semibold">
                      {isVideoOff ? "Camera Off" : "Camera On"}
                    </span>
                  </Button>
                )}

                {/* Mute/Unmute Button - ALWAYS VISIBLE regardless of minimize state */}
                <Button
                  size="lg"
                  variant={isMuted ? "destructive" : "secondary"}
                  onClick={toggleMute}
                  data-testid="button-toggle-mute"
                  className={`gap-3 min-w-[150px] shadow-lg transition-all ${
                    isMuted
                      ? "bg-red-600 hover:bg-red-700 text-white border-red-500 ring-2 ring-red-400"
                      : "bg-green-600 hover:bg-green-700 text-white border-green-500"
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                  <span className="font-semibold">
                    {isMuted ? "Unmute" : "Mute"}
                  </span>
                </Button>

                {/* Speaker Toggle Button - For audio calls */}
                {callType === "audio" && (
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={toggleSpeaker}
                    data-testid="button-toggle-speaker"
                    className={`gap-3 min-w-[150px] shadow-lg transition-all ${
                      isSpeakerOn
                        ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                        : "bg-gray-600 hover:bg-gray-700 text-white border-gray-500"
                    }`}
                  >
                    {isSpeakerOn ? (
                      <Volume2 className="h-6 w-6" />
                    ) : (
                      <VolumeX className="h-6 w-6" />
                    )}
                    <span className="font-semibold">
                      {isSpeakerOn ? "Speaker On" : "Speaker Off"}
                    </span>
                  </Button>
                )}

                {/* Red End Call button - ALWAYS visible */}
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => endCall(false)}
                  disabled={callStatus === "ended" || callStatus === "ending"}
                  data-testid="button-end-call"
                  className="gap-3 min-w-[150px] shadow-lg"
                >
                  <PhoneOff className="h-6 w-6" />
                  <span className="font-semibold">End Call</span>
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Post-missed call followup dialog */}
      {missedCallId && (
        <PostMissedCallDialog
          isOpen={showPostMissedDialog}
          onClose={() => {
            setShowPostMissedDialog(false);
            setMissedCallId(null);
          }}
          callId={missedCallId}
        />
      )}
    </>
  );
}

// Memo wrapper to prevent unnecessary re-renders
export default memo(VideoCallDialog, (prevProps, nextProps) => {
  // Only re-render if critical props change
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.callId === nextProps.callId &&
    prevProps.sessionCodeProp === nextProps.sessionCodeProp &&
    prevProps.isIncoming === nextProps.isIncoming &&
    prevProps.callType === nextProps.callType &&
    prevProps.recipientId === nextProps.recipientId &&
    prevProps.callerId === nextProps.callerId &&
    prevProps.autoAccepted === nextProps.autoAccepted
  );
});