import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, Paperclip, Mic, Camera, X, FileText, Check, Trash2, Sparkles, AlertTriangle, Lightbulb, Menu, Wifi, WifiOff, RefreshCw, MessageCircle, Plus, Copy, Calendar, DollarSign, CheckSquare, Reply } from "lucide-react";
import MessageBubble from "./MessageBubble";
import { ConversationList } from "./ConversationList";
import { ConnectWithPartner } from "./ConnectWithPartner";
import { UnderstandingCheck } from "./UnderstandingCheck";
import { SummarizationPrompt } from "./SummarizationPrompt";
import { ListeningFeedback } from "./ListeningFeedback";
import { VoiceNoteRecorder } from "./VoiceNoteRecorder";
import { AudioPlayer } from "./AudioPlayer";
import { ImageUploadPreview } from "./ImageUploadPreview";
import { AudioWaveform } from "./AudioWaveform";
import { type ToneType } from "./TonePill";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useActivity } from "@/components/ActivityProvider";
import { playNotificationSound, areNotificationSoundsEnabled, initializeAudioContext } from "@/lib/notificationSounds";
import { QRCodeSVG } from "qrcode.react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCallContext } from "@/contexts/CallContext";

type MessageWithSender = Message & {
  senderDisplayName?: string;
  senderFirstName?: string;
  senderLastName?: string;
  senderProfileImage?: string;
};

interface ConversationMember {
  id: string;
  displayName: string | null;
  profileImageUrl: string | null;
}

