import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, MessageCircle, RefreshCw, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type DraftAnalysis = {
  overallTone: string;
  toneScore: number;
  howItMightBePerceived: string;
  suggestedRevision?: string;
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
  "I need to talk about a schedule change.",
  "I need help writing a message about money.",
  "I want to set a boundary without making things worse.",
  "I need to respond to something upsetting.",
];

export default function PrepChatPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [topicInput, setTopicInput] = useState("");
  const [feeling, setFeeling] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [draftInput, setDraftInput] = useState("");
  const [draftSuggestion, setDraftSuggestion] = useState("");
  const [draftSourceText, setDraftSourceText] = useState("");

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
    if (activeSession && !draftInput) {
      const lastUserMessage = [...activeSession.messages].reverse().find((item) => item.role === "user");
      if (lastUserMessage?.content) {
        setDraftInput(lastUserMessage.content);
      }
    }
  }, [activeSession, draftInput]);

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
      setDraftInput(variables.content);
      await queryClient.invalidateQueries({ queryKey: ["/api/prep-chat/sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/prep-chat/sessions", variables.sessionId] });

      const refreshedSession = result.session;
      const turns = (refreshedSession.messages || []).filter((item) => item.role === "user").length;
      trackEvent("prep_chat_message_sent", { turn_number: turns });
    },
    onError: () => {
      toast({
        title: "Prep Chat is unavailable",
        description: "Please try sending that again.",
        variant: "destructive",
      });
    },
  });

  const analyzeDraft = useMutation({
    mutationFn: async (draft: string) => {
      const response = await apiRequest("POST", "/api/prep-chat/analyze-draft", { draft });
      return response.json() as Promise<DraftAnalysis>;
    },
    onSuccess: async (result) => {
      const revision = result.suggestedRevision?.trim();
      setDraftSuggestion(revision || "");
      setDraftSourceText(draftInput.trim());

      if (revision) {
        trackEvent("prep_chat_draft_generated", {
          draft_length: revision.length,
        });
      }

      if (activeSession?.id) {
        await apiRequest("PUT", `/api/prep-chat/sessions/${activeSession.id}`, {
          draftedMessage: revision || draftInput.trim(),
          tonePreview: result,
        });
        await queryClient.invalidateQueries({ queryKey: ["/api/prep-chat/sessions"] });
      }
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
        title: "What do you need to discuss?",
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
      // Error handled by mutations.
    }
  };

  const handleFollowUpSend = async () => {
    if (!activeSession || !composer.trim()) {
      return;
    }

    await sendPrepMessage.mutateAsync({
      sessionId: activeSession.id,
      content: composer.trim(),
    });
  };

  const handleUseDraft = async () => {
    const message = (draftSuggestion || draftInput).trim();
    if (!message) {
      return;
    }

    localStorage.setItem("preparedMessage", message);
    localStorage.setItem("peacepad_last_prep_chat_draft_at", new Date().toISOString());
    localStorage.removeItem("peacepad_prep_chat_entry_point");

    if (activeSession?.id) {
      await apiRequest("PUT", `/api/prep-chat/sessions/${activeSession.id}`, {
        draftedMessage: message,
        sentToChat: true,
        outcome: "revised",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/prep-chat/sessions"] });
    }

    trackEvent("prep_chat_draft_used", {
      turns_in_session: activeSession?.messages.filter((item) => item.role === "user").length ?? 0,
    });

    setLocation("/chat");
  };

  return (
    <>
      <SEOHead
        title="Prep Chat - PeacePad"
        description="Plan a hard conversation before you send it."
        noindex
      />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
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

        <div className="grid flex-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="flex min-h-0 flex-col border-border/60">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="text-lg">Coach conversation</CardTitle>
              <CardDescription>Tell PeacePad what you need to talk about and ask follow-up questions.</CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
              {!activeSession ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="prep-topic">What do you need to discuss?</Label>
                    <Textarea
                      id="prep-topic"
                      value={topicInput}
                      onChange={(event) => setTopicInput(event.target.value)}
                      placeholder="For example: I need to ask for a pickup change on Thursday."
                      className="min-h-[140px] resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>How are you feeling about this?</Label>
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
                    <Label>Quick starts</Label>
                    <div className="grid gap-2">
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
                    disabled={createSession.isPending || sendPrepMessage.isPending}
                  >
                    {createSession.isPending || sendPrepMessage.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Start Prep Chat
                  </Button>
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                    {activeSession.messages.map((item, index) => (
                      <div
                        key={`${item.timestamp}-${index}`}
                        className={item.role === "coach" ? "mr-6" : "ml-6"}
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
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.timestamp).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 border-t border-border/60 pt-4">
                    <Textarea
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      placeholder='Ask a follow-up like "What if they say no?" or "Make it shorter."'
                      className="min-h-[110px] resize-none"
                    />
                    <Button
                      type="button"
                      onClick={handleFollowUpSend}
                      disabled={!composer.trim() || sendPrepMessage.isPending}
                    >
                      {sendPrepMessage.isPending ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <MessageCircle className="mr-2 h-4 w-4" />
                      )}
                      Send to coach
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="text-lg">Draft a message</CardTitle>
              <CardDescription>Turn your thinking into a calmer message you can send.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="draft-input">Draft</Label>
                <Textarea
                  id="draft-input"
                  value={draftInput}
                  onChange={(event) => setDraftInput(event.target.value)}
                  placeholder="Type the message you want help with."
                  className="min-h-[170px] resize-none"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => analyzeDraft.mutate(draftInput.trim())}
                disabled={!draftInput.trim() || analyzeDraft.isPending}
              >
                {analyzeDraft.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate calmer draft
              </Button>

              {draftSuggestion && (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                  <div className="space-y-1">
                    <p className="font-medium">Suggested draft</p>
                    <p className="text-sm text-muted-foreground">
                      {analyzeDraft.data?.howItMightBePerceived || "A clearer, calmer version for your co-parent."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/80 p-3 text-sm leading-relaxed">
                    {draftSuggestion}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={handleUseDraft}>
                      <Check className="mr-2 h-4 w-4" />
                      Use in Messages
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDraftInput(draftSuggestion)}
                    >
                      Keep editing here
                    </Button>
                  </div>
                </div>
              )}

              {activeSession && (
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-sm font-medium">Recent sessions</p>
                  <div className="mt-3 space-y-2">
                    {sessions.slice(0, 3).map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        className={[
                          "w-full rounded-xl border px-3 py-3 text-left text-sm transition",
                          session.id === activeSession.id
                            ? "border-primary bg-primary/5"
                            : "border-border/60 bg-background hover:bg-muted/30",
                        ].join(" ")}
                        onClick={() => {
                          setActiveSessionId(session.id);
                          setDraftSuggestion("");
                          setDraftInput(session.draftedMessage || session.customTopic || "");
                          setDraftSourceText("");
                        }}
                      >
                        <div className="font-medium">{session.customTopic || "Prep Chat session"}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!activeSession && (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
                  Start a Prep Chat conversation to save your coaching history here.
                </div>
              )}

              {draftSourceText && (
                <p className="text-xs text-muted-foreground">
                  Based on: "{draftSourceText}"
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
