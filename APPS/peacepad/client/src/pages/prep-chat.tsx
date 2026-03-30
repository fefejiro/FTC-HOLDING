import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, MessageCircle, RefreshCw, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";
import { trackEvent } from "@/lib/analytics";

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
  "I need to pick up my kids without a fight.",
  "I need to ask for a schedule change.",
  "I want to set a boundary without making things worse.",
  "I need to respond to something upsetting about the kids.",
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
  const { toast } = useToast();
  const [topicInput, setTopicInput] = useState("");
  const [feeling, setFeeling] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [draftCard, setDraftCard] = useState<DraftCardState | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [draftEditor, setDraftEditor] = useState("");

  const entryPoint = useMemo(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    return params.get("entry") || localStorage.getItem("peacepad_prep_chat_entry_point") || "nav";
  }, [location]);

  const { data: sessions = [] } = useQuery<PrepChatSession[]>({
    queryKey: ["/api/prep-chat/sessions"],
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
                <CardTitle>Prep Chat</CardTitle>
                <CardDescription>
                  Warm, practical coaching for the conversations you do not want to get wrong.
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit bg-muted/40">
                AI communication coach
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col border-border/60">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="text-lg">
              {activeSession ? "Coach conversation" : "What do you need to talk about?"}
            </CardTitle>
            <CardDescription>
              {activeSession
                ? "Keep going until you have a message that feels calm, clear, and usable."
                : "Start with the situation. PeacePad will help you shape it into a calmer message."}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            {!activeSession ? (
              <div className="space-y-4">
                <Textarea
                  value={topicInput}
                  onChange={(event) => setTopicInput(event.target.value)}
                  placeholder="For example: I need to pick up my kids without a fight."
                  className="min-h-[112px] resize-none"
                />

                <div className="space-y-2">
                  <p className="text-sm font-medium">How are you feeling about this?</p>
                  <div className="flex flex-wrap gap-2">
                    {FEELINGS.map((item) => (
                      <Button
                        key={item}
                        type="button"
                        size="sm"
                        variant={feeling === item ? "default" : "outline"}
                        onClick={() => setFeeling(item)}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Helpful starting points</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {STARTERS.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-left text-sm transition hover:bg-muted/40"
                        onClick={() => setTopicInput(starter)}
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleStartSession}
                  disabled={coachBusy}
                  className="w-full sm:w-auto"
                >
                  {coachBusy ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Send to coach
                </Button>
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

                  {draftCard && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/20">
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
                    placeholder="Tell the coach what you want help with next."
                    className="min-h-[104px] resize-none"
                  />

                  <p className="text-sm text-muted-foreground">
                    Ask a follow-up like ‘What if they say no?’ or ‘Make it shorter.’
                  </p>

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
                      disabled={!composer.trim() || coachBusy}
                      className="flex-1 sm:flex-none"
                    >
                      {coachBusy ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <MessageCircle className="mr-2 h-4 w-4" />
                      )}
                      Send to coach
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateDraft}
                      disabled={latestUserTurnCount === 0 || generateDraft.isPending}
                      className="flex-1 sm:flex-none"
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
            <CardDescription>Pick up where you left off without interrupting the main flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                Start a Prep Chat conversation to save your coaching history here.
              </div>
            ) : (
              sessions.slice(0, 4).map((session) => (
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
                    setDraftCard(session.draftedMessage
                      ? {
                          draft: session.draftedMessage,
                          note: "A calmer version you can review before sending.",
                        }
                      : null);
                    setDraftEditor(session.draftedMessage || "");
                    setIsEditingDraft(false);
                  }}
                >
                  <div className="font-medium">{session.customTopic || "Prep Chat session"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
