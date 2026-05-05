import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ClipboardList, MessageCircle, PenLine, Plus, RefreshCw, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";
import { trackEvent } from "@/lib/analytics";
import { ensureGuestSession } from "@/lib/guestSession";

type PrepChatMessage = {
  role: "user" | "coach";
  content: string;
  timestamp: string;
};

type PrepChatSession = {
  id: string;
  topic: string;
  customTopic: string | null;
  emotionalStateStart: string | null;
  messages: PrepChatMessage[];
  draftedMessage: string | null;
  createdAt: string;
};

type DraftResponse = {
  session: PrepChatSession;
  draft: string;
  note: string;
};

type DraftCardState = {
  draft: string;
  note: string;
};

const FEELINGS = [
  "Calm",
  "Anxious",
  "Frustrated",
  "Overwhelmed",
  "Sad",
  "Angry",
];

const STARTERS = [
  "I need to ask for a schedule change.",
  "I need to set a boundary.",
  "I need to respond to something upsetting.",
  "I need to pick up my kids without a fight.",
];

const SUPPORT_FEELINGS = new Set(["Angry", "Overwhelmed", "Sad"]);

const COACH_STEPS = [
  "Understand situation",
  "Shape message",
  "Get draft",
  "Refine",
  "Send",
];

const FOLLOW_UP_IDEAS = [
  "What pickup time should I propose?",
  "Make it shorter.",
  "Make it firmer.",
  "What do I want to avoid escalating?",
];

