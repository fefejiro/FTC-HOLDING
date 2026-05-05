import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, MessageCircle, RefreshCw, Send, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConnectWithPartner } from "@/components/ConnectWithPartner";
import MessageBubble from "@/components/MessageBubble";
import type { Message } from "@shared/schema";
import { daysSince, trackEvent } from "@/lib/analytics";

type ConversationMember = {
  id: string;
  displayName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl: string | null;
};

type Conversation = {
  id: string;
  name: string | null;
  type: "direct" | "group";
  members: ConversationMember[];
};

type MessageWithSender = Message & {
  senderDisplayName?: string;
  senderFirstName?: string;
  senderLastName?: string;
  senderProfileImage?: string;
};

type PreviewPayload = {
  tone: string;
  summary: string;
  emoji: string;
  rewordingSuggestion: string | null;
  originalMessage: string;
  ces?: {
    state?: string;
    deescalationSuggestion?: string | null;
  } | null;
};

type AnalysisDisplay = "calm" | "concerning" | "hostile";

type PendingSendDecision = {
  acceptedSuggestion: boolean;
  originalTone: string | null;
  usedRewording: boolean;
};

const PREPARED_MESSAGE_KEY = "preparedMessage";
const PREPARED_MESSAGE_TIMESTAMP_KEY = "peacepad_last_prep_chat_draft_at";

function getConversationDraftKey(conversationId?: string): string | null {
  return conversationId ? `peacepad_message_draft_${conversationId}` : null;
}