interface Conversation {
  id: string;
  name: string | null;
  type: 'direct' | 'group';
  createdBy: string;
  createdAt: string;
  members: ConversationMember[];
}

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  // CES (Conflict Escalation Score) types for predictive intervention
  interface CESData {
    score: number;
    state: "neutral" | "sensitive" | "defensive" | "escalating" | "hostile";
    phase: "cold" | "warm" | "hot"; // Conversation phase for AI mediator behavior
    interventionLevel: "none" | "soft_nudge" | "modal" | "hard_block";
    trajectory: "improving" | "stable" | "worsening";
    signals: Array<{ type: string; signal: string; weight: number; description: string }>;
    suggestedActions: Array<{ type: string; label: string; priority: number; dangerous?: boolean }>;
    pauseRecommended: boolean;
    pauseDuration?: number;
    childImpactReminder: boolean;
    deescalationSuggestion: string | null;
  }
  
  const [tonePreview, setTonePreview] = useState<{
    tone: string;
    summary: string;
    emoji: string;
    rewordingSuggestion: string | null;
    originalMessage: string;
    ces?: CESData | null;
  } | null>(null);
  
  // CES intervention modal state
  const [showCESIntervention, setShowCESIntervention] = useState(false);
  const [shownChildReminder, setShownChildReminder] = useState(false); // Only show once per session

  const [showAttachmentTray, setShowAttachmentTray] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(() => {
    const saved = localStorage.getItem('ai_tone_analysis_enabled');
    return saved !== 'false'; // Default to true
  });
  const [isUrgent, setIsUrgent] = useState(false);
  const [showUnderstandingCheck, setShowUnderstandingCheck] = useState(false);
  const [showSummarizationPrompt, setShowSummarizationPrompt] = useState(false);
  const [showListeningFeedback, setShowListeningFeedback] = useState(false);
  const [emotionalMessage, setEmotionalMessage] = useState<MessageWithSender | null>(null);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    score: number;
    capturedPoints: string[];
    missedPoints: string[];
    feedback: string;
    encouragement: string;
  } | null>(null);
  const [understandingCheckEnabled, setUnderstandingCheckEnabled] = useState(() => {
    const saved = localStorage.getItem('understanding_check_enabled');
    return saved !== 'false'; // Default to true
  });
  const [hasCheckedEmotionalMessage, setHasCheckedEmotionalMessage] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<{
    id: string;
    content: string;
    senderId: string;
    senderDisplayName: string;
  } | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackActivity, endActivity } = useActivity();
  const callContext = useCallContext();
  const [, setLocation] = useLocation();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordedVideoPreviewRef = useRef<HTMLVideoElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // CRITICAL: Cleanup media streams on unmount to release microphone/camera
  useEffect(() => {
    return () => {
      console.log('[ChatInterface] Component unmounting - releasing all media resources');
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('[ChatInterface] Stopped audio track:', track.kind, track.label);
        });
        audioStreamRef.current = null;
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('[ChatInterface] Stopped video track:', track.kind, track.label);
        });
        videoStreamRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
        try { audioRecorderRef.current.stop(); } catch (e) {}
      }
      if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
        try { videoRecorderRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  // Load prepared message from Practice Chat (localStorage)
  useEffect(() => {
    const preparedMessage = localStorage.getItem('preparedMessage');
    if (preparedMessage) {
      console.log('[ChatInterface] Found prepared message from Practice Chat');
      setMessage(preparedMessage);
      // Clear it from localStorage after loading
      localStorage.removeItem('preparedMessage');
    }
  }, []);

  const conversationId = selectedConversation?.id;

  // Fetch partnerships to determine active partnership
  const { data: partnerships = [] } = useQuery<any[]>({
    queryKey: ["/api/partnerships"],
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch all conversations
  const { data: allConversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  // Filter conversations based on active primary partnership (SAFETY: no fallback!)
  const conversations = useMemo(() => {
    // 🚨 CRITICAL: If no active partnership set, show ZERO conversations (prevent messaging wrong ex!)
    if (!user?.activePartnershipId || partnerships.length === 0) {
      return [];
    }

    // Find the active partnership
    const activePship = partnerships.find((p: any) => p.id === user.activePartnershipId);
    
    // 🚨 CRITICAL: If active partnership deleted/invalid, show ZERO conversations
    if (!activePship) {
      return [];
    }

    // Get the partner's user ID from the active partnership
    const partnerId = activePship.user1Id === user.id ? activePship.user2Id : activePship.user1Id;

    // Filter conversations to only show those with the active partner
    return allConversations.filter((conv: Conversation) => {
      // For direct conversations, check if partner is a member
      if (conv.type === 'direct') {
        return conv.members.some((m: ConversationMember) => m.id === partnerId);
      }
      // For group conversations, also check if partner is a member
      return conv.members.some((m: ConversationMember) => m.id === partnerId);
    });
  }, [allConversations, user?.activePartnershipId, user?.id, partnerships]);

  const { data: messages = [], isLoading } = useQuery<MessageWithSender[]>({
    queryKey: conversationId ? ["/api/conversations", conversationId, "messages"] : [],
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await fetch(`/api/conversations/${conversationId}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!conversationId,
  });

  // Auto-select first conversation when conversations list changes
  // PRIORITY: Direct conversations first (1:1 with co-parent), then group conversations
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      // Sort to prioritize direct conversations
      const sorted = [...conversations].sort((a, b) => {
        if (a.type === 'direct' && b.type !== 'direct') return -1;
        if (a.type !== 'direct' && b.type === 'direct') return 1;
        return 0;
      });
      setSelectedConversation(sorted[0]);
    }
  }, [conversations, selectedConversation]);

  // Track previous conversation ID to detect conversation changes
  const prevConversationIdRef = useRef<string | undefined>();
  const prevMessageCountRef = useRef<number>(0);

  // Initialize audio context on first user interaction (avoids autoplay restrictions)
  useEffect(() => {
    const initAudio = () => {
      initializeAudioContext();
    };
    
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, []);

  // Play notification sound when new message arrives
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && areNotificationSoundsEnabled()) {
      // New message received - play subtle notification sound
      playNotificationSound('message', true);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Auto-scroll to bottom when messages change or conversation is selected
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      // Check if conversation changed (instant scroll) vs new message in same conversation (smooth scroll)
      const conversationChanged = prevConversationIdRef.current !== conversationId;
      
      // Use requestAnimationFrame for smoother scroll timing
      requestAnimationFrame(() => {
        if (!messagesEndRef.current) return;

        if (conversationChanged) {
          // Instant scroll when switching conversations
          messagesEndRef.current.scrollIntoView({ behavior: "auto" });
          prevConversationIdRef.current = conversationId;
        } else {
          // Smooth scroll for new messages in same conversation
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  }, [messages, conversationId]);

  // Scroll to bottom on initial conversation load (when page first opens)
  useEffect(() => {
    if (conversationId && messages.length > 0 && messagesEndRef.current) {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [conversationId]);

  // Reset understanding check state when new message arrives
  useEffect(() => {
    setHasCheckedEmotionalMessage(false);
    setShowUnderstandingCheck(false);
    setShowSummarizationPrompt(false);
    setShowListeningFeedback(false);
    setEmotionalMessage(null);
    setValidationResult(null);
  }, [messages.length, conversationId]);

  // Track which messages we've already marked as read (to prevent duplicate API calls)
  const markedAsReadRef = useRef<Set<string>>(new Set());

  // Mark unread messages from co-parent as "read" when conversation is viewed
  useEffect(() => {
    if (!user || !conversationId || messages.length === 0) return;

    // Find messages from co-parent that haven't been marked as read AND haven't been sent PATCH yet
    const unreadFromCoParent = messages.filter(
      (msg) => 
        msg.senderId !== user.id && 
        msg.status !== "read" && 
        !markedAsReadRef.current.has(msg.id)
    );

    if (unreadFromCoParent.length === 0) return;

    // Mark all immediately in our tracking set to prevent duplicate calls
    unreadFromCoParent.forEach((msg) => markedAsReadRef.current.add(msg.id));

    // Stagger API calls slightly to avoid hammering the server
    unreadFromCoParent.forEach((msg, index) => {
      setTimeout(() => {
        apiRequest("PATCH", `/api/messages/${msg.id}/read`)
          .catch((err) => {
            console.error("[Read Receipt] Failed to mark message as read:", err);
            markedAsReadRef.current.delete(msg.id);
          });
      }, index * 50);
    });
  }, [messages, user, conversationId]);

  // Reset tracked messages when conversation changes
  useEffect(() => {
    markedAsReadRef.current = new Set();
  }, [conversationId]);

  // Detect emotional partner messages and prompt understanding check when user starts typing
  const checkForEmotionalMessage = () => {
    if (!understandingCheckEnabled || !aiAnalysisEnabled || hasCheckedEmotionalMessage) return;
    if (messages.length === 0 || !user) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.senderId === user.id) return;

    const emotionalTones = ['frustrated', 'anxious', 'sad', 'emotional', 'upset', 'worried', 'concerned', 'hurt'];
    const messageTone = lastMessage.tone?.toLowerCase() || '';
    const toneSummary = lastMessage.toneSummary?.toLowerCase() || '';

    const isEmotional = emotionalTones.some(t => 
      messageTone.includes(t) || toneSummary.includes(t)
    );

    if (isEmotional && lastMessage.content) {
      setEmotionalMessage(lastMessage);
      setShowUnderstandingCheck(true);
      setHasCheckedEmotionalMessage(true);
    }
  };

  const handleInputFocus = () => {
    checkForEmotionalMessage();
  };

  const handleReflect = () => {
    setShowUnderstandingCheck(false);
    setShowSummarizationPrompt(true);
  };

  const handleSkipUnderstanding = () => {
    setShowUnderstandingCheck(false);
    setShowSummarizationPrompt(false);
    setShowListeningFeedback(false);
  };

  const handleValidationComplete = (result: typeof validationResult, _summaryText: string) => {
    setValidationResult(result);
    setShowSummarizationPrompt(false);
    setShowListeningFeedback(true);
  };

  const handleContinueFromFeedback = () => {
    setShowListeningFeedback(false);
    setValidationResult(null);
  };

  const handleTryAgain = () => {
    setShowListeningFeedback(false);
    setShowSummarizationPrompt(true);
    setValidationResult(null);
  };

  // Re-analyze old messages with unavailable tone analysis (runs once per session)
  useEffect(() => {
    const hasReanalyzed = sessionStorage.getItem('tone_reanalyzed');

    if (user && aiAnalysisEnabled && !hasReanalyzed) {
      console.log('[Tone Re-analysis] Checking for old messages to re-analyze...');

      apiRequest('POST', '/api/messages/reanalyze-tone')
        .then((res) => res.json())
        .then((result: any) => {
          if (result.updated > 0) {
            console.log(`[Tone Re-analysis] Updated ${result.updated} messages`);
            // Invalidate all conversation message queries to refetch with updated tone
            queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
            toast({
              title: "Tone Analysis Updated",
              description: `Re-analyzed ${result.updated} message${result.updated !== 1 ? 's' : ''} with improved tone detection.`,
            });
          }
          sessionStorage.setItem('tone_reanalyzed', 'true');
        })
        .catch((error) => {
          console.error('[Tone Re-analysis] Failed:', error);
          // Don't retry on error, set the flag anyway to avoid infinite retries
          sessionStorage.setItem('tone_reanalyzed', 'true');
        });
    }
  }, [user, aiAnalysisEnabled, toast]);

  // Track if a tone preview request is in progress (to prevent stacking)
  const [isPreviewPending, setIsPreviewPending] = useState(false);

  const [hasConfirmedFlagged, setHasConfirmedFlagged] = useState<string | null>(null);
  
  // Track if user attempted to send a flagged message (only show AI suggestions after Send attempt)
  const [hasAttemptedSend, setHasAttemptedSend] = useState(false);

  // REMOVED: Auto-preview tone while typing
  // Per product spec: AI analysis should run ONLY when user presses Send
  // This prevents the feature from feeling "reactive and judgmental" while composing
  // The tone analysis now happens in handleSend() synchronously before deciding to send

  const sendTextMessage = useMutation({
    mutationFn: async ({ content, conversationId, isUrgent, replyToId }: { content: string; conversationId: string; isUrgent?: boolean; replyToId?: string }) => {
      console.log('[Chat] Sending message to conversation:', conversationId);
      const res = await apiRequest("POST", "/api/messages", { content, conversationId, isUrgent: isUrgent || false, replyToId });
      const data = await res.json();
      console.log('[Chat] Message sent successfully, id:', data.id);
      return data;
    },

    onMutate: async ({ content, conversationId, isUrgent: isUrgentVal, replyToId }) => {
      // Save state for rollback on error
      const savedMessage = message;
      const savedTonePreview = tonePreview;
      const savedIsUrgent = isUrgentVal;
      const savedReplyTo = replyToMessage;
      // Clear input immediately so user can't double-send the same message
      setMessage("");
      setTonePreview(null);
      setIsUrgent(false);
      setReplyToMessage(null);
      
      // Cancel pending queries to prevent refetch overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      
      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(["/api/conversations", conversationId, "messages"]);
      
      // Create optimistic message
      const optimisticMessage: MessageWithSender = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: (user?.id || "") as string,
        recipientId: null,
        content,
        messageType: "text",
        tone: null,
        toneSummary: null,
        toneEmoji: null,
        rewordingSuggestion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timestamp: new Date(),
        isUrgent: isUrgent || false,
        isRead: false,
        fileUrl: null,
        fileName: null,
        fileSize: null,
        mimeType: null,
        duration: null,
        readAt: null,
        transcript: null,
        status: 'sent',
        deliveredAt: null,
        replyToId: replyToId || null,
        senderDisplayName: user?.displayName || 'You',
        senderFirstName: user?.firstName || undefined,
        senderLastName: user?.lastName || undefined,
        senderProfileImage: user?.profileImageUrl || undefined,
        sharedItemType: null,
        sharedItemId: null,
        isDeleted: false,
      } as unknown as MessageWithSender;

      queryClient.setQueryData(
        ["/api/conversations", conversationId, "messages"],
        (old: MessageWithSender[] = []) => [...old, optimisticMessage]
      );

      // Return context for rollback
      return { previousMessages, conversationId, savedMessage, savedTonePreview, savedIsUrgent, savedReplyTo };
    },
    onSuccess: (data, variables, context) => {
      playNotificationSound('messageSent');
      
      // Replace optimistic message with real server response
      queryClient.setQueryData(
        ["/api/conversations", context.conversationId, "messages"],
        (old: MessageWithSender[] = []) => {
          // Remove temp message and add real message
          const withoutTemp = old.filter(msg => 
            typeof msg.id !== 'string' || !msg.id.startsWith('temp-')
          );
          return [...withoutTemp, data];
        }
      );
      
      // Invalidate conversation list to update last message
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: Error, _variables: any, context: any) => {
      // Rollback to previous messages on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["/api/conversations", context.conversationId, "messages"],
          context.previousMessages
        );
      }
      // Restore all state so user can retry
      if (context?.savedMessage) {
        setMessage(context.savedMessage);
      }
      if (context?.savedTonePreview) {
        setTonePreview(context.savedTonePreview);
      }
      if (context?.savedIsUrgent) {
        setIsUrgent(context.savedIsUrgent);
      }
      if (context?.savedReplyTo) {
        setReplyToMessage(context.savedReplyTo);
      }
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please refresh the page.",
          variant: "destructive",
          duration: 5000,
        });
        localStorage.removeItem("peacepad_session_id");
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  // AI-first: Preview tone BEFORE sending
  const previewTone = useMutation({
    mutationFn: async (content: string) => {
      console.log('[AI] Tone analysis started for message:', content.substring(0, 50) + (content.length > 50 ? '...' : ''));
      const res = await apiRequest("POST", "/api/messages/preview", { content });
      const data = await res.json();
      console.log('[AI] Tone analysis completed:', { tone: data.tone, conflictScore: data.conflictScore });
      return data;
    },
    onSuccess: (data) => {
      // Only set preview if message hasn't changed (prevent stale previews from race conditions)
      if (message.trim() === data.originalMessage.trim()) {
        console.log('[AI] Tone preview applied successfully');
        setTonePreview(data);
      } else {
        console.log('[AI] Tone preview discarded (message changed during analysis)');
      }
    },
    onError: (error: Error) => {
      console.error('[AI] Tone analysis failed:', error.message);
      toast({
        title: "Error",
        description: "Failed to analyze message tone. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const sendMediaMessage = useMutation({
    mutationFn: async ({ file, messageType, duration, conversationId }: { file: File; messageType: string; duration?: number; conversationId: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('messageType', messageType);
      if (duration) formData.append('duration', duration.toString());

      const uploadRes = await fetch('/api/chat-attachments', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadRes.ok) throw new Error('Failed to upload file');
      const fileData = await uploadRes.json();

      const res = await apiRequest("POST", "/api/messages", {
        content: file.name,
        messageType: fileData.messageType,
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        duration: fileData.duration,
        conversationId,
      });

      return await res.json();
    },
    onMutate: async (variables) => {
      const { conversationId } = variables;
      
      // Cancel pending queries
      await queryClient.cancelQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      
      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        recipientId: null,
        senderId: user?.id || "",
        content: variables.file.name,
        messageType: variables.messageType as any,
        tone: null,
        toneSummary: null,
        toneEmoji: null,
        rewordingSuggestion: null,
        timestamp: new Date(),
        isUrgent: false,
        fileUrl: URL.createObjectURL(variables.file),
        fileName: variables.file.name,
        fileSize: String(variables.file.size),
        mimeType: variables.file.type,
        duration: variables.duration ? String(variables.duration) : null,
        transcript: null,
        status: "sent",
        deliveredAt: null,
        readAt: null,
        sharedItemType: null,
        sharedItemId: null,
        isDeleted: false,
        replyToId: null,
      };
      
      const previousMessages = queryClient.getQueryData<Message[]>(["/api/conversations", conversationId, "messages"]);
      
      queryClient.setQueryData(["/api/conversations", conversationId, "messages"], (old: Message[] | undefined) => [
        ...(old || []),
        optimisticMessage,
      ]);
      
      return { previousMessages };
    },
    onSuccess: (_data, variables) => {
      playNotificationSound('messageSent');
      
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", variables.conversationId, "messages"]
      });
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setRecordedAudioBlob(null);
      setRecordedAudioUrl(null);
      setRecordedVideoBlob(null);
      setRecordedVideoUrl(null);
      toast({
        title: "Message sent",
        description: "Your media message was sent successfully",
        duration: 3000,
      });
    },
    onError: (error: Error, variables, context: any) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["/api/conversations", variables.conversationId, "messages"],
          context.previousMessages
        );
      }
      toast({
        title: "Error",
        description: "Failed to send media message",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const sendVoiceNote = useMutation({
    mutationFn: async ({ audioBlob, duration, conversationId }: { audioBlob: Blob; duration: number; conversationId: string }) => {
      const formData = new FormData();
      const fileName = `voice-note-${Date.now()}.webm`;
      formData.append('audio', audioBlob, fileName);
      formData.append('duration', duration.toString());

      const uploadRes = await fetch('/api/voice-notes', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadRes.ok) throw new Error('Failed to upload voice note');
      const voiceData = await uploadRes.json();

      // Create message with voice note data, transcript, and AI tone analysis
      // Filter out "[Transcription unavailable]" - just use "Voice note" instead
      const transcriptText = voiceData.transcript && voiceData.transcript !== '[Transcription unavailable]' 
        ? voiceData.transcript 
        : null;
      const res = await apiRequest("POST", "/api/messages", {
        content: transcriptText || 'Voice note',
        messageType: 'audio',
        fileUrl: voiceData.fileUrl,
        fileName: voiceData.fileName,
        fileSize: voiceData.fileSize,
        mimeType: voiceData.mimeType,
        duration: voiceData.duration,
        transcript: transcriptText,
        tone: voiceData.tone,
        toneSummary: voiceData.toneSummary,
        toneEmoji: voiceData.toneEmoji,
        rewordingSuggestion: voiceData.rewordingSuggestion,
        conversationId,
      });

      return await res.json();
    },
    onMutate: async (variables) => {
      const { conversationId, duration } = variables;
      
      // Cancel pending queries
      await queryClient.cancelQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      
      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        recipientId: null,
        senderId: user?.id || "",
        content: 'Voice note',
        messageType: 'audio',
        tone: null,
        toneSummary: null,
        toneEmoji: null,
        rewordingSuggestion: null,
        timestamp: new Date(),
        isUrgent: false,
        fileUrl: URL.createObjectURL(variables.audioBlob),
        fileName: `voice-note-${Date.now()}.webm`,
        fileSize: String(variables.audioBlob.size),
        mimeType: 'audio/webm',
        duration: duration ? String(duration) : null,
        transcript: null,
        status: "sent",
        deliveredAt: null,
        readAt: null,
        sharedItemType: null,
        sharedItemId: null,
        isDeleted: false,
        replyToId: null,
      };
      
      const previousMessages = queryClient.getQueryData<Message[]>(["/api/conversations", conversationId, "messages"]);
      
      queryClient.setQueryData(["/api/conversations", conversationId, "messages"], (old: Message[] | undefined) => [
        ...(old || []),
        optimisticMessage,
      ]);
      
      return { previousMessages };
    },
    onSuccess: (_data, variables) => {
      playNotificationSound('messageSent');
      
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", variables.conversationId, "messages"]
      });
    },
    onError: (error: Error, variables, context: any) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["/api/conversations", variables.conversationId, "messages"],
          context.previousMessages
        );
      }
      toast({
        title: "Error",
        description: "Failed to send voice note",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  // Helper to get file extension from MIME type
  const getExtensionFromMimeType = (mimeType: string): string => {
    // Strip codec parameters (e.g., "audio/webm;codecs=opus" -> "audio/webm")
    const baseMimeType = mimeType.split(';')[0].trim();

    const mimeMap: { [key: string]: string } = {
      'audio/mp4': 'mp4',
      'audio/m4a': 'm4a',
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/ogg': 'ogg',
    };
    return mimeMap[baseMimeType] || baseMimeType.split('/')[1] || 'webm';
  };

  const handleSend = async (forceBypass: boolean = false) => {
    // Prevent double-send: block if already sending or analyzing
    if (sendTextMessage.isPending || sendMediaMessage.isPending || sendVoiceNote.isPending || isPreviewPending) return;

    // Track messaging activity
    trackActivity('messaging');

    // Close attachment tray when sending
    setShowAttachmentTray(false);

    // Media messages bypass tone check
    if (!conversationId) return;

    if (selectedFile) {
      const messageType = selectedFile.type.startsWith('image/') ? 'image' :
                         selectedFile.type.startsWith('video/') ? 'video' :
                         selectedFile.type.startsWith('audio/') ? 'audio' : 'document';
      sendMediaMessage.mutate({ file: selectedFile, messageType, conversationId });
      return;
    }

    if (recordedAudioBlob) {
      const mimeType = recordedAudioBlob.type || 'audio/webm';
      const extension = getExtensionFromMimeType(mimeType);
      const file = new File([recordedAudioBlob], `audio-${Date.now()}.${extension}`, { type: mimeType });
      sendMediaMessage.mutate({ file, messageType: 'audio', conversationId });
      return;
    }

    if (recordedVideoBlob) {
      const mimeType = recordedVideoBlob.type || 'video/webm';
      const extension = getExtensionFromMimeType(mimeType);
      const file = new File([recordedVideoBlob], `video-${Date.now()}.${extension}`, { type: mimeType });
      sendMediaMessage.mutate({ file, messageType: 'video', conversationId });
      return;
    }

    // Text message: AI analysis happens ONLY on Send press
    if (message.trim()) {
      // If force bypass (user clicked "Send original"), send immediately without checks
      if (forceBypass || hasConfirmedFlagged === message.trim()) {
        if (!conversationId) return;
        sendTextMessage.mutate({ content: message, conversationId, isUrgent, replyToId: replyToMessage?.id });
        setHasConfirmedFlagged(null); // Reset after send
        setTonePreview(null);
        return;
      }

      // If AI already analyzed this message and we're showing the modal, don't re-analyze
      if (tonePreview && tonePreview.originalMessage.trim() === message.trim() && showCESIntervention) {
        return; // Modal is already showing, wait for user choice
      }

      // AI Analysis: ONLY runs when user presses Send (not while typing)
      // Per product spec: "The AI analysis should run when the user presses Send"
      if (aiAnalysisEnabled && !isPreviewPending) {
        setIsPreviewPending(true);
        try {
          const res = await apiRequest("POST", "/api/messages/preview", { 
            content: message.trim(),
            conversationId: conversationId
          });
          const data = await res.json();
          
          // Check if message needs intervention based on CES or tone
          const cesNeedsIntervention = data.ces && 
            (data.ces.interventionLevel === "modal" || 
             data.ces.interventionLevel === "hard_block");
          
          const isHostile = data.tone === 'hostile';
          const hasSuggestion = data.ces?.deescalationSuggestion || data.rewordingSuggestion;
          
          // If neutral/healthy message (no escalation AND not hostile), send immediately
          if (!cesNeedsIntervention && !isHostile) {
            if (!conversationId) return;
            sendTextMessage.mutate({ content: message, conversationId, isUrgent, replyToId: replyToMessage?.id });
            return;
          }
          
          // If escalating or hostile, show the supportive suggestion modal
          // Normalize the data to ensure modal can render even without CES
          const normalizedData = {
            ...data,
            ces: data.ces || {
              score: isHostile ? 70 : 50,
              state: isHostile ? 'hostile' : 'escalating',
              phase: 'warm',
              interventionLevel: isHostile ? 'hard_block' : 'modal',
              trajectory: 'stable',
              signals: [{ type: 'tone', signal: 'escalating', weight: 1, description: 'This message may escalate conflict.' }],
              suggestedActions: [],
              pauseRecommended: false,
              childImpactReminder: false,
              deescalationSuggestion: data.rewordingSuggestion || null
            }
          };
          
          // Use rewording suggestion as fallback for CES deescalation suggestion
          if (!normalizedData.ces.deescalationSuggestion && data.rewordingSuggestion) {
            normalizedData.ces.deescalationSuggestion = data.rewordingSuggestion;
          }
          
          setTonePreview(normalizedData);
          setHasAttemptedSend(true);
          setShowCESIntervention(true);
          // Message is paused - user will choose from modal options
          
        } catch (error) {
          console.error('[Tone Analysis] Error:', error);
          // On error, send the message anyway - don't block user
          if (!conversationId) return;
          sendTextMessage.mutate({ content: message, conversationId, isUrgent, replyToId: replyToMessage?.id });
        } finally {
          setIsPreviewPending(false);
        }
        return;
      }

      // AI disabled or already pending - send immediately
      if (!conversationId) return;
      sendTextMessage.mutate({ content: message, conversationId, isUrgent, replyToId: replyToMessage?.id });
    }
  };

  // Desktop: Enter sends message, Shift+Enter creates new line
  // Mobile: Enter creates new line (users tap Send button)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Detect if user is on a touch device (mobile/tablet)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift+Enter always creates a new line (default behavior)
        return;
      }
      
      // On desktop: Enter sends the message
      // On mobile: Enter creates new line (let them use Send button)
      if (!isTouchDevice) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setFilePreviewUrl(URL.createObjectURL(file));
      }
      // Close attachment tray after file selection
      setShowAttachmentTray(false);
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      // Use compatible MIME type for better iOS support
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      audioRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[ChatInterface] Audio recording stopped, releasing microphone');
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedAudioBlob(blob);
        setRecordedAudioUrl(url);

        stream.getTracks().forEach(track => {
          track.stop();
          console.log('[ChatInterface] Stopped audio track:', track.kind, track.label);
        });
        audioStreamRef.current = null;
      };

      mediaRecorder.onerror = (event) => {
        console.error('[ChatInterface] Audio MediaRecorder error:', event);
        stream.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
        setIsRecordingAudio(false);
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);

      toast({
        title: "Recording started",
        description: "Recording audio message...",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to start audio recording:", error);
      toast({
        title: "Recording failed",
        description: "Could not access microphone",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecordingAudio) {
      audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
      toast({
        title: "Recording stopped",
        description: "Review your audio message",
        duration: 3000,
      });
    }
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
  };

  const cancelAudioRecording = () => {
    if (isRecordingAudio && audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      toast({
        title: "Recording cancelled",
        description: "Audio recording discarded",
        duration: 3000,
      });
    }
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      videoStreamRef.current = stream;
      videoChunksRef.current = [];

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(err => console.error("Video play error:", err));
      }

      const mediaRecorder = new MediaRecorder(stream);
      videoRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[ChatInterface] Video recording stopped, releasing camera');
        const mimeType = mediaRecorder.mimeType || 'video/webm';
        const blob = new Blob(videoChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedVideoBlob(blob);
        setRecordedVideoUrl(url);

        stream.getTracks().forEach(track => {
          track.stop();
          console.log('[ChatInterface] Stopped video track:', track.kind, track.label);
        });
        videoStreamRef.current = null;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('[ChatInterface] Video MediaRecorder error:', event);
        stream.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
        setIsRecordingVideo(false);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecordingVideo(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording started",
        description: "Recording video message...",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to start video recording:", error);
      toast({
        title: "Recording failed",
        description: "Could not access camera. Make sure you've granted camera permissions.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      toast({
        title: "Recording stopped",
        description: "Review your video message",
        duration: 3000,
      });
    }
  };

  const cancelVideoRecording = () => {
    if (isRecordingVideo && videoRecorderRef.current) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingDuration(0);

      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
      toast({
        title: "Recording cancelled",
        description: "Video recording discarded",
        duration: 3000,
      });
    }
    setRecordedVideoBlob(null);
    setRecordedVideoUrl(null);
  };

  // Call feature removed from MVP - focus on Conch Mode structured conversations

  const hasAnyMediaReady = !!(selectedFile || recordedAudioBlob || recordedVideoBlob);

  // Show loading state if messages are loading
  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className={`flex gap-2 max-w-[80%] ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-16 w-48 rounded-lg" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Solo mode: Show empty chat interface with guidance instead of blocking
  // User can explore the interface and will see prompt to connect when they try to message

  return (
    <div 
      className="flex h-full w-full overflow-hidden"
      style={{ overscrollBehavior: 'contain' }}
    >

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full min-h-0">
        {/* 🔒 FIXED HEADER - Stays locked at top */}
        {conversations.length > 0 && (
          <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-3 sm:px-4 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">

              <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedConversation?.type === 'direct' && selectedConversation.members?.find(m => m.id !== user?.id) && (
                <Avatar className="h-9 w-9 border-2 border-chart-2/20">
                  {selectedConversation.members.find(m => m.id !== user?.id)?.profileImageUrl ? (
                    <AvatarImage src={selectedConversation.members.find(m => m.id !== user?.id)?.profileImageUrl!} />
                  ) : (
                    <AvatarFallback className="bg-chart-2/15 text-chart-2 font-semibold text-sm">
                      {(selectedConversation.members.find(m => m.id !== user?.id)?.displayName || "C").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate min-w-0">
                  {selectedConversation
                    ? selectedConversation.type === 'direct'
                      ? selectedConversation.members?.find(m => m.id !== user?.id)?.displayName || 'Chat'
                      : selectedConversation.name || 'Group Chat'
                    : 'Chat'
                  }
                </h2>
                <p className="text-xs text-muted-foreground font-normal">Direct messaging</p>
              </div>
            </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Current User Indicator */}
              {user && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border" data-testid="current-user-indicator">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-foreground truncate max-w-[100px]">
                      {user.displayName}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {user.inviteCode}
                    </span>
                  </div>
                </div>
              )}
              
              <Button
                size="icon"
                variant={aiAnalysisEnabled ? "default" : "outline"}
                onClick={() => {
                  const newValue = !aiAnalysisEnabled;
                  setAiAnalysisEnabled(newValue);
                  localStorage.setItem('ai_tone_analysis_enabled', String(newValue));
                  toast({
                    title: newValue ? "AI Analysis On" : "AI Analysis Off",
                    description: newValue 
                      ? "Messages will be analyzed for tone" 
                      : "Tone analysis disabled",
                    duration: 2000,
                  });
                }}
                className="h-9 w-9"
                aria-label={aiAnalysisEnabled ? "Disable AI tone analysis" : "Enable AI tone analysis"}
                data-testid="button-toggle-ai-analysis"
              >
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        )}

      {/* Messages Area - Scrollable container */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
      <div ref={messagesContainerRef} className="p-3 sm:p-6 space-y-4 sm:space-y-6 pb-[200px] lg:pb-6">
        {partnerships.length === 0 ? (
          <ConnectWithPartner 
            title="Welcome to PeacePad!"
            subtitle="Connect with your co-parent to start messaging, share schedules, and coordinate together."
          />
        ) : conversations.length === 0 ? (
          <ConnectWithPartner 
            title="Start a Conversation"
            subtitle="You are connected with your co-parent. Start a new chat to begin messaging."
          />
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full w-full">
                <div className="text-center space-y-2">
                  <div className="bg-muted rounded-full p-4 mx-auto w-fit mb-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">No messages yet</h3>
                  <p className="text-sm text-muted-foreground">Send a message to start the conversation.</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const getSenderName = () => {
                    if (msg.senderId === user?.id) return "You";

                    const displayName = msg.senderDisplayName || 
                      (msg.senderFirstName && msg.senderLastName 
                        ? `${msg.senderFirstName} ${msg.senderLastName}` 
                        : msg.senderFirstName || "Guest User");

                    if (displayName.startsWith("Guest")) {
                      return "Guest User";
                    }
                    return displayName;
                  };

                  const isPending = typeof msg.id === 'string' && msg.id.startsWith('temp-');
                  const isNewest = index === messages.length - 1;

                  return (
                    <div 
                      key={msg.id}
                      className={isNewest ? "animate-in slide-in-from-bottom-2 duration-200" : ""}
                      style={isPending ? { opacity: 0.6 } : {}}
                    >
                      <MessageBubble
                        content={msg.content}
                        sender={msg.senderId === user?.id ? "me" : "coparent"}
                        timestamp={new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        senderName={getSenderName()}
                        senderAvatar={msg.senderProfileImage || undefined}
                        tone={aiAnalysisEnabled ? (msg.tone as ToneType | undefined) : undefined}
                        toneSummary={aiAnalysisEnabled ? (msg.toneSummary || undefined) : undefined}
                        toneEmoji={aiAnalysisEnabled ? (msg.toneEmoji || undefined) : undefined}
                        rewordingSuggestion={undefined}
                        messageType={msg.messageType || "text"}
                        fileUrl={msg.fileUrl || undefined}
                        fileName={msg.fileName || undefined}
                        mimeType={msg.mimeType || undefined}
                        transcript={msg.transcript && msg.transcript !== '[Transcription unavailable]' ? msg.transcript : undefined}
                        duration={msg.duration ? String(msg.duration) : undefined}
                        sharedItemType={msg.sharedItemType as "event" | "expense" | "task" | undefined}
                        isDeleted={msg.isDeleted || undefined}
                        status={(msg.status as "sent" | "delivered" | "read") || "sent"}
                        deliveredAt={msg.deliveredAt ? String(msg.deliveredAt) : null}
                        readAt={msg.readAt ? String(msg.readAt) : null}
                        createdAt={String(msg.timestamp)}
                        replyToMessage={msg.replyToId ? (() => {
                          const repliedMsg = messages.find((m: MessageWithSender) => m.id === msg.replyToId);
                          if (!repliedMsg) return null;
                          return {
                            id: repliedMsg.id,
                            content: repliedMsg.content,
                            senderName: repliedMsg.senderDisplayName || 'Unknown'
                          };
                        })() : null}
                        onReply={() => setReplyToMessage({
                          id: msg.id,
                          content: msg.content,
                          senderId: msg.senderId,
                          senderDisplayName: getSenderName()
                        })}
                      />
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </>
        )}

      </div>
      </div>

      {/* Removed duplicate VideoCallDialog - it's now handled globally in App.tsx via CallContext */}

      {/* Legacy tone warning removed - AI suggestions only appear in the pre-send modal */}

      {/* Video Recording Live Preview */}
      {isRecordingVideo && (
        <div className="p-4 bg-card border-t">
          <div className="max-w-md mx-auto space-y-3">
            <p className="text-sm font-semibold flex items-center justify-between text-foreground">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Recording video...
              </span>
              <span className="text-red-600 dark:text-red-400 font-mono text-lg">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
            </p>
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video object-cover"
              />
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                REC
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={stopVideoRecording}
                className="flex-1"
                data-testid="button-stop-video-recording"
              >
                <Check className="h-4 w-4 mr-2" />
                Stop & Review
              </Button>
              <Button
                onClick={cancelVideoRecording}
                variant="destructive"
                className="flex-1"
                data-testid="button-cancel-video-recording"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recorded Video Preview */}
      {recordedVideoBlob && recordedVideoUrl && !isRecordingVideo && (
        <div className="p-4 bg-card border-t">
          <div className="max-w-md mx-auto space-y-3">
            <p className="text-sm font-medium">Review your video message</p>
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                ref={recordedVideoPreviewRef}
                src={recordedVideoUrl}
                controls
                playsInline
                className="w-full aspect-video object-cover"
                data-testid="video-preview"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleSend()}
                disabled={sendMediaMessage.isPending}
                className="flex-1"
                data-testid="button-send-video"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMediaMessage.isPending ? "Sending..." : "Send Video"}
              </Button>
              <Button
                onClick={cancelVideoRecording}
                variant="outline"
                className="flex-1"
                data-testid="button-delete-video"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recorded Audio Preview */}
      {recordedAudioBlob && recordedAudioUrl && !isRecordingAudio && (
        <div className="p-4 bg-card border-t">
          <div className="max-w-md mx-auto space-y-3">
            <p className="text-sm font-medium">Review your audio message</p>
            <div className="p-3 bg-muted rounded-lg">
              <AudioPlayer audioUrl={recordedAudioUrl} />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleSend()}
                disabled={sendMediaMessage.isPending}
                className="flex-1"
                data-testid="button-send-audio"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMediaMessage.isPending ? "Sending..." : "Send Audio"}
              </Button>
              <Button
                onClick={cancelAudioRecording}
                variant="outline"
                className="flex-1"
                data-testid="button-delete-audio"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area - Fixed at Bottom on Mobile, Relative on Desktop */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-3 bg-background border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.3)] z-[60] md:z-auto">
        <div className="max-w-4xl mx-auto">
          {/* Reply Preview */}
          {replyToMessage && (
            <div className="mb-2 p-2 bg-muted/50 border-l-4 border-primary rounded-r-md flex items-start gap-2">
              <Reply className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary">
                  Replying to {replyToMessage.senderId === user?.id ? 'yourself' : (replyToMessage.senderDisplayName || 'them')}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {replyToMessage.content}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0"
                onClick={() => setReplyToMessage(null)}
                data-testid="button-cancel-reply"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* File Preview */}
          {selectedFile && (
            <div className="mb-3">
              <ImageUploadPreview
                file={selectedFile}
                previewUrl={filePreviewUrl || undefined}
                onRemove={() => {
                  setSelectedFile(null);
                  setFilePreviewUrl(null);
                }}
                onSend={handleSend}
                showSendButton={true}
                compressImage={true}
              />
            </div>
          )}

          {/* Audio Recording Indicator with Waveform */}
          {isRecordingAudio && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shrink-0"></span>
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Recording Audio</span>
                <span className="text-xs text-red-600 dark:text-red-400 ml-auto">
                  {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="bg-background rounded-md mb-3 overflow-hidden">
                <AudioWaveform 
                  stream={audioStreamRef.current} 
                  isRecording={true}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  onClick={stopAudioRecording}
                  className="min-h-[36px]"
                  data-testid="button-stop-audio-recording"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Stop & Review
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelAudioRecording}
                  className="min-h-[36px]"
                  data-testid="button-cancel-audio-recording"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* AI Suggestion Modal - calm blue/teal color system */}
          {/* All tiers use calming blues - deeper for more serious situations */}
          {showCESIntervention && tonePreview?.ces && (() => {
            const getTier = () => {
              if (!tonePreview?.ces) return 'gentle' as const;
              const { interventionLevel, state, score } = tonePreview.ces;
              if (interventionLevel === 'hard_block' && state === 'hostile') return 'critical' as const;
              if (interventionLevel === 'hard_block') return 'caution' as const;
              if (score > 60) return 'reframe' as const;
              return 'gentle' as const;
            };

            const tierColors = {
              gentle: {
                bg: 'bg-sky-50/80 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/50',
                iconBg: 'bg-sky-100 dark:bg-sky-900/40',
                icon: 'text-sky-600 dark:text-sky-400',
                header: 'text-sky-800 dark:text-sky-200',
                desc: 'text-sky-700 dark:text-sky-300',
                close: 'text-sky-500 dark:text-sky-400',
                title: 'A calmer way to say this',
                descText: "Here's a gentler version that keeps your message clear.",
                descNoSuggestion: 'You might want to rephrase this to keep the conversation warm.',
                sendOriginalStyle: 'text-muted-foreground',
              },
              reframe: {
                bg: 'bg-blue-50/80 dark:bg-blue-950/25 border border-blue-200/70 dark:border-blue-800/50',
                iconBg: 'bg-blue-100 dark:bg-blue-900/40',
                icon: 'text-blue-600 dark:text-blue-400',
                header: 'text-blue-800 dark:text-blue-200',
                desc: 'text-blue-700 dark:text-blue-300',
                close: 'text-blue-500 dark:text-blue-400',
                title: "Let's soften this a bit",
                descText: "This might come across stronger than intended. Here's an alternative.",
                descNoSuggestion: 'Consider rephrasing to keep things constructive.',
                sendOriginalStyle: 'text-muted-foreground',
              },
              caution: {
                bg: 'bg-indigo-50/80 dark:bg-indigo-950/25 border border-indigo-200/70 dark:border-indigo-800/50',
                iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
                icon: 'text-indigo-600 dark:text-indigo-400',
                header: 'text-indigo-800 dark:text-indigo-200',
                desc: 'text-indigo-700 dark:text-indigo-300',
                close: 'text-indigo-500 dark:text-indigo-400',
                title: 'A moment to pause',
                descText: "This message has strong language. Here's a calmer alternative.",
                descNoSuggestion: 'Consider rephrasing before sending to keep communication constructive.',
                sendOriginalStyle: 'text-indigo-600 dark:text-indigo-400',
              },
              critical: {
                bg: 'bg-slate-100/80 dark:bg-slate-900/40 border-2 border-slate-300 dark:border-slate-600',
                iconBg: 'bg-teal-100 dark:bg-teal-900/40',
                icon: 'text-teal-700 dark:text-teal-400',
                header: 'text-slate-800 dark:text-slate-200',
                desc: 'text-slate-600 dark:text-slate-300',
                close: 'text-slate-500 dark:text-slate-400',
                title: 'Take a breath before sending',
                descText: 'This message could escalate things. Here\'s a calmer way to express this.',
                descNoSuggestion: 'This message may escalate the conversation. Take a moment to rephrase.',
                sendOriginalStyle: 'text-slate-500 dark:text-slate-400',
              },
            };

            const tier = getTier();
            const colors = tierColors[tier];

            return (
            <div className={`mb-2 rounded-2xl p-4 shadow-lg animate-slide-up ${colors.bg}`} data-testid="ces-intervention-modal">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${colors.iconBg}`}>
                  <Sparkles className={`h-5 w-5 ${colors.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${colors.header}`}>
                    {colors.title}
                  </p>
                  
                  <p className={`text-sm mt-1 ${colors.desc}`}>
                    {tonePreview.ces.deescalationSuggestion
                      ? colors.descText
                      : colors.descNoSuggestion}
                  </p>

                  {/* Child Impact Reminder - Supportive, not accusatory */}
                  {tonePreview.ces.childImpactReminder && !shownChildReminder && (
                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Staying calm helps keep decisions focused on the children.
                      </p>
                    </div>
                  )}

                  {/* Suggested Alternative */}
                  {tonePreview.ces.deescalationSuggestion && (
                    <div className="mt-3 p-3 bg-muted/50 border border-border rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        A calmer version you could send:
                      </p>
                      <p className="text-sm text-foreground italic">
                        "{tonePreview.ces.deescalationSuggestion}"
                      </p>
                    </div>
                  )}

                  {/* Three Clear Action Buttons */}
                  <div className="mt-4 flex flex-col gap-2">
                    {/* Option 1: Use suggested version */}
                    {tonePreview.ces.deescalationSuggestion && (
                      <Button
                        size="sm"
                        onClick={() => {
                          const suggestion = tonePreview.ces!.deescalationSuggestion || "";
                          setShowCESIntervention(false);
                          setTonePreview(null);
                          if (tonePreview.ces?.childImpactReminder) {
                            setShownChildReminder(true);
                          }
                          if (!conversationId) return;
                          sendTextMessage.mutate({ content: suggestion, conversationId, isUrgent, replyToId: replyToMessage?.id });
                          setMessage("");
                          setReplyToMessage(null);
                        }}
                        className="w-full justify-center bg-primary text-white"
                        data-testid="button-ces-use-suggested"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Use suggested version
                      </Button>
                    )}
                    
                    {/* Option 2: Edit suggested version (or edit original if no suggestion) */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (tonePreview.ces?.deescalationSuggestion) {
                          setMessage(tonePreview.ces.deescalationSuggestion);
                        }
                        setShowCESIntervention(false);
                        setTonePreview(null);
                        if (tonePreview.ces?.childImpactReminder) {
                          setShownChildReminder(true);
                        }
                        textareaRef.current?.focus();
                      }}
                      className="w-full justify-center"
                      data-testid="button-ces-edit-suggested"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      {tonePreview.ces.deescalationSuggestion ? 'Edit suggested version' : 'Edit my message'}
                    </Button>
                    
                    {/* Option 3: Send original message */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowCESIntervention(false);
                        setTonePreview(null);
                        if (tonePreview.ces?.childImpactReminder) {
                          setShownChildReminder(true);
                        }
                        if (!conversationId) return;
                        sendTextMessage.mutate({ content: message, conversationId, isUrgent, replyToId: replyToMessage?.id });
                        setMessage("");
                        setReplyToMessage(null);
                      }}
                      className={`w-full justify-center ${colors.sendOriginalStyle}`}
                      data-testid="button-ces-send-original"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send original message
                    </Button>
                  </div>
                </div>
                
                {/* Close button */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setShowCESIntervention(false);
                    setTonePreview(null);
                  }}
                  className={`h-6 w-6 ${colors.close}`}
                  data-testid="button-close-suggestion-modal"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            );
          })()}

          {/* Understanding Check Prompt - Shows when replying to emotional messages */}
          {showUnderstandingCheck && emotionalMessage && selectedConversation && (
            <div className="mb-3">
              <UnderstandingCheck
                partnerName={
                  selectedConversation.members.find(m => m.id !== user?.id)?.displayName || 
                  emotionalMessage.senderDisplayName || 
                  "your co-parent"
                }
                originalMessage={emotionalMessage.content || ""}
                onReflect={handleReflect}
                onSkip={handleSkipUnderstanding}
                onDismiss={handleSkipUnderstanding}
              />
            </div>
          )}

          {/* Summarization Prompt - When user chooses to reflect */}
          {showSummarizationPrompt && emotionalMessage && selectedConversation && (
            <div className="mb-3">
              <SummarizationPrompt
                originalContent={emotionalMessage.content || ""}
                senderName={
                  selectedConversation.members.find(m => m.id !== user?.id)?.displayName || 
                  emotionalMessage.senderDisplayName || 
                  "your co-parent"
                }
                onValidationComplete={handleValidationComplete}
                onSkip={handleSkipUnderstanding}
                context="chat"
              />
            </div>
          )}

          {/* Listening Feedback - Shows validation results */}
          {showListeningFeedback && validationResult && (
            <div className="mb-3">
              <ListeningFeedback
                result={validationResult}
                onContinue={handleContinueFromFeedback}
                onTryAgain={handleTryAgain}
              />
            </div>
          )}

          {/* WhatsApp-style Input Bar */}
          <div className="relative">
            {/* Attachment Tray - Expands above input */}
            {showAttachmentTray && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border rounded-2xl shadow-lg p-3 flex items-start justify-around gap-2 animate-slide-up" data-testid="attachment-tray">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachmentTray(false);
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover-elevate active-elevate-2 transition-all"
                  disabled={hasAnyMediaReady || isRecordingAudio || isRecordingVideo}
                  data-testid="button-attach-document"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">File</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentTray(false);
                    setLocation("/scheduling");
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover-elevate active-elevate-2 transition-all"
                  disabled={hasAnyMediaReady || isRecordingAudio || isRecordingVideo}
                  data-testid="button-share-event"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-blue-500" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Calendar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentTray(false);
                    setLocation("/expenses");
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover-elevate active-elevate-2 transition-all"
                  disabled={hasAnyMediaReady || isRecordingAudio || isRecordingVideo}
                  data-testid="button-share-expense"
                >
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Expense</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentTray(false);
                    setLocation("/tasks");
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover-elevate active-elevate-2 transition-all"
                  disabled={hasAnyMediaReady || isRecordingAudio || isRecordingVideo}
                  data-testid="button-share-task"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <CheckSquare className="h-6 w-6 text-purple-500" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Task</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUrgent(!isUrgent);
                    toast({
                      title: isUrgent ? "Removed urgent flag" : "Marked as urgent",
                      description: isUrgent 
                        ? "Message will send normally" 
                        : "Your co-parent will receive a push notification",
                      duration: 2000,
                    });
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover-elevate active-elevate-2 transition-all"
                  data-testid="button-mark-urgent"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isUrgent ? 'bg-orange-500' : 'bg-orange-500/10'}`}>
                    <AlertTriangle className={`h-6 w-6 ${isUrgent ? 'text-white' : 'text-orange-500'}`} />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Urgent</span>
                </button>
              </div>
            )}

            <div className="rounded-[28px] shadow-lg bg-secondary/40 border border-primary/10 flex items-end gap-2 px-2 py-2 backdrop-blur-sm transition-all focus-within:shadow-xl focus-within:border-primary/20">
              {/* Plus Button - Left side */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowAttachmentTray(!showAttachmentTray)}
                className="shrink-0 h-10 w-10 rounded-full hover:bg-background/80 transition-colors mb-0.5"
                aria-label="Show attachment options"
                disabled={hasAnyMediaReady || isRecordingAudio || isRecordingVideo}
                data-testid="button-toggle-attachments"
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
              </Button>

              {/* Message Input - Center, expandable */}
              <div className="flex-1 relative min-h-[48px] flex items-center">
                {/* AI analysis indicator - positioned above textarea to prevent overlap */}
                {previewTone.isPending && (
                  <div className="absolute -top-7 left-0 text-xs text-muted-foreground flex items-center gap-1 pointer-events-none bg-card/90 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border/50">
                    <Sparkles className="h-3 w-3 animate-pulse text-purple-500" />
                    <span>Analyzing...</span>
                  </div>
                )}
                <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  const newMessage = e.target.value;
                  setMessage(newMessage);
                  if (tonePreview && newMessage.trim() !== tonePreview.originalMessage) {
                    setTonePreview(null);
                    setHasAttemptedSend(false);
                  }
                  if (newMessage.trim()) {
                    trackActivity('messaging');
                  }
                }}
                onKeyPress={handleKeyPress}
                onFocus={handleInputFocus}
                placeholder="Message..."
                className="resize-none border-0 text-[16px] leading-snug focus-visible:ring-0 min-h-[44px] max-h-[200px] w-full bg-transparent py-3 px-1 text-foreground placeholder:text-muted-foreground/60 placeholder:font-normal overflow-y-auto scrollbar-none"
                rows={1}
                data-testid="input-message"
                disabled={sendTextMessage.isPending || sendMediaMessage.isPending || hasAnyMediaReady || isRecordingAudio || isRecordingVideo}
              />
              </div>

            {/* Right side: Voice Note Recorder OR Send Button */}
            {!message.trim() && !hasAnyMediaReady && conversationId && (
              <div className="shrink-0 mb-0.5">
                <VoiceNoteRecorder
                  onSend={async (audioBlob, duration) => {
                    await sendVoiceNote.mutateAsync({ audioBlob, duration, conversationId });
                  }}
                  disabled={sendVoiceNote.isPending || isRecordingAudio || isRecordingVideo}
                />
              </div>
            )}

            {(message.trim() || hasAnyMediaReady) && (
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={sendTextMessage.isPending || sendMediaMessage.isPending || isPreviewPending || isRecordingAudio || isRecordingVideo}
                className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-10 w-10 shadow-sm transition-all duration-200 active:scale-95 mb-0.5"
                aria-label="Send message"
                data-testid="button-send-message"
              >
                {sendTextMessage.isPending || sendMediaMessage.isPending || isPreviewPending ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-4.5 w-4.5" />
                )}
              </Button>
            )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            data-testid="input-file"
          />

        </div>
      </div>
      </div>

      {/* Invite Code Dialog */}
      <AlertDialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Share Your Invite Code</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Share this QR code or invite code with your co-parent to connect on PeacePad
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {/* QR Code */}
            {user?.inviteCode && (
              <div className="flex justify-center p-4 bg-white dark:bg-card rounded-xl border" style={{ width: 'fit-content', margin: '0 auto' }}>
                <div style={{ width: '200px', height: '200px' }}>
                  <QRCodeSVG 
                    value={`${window.location.origin}/join/${user.inviteCode}`} 
                    size={200} 
                    level="M"
                    includeMargin={true}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* Invite Code */}
            <div className="w-full space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Invite Code</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-muted rounded-lg font-mono text-lg text-center font-bold">
                  {user?.inviteCode || 'N/A'}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={async () => {
                    if (user?.inviteCode) {
                      await navigator.clipboard.writeText(user.inviteCode);
                      toast({
                        title: "Copied!",
                        description: "Invite code copied to clipboard",
                        duration: 2000,
                      });
                    }
                  }}
                  className="h-12 w-12 shrink-0"
                  aria-label="Copy invite code"
                  data-testid="button-copy-invite-code"
                >
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Share Link */}
            <div className="w-full">
              <Button
                className="w-full"
                variant="default"
                onClick={async () => {
                  const inviteCode = user?.inviteCode;
                  if (!inviteCode) return;

                  const baseUrl = window.location.origin;
                  const inviteLink = `${baseUrl}/join/${inviteCode}`;
                  const shareMessage = `I'm using PeacePad for co-parenting coordination. Join me: ${inviteLink}`;

                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title: "Join me on PeacePad",
                        text: shareMessage,
                        url: inviteLink,
                      });
                      toast({ 
                        title: "Shared!", 
                        description: "Invite sent successfully", 
                        duration: 3000 
                      });
                      setShowInviteDialog(false);
                    } else {
                      await navigator.clipboard.writeText(shareMessage);
                      toast({ 
                        title: "Link copied!", 
                        description: "Paste this in SMS, WhatsApp, or email", 
                        duration: 4000 
                      });
                    }
                  } catch (error: any) {
                    if (error.name !== 'AbortError') {
                      toast({ 
                        title: "Error sharing", 
                        description: "Please try copying manually", 
                        variant: "destructive", 
                        duration: 3000 
                      });
                    }
                  }
                }}
                data-testid="button-share-invite-link"
              >
                Share Invite Link
              </Button>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-close-invite-dialog">Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Join Partnership Dialog */}
      <AlertDialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Join with Invite Code</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Enter the invite code shared by your co-parent to connect
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Invite Code</label>
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter code..."
                className="text-center font-mono text-lg uppercase"
                maxLength={8}
                data-testid="input-join-code"
              />
            </div>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              data-testid="button-cancel-join"
              onClick={() => {
                setJoinCode("");
                setShowJoinDialog(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => {
                if (!joinCode.trim()) {
                  toast({
                    title: "Invalid Code",
                    description: "Please enter a valid invite code",
                    variant: "destructive",
                    duration: 3000,
                  });
                  return;
                }
                // Navigate to join partnership page
                setShowJoinDialog(false);
                setLocation(`/join/${joinCode.trim()}`);
                setJoinCode("");
              }}
              disabled={!joinCode.trim()}
              data-testid="button-submit-join-code"
            >
              Join Partnership
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}