const PREPARED_MESSAGE_KEY = "preparedMessage";
const PREPARED_MESSAGE_TIMESTAMP_KEY = "peacepad_last_prep_chat_draft_at";

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PrepChatPage() {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [topicInput, setTopicInput] = useState("");
  const [feeling, setFeeling] = useState("");
  const [entryMode, setEntryMode] = useState<"received" | "sending" | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [draftCard, setDraftCard] = useState<DraftCardState | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [draftEditor, setDraftEditor] = useState("");
  const [isBootstrappingGuest, setIsBootstrappingGuest] = useState(false);
  const [guestBootstrapError, setGuestBootstrapError] = useState<string | null>(null);

  const entryPoint = useMemo(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    return params.get("entry") || localStorage.getItem("peacepad_prep_chat_entry_point") || "nav";
  }, [location]);

  useEffect(() => {
    let cancelled = false;

    if (isLoading || user) {
      return;
    }

    setIsBootstrappingGuest(true);
    setGuestBootstrapError(null);

    ensureGuestSession()
      .catch((error) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "PeacePad could not start your guest session.";
          setGuestBootstrapError(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsBootstrappingGuest(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, user]);

  const { data: sessions = [] } = useQuery<PrepChatSession[]>({
    queryKey: ["/api/prep-chat/sessions"],
    enabled: Boolean(user),
  });

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null,
    [activeSessionId, sessions],
  );

  useEffect(() => {
    if (!activeSessionId && sessions[0]?.id) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (!activeSession) {
      setDraftCard(null);
      setDraftEditor("");
      setIsEditingDraft(false);
      return;
    }

    if (!activeSession.draftedMessage) {
      setDraftCard(null);
      setDraftEditor("");
      setIsEditingDraft(false);
      return;
    }

    setDraftCard({
      draft: activeSession.draftedMessage,
      note: "A calmer version you can review before sending.",
    });
    setDraftEditor(activeSession.draftedMessage);
  }, [activeSession]);

  const createSession = useMutation({
    mutationFn: async (payload: { topic: string; emotionalStateStart?: string }) => {
      const response = await apiRequest("POST", "/api/prep-chat/sessions", {
        topic: "custom",
        customTopic: payload.topic,
        emotionalStateStart: payload.emotionalStateStart || undefined,
      });
      return response.json() as Promise<PrepChatSession>;
    },
    onSuccess: async (session) => {
      setActiveSessionId(session.id);
      await queryClient.invalidateQueries({ queryKey: ["/api/prep-chat/sessions"] });
      trackEvent("prep_chat_started", { entry_point: entryPoint });
    },
  });

  const sendPrepMessage = useMutation({
    mutationFn: async (payload: { sessionId: string; content: string }) => {
      const response = await apiRequest("POST", `/api/prep-chat/sessions/${payload.sessionId}/messages`, {
        content: payload.content,
      });
      return response.json() as Promise<{ session: PrepChatSession; coachMessage: string }>;
    },
    onSuccess: async (result, variables) => {
      setComposer("");
      await queryClient.invalidateQueries({ queryKey: ["/api/prep-chat/sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/prep-chat/sessions", variables.sessionId] });

      const refreshedSession = result.session;
      const turns = (refreshedSession.messages || []).filter((item) => item.role === "user").length;
      trackEvent("prep_chat_message_sent", { turn_number: turns });
      if (turns > 1) {
        trackEvent("prep_chat_followup_sent", { turn_number: turns });
      }
    },
    onError: () => {
      toast({
        title: "Prep Chat is unavailable",
        description: "Please try sending that again.",
        variant: "destructive",
      });
    },
  });

  const generateDraft = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest("POST", `/api/prep-chat/sessions/${sessionId}/draft`, {});
      return response.json() as Promise<DraftResponse>;
    },
    onSuccess: async (result) => {
      setDraftCard({
        draft: result.draft,
        note: result.note,
      });
      setDraftEditor(result.draft);
      setIsEditingDraft(false);

      trackEvent("draft_generated", {
        draft_length: result.draft.length,
      });
      trackEvent("prep_chat_draft_generated", {
        draft_length: result.draft.length,
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/prep-chat/sessions"] });
    },
    onError: () => {
      toast({
        title: "Draft not ready yet",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const handleStartSession = async () => {
    const topic = topicInput.trim();
    if (!topic) {
      toast({
        title: "What do you need to talk about?",
        description: "Add a quick sentence so PeacePad can help.",
        variant: "destructive",
      });
      return;
    }

    try {
      const session = await createSession.mutateAsync({
        topic,
        emotionalStateStart: feeling || undefined,
      });

      await sendPrepMessage.mutateAsync({
        sessionId: session.id,
        content: topic,
      });
    } catch {
      // Mutation handlers already surface errors.
    }
  };

  const handleSendToCoach = async () => {
    const content = composer.trim();
    if (!content) {
      return;
    }

    if (!activeSession) {
      setTopicInput(content);
      await handleStartSession();
      return;
    }

    await sendPrepMessage.mutateAsync({
      sessionId: activeSession.id,
      content,
    });
  };

  const handleGenerateDraft = async () => {
    if (!activeSession) {
      return;
    }

    await generateDraft.mutateAsync(activeSession.id);
  };

  const handleUseDraft = async () => {
    const draft = (isEditingDraft ? draftEditor : draftCard?.draft || "").trim();
    if (!draft) {
      return;
    }

    localStorage.setItem(PREPARED_MESSAGE_KEY, draft);
    localStorage.setItem(PREPARED_MESSAGE_TIMESTAMP_KEY, new Date().toISOString());
    localStorage.removeItem("peacepad_prep_chat_entry_point");

    if (activeSession?.id) {
      await apiRequest("PUT", `/api/prep-chat/sessions/${activeSession.id}`, {
        draftedMessage: draft,
        sentToChat: true,
        outcome: "revised",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/prep-chat/sessions"] });
    }

    trackEvent("draft_used_in_messages", {
      turns_in_session: activeSession?.messages.filter((item) => item.role === "user").length ?? 0,
    });
    trackEvent("prep_chat_draft_used", {
      turns_in_session: activeSession?.messages.filter((item) => item.role === "user").length ?? 0,
    });

    setLocation("/chat");
  };

  const latestUserTurnCount = activeSession?.messages.filter((item) => item.role === "user").length ?? 0;
  const coachBusy = sendPrepMessage.isPending || createSession.isPending;
  const showBootstrapState = (!user && isLoading) || isBootstrappingGuest;

  if (showBootstrapState || (!user && guestBootstrapError)) {
    return (
      <>
        <SEOHead
          title="Prep Chat - PeacePad"
          description="Plan a hard conversation before you send it."
          noindex
        />

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-3">
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="px-4 py-4">
              <div className="space-y-1">
                <CardTitle data-testid="text-prep-chat-title">Prep Chat</CardTitle>
                <CardDescription>Warm, practical coaching for the hard conversations.</CardDescription>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardContent className="space-y-4 p-6">
              {showBootstrapState ? (
                <>
                  <p className="text-sm font-medium">Preparing your private PeacePad session.</p>
                  <p className="text-sm text-muted-foreground">
                    We are restoring or creating a guest session so you can start writing right away.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">Guest session needs attention.</p>
                  <p className="text-sm text-muted-foreground">{guestBootstrapError}</p>
                  <Button
                    type="button"
                    onClick={() => {
                      setGuestBootstrapError(null);
                      setIsBootstrappingGuest(true);
                      ensureGuestSession()
                        .catch((error) => {
                          const message =
                            error instanceof Error
                              ? error.message
                              : "PeacePad could not start your guest session.";
                          setGuestBootstrapError(message);
                        })
                        .finally(() => {
                          setIsBootstrappingGuest(false);
                        });
                    }}
                  >
                    Retry guest session
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Prep Chat - PeacePad"
        description="Plan a hard conversation before you send it."
        noindex
      />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-3">
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle data-testid="text-prep-chat-title">Prep Chat</CardTitle>
                <CardDescription>
                  Warm, practical coaching for the hard conversations.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {activeSession && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => { setActiveSessionId(null); setEntryMode(null); }}
                  >
                    <Plus className="h-3 w-3" />
                    New session
                  </Button>
                )}
                <Badge variant="outline" className="w-fit bg-muted/40">
                  AI communication coach
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col border-border/60">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="text-lg">
              {activeSession ? "Coach conversation" : "What brought you here?"}
            </CardTitle>
            {activeSession && (
              <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                {COACH_STEPS.map((label, i) => {
                  const currentStep = draftCard
                    ? latestUserTurnCount > 0
                      ? 3
                      : 2
                    : latestUserTurnCount >= 2
                      ? 1
                      : 0;
                  return (
                    <span key={label} className="flex items-center gap-1">
                      {i > 0 && <span>→</span>}
                      <span className={i === currentStep ? "font-semibold text-primary" : ""}>{label}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            {!activeSession ? (
              <div className="space-y-4">
                {entryMode === null ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className="rounded-2xl border border-border/70 bg-background p-4 text-left transition hover:bg-muted/30"
                      onClick={() => setEntryMode("received")}
                      data-testid="button-prep-chat-received"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-sky-500" />
                        <span className="font-semibold text-sm">I received a message</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Paste it. I&apos;ll help you respond without escalating.
                      </p>
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border border-border/70 bg-background p-4 text-left transition hover:bg-muted/30"
                      onClick={() => setEntryMode("sending")}
                      data-testid="button-prep-chat-sending"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <PenLine className="h-5 w-5 text-amber-500" />
                        <span className="font-semibold text-sm">I need to send something</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Describe the situation and I&apos;ll help you say it calmly.
                      </p>
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => { setEntryMode(null); setTopicInput(""); setFeeling(""); }}
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back
                    </button>

                    <Textarea
                      value={topicInput}
                      onChange={(event) => setTopicInput(event.target.value)}
                      placeholder={entryMode === "received" ? "Paste what they sent..." : "What's going on? Start anywhere."}
                      className="min-h-[112px] resize-none"
                      data-testid="textarea-prep-chat-topic"
                    />

                    {/* Feeling chips — optional, after input */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Optional — how are you feeling about this?</p>
                      <div className="flex flex-wrap gap-2">
                        {FEELINGS.map((item) => (
                          <Button
                            key={item}
                            type="button"
                            size="sm"
                            variant={feeling === item ? "default" : "outline"}
                            onClick={() => setFeeling((f) => (f === item ? "" : item))}
                          >
                            {item}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Starter chips — horizontal scroll */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Common situations →</p>
                      <div className="relative">
                      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {STARTERS.map((starter) => (
                          <button
                            key={starter}
                            type="button"
                            className="flex-shrink-0 whitespace-nowrap rounded-full border border-border/70 bg-muted/20 px-3 py-1.5 text-xs transition hover:bg-muted/40"
                            onClick={() => setTopicInput(starter)}
                          >
                            {starter}
                          </button>
                        ))}
                      </div>
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleStartSession}
                      disabled={!topicInput.trim() || coachBusy}
                      className="w-full sm:w-auto"
                      data-testid="button-prep-chat-start"
                    >
                      {coachBusy ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                      )}
                      {entryMode === "received" ? "Help me respond" : "Help me say this"}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                  {activeSession.messages.map((item, index) => (
                    <div
                      key={`${item.timestamp}-${index}`}
                      className={item.role === "coach" ? "pr-8" : "pl-8"}
                    >
                      <div
                        className={[
                          "rounded-2xl border p-4 shadow-sm",
                          item.role === "coach"
                            ? "border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/20"
                            : "border-border/60 bg-background",
                        ].join(" ")}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="outline" className="bg-background/70">
                            {item.role === "coach" ? "Coach" : "You"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatTime(item.timestamp)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Contextual support nudge for difficult emotional states */}
                  {SUPPORT_FEELINGS.has(feeling) && activeSession.messages.length > 0 && (
                    <div className="rounded-2xl border border-muted bg-muted/20 p-4">
                      <p className="text-sm text-muted-foreground">
                        This sounds really hard. If you need more than a draft, support resources are one tap away.
                      </p>
                      <Link href="/resources">
                        <Button type="button" variant="outline" size="sm" className="mt-2">
                          Open support resources
                        </Button>
                      </Link>
                    </div>
                  )}

                  {draftCard && (
                    <div
                      className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/20"
                      data-testid="card-prep-chat-draft"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">Your draft</p>
                        <p className="text-sm text-muted-foreground">{draftCard.note}</p>
                      </div>

                      <div className="mt-3 rounded-xl border border-border/60 bg-background/90 p-3">
                        {isEditingDraft ? (
                          <Textarea
                            value={draftEditor}
                            onChange={(event) => setDraftEditor(event.target.value)}
                            className="min-h-[140px] resize-none border-0 bg-transparent p-0 text-sm leading-relaxed focus-visible:ring-0"
                          />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{draftCard.draft}</p>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" onClick={handleUseDraft}>
                          <Check className="mr-2 h-4 w-4" />
                          Use this message
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditingDraft((current) => !current);
                            setDraftEditor(draftCard.draft);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-border/60 pt-3">
                  <Textarea
                    value={composer}
                    onChange={(event) => setComposer(event.target.value)}
                    placeholder="What would you like to work on next?"
                    className="min-h-[104px] resize-none"
                    data-testid="textarea-prep-chat-composer"
                  />

                  <div className="flex flex-wrap gap-2">
                    {FOLLOW_UP_IDEAS.map((idea) => (
                      <Button
                        key={idea}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setComposer(idea)}
                      >
                        {idea}
                      </Button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={handleSendToCoach}
                      disabled={coachBusy}
                      className="flex-1 sm:flex-none"
                    >
                      {coachBusy ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <MessageCircle className="mr-2 h-4 w-4" />
                      )}
                      {!composer.trim() ? "Type something first" : "Send to coach"}
                    </Button>

                    <Button
                      type="button"
                      variant={draftCard ? "default" : "outline"}
                      onClick={handleGenerateDraft}
                      disabled={latestUserTurnCount === 0 || generateDraft.isPending}
                      className="flex-1 sm:flex-none"
                      data-testid="button-prep-chat-draft"
                    >
                      {generateDraft.isPending ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Get a draft to send
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Recent sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                Your coaching sessions will appear here so you can pick up right where you left off.
              </div>
            ) : (
              sessions.slice(0, 4).map((session) => {
                const sessionDate = new Date(session.createdAt);
                const today = new Date();
                const isToday =
                  sessionDate.getFullYear() === today.getFullYear() &&
                  sessionDate.getMonth() === today.getMonth() &&
                  sessionDate.getDate() === today.getDate();
                const dateLabel = isToday
                  ? "Today"
                  : sessionDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });

                return (
                  <button
                    key={session.id}
                    type="button"
                    className={[
                      "w-full rounded-xl border px-3 py-3 text-left text-sm transition",
                      session.id === activeSession?.id
                        ? "border-primary bg-primary/5"
                        : "border-border/60 bg-background hover:bg-muted/30",
                    ].join(" ")}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setDraftCard(
                        session.draftedMessage
                          ? {
                              draft: session.draftedMessage,
                              note: "A calmer version you can review before sending.",
                            }
                          : null,
                      );
                      setDraftEditor(session.draftedMessage || "");
                      setIsEditingDraft(false);
                    }}
                  >
                    <div className="font-medium">{session.customTopic || "Prep Chat session"}</div>
                    <div className="text-xs text-muted-foreground">{dateLabel}</div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