function formatMessageTime(value?: string | Date | null): string {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPartnerName(conversation: Conversation | null, userId?: string): string {
  if (!conversation) {
    return "your co-parent";
  }

  const otherMember = conversation.members.find((member) => member.id !== userId);
  if (!otherMember) {
    return "your co-parent";
  }

  return (
    otherMember.displayName ||
    [otherMember.firstName, otherMember.lastName].filter(Boolean).join(" ") ||
    "your co-parent"
  );
}

function getAnalysisDisplay(preview: PreviewPayload | null): AnalysisDisplay | null {
  if (!preview) {
    return null;
  }

  const tone = preview.tone?.toLowerCase();
  const state = preview.ces?.state?.toLowerCase();

  if (tone === "hostile" || tone === "escalating" || state === "hostile" || state === "escalating") {
    return "hostile";
  }

  if (["defensive", "frustrated", "tense", "confrontational"].includes(tone) || state === "defensive") {
    return "concerning";
  }

  return "calm";
}

function getToneLabel(preview: PreviewPayload | null, display: AnalysisDisplay | null): string {
  if (!preview || !display) {
    return "";
  }

  if (display === "calm") {
    return "Calm and ready";
  }

  if (display === "hostile") {
    return "Likely to escalate";
  }

  const tone = preview.tone?.toLowerCase() || "";
  if (tone === "defensive") {
    return "Could feel defensive";
  }
  if (tone === "frustrated") {
    return "Could feel frustrated";
  }
  return "Feels tense";
}

function getToneExplanation(preview: PreviewPayload | null, display: AnalysisDisplay | null): string {
  if (!preview || !display) {
    return "";
  }

  if (display === "calm") {
    return "This draft reads calm, clear, and ready to send.";
  }

  if (display === "hostile") {
    return "This message may increase conflict. A calmer version could land better.";
  }

  return "This may feel tense and could raise the temperature of the conversation.";
}

export default function MvpChatInterface() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [analysis, setAnalysis] = useState<PreviewPayload | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [composedTrackedForDraft, setComposedTrackedForDraft] = useState(false);
  const [decisionContext, setDecisionContext] = useState<PendingSendDecision | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const handledPreparedDraftRef = useRef(false);

  const { data: partnerships = [] } = useQuery<any[]>({
    queryKey: ["/api/partnerships"],
    enabled: Boolean(user),
  });

  const { data: allConversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: Boolean(user),
  });

  const activePartnership = useMemo(() => {
    if (!user?.activePartnershipId) {
      return partnerships[0] ?? null;
    }

    return partnerships.find((partnership) => partnership.id === user.activePartnershipId) ?? null;
  }, [partnerships, user?.activePartnershipId]);

  const conversations = useMemo(() => {
    if (!user || !activePartnership) {
      return [];
    }

    const partnerId = activePartnership.user1Id === user.id ? activePartnership.user2Id : activePartnership.user1Id;
    return allConversations.filter((conversation) =>
      conversation.members.some((member) => member.id === partnerId),
    );
  }, [activePartnership, allConversations, user]);

  const conversation = useMemo(() => {
    if (!selectedConversation) {
      return conversations[0] ?? null;
    }

    return conversations.find((item) => item.id === selectedConversation.id) ?? conversations[0] ?? null;
  }, [conversations, selectedConversation]);

  useEffect(() => {
    if (conversation && conversation.id !== selectedConversation?.id) {
      setSelectedConversation(conversation);
    }
  }, [conversation, selectedConversation?.id]);

  const { data: messages = [] } = useQuery<MessageWithSender[]>({
    queryKey: conversation ? ["/api/conversations", conversation.id, "messages"] : [],
    enabled: Boolean(conversation),
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${conversation?.id}/messages`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load messages");
      }
      return response.json();
    },
  });

  const draftStorageKey = getConversationDraftKey(conversation?.id);

  useEffect(() => {
    if (!conversation) {
      setMessage("");
      setAnalysis(null);
      setAnalysisMessage("");
      setDecisionContext(null);
      return;
    }

    const preparedMessage = localStorage.getItem(PREPARED_MESSAGE_KEY);
    if (preparedMessage && !handledPreparedDraftRef.current) {
      handledPreparedDraftRef.current = true;
      setMessage(preparedMessage);
      setComposedTrackedForDraft(false);
      setAnalysis(null);
      setAnalysisMessage("");
      setDecisionContext({
        acceptedSuggestion: false,
        originalTone: null,
        usedRewording: false,
      });
      localStorage.removeItem(PREPARED_MESSAGE_KEY);
      window.setTimeout(() => textareaRef.current?.focus(), 0);
      return;
    }

    const savedDraft = draftStorageKey ? localStorage.getItem(draftStorageKey) : "";
    setMessage(savedDraft || "");
    setComposedTrackedForDraft(Boolean(savedDraft?.trim()));
    setAnalysis(null);
    setAnalysisMessage("");
    setDecisionContext(null);
  }, [conversation, draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey) {
      return;
    }

    const draft = message.trim();
    if (!draft) {
      localStorage.removeItem(draftStorageKey);
      return;
    }

    localStorage.setItem(draftStorageKey, message);
  }, [draftStorageKey, message]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, analysisMessage]);

  useEffect(() => {
    if (!user || !conversation || messages.length === 0) {
      return;
    }

    const unread = messages.filter((item) => item.senderId !== user.id && item.status !== "read");
    unread.forEach((item, index) => {
      window.setTimeout(() => {
        void apiRequest("PATCH", `/api/messages/${item.id}/read`).catch(() => {
          // Ignore read receipt failures.
        });
      }, index * 40);
    });
  }, [conversation, messages, user]);

  const previewTone = useMutation({
    mutationFn: async (content: string) => {
      if (!conversation) {
        throw new Error("Choose a conversation first");
      }

      const response = await apiRequest("POST", "/api/messages/preview", {
        content,
        conversationId: conversation.id,
      });
      return response.json() as Promise<PreviewPayload>;
    },
    onSuccess: (data) => {
      const display = getAnalysisDisplay(data);
      const suggestion = data.ces?.deescalationSuggestion || data.rewordingSuggestion;

      setAnalysis(data);
      setAnalysisMessage(data.originalMessage);

      trackEvent("tone_analysis_shown", {
        tone_result: display,
        had_suggestion: Boolean(suggestion),
      });

      if (display === "calm") {
        trackEvent("tone_check_result_safe");
      } else if (display === "hostile") {
        trackEvent("tone_check_result_hostile", {
          original_tone: data.tone,
        });
      } else {
        trackEvent("tone_check_result_concerning", {
          original_tone: data.tone,
        });
      }

      if (suggestion) {
        trackEvent("rewording_suggested", {
          original_tone: data.tone,
          suggestion_length: suggestion.length,
        });
      }
    },
    onError: () => {
      toast({
        title: "Tone check unavailable",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const draft = message.trim();
    if (!conversation || !draft) {
      return;
    }

    if (previewTone.isPending || analysisMessage === draft) {
      return;
    }

    const timer = window.setTimeout(() => {
      trackEvent("tone_check_started", {
        trigger: "auto",
      });
      previewTone.mutate(draft);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [analysisMessage, conversation, message, previewTone]);

  const sendTextMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!conversation) {
        throw new Error("Choose a conversation first");
      }

      const response = await apiRequest("POST", "/api/messages", {
        content,
        conversationId: conversation.id,
      });
      return response.json() as Promise<MessageWithSender>;
    },
    onSuccess: async (_message, content) => {
      const currentDisplay = getAnalysisDisplay(analysis);
      const hadAnalysis = Boolean(
        analysis &&
          (analysisMessage === content || decisionContext?.acceptedSuggestion || decisionContext?.usedRewording),
      );
      const usedRewording = Boolean(decisionContext?.usedRewording);

      trackEvent("message_sent", {
        used_rewording: usedRewording,
        tone_at_send: hadAnalysis ? currentDisplay : null,
      });

      if (hadAnalysis) {
        trackEvent("message_sent_after_analysis", {
          accepted_suggestion: Boolean(decisionContext?.acceptedSuggestion),
        });
      }

      if (usedRewording && !localStorage.getItem("peacepad_first_reword_accept")) {
        localStorage.setItem("peacepad_first_reword_accept", "true");
        trackEvent("first_reword_accept", {
          days_since_signup: daysSince(user?.createdAt || null),
        });
      }

      const prepChatDraftAt = localStorage.getItem(PREPARED_MESSAGE_TIMESTAMP_KEY);
      const usedPrepChatDraft = Boolean(prepChatDraftAt);
      if (prepChatDraftAt) {
        const draftedAt = new Date(prepChatDraftAt);
        const elapsedMs = Number.isFinite(draftedAt.getTime()) ? Math.max(0, Date.now() - draftedAt.getTime()) : null;
        trackEvent("prep_chat_to_message_sent", {
          time_from_draft: elapsedMs,
        });
        localStorage.removeItem(PREPARED_MESSAGE_TIMESTAMP_KEY);
      }

      if ((currentDisplay === "calm" || !hadAnalysis) && !localStorage.getItem("peacepad_first_calm_message")) {
        localStorage.setItem("peacepad_first_calm_message", "true");
        trackEvent("first_calm_message_sent", {
          used_prep_chat: usedPrepChatDraft,
          used_rewording: usedRewording,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: ["/api/conversations", conversation?.id, "messages"],
      });

      setMessage("");
      setAnalysis(null);
      setAnalysisMessage("");
      setDecisionContext(null);
      setComposedTrackedForDraft(false);
      if (draftStorageKey) {
        localStorage.removeItem(draftStorageKey);
      }
    },
    onError: () => {
      toast({
        title: "Message not sent",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const analysisDisplay = getAnalysisDisplay(analysis);
  const suggestion = analysis?.ces?.deescalationSuggestion || analysis?.rewordingSuggestion;
  const hasFreshAnalysis = Boolean(analysis && analysisMessage === message.trim());
  const resolutionRequired = Boolean(hasFreshAnalysis && analysisDisplay && analysisDisplay !== "calm");
  const partnerName = getPartnerName(conversation, user?.id);

  const runToneCheck = (trigger: "manual" | "send") => {
    const draft = message.trim();
    if (!draft || previewTone.isPending) {
      return;
    }

    trackEvent("tone_check_started", {
      trigger,
    });

    previewTone.mutate(draft);
  };

  const performSend = (
    contentOverride?: string,
    options?: { acceptedSuggestion?: boolean; rejectedSuggestion?: boolean; usedRewording?: boolean },
  ) => {
    const content = (contentOverride ?? message).trim();
    if (!content || sendTextMessage.isPending) {
      return;
    }

    if (options?.rejectedSuggestion && analysis) {
      trackEvent("rewording_rejected", {
        original_tone: analysis.tone,
      });
      trackEvent("original_sent_anyway", {
        original_tone: analysis.tone,
      });
    }

    setDecisionContext({
      acceptedSuggestion: Boolean(options?.acceptedSuggestion),
      originalTone: analysis?.tone ?? null,
      usedRewording: Boolean(options?.usedRewording),
    });
    sendTextMessage.mutate(content);
  };

  const handlePrimarySend = () => {
    if (!message.trim() || sendTextMessage.isPending || previewTone.isPending) {
      return;
    }

    if (!hasFreshAnalysis) {
      runToneCheck("send");
      return;
    }

    if (resolutionRequired) {
      return;
    }

    performSend(message, {
      acceptedSuggestion: Boolean(decisionContext?.acceptedSuggestion),
      usedRewording: Boolean(decisionContext?.usedRewording),
    });
  };

  const handleUseSuggestion = () => {
    if (!suggestion) {
      return;
    }

    trackEvent("rewording_accepted", {
      original_tone: analysis?.tone,
    });
    trackEvent("tone_suggestion_used", {
      original_tone: analysis?.tone,
    });

    setMessage(suggestion);
    setAnalysis(null);
    setAnalysisMessage("");
    setDecisionContext({
      acceptedSuggestion: true,
      originalTone: analysis?.tone ?? null,
      usedRewording: true,
    });
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleEditMessage = () => {
    textareaRef.current?.focus();
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);

    if (!value.trim()) {
      setComposedTrackedForDraft(false);
      setAnalysis(null);
      setAnalysisMessage("");
      setDecisionContext(null);
      return;
    }

    if (!composedTrackedForDraft) {
      setComposedTrackedForDraft(true);
      trackEvent("message_composed", {
        has_partnership: Boolean(activePartnership),
        is_first_message: messages.length === 0,
      });
    }

    if (analysis && analysisMessage !== value.trim()) {
      setAnalysis(null);
      setAnalysisMessage("");
      if (!decisionContext?.usedRewording) {
        setDecisionContext(null);
      }
    }
  };

  const sendButtonLabel = resolutionRequired
    ? "Choose an option above"
    : hasFreshAnalysis
      ? "Send message"
      : "Check tone to send";

  if (!activePartnership) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-6">
        <ConnectWithPartner
          title="Invite your co-parent"
          subtitle="Share your link to unlock messaging together."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-3">
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground">
            Pause before you send, and keep the next message calm and usable.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setLocation("/prep-chat?entry=messages")}>
          Prep Chat
        </Button>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/60">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{partnerName}</CardTitle>
              <CardDescription>Message history and before-you-send tone guidance.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {conversations.length > 1 && conversations.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={conversation?.id === item.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedConversation(item)}
                >
                  {getPartnerName(item, user?.id)}
                </Button>
              ))}
              <Badge variant="outline" className="bg-muted/40">
                {messages.length} {messages.length === 1 ? "message" : "messages"}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 py-8 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">No messages yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start with a calm first message, or open Prep Chat if you want help getting the wording right.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => setLocation("/prep-chat?entry=messages")}>
                  Open Prep Chat
                </Button>
              </div>
            ) : (
              messages.map((item) => (
                <MessageBubble
                  key={item.id}
                  content={item.content || ""}
                  sender={item.senderId === user?.id ? "me" : "coparent"}
                  senderName={
                    item.senderId === user?.id
                      ? user?.displayName || "You"
                      : item.senderDisplayName || partnerName
                  }
                  senderAvatar={item.senderId === user?.id ? user?.profileImageUrl || undefined : item.senderProfileImage || undefined}
                  timestamp={formatMessageTime(item.timestamp)}
                  tone={item.tone as any}
                  toneSummary={item.toneSummary || undefined}
                  status={item.status as "sent" | "delivered" | "read"}
                  deliveredAt={item.deliveredAt ? String(item.deliveredAt) : null}
                  readAt={item.readAt ? String(item.readAt) : null}
                  createdAt={item.timestamp ? String(item.timestamp) : undefined}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="space-y-3 border-t border-border/60 pt-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-sm text-muted-foreground">
                Before you send, check how this might land.
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLocation("/prep-chat?entry=messages")}>
                Need help first?
              </Button>
            </div>

            {analysis && hasFreshAnalysis && analysisDisplay && (
              <div
                className={[
                  "rounded-2xl border p-4",
                  analysisDisplay === "calm"
                    ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : analysisDisplay === "hostile"
                      ? "border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/20"
                      : "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/20",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full",
                      analysisDisplay === "calm"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                        : analysisDisplay === "hostile"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
                    ].join(" ")}
                  >
                    {analysisDisplay === "calm" ? (
                      <Check className="h-4 w-4" />
                    ) : analysisDisplay === "hostile" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <p className="font-medium">{getToneLabel(analysis, analysisDisplay)}</p>
                      <p className="text-sm text-muted-foreground">
                        {getToneExplanation(analysis, analysisDisplay)}
                      </p>
                    </div>

                    {suggestion && analysisDisplay !== "calm" && (
                      <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Suggested calmer version
                        </p>
                        <p className="text-sm leading-relaxed text-foreground">{suggestion}</p>
                      </div>
                    )}

                    {analysisDisplay !== "calm" && (
                      <div className="flex flex-wrap gap-2">
                        {suggestion && (
                          <Button type="button" size="sm" onClick={handleUseSuggestion}>
                            Use this
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="outline" onClick={handleEditMessage}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            performSend(message, {
                              rejectedSuggestion: true,
                              usedRewording: false,
                            })
                          }
                        >
                          Send anyway
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border/70 bg-background p-3 shadow-sm">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(event) => handleMessageChange(event.target.value)}
                placeholder="Write a message to your co-parent..."
                className="min-h-[112px] resize-none border-0 bg-transparent p-0 text-base focus-visible:ring-0"
                disabled={previewTone.isPending || sendTextMessage.isPending}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => runToneCheck("manual")}
                disabled={!message.trim() || previewTone.isPending || sendTextMessage.isPending}
              >
                {previewTone.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Check tone
              </Button>

              <Button
                type="button"
                onClick={handlePrimarySend}
                disabled={!message.trim() || sendTextMessage.isPending || previewTone.isPending || resolutionRequired}
              >
                {sendTextMessage.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {sendButtonLabel}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
