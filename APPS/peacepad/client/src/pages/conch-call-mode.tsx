import { useState, useEffect, useRef, useContext } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Phone, Video, VideoOff, X, ArrowRight, ArrowLeft, Loader2, Mic, MicOff, Target, CheckCircle2, Shell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ConchShell } from "@/components/ConchShell";
import { ConchTurnButton } from "@/components/ConchTurnButton";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ConchSession } from "@shared/schema";
import { useConchAudio } from "@/hooks/useConchAudio";
import { SEOHead } from "@/components/SEOHead";
import { ConchTutorial } from "@/components/ConchTutorial";
import { type MoodEmotion } from "@/components/MoodRing";
import { SessionMoodTracker, type EmotionSnapshot } from "@/lib/sessionMoodTracker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { ConnectWithPartner } from "@/components/ConnectWithPartner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SummarizationPrompt } from "@/components/SummarizationPrompt";
import { ListeningFeedback } from "@/components/ListeningFeedback";
import orangeConchCutout from "@assets/orange_conch_shell.png";

// Import WebRTC context
import { useWebRTC } from "@/contexts/WebRTCContext";

export default function ConchModePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const webrtc = useWebRTC();
  const sendMessage = webrtc?.sendSignal; // Use sendSignal for consistency

  // Detect mobile viewport safely using matchMedia
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)'); // < lg breakpoint
    setIsMobileViewport(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Server-driven state
  const [session, setSession] = useState<ConchSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [moodColor, setMoodColor] = useState("blue");
  const [showExtraTimeRequest, setShowExtraTimeRequest] = useState(false);
  const [partnerRequestingTime, setPartnerRequestingTime] = useState(false);
  const [strikeCount, setStrikeCount] = useState(0);
  const [isBlockedForCooldown, setIsBlockedForCooldown] = useState(false);
  const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState(0);
  const [showStrikeWarning, setShowStrikeWarning] = useState(false);
  const [isPassing, setIsPassing] = useState(false);
  const [passDirection, setPassDirection] = useState<'to-partner' | 'to-you'>('to-partner');
  const lastTapTimeRef = useRef<number>(0);
  
  // AI mood tracking state
  const [myMood, setMyMood] = useState<MoodEmotion>('neutral');
  const [myMoodConfidence, setMyMoodConfidence] = useState<number>(0);
  const [partnerMood, setPartnerMood] = useState<MoodEmotion>('neutral');
  const [partnerMoodConfidence, setPartnerMoodConfidence] = useState<number>(0);
  const moodTrackerRef = useRef<SessionMoodTracker | null>(null);
  
  // Invitation dialog state
  const [pendingInvitation, setPendingInvitation] = useState<{ sessionId: string; initiatorName: string } | null>(null);
  
  // Reaction system state
  interface ReactionEvent {
    id: string;
    emoji: string;
    senderName: string;
    timestamp: number;
  }
  const [activeReactions, setActiveReactions] = useState<ReactionEvent[]>([]);
  // Reactions moved to floating button - no inline emoji panel
  const reactionTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // AI Counselor intervention state
  interface AIIntervention {
    id: string;
    type: 'tone_alert' | 'empathy_nudge';
    message: string;
    suggestion?: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: number;
  }
  const [activeIntervention, setActiveIntervention] = useState<AIIntervention | null>(null);
  const interventionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousEmotionRef = useRef<EmotionSnapshot | null>(null);
  
  // Turn summary state
  interface TurnSummaryData {
    speakerUserId: string;
    keyPoints: string[];
    unaddressedConcerns: string[];
    overallSentiment: string;
    counselorNote: string;
  }
  const [activeTurnSummary, setActiveTurnSummary] = useState<TurnSummaryData | null>(null);
  const [showTurnSummary, setShowTurnSummary] = useState(false);
  
  // Rogerian listening / summarization state
  interface ValidationResult {
    isValid: boolean;
    score: number;
    capturedPoints: string[];
    missedPoints: string[];
    feedback: string;
    encouragement: string;
  }
  const [showSummarizationPrompt, setShowSummarizationPrompt] = useState(false);
  const [summarizationValidationResult, setSummarizationValidationResult] = useState<ValidationResult | null>(null);
  const [lastSpeakerContent, setLastSpeakerContent] = useState<string>("");
  const [lastSummaryAttempt, setLastSummaryAttempt] = useState<string>("");
  const previousConchHolderRef = useRef<string | null>(null);
  
  // Silent Pause State (Phase 2: 2-second pause after timer ends)
  const [isSilentPause, setIsSilentPause] = useState(false);
  
  // Request throttling refs to prevent duplicate API calls
  const isPassingRequestRef = useRef<boolean>(false);
  const isExtraTimeRequestRef = useRef<boolean>(false);
  const lastPassTimeRef = useRef<number>(0);
  const lastExtraTimeRequestRef = useRef<number>(0);

  // Fetch partnerships for display only - this polls frequently to catch new partnerships
  const { data: partnerships = [] } = useQuery<any[]>({
    queryKey: ['/api/partnerships'],
    enabled: !!user,
    refetchInterval: 1000, // Auto-refetch every second for instant sync when partnership created
  });

  // Use active partnership from user profile, with fallback to first partnership
  // This handles stale user cache when a new partnership is created
  const userActivePartnershipId = user?.activePartnershipId;
  const matchingPartnership = partnerships.find(p => p.id === userActivePartnershipId);
  
  // If user's activePartnershipId doesn't match any partnership, use first available
  // This can happen when partnership-joined WebSocket notification isn't received
  const partnershipId = matchingPartnership ? userActivePartnershipId : (partnerships[0]?.id || null);
  const partnership = matchingPartnership || partnerships[0];
  
  // Force refresh user data if there's a mismatch (stale cache)
  useEffect(() => {
    if (partnerships.length > 0 && userActivePartnershipId && !matchingPartnership) {
      console.log('[Conch] User activePartnershipId mismatch, refreshing user data');
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
    }
  }, [partnerships, userActivePartnershipId, matchingPartnership]);

  // Clear session state when partnership changes
  useEffect(() => {
    console.log('[Conch] Partnership changed, clearing session state');
    setSession(null);
    setTimeRemaining(60);
    setMoodColor("blue");
    setShowExtraTimeRequest(false);
    setPartnerRequestingTime(false);
    setStrikeCount(0);
    setIsBlockedForCooldown(false);
    setCooldownTimeRemaining(0);
    setShowStrikeWarning(false);
    setIsPassing(false);
    
    // Clear mood tracking state
    setMyMood('neutral');
    setMyMoodConfidence(0);
    setPartnerMood('neutral');
    setPartnerMoodConfidence(0);
    
    // Stop mood tracker if running
    if (moodTrackerRef.current) {
      moodTrackerRef.current.stopTracking();
      moodTrackerRef.current = null;
    }
  }, [partnershipId]);

  // Fetch active session on page load
  // Poll every 2 seconds when session is pending to detect when partner joins
  const { data: activeSession, isLoading: isLoadingSession, error: sessionError } = useQuery<ConchSession>({
    queryKey: ['/api/conch-sessions/active', partnershipId],
    queryFn: async () => {
      if (!partnershipId) throw new Error("No partnership found");
      const res = await fetch(`/api/conch-sessions/active?partnershipId=${partnershipId}`, { 
        credentials: "include" 
      });
      if (res.status === 404) return null; // No active session
      if (!res.ok) throw new Error("Failed to fetch active session");
      return res.json();
    },
    enabled: !!partnershipId,
    refetchInterval: session?.status === 'pending' ? 2000 : false, // Poll while waiting for partner
  });

  // Fetch past Conch sessions
  const { data: pastSessions = [] } = useQuery<ConchSession[]>({
    queryKey: ['/api/conch-sessions/history', partnershipId],
    queryFn: async () => {
      if (!partnershipId) return [];
      const res = await fetch(`/api/conch-sessions/history?partnershipId=${partnershipId}`, { 
        credentials: "include" 
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!partnershipId && (!activeSession || activeSession.status === 'ended'),
  });

  // Hydrate state from active session (or clear if null)
  useEffect(() => {
    if (activeSession) {
      console.log('[Conch] Active session data received:', {
        id: activeSession.id,
        status: activeSession.status,
        callId: activeSession.callId,
        partnershipId: activeSession.partnershipId
      });
      setSession(activeSession);
      // Calculate initial time remaining
      if (activeSession.currentTurnEndsAt) {
        const remaining = Math.max(
          0,
          Math.floor((new Date(activeSession.currentTurnEndsAt).getTime() - Date.now()) / 1000)
        );
        setTimeRemaining(remaining);
      }
    } else if (activeSession === null) {
      // Explicitly clear session when no active session exists for this partnership
      console.log('[Conch] No active session for this partnership, clearing state');
      setSession(null);
    }
  }, [activeSession]);
  
  // Determine if user is holding conch from server state
  const isHoldingConch = session?.conchHolderUserId === user?.id;
  
  // Reset AI intervention state when conch holder changes to prevent stale comparisons
  useEffect(() => {
    // Clear previous emotion when user gains/loses conch
    previousEmotionRef.current = null;
    
    // Clear any active intervention when losing conch
    if (!isHoldingConch && activeIntervention) {
      setActiveIntervention(null);
      if (interventionTimerRef.current) {
        clearTimeout(interventionTimerRef.current);
      }
    }
  }, [isHoldingConch]);
  
  // Rogerian listening: Show summarization prompt when conch is passed TO the user
  useEffect(() => {
    const currentHolder = session?.conchHolderUserId;
    const previousHolder = previousConchHolderRef.current;
    
    // Detect if conch just passed TO the user (from partner to user)
    if (currentHolder === user?.id && previousHolder && previousHolder !== user?.id && session?.status === 'active') {
      console.log('[ConchMode] Conch passed to user - checking for summarization');
      
      // Rogerian feedback is now contextual/optional
      // Only show if the previous turn was significant (> 20s)
      const wasSignificantTurn = timeRemaining < 40; // Started at 60s, so > 20s used

      if (wasSignificantTurn) {
        // Use turn summary key points if available, otherwise use a generic prompt
        if (activeTurnSummary && activeTurnSummary.keyPoints && activeTurnSummary.keyPoints.length > 0) {
          setLastSpeakerContent(activeTurnSummary.keyPoints.join('. '));
        } else {
          setLastSpeakerContent("What your partner just shared with you");
        }
        
        setShowSummarizationPrompt(true);
        setSummarizationValidationResult(null);
      }
    }
    
    // Update previous holder ref
    previousConchHolderRef.current = currentHolder || null;
  }, [session?.conchHolderUserId, user?.id, session?.status, activeTurnSummary]);

  // Partner info - API returns partnership.partner (co-parent data)
  const partner = partnership?.partner;

  // Background WebRTC audio connection (no UI) - enables walkie-talkie audio
  // CRITICAL: Use sessionCode from backend response, NOT callId
  const audioEnabled = session?.status === 'active' && !!(session as any)?.sessionCode && !!partner;
  
  // Debug logging to track audio connection state
  useEffect(() => {
    console.log('[ConchMode] Audio connection state:', {
      enabled: audioEnabled,
      sessionStatus: session?.status,
      hasSessionCode: !!(session as any)?.sessionCode,
      sessionCode: (session as any)?.sessionCode,
      hasCallId: !!session?.callId,
      callId: session?.callId,
      hasPartner: !!partner,
      partnerId: partner?.id,
    });
  }, [audioEnabled, session?.status, (session as any)?.sessionCode, session?.callId, partner?.id]);
  
  const { 
    toggleMute, 
    toggleCamera,
    switchCamera,
    isMuted, 
    isCameraOff,
    localAudioLevel, 
    remoteAudioLevel,
    setLocalVideoElement,
    setRemoteVideoElement,
    localStream,
  } = useConchAudio({
    sessionCode: (session as any)?.sessionCode || '', // Use sessionCode for WebRTC connection
    partnerId: partner?.id || '',
    enabled: audioEnabled,
    videoEnabled: true,
  });

  // Double-tap handler for switching cameras
  const lastVideoTapTimeRef = useRef<number>(0);
  const handleVideoDoubleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastVideoTapTimeRef.current;
    
    if (timeSinceLastTap < 500) {
      // Double tap detected
      switchCamera();
    }
    
    lastVideoTapTimeRef.current = now;
  };

  // Detect speaking based on real audio levels (threshold: 10%)
  const isSpeaking = localAudioLevel > 10;
  const partnerIsSpeaking = remoteAudioLevel > 10;
  
  // Initialize AI mood tracking when session is active and we have a local stream
  useEffect(() => {
    const initMoodTracking = async () => {
      // Only track mood when session is active, we have necessary IDs, and local stream is available
      if (!session?.id || !user?.id || !audioEnabled || !localStream) {
        // Stop tracking if conditions no longer met
        if (moodTrackerRef.current) {
          console.log('[ConchMode] Stopping mood tracking - session inactive or stream unavailable');
          moodTrackerRef.current.stopTracking();
          moodTrackerRef.current = null;
        }
        return;
      }
      
      // Don't reinitialize if already tracking
      if (moodTrackerRef.current) {
        return;
      }
      
      try {
        console.log('[ConchMode] Initializing AI mood tracking with existing stream...');
        
        // Create mood tracker instance
        moodTrackerRef.current = new SessionMoodTracker({
          sessionId: session.id,
          userId: user.id,
          onEmotionUpdate: async (emotion: EmotionSnapshot) => {
            console.log('[ConchMode] Mood update:', emotion.emotion, emotion.confidence);
            setMyMood(emotion.emotion);
            setMyMoodConfidence(emotion.confidence);
            
            // Update mood color for ConchShell glow effect
            const colorMap: Record<MoodEmotion, string> = {
              calm: 'blue',
              cooperative: 'green',
              neutral: 'blue',
              frustrated: 'orange',
              tense: 'yellow',
              defensive: 'red',
            };
            setMoodColor(colorMap[emotion.emotion]);
            
            // AI Counselor: Check if intervention is needed when mood changes
            if (session?.id && isHoldingConch) {
              try {
                const res = await apiRequest("POST", `/api/conch-sessions/${session.id}/check-intervention`, {
                  currentEmotion: {
                    emotion: emotion.emotion,
                    confidence: emotion.confidence,
                    summary: emotion.summary || '',
                    timestamp: emotion.timestamp,
                  },
                  previousEmotion: previousEmotionRef.current ? {
                    emotion: previousEmotionRef.current.emotion,
                    confidence: previousEmotionRef.current.confidence,
                    summary: previousEmotionRef.current.summary || '',
                    timestamp: previousEmotionRef.current.timestamp,
                  } : undefined,
                });
                
                const intervention = await res.json();
                
                if (intervention.shouldIntervene) {
                  console.log('[Conch] Local intervention triggered');
                  // Note: Server will broadcast via WebSocket, so we just log here
                }
              } catch (error) {
                console.error('[Conch AI] Failed to check intervention:', error);
              }
            }
            
            // Store current emotion as previous for next comparison
            previousEmotionRef.current = emotion;
          },
          onError: (error) => {
            console.error('[ConchMode] Mood tracking error:', error);
          },
        });
        
        // Start tracking using the existing WebRTC audio stream
        await moodTrackerRef.current.startTracking(localStream);
        console.log('[ConchMode] AI mood tracking started successfully');
      } catch (error) {
        console.error('[ConchMode] Failed to initialize mood tracking:', error);
        // Don't show error toast - mood tracking is optional enhancement
      }
    };
    
    initMoodTracking();
    
    // Cleanup on unmount or when session ends
    return () => {
      if (moodTrackerRef.current) {
        console.log('[ConchMode] Cleaning up mood tracking');
        moodTrackerRef.current.stopTracking();
        moodTrackerRef.current = null;
      }
    };
  }, [session?.id, user?.id, audioEnabled, localStream]);

  // Access WebRTC context for sending messages
  // Note: In a real implementation, we'd use useContext(WebRTCContext)
  // For now, we'll use a simple fetch-based approach to send messages
  const sendWebSocketMessage = (message: any) => {
    // This is a placeholder - in production, use WebRTCContext.sendMessage
    console.log('[ConchMode] WebSocket send requested');
  };

  // Subscribe to WebSocket events
  useEffect(() => {
    const handleStateSync = (event: CustomEvent) => {
      const { sessionId, conchHolderUserId, currentTurnEndsAt, status } = event.detail;
      console.log('[ConchMode] State sync:', event.detail);
      
      setSession(prev => prev ? {
        ...prev,
        conchHolderUserId,
        currentTurnEndsAt,
        status,
      } : null);
      
      // Recalculate time remaining
      if (currentTurnEndsAt) {
        const remaining = Math.max(
          0,
          Math.floor((new Date(currentTurnEndsAt).getTime() - Date.now()) / 1000)
        );
        setTimeRemaining(remaining);
      }
    };

    const handleSessionCreated = async (event: CustomEvent) => {
      const { sessionId, initiatorUserId } = event.detail;
      console.log('[ConchMode] Session created:', sessionId);
      
      // Auto-join for the recipient (no invitation dialog)
      if (initiatorUserId !== user?.id) {
        console.log('[ConchMode] 🔄 Auto-joining session:', sessionId);
        try {
          await apiRequest("POST", `/api/conch-sessions/${sessionId}/join`);
          queryClient.invalidateQueries({ queryKey: ['/api/conch-sessions/active', partnershipId] });
          
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        } catch (error) {
          console.error('[ConchMode] Failed to auto-join:', error);
        }
      }
    };

    const handleSessionJoined = async (event: CustomEvent) => {
      const { sessionId, joinerUserId } = event.detail;
      console.log('[ConchMode] Session joined:', sessionId);
      
      // Play simple notification sound when session becomes active
      const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
      audio.volume = 0.4; // Quieter than invitation
      audio.play().catch(e => console.log('[Conch] Could not play sound:', e));
      
      // Vibrate if supported (mobile)
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]); // Two short pulses
      }
      
      // Show visual toast notification
      const joinerName = joinerUserId === user?.id ? 'You' : (partner?.displayName || 'Partner');
      toast({
        title: "Conch Session Active",
        description: `${joinerName} joined. Session is now live.`,
        duration: 5000,
      });
      
      // Browser notification (if permission granted and user didn't join)
      if (joinerUserId !== user?.id && 'Notification' in window) {
        try {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('Conch Session Active', {
            body: "Open PeacePad to continue the structured conversation.",
            icon: '/favicon.ico',
            tag: 'conch-session-active',
          });
        } catch (e) {
          console.log('[Conch] Notification error:', e);
        }
      }
      
      // Invalidate cache AND force immediate refetch to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/conch-sessions/active', partnershipId] });
      queryClient.refetchQueries({ queryKey: ['/api/conch-sessions/active', partnershipId] });
    };

    const handleConchPass = (event: CustomEvent) => {
      const { newHolderUserId, currentTurnEndsAt } = event.detail;
      console.log('[ConchMode] Conch passed to:', newHolderUserId, 'Timer reset to:', currentTurnEndsAt);
      
      // Update session state with new holder AND new timer
      setSession(prev => prev ? { 
        ...prev, 
        conchHolderUserId: newHolderUserId,
        currentTurnEndsAt: currentTurnEndsAt 
      } : null);
      
      // Recalculate time remaining from new timer
      if (currentTurnEndsAt) {
        const remaining = Math.max(
          0,
          Math.floor((new Date(currentTurnEndsAt).getTime() - Date.now()) / 1000)
        );
        setTimeRemaining(remaining);
      }
    };

    const handleAIIntervention = (event: CustomEvent) => {
      const { interventionType, message, suggestion, severity } = event.detail;
      console.log('[Conch] Intervention received:', interventionType);
      
      // Clear any existing intervention timer
      if (interventionTimerRef.current) {
        clearTimeout(interventionTimerRef.current);
      }
      
      // Show new intervention
      const intervention: AIIntervention = {
        id: `intervention-${Date.now()}`,
        type: interventionType,
        message,
        suggestion,
        severity: severity || 'medium',
        timestamp: Date.now(),
      };
      
      setActiveIntervention(intervention);
      
      // Vibrate for high severity interventions
      if (severity === 'high' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      
      // Auto-dismiss after 10 seconds
      interventionTimerRef.current = setTimeout(() => {
        setActiveIntervention(null);
      }, 10000);
    };

    const handleTurnSummary = (event: CustomEvent) => {
      const { speakerUserId, summary } = event.detail;
      console.log('[Conch AI] Turn summary received for:', speakerUserId);
      
      // Show turn summary
      setActiveTurnSummary({
        speakerUserId,
        ...summary,
      });
      setShowTurnSummary(true);
    };

    const handleStrikeApplied = (event: CustomEvent) => {
      const { targetUserId, strikeCount: newStrikeCount } = event.detail;
      console.log('[ConchMode] Strike applied:', targetUserId, newStrikeCount);
      
      if (targetUserId === user?.id) {
        setStrikeCount(newStrikeCount);
        setShowStrikeWarning(true);
        
        if (newStrikeCount === 1) {
          toast({
            title: "Take a breath, partner",
            description: "Your tone is getting heated. Try more constructive language.",
            variant: "default",
            duration: 4000,
          });
          setTimeout(() => setShowStrikeWarning(false), 4000);
        } else if (newStrikeCount === 2) {
          toast({
            title: "You're getting heated",
            description: "Pause and breathe. One more strike and you'll be blocked for 5 minutes.",
            variant: "destructive",
            duration: 5000,
          });
          setTimeout(() => setShowStrikeWarning(false), 5000);
        } else if (newStrikeCount === 3) {
          setIsBlockedForCooldown(true);
          setCooldownTimeRemaining(300); // 5 minutes
          toast({
            title: "Conch revoked for 5 minutes",
            description: "You used hostile language. Take a break and reset.",
            variant: "destructive",
            duration: 8000,
          });
          setTimeout(() => setShowStrikeWarning(false), 8000);
        }
      }
    };

    const handleExtraTimeRequest = (event: CustomEvent) => {
      const { requesterUserId, seconds } = event.detail;
      console.log('[ConchMode] Extra time requested:', requesterUserId, seconds);
      
      if (requesterUserId !== user?.id) {
        setPartnerRequestingTime(true);
      }
    };

    const handleExtraTimeResponse = (event: CustomEvent) => {
      const { approved, seconds } = event.detail;
      console.log('[ConchMode] Extra time response:', approved, seconds);
      
      // Clear pending request
      setShowExtraTimeRequest(false);
      
      // Refetch session to get updated currentTurnEndsAt with extra time added
      if (approved) {
        queryClient.invalidateQueries({ queryKey: ['/api/conch-sessions/active', partnershipId] });
      }
    };

    const handleReaction = (event: CustomEvent) => {
      const { emoji, senderName, senderId } = event.detail;
      console.log('[ConchMode] 🎉 Reaction received:', emoji, 'from', senderName, 'senderId:', senderId);
      
      // Add reaction to active reactions - show all reactions including your own for visual feedback
      const reactionEvent: ReactionEvent = {
        id: `${Date.now()}-${Math.random()}`,
        emoji,
        senderName,
        timestamp: Date.now(),
      };
      console.log('[ConchMode] 📍 Adding reaction to activeReactions:', reactionEvent.id);
      setActiveReactions(prev => {
        const updated = [...prev, reactionEvent];
        console.log('[ConchMode] 📊 ActiveReactions count:', updated.length);
        return updated;
      });
      
      // Auto-remove after 3 seconds - track timer for cleanup on unmount
      const timerId = setTimeout(() => {
        console.log('[ConchMode] ⏰ Auto-removing reaction:', reactionEvent.id);
        setActiveReactions(prev => prev.filter(r => r.id !== reactionEvent.id));
        reactionTimersRef.current.delete(reactionEvent.id);
      }, 3000);
      
      // Store timer ID for cleanup
      reactionTimersRef.current.set(reactionEvent.id, timerId);
    };

    const handleSessionEnded = (event: CustomEvent) => {
      console.log('[ConchMode] Session ended');
      
      // Clear session state (UI will show start button)
      setSession(null);
    };

    // Add event listeners
    window.addEventListener('conch:state_sync', handleStateSync as any);
    window.addEventListener('conch:session_created', handleSessionCreated as any);
    window.addEventListener('conch:session_joined', handleSessionJoined as any);
    window.addEventListener('conch:pass', handleConchPass as any);
    window.addEventListener('conch:strike_applied', handleStrikeApplied as any);
    window.addEventListener('conch:extra_time_request', handleExtraTimeRequest as any);
    window.addEventListener('conch:extra_time_response', handleExtraTimeResponse as any);
    window.addEventListener('conch:reaction', handleReaction as any);
    window.addEventListener('conch:ai_intervention', handleAIIntervention as any);
    window.addEventListener('conch:turn_summary', handleTurnSummary as any);
    window.addEventListener('conch:session_ended', handleSessionEnded as any);

    return () => {
      window.removeEventListener('conch:state_sync', handleStateSync as any);
      window.removeEventListener('conch:session_created', handleSessionCreated as any);
      window.removeEventListener('conch:session_joined', handleSessionJoined as any);
      window.removeEventListener('conch:pass', handleConchPass as any);
      window.removeEventListener('conch:strike_applied', handleStrikeApplied as any);
      window.removeEventListener('conch:extra_time_request', handleExtraTimeRequest as any);
      window.removeEventListener('conch:extra_time_response', handleExtraTimeResponse as any);
      window.removeEventListener('conch:reaction', handleReaction as any);
      window.removeEventListener('conch:ai_intervention', handleAIIntervention as any);
      window.removeEventListener('conch:turn_summary', handleTurnSummary as any);
      window.removeEventListener('conch:session_ended', handleSessionEnded as any);
      
      // Clear all reaction timers on unmount to prevent setState calls after unmount
      reactionTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      reactionTimersRef.current.clear();
    };
  }, [user?.id, partnershipId, toast]);

  // Calculate time remaining from currentTurnEndsAt - simple setInterval
  useEffect(() => {
    if (!session?.currentTurnEndsAt) {
      setTimeRemaining(60); // Reset to default if no turn end time
      return;
    }

    const interval = setInterval(() => {
      const endTime = new Date(session.currentTurnEndsAt!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      
      setTimeRemaining(remaining);
      
      // Auto-pass when time runs out (only if we hold conch and it's the first time reaching 0)
      if (remaining === 0 && isHoldingConch && timeRemaining > 0) {
        console.log('[ConchMode] Timer expired, triggering silent pause then auto-passing');
        // Phase 2: Silent Pause (2 seconds of calm before passing)
        setIsSilentPause(true);
        setTimeout(() => {
          setIsSilentPause(false);
          handlePassConch();
        }, 2000);
      }
    }, 500); // Increased frequency to 500ms for more responsive updates

    return () => clearInterval(interval);
  }, [session?.currentTurnEndsAt, isHoldingConch, timeRemaining]);

  // Cooldown timer
  useEffect(() => {
    if (!isBlockedForCooldown || cooldownTimeRemaining <= 0) return;

    const interval = setInterval(() => {
      setCooldownTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsBlockedForCooldown(false);
          setStrikeCount(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isBlockedForCooldown, cooldownTimeRemaining, toast]);

  // Mutations
  const createSession = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conch-sessions", { partnershipId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conch-sessions/active', partnershipId] });
      // UI will show waiting state automatically
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      });
    },
  });

  const joinSession = useMutation({
    mutationFn: async () => {
      if (!session?.id) throw new Error("No session to join");
      const res = await apiRequest("POST", `/api/conch-sessions/${session.id}/join`, {});
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/conch-sessions/active', partnershipId] });
      // Force immediate refetch so UI updates right away when joining
      await queryClient.refetchQueries({ queryKey: ['/api/conch-sessions/active', partnershipId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to join session",
        variant: "destructive",
      });
    },
  });

  const endSession = useMutation({
    mutationFn: async () => {
      if (!session?.id) throw new Error("No active session");
      const res = await apiRequest("POST", `/api/conch-sessions/${session.id}/end`, {});
      return await res.json();
    },
    onSuccess: () => {
      setSession(null);
      setLocation("/calls");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to end session",
        variant: "destructive",
      });
    },
  });

  // Double-tap to pass conch (prevents accidental passes)
  const handleConchTap = async () => {
    // Track taps for double-tap detection
    const now = Date.now();
    
    // If last tap was more than 300ms ago, this is the first tap of a new sequence
    if (now - lastTapTimeRef.current > 300) {
      lastTapTimeRef.current = now;
      return;
    }
    
    // This is the second tap within 300ms - it's a double-tap!
    lastTapTimeRef.current = 0; // Reset for next double-tap sequence
    
    if (!isHoldingConch || !session?.id || isPassing || isBlockedForCooldown) {
      return;
    }
    
    // Pass the conch
    await handlePassConch();
  };

  const handlePassConch = async () => {
    if (!session?.id) return;
    
    // Prevent duplicate requests - check if request is in-flight (silent)
    if (isPassingRequestRef.current) {
      console.log('[ConchMode] Pass request already in flight, ignoring duplicate');
      return;
    }
    
    // Cooldown period - prevent rapid-fire passes (silent - just ignore)
    const now = Date.now();
    const timeSinceLastPass = now - lastPassTimeRef.current;
    
    if (timeSinceLastPass < 500) {
      console.log('[ConchMode] Pass cooldown active, ignoring duplicate');
      return;
    }
    
    // Mark request as in-flight and record timestamp
    isPassingRequestRef.current = true;
    lastPassTimeRef.current = now;
    
    setIsPassing(true);
    setPassDirection(isHoldingConch ? 'to-partner' : 'to-you');
    
    try {
      // Call dedicated pass endpoint that broadcasts to both users
      await apiRequest("POST", `/api/conch-sessions/${session.id}/pass`, {});
    } catch (error: any) {
      // Only show toast for non-expected errors (ignore 400 "already passed")
      const is400Error = error?.message?.includes('400') || error?.message?.includes('not the current conch holder');
      if (!is400Error) {
        toast({
          title: "Error",
          description: "Failed to pass conch",
          variant: "destructive",
        });
      } else {
        console.log('[ConchMode] Expected pass error (already passed), ignoring:', error.message);
      }
    } finally {
      // Clear in-flight flag only after request completes (success or failure)
      isPassingRequestRef.current = false;
      
      // Keep animation running for visual feedback
      setTimeout(() => {
        setIsPassing(false);
      }, 1000);
    }
  };

  const handleLongPress = async () => {
    if (!isHoldingConch || !session?.id) return;
    
    // Prevent duplicate requests - check if request is in-flight (silent)
    if (isExtraTimeRequestRef.current) {
      console.log('[ConchMode] Extra time request already in flight, ignoring duplicate');
      return;
    }
    
    // Cooldown period - prevent rapid-fire extra time requests (silent)
    const now = Date.now();
    const timeSinceLastRequest = now - lastExtraTimeRequestRef.current;
    
    if (timeSinceLastRequest < 2000) {
      console.log('[ConchMode] Extra time cooldown active, ignoring duplicate');
      return;
    }
    
    // Mark request as in-flight and record timestamp
    isExtraTimeRequestRef.current = true;
    lastExtraTimeRequestRef.current = now;
    
    // Show pending request UI (no toast needed - UI is clear)
    setShowExtraTimeRequest(true);
    
    try {
      // Call API endpoint that broadcasts extra time request via WebSocket
      await apiRequest("POST", `/api/conch-sessions/${session.id}/extra-time/request`, {
        seconds: 30,
      });
    } catch (error: any) {
      console.log('[ConchMode] Extra time request error:', error);
      
      // Check if this is a 403 error (permission denied - user doesn't have conch)
      const is403Error = error?.message?.includes('403') || error?.message?.includes('Only the conch holder');
      
      // For 403 errors, just silently ignore (expected when user doesn't have conch)
      if (is403Error) {
        console.log('[ConchMode] Expected 403 error (user does not have conch), ignoring:', error.message);
        setShowExtraTimeRequest(false);
        return; // Exit early without showing toast
      }
      
      // Parse the error response to show helpful messages for other errors
      let errorMessage = "Failed to request extra time";
      
      if (error?.message) {
        // Try to extract the message from the error
        try {
          // API errors come as strings like "400: {message: '...'}"
          const match = error.message.match(/\{.*\}/);
          if (match) {
            const errorData = JSON.parse(match[0]);
            errorMessage = errorData.message || error.message;
          } else {
            errorMessage = error.message;
          }
        } catch {
          errorMessage = error.message;
        }
      }
      
      // Show user-friendly toast with specific error (only for non-403 errors)
      toast({
        title: "Can't request extra time",
        description: errorMessage,
        variant: "destructive",
        duration: 3000,
      });
      
      setShowExtraTimeRequest(false);
    } finally {
      // Clear in-flight flag only after request completes (success or failure)
      isExtraTimeRequestRef.current = false;
    }
  };

  const handleApproveExtraTime = async () => {
    if (!session?.id) return;
    
    setPartnerRequestingTime(false);
    
    try {
      // Call API endpoint that adds extra time and broadcasts approval
      await apiRequest("POST", `/api/conch-sessions/${session.id}/extra-time/approve`, {
        seconds: 30,
      });
      
      toast({
        title: "Extra time granted",
        description: "+30 seconds added",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to grant extra time",
        variant: "destructive",
      });
    }
  };

  const handleDenyExtraTime = async () => {
    setPartnerRequestingTime(false);
    
    try {
      // Call API endpoint that broadcasts denial via WebSocket
      if (session?.id) {
        await apiRequest("POST", `/api/conch-sessions/${session.id}/extra-time/deny`, {});
      }
      
      toast({
        title: "Extra time denied",
        description: "Conch will auto-pass when timer expires",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deny extra time",
        variant: "destructive",
      });
    }
  };

  const handleSendReaction = async (emoji: string) => {
    console.log('[ConchMode] 🎯 handleSendReaction called with emoji:', emoji);
    console.log('[ConchMode] Session ID:', session?.id);
    console.log('[ConchMode] User:', user?.id);
    
    if (!session?.id || !user) {
      console.warn('[ConchMode] ⚠️ Missing session or user, aborting reaction');
      return;
    }
    
    try {
      console.log('[ConchMode] 📤 Sending reaction API request...');
      // Send reaction via WebSocket by calling API endpoint
      // Backend will derive senderId and senderName from authenticated user for security
      const response = await apiRequest("POST", `/api/conch-sessions/${session.id}/reaction`, {
        emoji,
      });
      console.log('[ConchMode] ✅ Reaction API response:', response);
    } catch (error) {
      console.error('[ConchMode] ❌ Failed to send reaction:', error);
    }
  };

  const handleEndSession = () => {
    endSession.mutate(undefined, {
      onSuccess: () => {
        // Force state cleanup and ensure we stay on the conch page
        setSession(null);
        queryClient.invalidateQueries({ queryKey: ['/api/conch-sessions/active', partnershipId] });
      }
    });
  };

  // Display active partnership info
  const renderPartnershipInfo = () => {
    if (!partnership) {
      return (
        <div className="mb-6 p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-lg">
          <p className="text-sm text-center text-muted-foreground">
            Set your primary partnership in Settings to use Conch Mode.
          </p>
        </div>
      );
    }

    const partner = partnership.partner;
    
    const getAvatarContent = () => {
      if (partner?.profileImageUrl?.startsWith('avatar:')) {
        const avatarId = partner.profileImageUrl.replace('avatar:', '');
        const gradients: Record<string, string> = {
          'calm-purple': 'from-purple-400 to-purple-600',
          'calm-blue': 'from-blue-400 to-blue-600',
          'calm-green': 'from-emerald-400 to-emerald-600',
          'calm-orange': 'from-orange-400 to-orange-600',
          'calm-pink': 'from-pink-400 to-pink-600',
          'calm-teal': 'from-teal-400 to-teal-600',
        };
        const gradient = gradients[avatarId] || 'from-gray-400 to-gray-600';
        return (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <User className="h-5 w-5 text-white" />
          </div>
        );
      } else if (partner?.profileImageUrl?.startsWith('emoji:')) {
        return (
          <div className="flex items-center justify-center h-full text-2xl">
            {partner.profileImageUrl.replace('emoji:', '')}
          </div>
        );
      } else if (partner?.profileImageUrl) {
        return <AvatarImage src={partner.profileImageUrl} />;
      } else {
        return <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>;
      }
    };

    return (
      <div className="mb-6 flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-card/50 border border-border/50 max-w-xs mx-auto text-center">
        <Avatar className="h-12 w-12 ring-2 ring-primary/20">
          {getAvatarContent()}
        </Avatar>
        <div>
          <p className="text-xs text-muted-foreground">Conching with</p>
          <p className="font-semibold text-foreground">
            {partner?.displayName?.startsWith('Guest') ? 'Guest User' : (partner?.displayName || 'Co-parent')}
          </p>
        </div>
      </div>
    );
  };

  // Decline invitation handler
  const handleDeclineInvitation = async () => {
    if (!pendingInvitation) return;
    
    try {
      await apiRequest("POST", `/api/conch-sessions/${pendingInvitation.sessionId}/decline`, {
        reason: 'Declined from invitation dialog',
      });
      
      setPendingInvitation(null);
      toast({
        title: "Invitation Declined",
        description: "You declined the Conch session",
      });
    } catch (error) {
      console.error('[Conch] Failed to decline:', error);
      toast({
        title: "Error",
        description: "Failed to decline invitation",
        variant: "destructive",
      });
    }
  };
  
  // Accept invitation handler - Unified acceptance (one action = one intent)
  // Uses direct API call since invitation has a different sessionId than current state
  const handleAcceptInvitation = async () => {
    if (!pendingInvitation) return;
    
    try {
      // One action handles everything: join session immediately via direct API call
      await apiRequest("POST", `/api/conch-sessions/${pendingInvitation.sessionId}/join`, {});
      setPendingInvitation(null);
      // Refresh session data to pick up the newly joined session
      await queryClient.invalidateQueries({ queryKey: ['/api/conch-sessions/active', partnershipId] });
      await queryClient.refetchQueries({ queryKey: ['/api/conch-sessions/active', partnershipId] });
    } catch (e) {
      console.error('[Conch] Join error:', e);
      toast({
        title: "Connection Error",
        description: "Could not join the session. Please try again.",
        variant: "destructive",
      });
      setPendingInvitation(null);
    }
  };

  // Loading state
  if (isLoadingSession) {
    return (
      <>
        {/* Invitation Dialog */}
        
        <div className="flex items-center justify-center h-dvh">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading session...</p>
        </div>
      </>
    );
  }

  // No active partnership configured - show connection interface
  if (!partnership) {
    return (
      <>
        {/* Invitation Dialog */}
        
        <div 
          className="h-dvh overflow-y-auto overflow-x-hidden"
          style={{ overscrollBehavior: 'contain' }}
        >
          <ConnectWithPartner 
            title="Conch Mode"
            subtitle="Connect with your co-parent to start"
          />
        </div>
      </>
    );
  }

  // No active session - show history or start button
  if (!session || session.status === 'ended') {
    return (
      <>
        {/* Invitation Dialog */}
        
        <div 
          className="relative min-h-full flex flex-col bg-background"
          style={{ overscrollBehavior: 'contain' }}
        >
        {/* Main scrollable content area */}
        <div className="flex-1 flex flex-col items-center justify-center pb-6 px-4">
          {/* Content container */}
          <div className="w-full max-w-md space-y-8 text-center">
            {/* Title and subtitle */}
            <div className="space-y-2 animate-fade-in text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground drop-shadow-lg leading-tight">Conch Conversations</h1>
              <p className="text-base sm:text-lg text-muted-foreground font-medium drop-shadow">
                Speak in turn, track mood
              </p>
            </div>

            {/* Partnership info */}
            <div className="animate-slide-up">
              {renderPartnershipInfo()}
            </div>

            {/* Floating conch shell start button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => createSession.mutate()}
                disabled={createSession.isPending}
                className="group relative w-24 h-24 rounded-full bg-primary shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                data-testid="button-start-session"
              >
                {createSession.isPending ? (
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                ) : (
                  <Shell className="w-10 h-10 text-white" />
                )}
              </button>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-3">
              Tap to start
            </p>

            {/* Session history if available */}
            {pastSessions.length > 0 && (
              <div className="bg-card/50 backdrop-blur-md border border-border/50 rounded-2xl p-4 animate-slide-up">
                <h3 className="font-semibold text-sm mb-3 text-foreground">Recent Sessions</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {pastSessions.slice(0, 3).map((s) => (
                    <div key={s.id} className="text-xs p-2 bg-muted/50 rounded-lg border border-border/30">
                      <p className="text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString()} at{' '}
                        {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </>
    );
  }

  // Pending session - waiting for partner
  if (session.status === 'pending' && session.initiatorUserId === user?.id) {
    return (
      <>
        {/* Invitation Dialog */}
        
        <div 
          className="relative min-h-full flex flex-col items-center justify-center p-6 overflow-hidden bg-background"
          style={{ overscrollBehavior: 'contain' }}
        >
        <div className="flex flex-col items-center max-w-md mx-auto relative z-10">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <h2 className="text-3xl font-bold mb-2 text-foreground drop-shadow">Waiting for Partner</h2>
          <p className="text-center text-muted-foreground mb-6">
            {partner?.displayName?.startsWith('Guest') ? 'Guest User' : (partner?.displayName || "Your partner")} will join the session shortly...
          </p>
          <Button variant="outline" onClick={handleEndSession} className="border-primary/40" data-testid="button-cancel-session">
            Cancel Session
          </Button>
        </div>
        </div>
      </>
    );
  }

  // Pending session - show join button
  if (session.status === 'pending' && session.initiatorUserId !== user?.id) {
    return (
      <>
        {/* Invitation Dialog */}
        
        <div 
          className="relative min-h-full flex flex-col items-center justify-center p-6 overflow-hidden bg-background"
          style={{ overscrollBehavior: 'contain' }}
        >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse" />
          <div className="absolute bottom-20 left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="flex flex-col items-center max-w-md mx-auto relative z-10">
          <div className="mb-6 flex items-center justify-center w-full">
            <div className="w-64 h-64 flex items-center justify-center transform scale-75">
              <ConchShell
                isActive={false}
                moodColor="blue"
                onTap={() => {}}
                onLongPress={() => {}}
                isPassing={false}
                passDirection="to-partner"
                conchPicture={partnership?.conchPicture}
              />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-foreground drop-shadow text-center">Join Conch Session</h2>
          <p className="text-center text-muted-foreground mb-8">
            {partner?.displayName?.startsWith('Guest') ? 'Guest User' : (partner?.displayName || "Your partner")} started a Conch Mode session
          </p>
          <Button
            onClick={() => joinSession.mutate()}
            disabled={joinSession.isPending}
            size="lg"
            className="font-semibold text-lg px-12 py-6 rounded-full shadow-lg"
            data-testid="button-join-session"
          >
            {joinSession.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Session"
            )}
          </Button>
        </div>
        </div>
      </>
    );
  }

  // Show helpful message if no active partnership is set
  if (!partnershipId && !isLoadingSession) {
    return (
      <>
        {/* Invitation Dialog */}
        
        <SEOHead title="Conch Mode" description="Structured walkie-talkie conversations" noindex />
        <div className="flex items-center justify-center h-screen-dvh bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900 p-6">
          <div className="max-w-md text-center">
            <AlertTriangle className="h-20 w-20 text-amber-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Set Up Your Partnership</h1>
            <p className="text-white/80 mb-6">
              Conch Mode requires an active co-parenting partnership. Go to Settings to connect with your co-parent or select your primary partnership.
            </p>
            <Button 
              onClick={() => setLocation("/settings")}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              data-testid="button-go-to-settings"
            >
              Go to Settings
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Active session UI
  return (
    <>
      {/* Invitation Dialog */}
      <AlertDialog open={!!pendingInvitation} onOpenChange={(open) => !open && setPendingInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conch Session Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingInvitation?.initiatorName || 'Your co-parent'} wants to start a Conch session with you
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeclineInvitation} data-testid="button-decline-conch">
              Decline
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptInvitation} data-testid="button-accept-conch">
              Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <SEOHead title="Conch Mode" description="Structured walkie-talkie conversations" noindex />
      <div 
        className="relative min-h-full w-full bg-black overflow-hidden flex flex-col items-center justify-center"
        style={{
          touchAction: 'manipulation',
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
      {/* Mood glow overlay - subtle edge effect when video is on */}
      {isCameraOff && (
        <div
          className={`absolute inset-0 pointer-events-none animate-pulse`}
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, ${moodColor === 'blue' ? 'rgba(59, 130, 246, 0.15)' : moodColor === 'green' ? 'rgba(16, 185, 129, 0.15)' : moodColor === 'yellow' ? 'rgba(245, 158, 11, 0.15)' : moodColor === 'orange' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(239, 68, 68, 0.15)'} 100%)`,
            animation: 'breathe 3s ease-in-out infinite',
          }}
        />
      )}

      {/* Top bar with glass morphism effect */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-30 bg-gradient-to-b from-black/60 via-black/40 to-transparent backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`relative h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold ${partnerIsSpeaking ? 'ring-4 ring-green-500 ring-opacity-50 animate-pulse' : ''}`}>
            {partner?.displayName?.[0] || "P"}
            {partnerIsSpeaking && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold flex items-center gap-2 text-white">
              {partner?.displayName?.startsWith('Guest') ? 'Guest User' : (partner?.displayName || "Partner")}
              {partnerIsSpeaking && (
                <span className="flex gap-0.5">
                  <span className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1 h-4 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                </span>
              )}
            </p>
            <p className="text-sm text-white/70">
              {partnerIsSpeaking ? 'Speaking...' : isHoldingConch ? 'Listening' : 'Has the conch'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mute button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            data-testid="button-toggle-mute"
            title={isMuted ? "Unmute" : "Mute"}
            className={`hover-elevate active-elevate-2 ${isMuted ? 'bg-red-500/80 hover:bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}
          >
            {isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
          </Button>
          
          {/* Camera toggle button - Optional video feature */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCamera}
            data-testid="button-toggle-camera"
            title={isCameraOff ? "Add video (optional)" : "Turn video OFF"}
            aria-label={isCameraOff ? "Enable optional video camera" : "Disable video camera"}
            className={`hover-elevate active-elevate-2 ${isCameraOff ? 'bg-white/10 hover:bg-white/20 border border-white/30' : 'bg-green-500/80 hover:bg-green-500 border border-green-400'}`}
          >
            {isCameraOff ? (
              <div className="relative flex items-center justify-center">
                <VideoOff className="h-5 w-5 text-white/70" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <VideoOff className="h-5 w-5 text-white opacity-20 scale-150" />
                </div>
              </div>
            ) : (
              <Video className="h-5 w-5 text-white" />
            )}
          </Button>
          
          {/* End session button - larger touch target for mobile */}
          <Button
            variant="ghost"
            onClick={handleEndSession}
            data-testid="button-end-session"
            title="End Session"
            className="bg-red-500/80 hover:bg-red-500 hover-elevate active-elevate-2 min-w-[48px] min-h-[48px] p-3"
          >
            <X className="h-6 w-6 text-white" />
          </Button>
        </div>
      </div>

      {/* Video layout: WhatsApp-style split-screen (partner top, self bottom) */}
      <div className="absolute inset-0 flex flex-col">
        {/* Partner video - top half */}
        <div className="flex-1 bg-black relative overflow-hidden border-b border-white/10">
          <video
            ref={(el) => setRemoteVideoElement(el)}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            data-testid="video-remote"
          />
        </div>
        
        {/* Self video - bottom half */}
        <div className="flex-1 bg-black relative overflow-hidden">
          {!isCameraOff && (
            <video
              ref={(el) => setLocalVideoElement(el)}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              data-testid="video-local"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
          {isCameraOff && (
            <div className="w-full h-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <VideoOff className="h-12 w-12 text-white/60" />
            </div>
          )}
        </div>
      </div>

      {/* Floating Conch Turn Button - swipe-to-pass interaction */}
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 z-40"
        style={{
          bottom: isMobileViewport 
            ? `calc(6rem + max(env(safe-area-inset-bottom, 0px), 1rem))`
            : '2rem',
        }}
      >
        <ConchTurnButton
          mode={
            !isHoldingConch ? 'partner-turn' :
            !isCameraOff ? 'camera-on' :
            isSpeaking ? 'speaking' : 'idle'
          }
          onSwipePass={handlePassConch}
          onDoubleTap={handleConchTap}
          onLongPress={handleLongPress}
          disabled={isBlockedForCooldown || !isHoldingConch}
        />
      </div>


      {/* Strike warning overlay - shown temporarily when strike is applied */}
      {showStrikeWarning && strikeCount > 0 && (
        <div className="absolute top-32 left-0 right-0 px-4 z-[45] animate-in slide-in-from-top max-w-lg mx-auto">
          <div
            className={`rounded-2xl p-4 shadow-xl border-2 flex items-center gap-3 ${
              strikeCount === 1
                ? "bg-yellow-500/10 border-yellow-500"
                : strikeCount === 2
                ? "bg-orange-500/10 border-orange-500"
                : "bg-red-500/10 border-red-500"
            }`}
          >
            <AlertTriangle className={`h-6 w-6 ${strikeCount === 1 ? "text-yellow-500" : strikeCount === 2 ? "text-orange-500" : "text-red-500"}`} />
            <div className="flex-1">
              <p className="font-semibold">
                {strikeCount === 1 ? "Warning 1/3" : strikeCount === 2 ? "Warning 2/3" : "Strike 3 - Blocked"}
              </p>
              <p className="text-sm text-muted-foreground">
                {strikeCount === 1
                  ? "Keep your language constructive"
                  : strikeCount === 2
                  ? "One more strike = 5 minute timeout"
                  : "You've been blocked for 5 minutes"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cooldown overlay */}
      {isBlockedForCooldown && (
        <div className="absolute inset-0 bg-background/90 z-40 flex flex-col items-center justify-center p-6">
          <AlertTriangle className="h-20 w-20 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Cooldown Period</h2>
          <p className="text-center text-muted-foreground mb-4">
            You used hostile language and need to take a break.
          </p>
          <div className="text-6xl font-bold text-red-500 mb-4">
            {Math.floor(cooldownTimeRemaining / 60)}:{(cooldownTimeRemaining % 60).toString().padStart(2, '0')}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Your partner has the conch during this time.<br />
            Use this time to reflect and reset.
          </p>
        </div>
      )}

      {/* Rogerian Listening: Summarization prompt overlay */}
      {showSummarizationPrompt && !isBlockedForCooldown && (
        <div className="absolute inset-0 bg-background/95 z-50 flex flex-col items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-md">
            {!summarizationValidationResult ? (
              <SummarizationPrompt
                originalContent={lastSpeakerContent}
                senderName={partner?.displayName || "Your partner"}
                onValidationComplete={(result, attemptedSummary) => {
                  setSummarizationValidationResult(result);
                  setLastSummaryAttempt(attemptedSummary);
                }}
                onSkip={() => {
                  setShowSummarizationPrompt(false);
                  setLastSummaryAttempt("");
                  toast({
                    title: "That's okay",
                    description: "You can still share your perspective now.",
                  });
                }}
                context="Conch Mode conversation"
                initialSummary={lastSummaryAttempt}
              />
            ) : (
              <ListeningFeedback
                result={summarizationValidationResult}
                onContinue={() => {
                  setShowSummarizationPrompt(false);
                  setSummarizationValidationResult(null);
                  setLastSummaryAttempt("");
                }}
                onTryAgain={summarizationValidationResult.isValid ? undefined : () => {
                  setSummarizationValidationResult(null);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Silent Pause Overlay (Phase 2) */}
      {isSilentPause && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto">
              <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
            </div>
            <p className="text-xl text-white/80 font-light">Take a breath...</p>
          </div>
        </div>
      )}

      {/* Center: MINIMAL Timer and status (Clean Conch UI) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pb-32 lg:pb-0">

        {/* Big centered countdown - visual anchor */}
        <div className="flex flex-col items-center gap-4">
          <div className="px-8 py-6 rounded-3xl bg-black/60 backdrop-blur-md border border-white/10">
            <span className="text-6xl font-bold text-white tabular-nums">
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
          
          {/* Single calm status line */}
          <p className="text-sm text-white/70 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
            {isHoldingConch 
              ? "You'll both get a chance to speak" 
              : `${partner?.displayName?.startsWith('Guest') ? 'Guest User' : (partner?.displayName || 'Partner')} is sharing`}
          </p>
        </div>
      </div>

      {/* Partner's extra time request */}
      {partnerRequestingTime && (
        <div 
          className="absolute lg:bottom-32 left-0 right-0 px-6 z-20"
          style={{
            bottom: isMobileViewport 
              ? `calc(4rem + max(env(safe-area-inset-bottom, 0px), 1rem) + 3rem)` // Mobile: Bottom nav + safe-area + extra spacing for notification
              : undefined // Desktop uses lg:bottom-32 from className
          }}
        >
          <div className="bg-card border-2 border-primary rounded-2xl p-4 shadow-xl animate-in slide-in-from-bottom">
            <p className="text-center font-semibold mb-4">Partner requesting +30 seconds</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDenyExtraTime}
                data-testid="button-deny-extra-time"
              >
                Deny
              </Button>
              <Button
                className="flex-1"
                onClick={handleApproveExtraTime}
                data-testid="button-approve-extra-time"
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Compact speaking indicator - top right corner */}
      {session?.status === 'active' && (isSpeaking || partnerIsSpeaking) && (
        <div className="absolute top-6 right-6 z-20">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm border transition-all ${
            isSpeaking 
              ? 'bg-green-500/20 border-green-500/50' 
              : 'bg-blue-500/20 border-blue-500/50'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              isSpeaking ? 'bg-green-500' : 'bg-blue-500'
            }`} />
            <span className="text-xs font-medium">
              {isSpeaking ? 'You' : partner?.firstName || 'Partner'}
            </span>
          </div>
        </div>
      )}


      {/* Floating reactions animation */}
      {activeReactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute left-1/2 transform -translate-x-1/2 animate-float-up z-30 pointer-events-none"
          style={{
            bottom: '40%',
            animation: 'float-up 3s ease-out forwards',
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-5xl">{reaction.emoji}</span>
            <span className="text-xs text-white/80 bg-black/60 px-2 py-1 rounded-full backdrop-blur-sm">
              {reaction.senderName}
            </span>
          </div>
        </div>
      ))}

      {/* AI Counselor Intervention Overlay - positioned below top bar */}
      {activeIntervention && (
        <div className="absolute top-20 left-0 right-0 px-4 z-50 animate-in slide-in-from-top max-w-lg mx-auto">
          <div
            className={`rounded-2xl p-4 shadow-xl border-2 backdrop-blur-md ${
              activeIntervention.severity === 'high'
                ? 'bg-red-500/20 border-red-500'
                : activeIntervention.severity === 'medium'
                ? 'bg-yellow-500/20 border-yellow-500'
                : 'bg-blue-500/20 border-blue-500'
            }`}
            data-testid="ai-intervention-overlay"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex-shrink-0 ${
                activeIntervention.severity === 'high' ? 'text-red-500' : 
                activeIntervention.severity === 'medium' ? 'text-yellow-500' : 
                'text-blue-500'
              }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white mb-1">
                  {activeIntervention.type === 'tone_alert' ? 'Counselor Alert' : 'Communication Tip'}
                </p>
                <p className="text-sm text-white/90">
                  {activeIntervention.message}
                </p>
                {activeIntervention.suggestion && (
                  <p className="text-sm text-white/70 mt-2 italic">
                    💡 {activeIntervention.suggestion}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 hover:bg-white/20"
                onClick={() => setActiveIntervention(null)}
                data-testid="button-dismiss-intervention"
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Turn Summary Modal */}
      {showTurnSummary && activeTurnSummary && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold">Turn Summary</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTurnSummary(false)}
                  data-testid="button-close-turn-summary"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Counselor Note */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-sm font-medium text-blue-400 mb-2">Counselor Observation</p>
                  <p className="text-sm text-foreground/80">
                    {activeTurnSummary.counselorNote}
                  </p>
                </div>

                {/* Key Points */}
                {activeTurnSummary.keyPoints.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-400 mb-2">Key Points</p>
                    <ul className="space-y-2">
                      {activeTurnSummary.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground/80">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Unaddressed Concerns */}
                {activeTurnSummary.unaddressedConcerns.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-yellow-400 mb-2">Still To Discuss</p>
                    <ul className="space-y-2">
                      {activeTurnSummary.unaddressedConcerns.map((concern, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Target className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground/80">{concern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Overall Sentiment */}
                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">Overall tone:</span>
                  <span className={`text-sm font-medium ${
                    activeTurnSummary.overallSentiment === 'calm' || activeTurnSummary.overallSentiment === 'cooperative' 
                      ? 'text-green-400' 
                      : activeTurnSummary.overallSentiment === 'frustrated' || activeTurnSummary.overallSentiment === 'tense'
                      ? 'text-yellow-400'
                      : 'text-blue-400'
                  }`}>
                    {activeTurnSummary.overallSentiment}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  className="w-full"
                  onClick={() => setShowTurnSummary(false)}
                  data-testid="button-continue-session"
                >
                  Continue Session
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated WebRTC audio handler for Conch mode.
          This hidden element receives remote audio tracks when WebRTC is active.
          When WebRTC is unavailable the hook degrades gracefully and this
          element is simply not used — no visible error is shown to the user. */}
      {audioEnabled && (
        <audio
          id="conch-remote-audio"
          autoPlay
          playsInline
          style={{ display: 'none' }}
          aria-hidden="true"
          data-testid="conch-audio-output"
        />
      )}

      {/* CSS for breathing and passing animations */}
      <style>{`
        @keyframes breathe {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
        
        @keyframes pass-to-partner {
          0% {
            transform: translateY(20%) scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translateY(-50%) scale(0.7) rotate(180deg);
            opacity: 0.5;
          }
          100% {
            transform: translateY(-100%) scale(0.5) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes pass-to-you {
          0% {
            transform: translateY(-100%) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: translateY(-50%) scale(0.7) rotate(180deg);
            opacity: 0.5;
          }
          100% {
            transform: translateY(20%) scale(1) rotate(360deg);
            opacity: 1;
          }
        }
        
        .animate-pass-to-partner {
          animation: pass-to-partner 1s ease-in-out forwards;
        }
        
        .animate-pass-to-you {
          animation: pass-to-you 1s ease-in-out forwards;
        }
        
        @keyframes float-up {
          0% {
            transform: translateY(0) translateX(-50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-200px) translateX(-50%) scale(1.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
    </>
  );
}
