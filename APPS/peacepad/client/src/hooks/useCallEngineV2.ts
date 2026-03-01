import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ConnectionStats } from "@/components/ConnectionIndicator";

export type CallPhase = 
  | "idle"
  | "initiated"
  | "ringing"
  | "pre-join"
  | "media-ready"
  | "connecting"
  | "connected"
  | "in-turn"
  | "ended"
  | "failed";

export type CallRole = "offerer" | "answerer" | null;

export interface CallEngineV2State {
  currentCallId: string | null;
  sessionCode: string | null;
  phase: CallPhase;
  role: CallRole;
  participants: Array<{
    userId: string;
    displayName: string;
    hasAudio: boolean;
    hasVideo: boolean;
    isConnected: boolean;
  }>;
  conchHolder: string | null;
  isConchEnabled: boolean;
  errors: string[];
  connectionStats: ConnectionStats | null;
}

export interface CallEngineV2Actions {
  initiateCall: (targetUserId: string, options?: {
    hasVideo?: boolean;
    isEmergency?: boolean;
    reason?: string;
    isConch?: boolean;
  }) => void;
  joinCallByCode: (sessionCode: string, options?: { hasVideo?: boolean }) => void;
  answerCall: (options?: { hasVideo?: boolean }) => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  requestConch: () => void;
  releaseConch: () => void;
  sendOffer: (offer: RTCSessionDescriptionInit) => void;
  sendAnswer: (answer: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (candidate: RTCIceCandidateInit) => void;
  processMessage: (message: V2Message) => void;
}

// Message types for V2 protocol
export interface V2Message {
  type: string;
  payload?: any;
  sequence?: number;
}

export function useCallEngineV2(
  wsRef: React.MutableRefObject<WebSocket | null>, // CRITICAL FIX: Accept WebSocket ref to avoid closure issues
  peerConnectionsRef: React.MutableRefObject<Map<string, RTCPeerConnection>>,
  getLocalMediaStream?: () => MediaStream | null // Function to get local media stream
): [CallEngineV2State, CallEngineV2Actions] {
  const { user } = useAuth();
  const { toast } = useToast();

  // State management
  const [state, setState] = useState<CallEngineV2State>({
    currentCallId: null,
    sessionCode: null,
    phase: "idle",
    role: null,
    participants: [],
    conchHolder: null,
    isConchEnabled: false,
    errors: [],
    connectionStats: null
  });

  // Sequence tracking for ordered message processing
  const lastSequenceRef = useRef<number>(0);
  const messageQueueRef = useRef<Map<number, V2Message>>(new Map());
  
  // Stats collection interval ref
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // CRITICAL FIX: State ref to prevent stale closure bugs in action handlers
  const stateRef = useRef<CallEngineV2State>(state);
  
  // Keep stateRef synchronized with state
  useEffect(() => {
    stateRef.current = state;
    console.log('[V2] 🔄 stateRef updated:', {
      callId: state.currentCallId,
      sessionCode: state.sessionCode,
      phase: state.phase
    });
  }, [state]);
  
  // Helper to normalize participant data from server
  const normalizeParticipant = (serverParticipant: any) => ({
    userId: serverParticipant.userId,
    displayName: serverParticipant.displayName || "Unknown",
    hasAudio: serverParticipant.hasAudio !== undefined 
      ? serverParticipant.hasAudio 
      : !serverParticipant.isMuted,
    hasVideo: serverParticipant.hasVideo || false,
    isConnected: serverParticipant.isConnected !== undefined 
      ? serverParticipant.isConnected 
      : true
  });

  // Process messages in sequence order
  const processMessage = useCallback((message: V2Message) => {
    console.log('[V2] 📩 processMessage called with:', message.type, message);
    const { type, payload } = message;

    switch (type) {
      case "v2:call_initiated":
        setState(prev => ({
          ...prev,
          currentCallId: payload.callId,
          sessionCode: payload.sessionCode,
          phase: "initiated",
          role: payload.role as CallRole,
          participants: payload.participants || []
        }));
        break;

      case "incoming-call":
      case "v2:call_incoming":
        // Handle incoming call notification (both legacy and v2 formats)
        console.log('[V2] 🔔 Incoming call notification received!', { 
          callId: payload.call?.id || payload.callId,
          sessionCode: payload.call?.sessionCode || payload.sessionCode
        });
        
        // CRITICAL FIX: Set role to "answerer" for callee
        // This ensures role is available when callee accepts and joins session
        setState(prev => ({
          ...prev,
          role: "answerer",
          currentCallId: payload.call?.id || payload.callId,
          sessionCode: payload.call?.sessionCode || payload.sessionCode,
          phase: "ringing",
          participants: [{
            userId: payload.fromUser?.id || payload.callerId,
            displayName: payload.fromUser?.displayName || payload.callerName || "Unknown",
            hasAudio: true,
            hasVideo: payload.call?.callType === 'video' || payload.callType === 'video',
            isConnected: false
          }]
        }));
        
        console.log('[V2] ✅ V2 state updated with sessionCode:', payload.call?.sessionCode || payload.sessionCode);
        
        toast({
          title: "Incoming Call",
          description: `${payload.fromUser?.displayName || payload.callerName || "Someone"} is calling...`,
          duration: 30000
        });
        break;

      case "call-accepted":
      case "v2:call_accepted":
        // Call was accepted by target user (CALLER receives this)
        console.log('[V2] 🎉 Call accepted! Caller now joining session...');
        
        // CRITICAL FIX: Use stateRef to get LATEST sessionCode (avoid stale closure)
        const currentState = stateRef.current;
        const callSessionCode = currentState.sessionCode || payload.sessionCode || payload.call?.sessionCode;
        
        console.log('[V2] SessionCode for join:', callSessionCode, {
          fromState: currentState.sessionCode,
          fromPayload: payload.sessionCode,
          fromCallObj: payload.call?.sessionCode
        });
        
        setState(prev => ({
          ...prev,
          phase: "connecting",
          sessionCode: callSessionCode || prev.sessionCode
        }));
        
        // CRITICAL: Caller must join the session (just like callee does in answerCall)
        if (callSessionCode) {
          console.log('[V2] Caller joining session after call accepted. SessionCode:', callSessionCode);
          sendMessage({
            type: "v2:call:join-session",
            payload: {
              sessionCode: callSessionCode
            }
          });
          console.log('[V2] ✅ v2:call:join-session message sent for caller');
        } else {
          console.error('[V2] ❌ Cannot join session - missing sessionCode!', {
            currentState,
            payload
          });
        }
        break;

      case "v2:call_ringing":
        setState(prev => ({
          ...prev,
          phase: "ringing",
          participants: payload.participants || prev.participants
        }));
        
        // Show incoming call notification
        if (payload.callerId !== user?.id) {
          toast({
            title: "Incoming Call",
            description: `${payload.callerName || "Someone"} is calling...`,
            duration: 30000
          });
        }
        break;

      case "v2:participant_joined":
        setState(prev => ({
          ...prev,
          participants: [
            ...prev.participants.filter(p => p.userId !== payload.userId),
            normalizeParticipant(payload)
          ]
        }));
        
        // Create peer connection for the new participant
        // Server will send v2:negotiation_required to trigger offer creation
        const newPeerId = payload.userId || payload.id;
        if (newPeerId && newPeerId !== user?.id) {
          console.log(`[V2] 🔧 New participant joined: ${newPeerId}, creating peer connection`);
          createPeerConnection(newPeerId).then(pc => {
            if (pc) {
              console.log(`[V2] ✅ Peer connection ready for ${newPeerId}, waiting for server negotiation directive`);
            }
          });
        }
        break;

      case "v2:participant_left":
        setState(prev => ({
          ...prev,
          participants: prev.participants.filter(p => p.userId !== payload.userId)
        }));
        break;

      case "v2:prepare_for_connections":
        // Server is telling us about expected connections for multi-party calls
        setState(prev => ({
          ...prev,
          role: payload.role as CallRole,
          sessionCode: payload.sessionCode,
          phase: "pre-join"
        }));
        
        // Store expected connections for mesh setup
        console.log(`[V2] Preparing for connections from ${payload.expectedConnections?.length || 0} participants`);
        break;

      case "v2:session_joined":
        // Server sent current session state after joining
        setState(prev => ({
          ...prev,
          sessionCode: payload.sessionCode,
          participants: payload.users?.map((u: any) => normalizeParticipant(u)) || [],
          phase: "connected"
        }));
        
        console.log(`[V2] Joined session with ${payload.users?.length || 0} participants`);
        
        // Create peer connections for all existing participants
        // CRITICAL FIX: Always create offers for all participants regardless of role
        // The perfect negotiation pattern will handle simultaneous offers correctly
        if (payload.users && payload.users.length > 0) {
          console.log(`[V2] 🔧 Creating peer connections for ${payload.users.length} existing participants`);
          (async () => {
            for (const participant of payload.users) {
              const peerId = participant.userId || participant.id;
              if (peerId && peerId !== user?.id) {
                console.log(`[V2] Creating connection for existing participant: ${peerId}`);
                const pc = await createPeerConnection(peerId);
                if (pc) {
                  console.log(`[V2] 🎤 Creating and sending offer to ${peerId} (perfect negotiation pattern handles conflicts)`);
                  createAndSendOffer(peerId);
                }
              }
            }
          })();
        }
        break;

      case "v2:negotiation_required":
        // Server is telling us to start negotiation
        setState(prev => ({
          ...prev,
          role: payload.role as CallRole,
          phase: "media-ready"
        }));
        
        // If we're the offerer, create and send offer
        if (payload.role === "offerer") {
          const peerId = payload.targetUserId || payload.from;
          if (peerId) {
            createAndSendOffer(peerId);
          }
        }
        break;

      case "v2:webrtc_offer":
      case "v2:offer_received":
        // Process remote offer (CRITICAL FIX: Handle both type variants)
        console.log('[V2] 📥 Received WebRTC OFFER');
        const offerPeerId = payload.fromUserId || payload.from;
        if (offerPeerId && peerConnectionsRef.current.get(offerPeerId) && payload.offer) {
          console.log('[V2] ✅ Handling offer from:', offerPeerId);
          handleRemoteOffer(payload.offer, offerPeerId);
        } else {
          console.error('[V2] ❌ Cannot process offer - missing data:', {
            offerPeerId,
            hasPeerConnection: !!peerConnectionsRef.current.get(offerPeerId),
            hasOffer: !!payload.offer
          });
        }
        break;

      case "v2:webrtc_answer":
      case "v2:answer_received":
        // Process remote answer (CRITICAL FIX: Handle both type variants)
        console.log('[V2] 📥 Received WebRTC ANSWER');
        const answerPeerId = payload.fromUserId || payload.from;
        if (answerPeerId && peerConnectionsRef.current.get(answerPeerId) && payload.answer) {
          console.log('[V2] ✅ Calling setRemoteDescription with answer from:', answerPeerId);
          handleRemoteAnswer(payload.answer, answerPeerId);
        } else {
          console.error('[V2] ❌ Cannot process answer - missing data:', {
            answerPeerId,
            hasPeerConnection: !!peerConnectionsRef.current.get(answerPeerId),
            hasAnswer: !!payload.answer
          });
        }
        break;

      case "v2:webrtc_candidate":
      case "v2:ice_candidate":
        // Add remote ICE candidate (CRITICAL FIX: Handle both type variants)
        console.log('[V2] 🧊 Received ICE candidate');
        const candidatePeerId = payload.fromUserId || payload.from;
        const peerConnection = candidatePeerId ? peerConnectionsRef.current.get(candidatePeerId) : null;
        if (peerConnection && payload.candidate) {
          console.log('[V2] ✅ Adding ICE candidate from:', candidatePeerId);
          peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate))
            .then(() => console.log('[V2] ✅ ICE candidate added successfully'))
            .catch((err: Error) => console.error('[V2] ❌ Failed to add ICE candidate:', err));
        } else {
          console.error('[V2] ❌ Cannot add ICE candidate - missing data:', {
            candidatePeerId,
            hasPeerConnection: !!peerConnection,
            hasCandidate: !!payload.candidate
          });
        }
        break;

      case "v2:call_connected":
        setState(prev => ({
          ...prev,
          phase: "connected"
        }));
        break;

      case "v2:call_ended":
        setState(prev => ({
          ...prev,
          currentCallId: null,
          sessionCode: null,
          phase: "idle",
          role: null,
          participants: [],
          conchHolder: null,
          isConchEnabled: false
        }));
        break;

      case "v2:error":
        console.error("V2 call error:", payload);
        setState(prev => ({
          ...prev,
          errors: [...prev.errors, payload.message || "Unknown error"]
        }));
        toast({
          title: "Call Error",
          description: payload.message || "An error occurred during the call",
          variant: "destructive"
        });
        break;

      case "v2:conch_state":
        setState(prev => ({
          ...prev,
          conchHolder: payload.holderUserId || payload.currentHolder,
          isConchEnabled: payload.isEnabled !== undefined ? payload.isEnabled : true
        }));
        break;

      case "v2:conch_granted":
        setState(prev => ({
          ...prev,
          conchHolder: payload.holderUserId,
          phase: payload.holderUserId === user?.id ? "in-turn" : prev.phase
        }));
        
        if (payload.holderUserId === user?.id) {
          toast({
            title: "Your Turn",
            description: `You have the conch for ${payload.duration || 30} seconds`
          });
        }
        break;

      case "v2:conch_denied":
        toast({
          title: "Request Denied",
          description: payload.reason === "cooldown" 
            ? "Please wait before requesting again"
            : "Your conch request was denied",
          variant: "destructive"
        });
        break;

      case "v2:conch_tick":
        // Handle countdown timer updates
        if (state.conchHolder === user?.id && payload.remainingSeconds <= 5) {
          console.log(`[V2] Conch expiring in ${payload.remainingSeconds}s`);
        }
        break;

      case "v2:call_rejected":
        setState(prev => ({
          ...prev,
          phase: "ended"
        }));
        toast({
          title: "Call Rejected",
          description: "The call was rejected"
        });
        break;

      case "v2:peer_disconnected":
        // Handle peer temporary disconnection
        setState(prev => ({
          ...prev,
          participants: prev.participants.map(p => 
            p.userId === payload.userId 
              ? { ...p, isConnected: false }
              : p
          )
        }));
        
        if (payload.canReconnect) {
          console.log(`[V2] Peer ${payload.userId} disconnected, can reconnect within ${payload.reconnectionWindow}ms`);
        }
        break;

      case "v2:peer_reconnected":
        // Handle peer reconnection
        setState(prev => ({
          ...prev,
          participants: prev.participants.map(p =>
            p.userId === payload.userId
              ? { ...p, isConnected: true }
              : p
          )
        }));
        
        console.log(`[V2] Peer ${payload.userId} reconnected`);
        break;

      case "v2:call_failed":
        setState(prev => ({
          ...prev,
          phase: "failed",
          errors: [...prev.errors, payload.reason || "Call failed"]
        }));
        toast({
          title: "Call Failed",
          description: payload.reason || "The call could not be completed",
          variant: "destructive"
        });
        break;

      case "v2:peer_left":
        setState(prev => ({
          ...prev,
          participants: prev.participants.filter(p => p.userId !== payload.userId)
        }));
        break;

      case "v2:participant_audio_toggled":
        setState(prev => ({
          ...prev,
          participants: prev.participants.map(p =>
            p.userId === payload.userId
              ? { ...p, hasAudio: payload.enabled }
              : p
          )
        }));
        break;

      case "v2:participant_video_toggled":
        setState(prev => ({
          ...prev,
          participants: prev.participants.map(p =>
            p.userId === payload.userId
              ? { ...p, hasVideo: payload.enabled }
              : p
          )
        }));
        break;

      case "v2:session_ended":
        setState(prev => ({
          ...prev,
          phase: "ended",
          sessionCode: null
        }));
        break;

      case "v2:track_enabled":
        // Handle media track enabled
        const trackKindEnabled = payload.kind || "audio";
        setState(prev => ({
          ...prev,
          participants: prev.participants.map(p =>
            p.userId === payload.userId
              ? { 
                  ...p, 
                  ...(trackKindEnabled === "audio" ? { hasAudio: true } : { hasVideo: true })
                }
              : p
          )
        }));
        break;

      case "v2:track_disabled":
        // Handle media track disabled
        const trackKindDisabled = payload.kind || "audio";
        setState(prev => ({
          ...prev,
          participants: prev.participants.map(p =>
            p.userId === payload.userId
              ? { 
                  ...p, 
                  ...(trackKindDisabled === "audio" ? { hasAudio: false } : { hasVideo: false })
                }
              : p
          )
        }));
        break;

      case "v2:conch_released":
        setState(prev => ({
          ...prev,
          conchHolder: null,
          phase: prev.phase === "in-turn" && state.conchHolder === user?.id ? "connected" : prev.phase
        }));
        break;

      case "v2:conch_expired":
        setState(prev => ({
          ...prev,
          conchHolder: null,
          phase: prev.phase === "in-turn" ? "connected" : prev.phase
        }));
        if (state.conchHolder === user?.id) {
          toast({
            title: "Time's Up",
            description: "Your speaking turn has ended"
          });
        }
        break;

      case "v2:conch_extended":
        if (payload.holderUserId === user?.id) {
          toast({
            title: "Time Extended",
            description: `Your turn has been extended by ${payload.duration || 30} seconds`
          });
        }
        break;

      case "v2:call_declined":
        setState(prev => ({
          ...prev,
          phase: "ended"
        }));
        toast({
          title: "Call Declined",
          description: "The call was declined by the other party"
        });
        break;

      case "v2:call_updated":
      case "v2:call_update_media":
        // Handle call media state updates
        if (payload.participants) {
          setState(prev => ({
            ...prev,
            participants: payload.participants.map((p: any) => normalizeParticipant(p))
          }));
        }
        break;

      case "v2:session_updated":
        // Handle session state updates
        setState(prev => ({
          ...prev,
          sessionCode: payload.sessionCode || prev.sessionCode,
          participants: payload.participants 
            ? payload.participants.map((p: any) => normalizeParticipant(p))
            : prev.participants
        }));
        break;

      case "v2:peer_connected":
        // Handle peer connection established
        setState(prev => ({
          ...prev,
          participants: prev.participants.map(p =>
            p.userId === payload.userId
              ? { ...p, isConnected: true }
              : p
          )
        }));
        console.log(`[V2] Peer ${payload.userId} connected successfully`);
        break;

      // WebRTC signaling message handlers
      case "peer-joined":
        console.log(`[V2] Peer joined: ${payload.userId}`);
        // Create peer connection for the new participant
        if (payload.userId && payload.userId !== user?.id) {
          createPeerConnection(payload.userId).then(pc => {
            if (pc && state.currentCallId) {
              // As the existing participant, create an offer for the new peer
              console.log(`[V2] Creating offer for new peer ${payload.userId}`);
              createAndSendOffer(payload.userId);
            }
          });
        }
        
        // Add participant to state
        setState(prev => {
          const exists = prev.participants.some(p => p.userId === payload.userId);
          if (!exists) {
            return {
              ...prev,
              participants: [...prev.participants, {
                userId: payload.userId,
                displayName: payload.name || 'Unknown',
                hasVideo: false,
                hasAudio: true,
                isConnected: false
              }]
            };
          }
          return prev;
        });
        break;

      case "session-users":
        console.log(`[V2] Session users received:`, payload.users);
        // Create peer connections for all existing users in the session
        if (payload.users && Array.isArray(payload.users)) {
          payload.users.forEach((sessionUser: any) => {
            if (sessionUser.userId && sessionUser.userId !== user?.id) {
              createPeerConnection(sessionUser.userId).then(pc => {
                if (pc && state.currentCallId) {
                  // As the new joiner, create offers for existing peers
                  console.log(`[V2] Creating offer for existing peer ${sessionUser.userId}`);
                  createAndSendOffer(sessionUser.userId);
                }
              });
            }
          });
        }
        break;

      case "offer":
        console.log(`[V2] Received offer from ${payload.from}`);
        if (payload.from && payload.offer) {
          handleRemoteOffer(payload.offer, payload.from);
        }
        break;

      case "answer":
        console.log(`[V2] Received answer from ${payload.from}`);
        if (payload.from && payload.answer) {
          handleRemoteAnswer(payload.answer, payload.from);
        }
        break;

      case "ice-candidate":
        console.log(`[V2] Received ICE candidate from ${payload.from}`);
        if (payload.from && payload.candidate) {
          handleRemoteIceCandidate(payload.candidate, payload.from);
        }
        break;

      case "peer-left":
        console.log(`[V2] Peer left: ${payload.userId}`);
        // Clean up peer connection
        const pc = peerConnectionsRef.current.get(payload.userId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(payload.userId);
        }
        
        // Remove participant from state
        setState(prev => ({
          ...prev,
          participants: prev.participants.filter(p => p.userId !== payload.userId)
        }));
        break;

      case "call-ended":
        console.log(`[V2] 🛑 CRITICAL: call-ended received from ${payload.endedBy}`);
        // CRITICAL FIX: When other party ends call, immediately end our side too
        setState(prev => ({
          ...prev,
          phase: "ended"
        }));
        
        // Close all peer connections
        peerConnectionsRef.current.forEach((connection, peerId) => {
          console.log(`[V2] 🧹 Closing peer connection to ${peerId}`);
          connection.close();
        });
        peerConnectionsRef.current.clear();
        
        toast({
          title: "Call Ended",
          description: "The other party ended the call"
        });
        break;
    }
  }, [user?.id, toast, state.currentCallId]);

  // Collect WebRTC stats from peer connections
  const collectConnectionStats = useCallback(async () => {
    // Only collect stats when we're in a connected call
    if (state.phase !== "connected" || peerConnectionsRef.current.size === 0) {
      return;
    }
    
    let totalRtt = 0;
    let totalPacketLoss = 0;
    let totalJitter = 0;
    let totalBandwidth = 0;
    let statsCount = 0;
    
    // Collect stats from all peer connections
    for (const [peerId, peerConnection] of Array.from(peerConnectionsRef.current.entries())) {
      try {
        const stats = await peerConnection.getStats();
        let rttForPeer: number | undefined;
        let packetLossForPeer: number | undefined;
        let jitterForPeer: number | undefined;
        let bandwidthForPeer: number | undefined;
        
        stats.forEach((report: any) => {
          // Extract RTT from candidate-pair stats
          if (report.type === 'candidate-pair' && report.currentRoundTripTime) {
            rttForPeer = report.currentRoundTripTime * 1000; // Convert to ms
          }
          
          // Extract packet loss and jitter from inbound-rtp stats
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            if (report.packetsLost && report.packetsReceived) {
              const totalPackets = report.packetsLost + report.packetsReceived;
              if (totalPackets > 0) {
                packetLossForPeer = (report.packetsLost / totalPackets) * 100;
              }
            }
            if (report.jitter) {
              jitterForPeer = report.jitter * 1000; // Convert to ms
            }
          }
          
          // Extract bandwidth from transport stats
          if (report.type === 'transport' && report.availableOutgoingBitrate) {
            bandwidthForPeer = report.availableOutgoingBitrate / 1000; // Convert to kbps
          }
        });
        
        // Aggregate stats from this peer
        if (rttForPeer !== undefined) {
          totalRtt += rttForPeer;
          statsCount++;
        }
        if (packetLossForPeer !== undefined) {
          totalPacketLoss += packetLossForPeer;
        }
        if (jitterForPeer !== undefined) {
          totalJitter += jitterForPeer;
        }
        if (bandwidthForPeer !== undefined) {
          totalBandwidth += bandwidthForPeer;
        }
      } catch (error) {
        console.error(`Failed to get stats for peer ${peerId}:`, error);
      }
    }
    
    // Calculate averages and update state
    if (statsCount > 0) {
      const avgStats: ConnectionStats = {
        rtt: totalRtt / statsCount,
        packetLoss: totalPacketLoss / statsCount,
        jitter: totalJitter / statsCount,
        bandwidth: totalBandwidth / statsCount,
        timestamp: Date.now()
      };
      
      setState(prev => ({
        ...prev,
        connectionStats: avgStats
      }));
    }
  }, [state.phase, peerConnectionsRef]);
  
  // Start/stop stats collection based on call phase
  useEffect(() => {
    if (state.phase === "connected") {
      // Start collecting stats every 2 seconds
      collectConnectionStats(); // Collect immediately
      statsIntervalRef.current = setInterval(collectConnectionStats, 2000);
      
      console.log("[V2] Started connection stats monitoring");
    } else {
      // Stop collecting stats
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
        console.log("[V2] Stopped connection stats monitoring");
      }
      
      // Clear stats when not connected
      if (state.connectionStats !== null) {
        setState(prev => ({
          ...prev,
          connectionStats: null
        }));
      }
    }
    
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [state.phase, collectConnectionStats]);
  
  // Reset sequence tracking when call changes
  useEffect(() => {
    lastSequenceRef.current = 0;
    messageQueueRef.current.clear();
  }, [state.currentCallId]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    const ws = wsRef.current; // Get current value from ref
    console.log('[V2] WebSocket listener effect running. ws:', !!ws);
    if (!ws) {
      console.log('[V2] ⚠️ WebSocket not ready yet, will retry when it becomes available');
      return;
    }

    console.log('[V2] ✅ Setting up WebSocket message listener');
    const handleMessage = (event: MessageEvent) => {
      console.log('[V2] 🎯 handleMessage received event:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('[V2] 📨 Parsed message:', data.type, data);
        
        // Process v2 messages and WebRTC signaling messages
        const isV2Message = data.type?.startsWith("v2:");
        const isWebRTCMessage = [
          "offer", "answer", "ice-candidate", 
          "peer-joined", "session-users", "peer-left",
          "call-accepted", "call-ended"
        ].includes(data.type);
        
        if (!isV2Message && !isWebRTCMessage) {
          console.log('[V2] ⏭️ Ignoring non-V2/WebRTC message:', data.type);
          return;
        }

        // CRITICAL FIX: Process v2: messages immediately 
        // The adapter adds timestamps as sequences, not sequential numbers
        // V2 messages are already in order from the adapter
        if (data.type?.startsWith("v2:")) {
          console.log('[V2] Processing V2 message immediately:', data.type);
          processMessage(data);
        } 
        // Handle sequenced messages from real WebSocket (non-V2 messages)
        else if (data.sequence !== undefined) {
          const seq = data.sequence;
          
          // Initialize sequence tracking with first message
          if (lastSequenceRef.current === 0 && seq > 1) {
            console.log(`[V2] Initializing sequence tracking at ${seq}`);
            lastSequenceRef.current = seq - 1;
          }
          
          // If this is the next expected sequence, process immediately
          if (seq === lastSequenceRef.current + 1 || lastSequenceRef.current === 0) {
            processMessage(data);
            lastSequenceRef.current = seq;
            
            // Process any queued messages that are now in sequence
            let nextSeq = seq + 1;
            while (messageQueueRef.current.has(nextSeq)) {
              const queuedMsg = messageQueueRef.current.get(nextSeq)!;
              messageQueueRef.current.delete(nextSeq);
              processMessage(queuedMsg);
              lastSequenceRef.current = nextSeq;
              nextSeq++;
            }
          } else if (seq > lastSequenceRef.current + 1) {
            // Queue out-of-order message
            console.log(`[V2] Queueing out-of-order message: seq ${seq}, expected ${lastSequenceRef.current + 1}`);
            messageQueueRef.current.set(seq, data);
          }
          // Ignore messages with seq <= lastSequence (duplicates or old)
        } else {
          // Process immediately if no sequence
          processMessage(data);
        }
      } catch (error) {
        console.error("Error processing V2 message:", error);
      }
    };

    ws.addEventListener("message", handleMessage);
    console.log('[V2] ✅ WebSocket message listener attached');
    
    return () => {
      console.log('[V2] 🧹 Removing WebSocket message listener');
      ws?.removeEventListener("message", handleMessage);
    };
  }, [processMessage]); // wsRef is stable, don't include in deps

  // Helper function to create peer connection for a participant
  const createPeerConnection = async (peerId: string): Promise<RTCPeerConnection | undefined> => {
    // Check if connection already exists
    if (peerConnectionsRef.current.has(peerId)) {
      console.log(`[V2] Peer connection already exists for ${peerId}`);
      return peerConnectionsRef.current.get(peerId)!;
    }

    console.log(`[V2] 🔧 Creating new peer connection for ${peerId}`);
    
    try {
      // Get TURN servers from environment
      const iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' }
      ];
      
      // Add TURN server if configured
      const turnUrl = import.meta.env.VITE_TURN_URL;
      const turnUser = import.meta.env.VITE_TURN_USER;
      const turnPass = import.meta.env.VITE_TURN_PASS;
      
      if (turnUrl && turnUser && turnPass) {
        iceServers.push({
          urls: turnUrl,
          username: turnUser,
          credential: turnPass
        });
      }
      
      const configuration: RTCConfiguration = {
        iceServers,
        iceCandidatePoolSize: 10
      };
      
      const pc = new RTCPeerConnection(configuration);
      
      // CRITICAL FIX: Get local media stream and add tracks to peer connection
      // This was missing, causing no audio to be sent!
      if (getLocalMediaStream) {
        console.log(`[V2] 🎤 Getting local media stream for peer ${peerId}`);
        const localStream = getLocalMediaStream();
        
        if (localStream) {
          console.log(`[V2] ✅ Got local stream with ${localStream.getTracks().length} tracks`);
          localStream.getTracks().forEach((track: MediaStreamTrack) => {
            console.log(`[V2] 📤 Adding ${track.kind} track to peer connection for ${peerId}`);
            pc.addTrack(track, localStream);
          });
        } else {
          console.error(`[V2] ❌ No local media stream available for ${peerId}`);
        }
      } else {
        console.warn(`[V2] ⚠️ No getLocalMediaStream function provided - audio won't work`);
      }
      
      // CRITICAL FIX: Set up ontrack handler for receiving remote audio
      pc.ontrack = (event) => {
        console.log(`[V2] 📥 Received remote ${event.track.kind} track from ${peerId}`);
        if (event.track.kind === 'audio' && event.streams[0]) {
          console.log(`[V2] 🔊 Binding remote audio stream from ${peerId}`);
          // Trigger remote audio binding
          window.dispatchEvent(new CustomEvent('remote-track-received', {
            detail: { peerId, stream: event.streams[0], track: event.track }
          }));
        }
      };
      
      // Set up ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`[V2] 🧊 Sending ICE candidate to ${peerId}`);
          sendMessage({
            type: "v2:send_candidate",
            payload: {
              candidate: event.candidate,
              targetUserId: peerId
            }
          });
        }
      };
      
      // Set up connection state handler
      pc.onconnectionstatechange = () => {
        console.log(`[V2] 📡 Connection state with ${peerId}: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          console.log(`[V2] ✅ Successfully connected to ${peerId}!`);
          setState(prev => ({ ...prev, phase: "connected" as CallPhase }));
        }
      };
      
      // Note: ontrack handler is already set up above (lines 978-987)
      // Note: Local tracks are already added above (lines 960-975)
      // Removing duplicate track handling to prevent double-adding
      
      // Store the peer connection
      peerConnectionsRef.current.set(peerId, pc);
      console.log(`[V2] ✅ Peer connection created for ${peerId}`);
      
      return pc;
    } catch (error) {
      console.error(`[V2] ❌ Failed to create peer connection for ${peerId}:`, error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, `Failed to create connection to ${peerId}`]
      }));
      return undefined;
    }
  };

  // Helper function to create and send an offer to a peer
  const createAndSendOffer = async (peerId: string) => {
    const peerConnection = peerConnectionsRef.current.get(peerId);
    if (!peerConnection) {
      console.error(`[V2] No peer connection for ${peerId}`);
      return;
    }

    try {
      console.log(`[V2] 📤 Creating and sending offer to ${peerId}`);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      sendMessage({
        type: "v2:send_offer",
        payload: {
          callId: state.currentCallId,
          offer: offer,
          targetUserId: peerId
        }
      });
    } catch (error) {
      console.error(`[V2] Failed to create offer for ${peerId}:`, error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, `Failed to create offer for ${peerId}`]
      }));
    }
  };

  const handleRemoteOffer = async (offer: RTCSessionDescriptionInit, peerId: string) => {
    let peerConnection = peerConnectionsRef.current.get(peerId);
    
    // Create peer connection if it doesn't exist (can happen if offer arrives before join event)
    if (!peerConnection) {
      console.log(`[V2] Creating peer connection to handle offer from ${peerId}`);
      peerConnection = await createPeerConnection(peerId);
      if (!peerConnection) return;
    }

    try {
      await peerConnection.setRemoteDescription(offer);
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      sendMessage({
        type: "v2:send_answer",
        payload: {
          callId: state.currentCallId,
          answer: answer,
          targetUserId: peerId
        }
      });
    } catch (error) {
      console.error("Failed to handle remote offer:", error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, "Failed to handle remote offer"]
      }));
    }
  };

  const handleRemoteAnswer = async (answer: RTCSessionDescriptionInit, peerId: string) => {
    const peerConnection = peerConnectionsRef.current.get(peerId);
    if (!peerConnection) return;

    try {
      await peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error("Failed to handle remote answer:", error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, "Failed to handle remote answer"]
      }));
    }
  };

  const handleRemoteIceCandidate = async (candidate: RTCIceCandidateInit, peerId: string) => {
    const peerConnection = peerConnectionsRef.current.get(peerId);
    if (!peerConnection) {
      console.warn(`[V2] No peer connection for ${peerId}, queueing ICE candidate`);
      return;
    }

    try {
      await peerConnection.addIceCandidate(candidate);
      console.log(`[V2] 🧊 Added ICE candidate from ${peerId}`);
    } catch (error) {
      console.error(`[V2] Failed to add ICE candidate from ${peerId}:`, error);
    }
  };

  // Send message helper - CRITICAL: Use wsRef.current to get latest value
  const sendMessage = useCallback((message: V2Message) => {
    const ws = wsRef.current; // Get current value from ref
    const wsState = ws?.readyState;
    const stateLabel = wsState === WebSocket.CONNECTING ? 'CONNECTING' : 
                       wsState === WebSocket.OPEN ? 'OPEN' : 
                       wsState === WebSocket.CLOSING ? 'CLOSING' : 
                       wsState === WebSocket.CLOSED ? 'CLOSED' : 'NONE';
    
    console.log(`[V2 sendMessage] Type: ${message.type}, WebSocket state: ${stateLabel} (${wsState})`);
    
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      console.log(`[V2 sendMessage] ✅ Message sent: ${message.type}`);
    } else {
      console.error(`[V2 sendMessage] ❌ WebSocket not ready (state: ${stateLabel}), cannot send message:`, message);
    }
  }, [wsRef]); // Depend on ref not its contents

  // Action handlers
  const actions: CallEngineV2Actions = {
    initiateCall: (targetUserId, options = {}) => {
      // CRITICAL FIX: Set role to "offerer" immediately since caller initiates
      // This ensures role is available when v2:session_joined arrives
      setState(prev => ({
        ...prev,
        role: "offerer"
      }));
      
      sendMessage({
        type: "v2:initiate_call",
        payload: {
          targetUserId,
          hasVideo: options.hasVideo || false,
          isEmergency: options.isEmergency || false,
          reason: options.reason,
          isConch: options.isConch || false
        }
      });
    },

    joinCallByCode: (sessionCode, options = {}) => {
      sendMessage({
        type: "v2:join_by_code",
        payload: { 
          sessionCode,
          hasVideo: options.hasVideo || false
        }
      });
    },

    answerCall: (options = {}) => {
      console.log('[V2] ⚠️ answerCall() CALLED!');
      
      // CRITICAL FIX: Use stateRef to get the LATEST state, not closure state
      const currentState = stateRef.current;
      console.log('[V2] Current state from ref:', { 
        callId: currentState.currentCallId, 
        sessionCode: currentState.sessionCode,
        phase: currentState.phase,
        role: currentState.role
      });
      
      if (!currentState.currentCallId) {
        console.error('[V2] ❌ Cannot answer call - missing callId!', currentState);
        return;
      }
      
      if (!currentState.sessionCode) {
        console.error('[V2] ❌ Cannot answer call - missing sessionCode!', currentState);
        console.error('[V2] This means the incoming-call message was not processed correctly!');
        return;
      }
      
      console.log('[V2] ✅ All checks passed, proceeding with answer...');
      
      // First, send the answer message to update call status
      console.log('[V2] Sending v2:answer_call message...');
      sendMessage({
        type: "v2:answer_call",
        payload: { 
          callId: currentState.currentCallId,
          hasVideo: options.hasVideo || false
        }
      });
      console.log('[V2] ✅ v2:answer_call message sent');
      
      // CRITICAL: Also join the WebRTC session so we can receive offers!
      console.log('[V2] Callee joining session after accepting. SessionCode:', currentState.sessionCode);
      console.log('[V2] Sending v2:call:join-session message...');
      sendMessage({
        type: "v2:call:join-session",
        payload: {
          sessionCode: currentState.sessionCode
        }
      });
      console.log('[V2] ✅ v2:call:join-session message sent');
    },

    rejectCall: () => {
      const currentState = stateRef.current;
      if (!currentState.currentCallId) return;
      
      sendMessage({
        type: "v2:reject_call",
        payload: { callId: currentState.currentCallId }
      });
    },

    endCall: () => {
      const currentState = stateRef.current;
      if (!currentState.currentCallId) return;
      
      console.log('[V2] 🧹 Cleaning up call resources');
      
      // CRITICAL FIX: Close all peer connections to prevent zombie connections
      peerConnectionsRef.current.forEach((pc, peerId) => {
        console.log(`[V2] 🧹 Closing peer connection to ${peerId}`);
        pc.close();
      });
      peerConnectionsRef.current.clear();
      
      // Clear message queue and sequence
      messageQueueRef.current.clear();
      lastSequenceRef.current = 0;
      
      // Stop stats collection
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      
      sendMessage({
        type: "v2:end_call",
        payload: { callId: currentState.currentCallId }
      });
      
      // Clean up local state immediately
      setState(prev => ({
        ...prev,
        currentCallId: null,
        sessionCode: null,
        phase: "idle",
        role: null,
        participants: [],
        conchHolder: null,
        isConchEnabled: false,
        connectionStats: null
      }));
      
      console.log('[V2] ✅ Call cleanup complete');
    },

    requestConch: () => {
      const currentState = stateRef.current;
      if (!currentState.currentCallId || !currentState.isConchEnabled) return;
      
      sendMessage({
        type: "v2:request_conch",
        payload: { callId: currentState.currentCallId }
      });
    },

    releaseConch: () => {
      const currentState = stateRef.current;
      if (!currentState.currentCallId || !currentState.isConchEnabled) return;
      
      sendMessage({
        type: "v2:release_conch",
        payload: { callId: currentState.currentCallId }
      });
    },

    toggleVideo: () => {
      const currentState = stateRef.current;
      if (!currentState.currentCallId) return;
      
      // Toggle local video track on all peer connections
      let videoEnabled: boolean | null = null;
      
      peerConnectionsRef.current.forEach((peerConnection) => {
        const senders = peerConnection.getSenders();
        const videoSender = senders.find((sender: RTCRtpSender) => sender.track?.kind === 'video');
        const localVideoTrack = videoSender?.track;
        
        if (localVideoTrack) {
          // Set the enabled state based on the first track found, then apply same state to all
          if (videoEnabled === null) {
            videoEnabled = !localVideoTrack.enabled;
          }
          localVideoTrack.enabled = videoEnabled;
        }
      });
      
      // Send message with the new state
      if (videoEnabled !== null) {
        sendMessage({
          type: "v2:toggle_video",
          payload: { 
            callId: currentState.currentCallId,
            enabled: videoEnabled
          }
        });
      }
    },

    toggleAudio: () => {
      const currentState = stateRef.current;
      if (!currentState.currentCallId) return;
      
      // Toggle local audio track on all peer connections
      let audioEnabled: boolean | null = null;
      
      peerConnectionsRef.current.forEach((peerConnection) => {
        const senders = peerConnection.getSenders();
        const audioSender = senders.find((sender: RTCRtpSender) => sender.track?.kind === 'audio');
        const localAudioTrack = audioSender?.track;
        
        if (localAudioTrack) {
          // Set the enabled state based on the first track found, then apply same state to all
          if (audioEnabled === null) {
            audioEnabled = !localAudioTrack.enabled;
          }
          localAudioTrack.enabled = audioEnabled;
        }
      });
      
      // Send message with the new state
      if (audioEnabled !== null) {
        sendMessage({
          type: "v2:toggle_audio",
          payload: { 
            callId: currentState.currentCallId,
            enabled: audioEnabled
          }
        });
      }
    },

    sendOffer: (offer) => {
      const currentState = stateRef.current;
      if (!currentState.currentCallId) return;
      
      sendMessage({
        type: "v2:send_offer",
        payload: {
          callId: currentState.currentCallId,
          offer
        }
      });
    },

    sendAnswer: (answer) => {
      const currentState = stateRef.current;
      if (!currentState.currentCallId) return;
      
      sendMessage({
        type: "v2:send_answer",
        payload: {
          callId: currentState.currentCallId,
          answer
        }
      });
    },

    sendIceCandidate: (candidate) => {
      const currentState = stateRef.current;
      if (!currentState.currentCallId) return;
      
      sendMessage({
        type: "v2:ice_candidate",
        payload: {
          callId: currentState.currentCallId,
          candidate
        }
      });
    },

    processMessage: (message) => {
      processMessage(message);
    }
  };

  return [state, actions];
}