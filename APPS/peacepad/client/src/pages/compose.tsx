import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Copy,
  MessageCircle,
  RefreshCw,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ensureGuestSession } from "@/lib/guestSession";
import { markGuestUpgradeIntent } from "@/lib/guestUpgrade";
import { trackEvent } from "@/lib/analytics";
import { SEOHead } from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type InterventionPath = "send" | "received" | "disagreement";

type PreviewTone = "calm" | "tense" | "escalating" | "neutral" | "hostile";

type PreviewResponse = {
  tone: PreviewTone;
  summary: string;
  emoji: string;
  confidence?: number;
  flags?: string[];
  rewordingSuggestion?: string | null;
  originalMessage: string;
  ces?: {
    pauseRecommended?: boolean;
    pauseDuration?: number;
    deescalationSuggestion?: string | null;
  } | null;
};

const TONE_STYLES: Record<PreviewTone, string> = {
  calm: "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100",
  neutral: "border-sky-200 bg-sky-50/80 text-sky-950 dark:border-sky-900 dark:bg-sky-950/20 dark:text-sky-100",
  tense: "border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100",
  escalating: "border-red-200 bg-red-50/80 text-red-950 dark:border-red-900 dark:bg-red-950/20 dark:text-red-100",
  hostile: "border-red-200 bg-red-50/80 text-red-950 dark:border-red-900 dark:bg-red-950/20 dark:text-red-100",
};

const PATHS: Array<{
  id: InterventionPath;
  label: string;
  description: string;
}> = [
  {
    id: "send",
    label: "I want to send a message",
    description: "Draft it here before it leaves your hands.",
  },
  {
    id: "received",
    label: "I received a message",
    description: "Paste it here and slow down the reply.",
  },
  {
    id: "disagreement",
    label: "We disagree about something",
    description: "Name the issue and choose a next step.",
  },
];

const COPY_COUNT_KEY = "peacepad_guest_copy_count";
const UPGRADE_PROMPT_DISMISSED_KEY = "peacepad_guest_upgrade_prompt_dismissed";

function readCopyCount(): number {
  const raw = localStorage.getItem(COPY_COUNT_KEY);
  const parsed = Number.parseInt(raw || "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toneLabel(tone?: PreviewTone | null): string {
  if (tone === "hostile" || tone === "escalating") {
    return "This may land as heated";
  }

  if (tone === "tense") {
    return "This may land as tense";
  }

  if (tone === "calm") {
    return "This may land as calm";
  }

  return "This may land as neutral";
}

function pauseRecommended(analysis: PreviewResponse | null): boolean {
  return analysis?.tone === "tense" || analysis?.tone === "escalating" || analysis?.tone === "hostile" || Boolean(analysis?.ces?.pauseRecommended);
}

function trimSentence(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function buildReceivedResponse(receivedMessage: string, analysis: PreviewResponse | null): string {
  const text = trimSentence(receivedMessage);
  const opener =
    analysis && pauseRecommended(analysis)
      ? "I want to keep this calm and focused."
      : "Thanks for letting me know.";
  const focus = text.length > 120 ? "the main issue" : "this";

  return `${opener} Can we focus on ${focus} and agree on the next practical step? I am open to working through it without blaming each other.`;
}

function buildDisagreementResponse(issue: string, outcome: string, analysis: PreviewResponse | null): string {
  const cleanIssue = trimSentence(issue);
  const cleanOutcome = trimSentence(outcome);
  const firstLine = cleanIssue
    ? `I think we are not aligned about ${cleanIssue}.`
    : "I think we are not aligned yet.";
  const outcomeLine = cleanOutcome
    ? `What I am hoping for is ${cleanOutcome}.`
    : "What I am hoping for is a clear next step we can both follow.";
  const paceLine = pauseRecommended(analysis)
    ? "If this feels too tense right now, we can pause and come back to it later."
    : "Can we pick the next step that keeps things predictable?";

  return `${firstLine} ${outcomeLine} ${paceLine}`;
}

function interpretationFor(path: InterventionPath, analysis: PreviewResponse | null): string {
  if (!analysis) {
    if (path === "received") {
      return "PeacePad will look for pressure, blame, urgency, or room for a calmer response.";
    }

    if (path === "disagreement") {
      return "PeacePad will help turn the disagreement into a clear request or next step.";
    }

    return "PeacePad will look for wording that could raise tension before you send it.";
  }

  if (path === "received") {
    if (pauseRecommended(analysis)) {
      return "There may be frustration, urgency, or defensiveness underneath the wording. You may want to respond to the issue without matching the heat.";
    }

    return "This looks workable. You can still reply with a clear boundary or next step.";
  }

  if (path === "disagreement") {
    if (pauseRecommended(analysis)) {
      return "The issue may need a slower pace before a decision. A short, specific next step can keep this from becoming personal.";
    }

    return "This looks like something that can be shaped into a practical request.";
  }

  return analysis.summary;
}

export default function ComposePage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activePath, setActivePath] = useState<InterventionPath>("send");
  const [message, setMessage] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [acceptedDraft, setAcceptedDraft] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PreviewResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [guestSessionNotice, setGuestSessionNotice] = useState<string | null>(null);
  const [isPreparingGuest, setIsPreparingGuest] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [acceptedRewrite, setAcceptedRewrite] = useState(false);
  const [copyCount, setCopyCount] = useState(0);
  const [draftStartedAt, setDraftStartedAt] = useState<number | null>(null);
  const [lastToneCategory, setLastToneCategory] = useState<PreviewTone | null>(null);
  const latestRequestId = useRef(0);

  const previewContent = useMemo(() => {
    const draft = message.trim();
    if (activePath !== "disagreement") {
      return draft;
    }

    const outcome = desiredOutcome.trim();
    return [draft, outcome ? `Desired outcome: ${outcome}` : ""].filter(Boolean).join("\n\n");
  }, [activePath, desiredOutcome, message]);

  const suggestedDraft = useMemo(() => {
    if (activePath === "send") {
      return analysis?.rewordingSuggestion || message.trim();
    }

    if (activePath === "received") {
      return buildReceivedResponse(message, analysis);
    }

    return buildDisagreementResponse(message, desiredOutcome, analysis);
  }, [activePath, analysis, desiredOutcome, message]);

  const canCopy = Boolean((acceptedDraft || suggestedDraft).trim());
  const showOutcomePrompt = activePath === "received" || activePath === "disagreement";

  useEffect(() => {
    let cancelled = false;

    if (isLoading || user) {
      return;
    }

    setIsPreparingGuest(true);
    setGuestSessionNotice(null);
    ensureGuestSession()
      .catch((error) => {
        if (!cancelled) {
          console.warn("[Compose] Guest session unavailable; continuing in local draft mode.", error);
          setGuestSessionNotice("Cloud sync is offline right now. You can still pause, draft, and copy your next step.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsPreparingGuest(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, user]);

  useEffect(() => {
    const draft = previewContent.trim();
    if (!draft) {
      setAnalysis(null);
      setAnalysisError(null);
      setIsAnalyzing(false);
      setAcceptedRewrite(false);
      setAcceptedDraft(null);
      setDraftStartedAt(null);
      setLastToneCategory(null);
      return;
    }

    if (!draftStartedAt) {
      setDraftStartedAt(Date.now());
    }

    const requestId = ++latestRequestId.current;
    const timer = window.setTimeout(async () => {
      setIsAnalyzing(true);
      setAnalysisError(null);

      try {
        const response = await apiRequest("POST", "/api/messages/preview", {
          content: draft,
        });
        const payload = (await response.json()) as PreviewResponse;

        if (latestRequestId.current === requestId) {
          setAnalysis(payload);
          setLastToneCategory(payload.tone);
        }
      } catch (error) {
        if (latestRequestId.current === requestId) {
          setAnalysis(null);
          setAnalysisError("Tone check is unavailable right now.");
        }
      } finally {
        if (latestRequestId.current === requestId) {
          setIsAnalyzing(false);
        }
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [draftStartedAt, previewContent]);

  const handlePathChange = (path: InterventionPath) => {
    setActivePath(path);
    setAnalysis(null);
    setAnalysisError(null);
    setAcceptedDraft(null);
    setAcceptedRewrite(false);
    setMessageCopied(false);
    setDraftStartedAt(null);
    setLastToneCategory(null);

    trackEvent("compose_intervention_path_selected", {
      path,
    });
  };

  const handleUseSuggestion = () => {
    const draft = suggestedDraft.trim();
    if (!draft) {
      return;
    }

    trackEvent("compose_rewrite_accepted", {
      tone_category: analysis?.tone ?? "unknown",
      intervention_path: activePath,
      message_length: previewContent.trim().length,
    });

    if (activePath === "send") {
      setMessage(draft);
      setAnalysis(null);
      setAnalysisError(null);
    }

    setAcceptedDraft(draft);
    setAcceptedRewrite(true);
  };

  const handleCopyMessage = async () => {
    const textToCopy = (acceptedDraft || suggestedDraft).trim();
    if (!textToCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      const nextCopyCount = readCopyCount() + 1;
      localStorage.setItem(COPY_COUNT_KEY, String(nextCopyCount));
      setCopyCount(nextCopyCount);
      setMessageCopied(true);
      window.setTimeout(() => setMessageCopied(false), 3000);

      trackEvent("guest_message_copied", {
        tone_category: analysis?.tone ?? lastToneCategory ?? "unknown",
        intervention_path: activePath,
        accepted_rewrite: acceptedRewrite,
        had_tone_analysis: Boolean(analysis || lastToneCategory),
        message_length: textToCopy.length,
        copy_count: nextCopyCount,
        time_spent_refining_ms: draftStartedAt ? Math.max(0, Date.now() - draftStartedAt) : null,
      });

      if (
        nextCopyCount === 3 &&
        localStorage.getItem(UPGRADE_PROMPT_DISMISSED_KEY) !== "true"
      ) {
        setShowUpgradePrompt(true);
        trackEvent("upgrade_prompt_shown", {
          trigger: "copy_threshold",
          copy_count: nextCopyCount,
        });
      }

      toast({
        title: "Copied",
        description: "Paste it into your messaging app when you are ready.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please select the text manually and copy it.",
        variant: "destructive",
      });
    }
  };

  const handleUpgradeNow = () => {
    markGuestUpgradeIntent();
    trackEvent("guest_upgraded", {
      source: "copy_threshold",
      copy_count: copyCount,
    });
    setShowUpgradePrompt(false);
    window.location.href = "/onboarding?auth=upgrade";
  };

  const handleUpgradeLater = () => {
    localStorage.setItem(UPGRADE_PROMPT_DISMISSED_KEY, "true");
    setShowUpgradePrompt(false);
  };

  const activePathLabel = PATHS.find((path) => path.id === activePath)?.label || PATHS[0].label;
  const inputLabel =
    activePath === "send"
      ? "What do you want to say?"
      : activePath === "received"
        ? "Paste the message you received"
        : "What is the disagreement about?";
  const inputPlaceholder =
    activePath === "send"
      ? "Type your message to your co-parent..."
      : activePath === "received"
        ? "Paste the message here..."
        : "Example: pickup time, school expense, switching weekends...";

  return (
    <>
      <SEOHead
        title="Pause Before Sending - PeacePad"
        description="Choose what happened, understand the tone, and draft a calmer next step before conflict grows."
        noindex
      />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-4">
        <Card className="border-border/60">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">No login required</Badge>
              {(isPreparingGuest || isLoading) && (
                <Badge variant="outline" className="gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Starting guest session
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">Pause before it becomes damage</CardTitle>
              <CardDescription>
                Start without an account. Sign in later if you want saved history and sync.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <section className="space-y-3" aria-labelledby="what-happened-heading">
              <div className="space-y-1">
                <h1 id="what-happened-heading" className="text-lg font-semibold">
                  What happened?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Choose the closest starting point. PeacePad will help you slow it down.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3" role="list" aria-label="Choose what happened">
                {PATHS.map((path) => {
                  const isActive = activePath === path.id;
                  return (
                    <button
                      key={path.id}
                      type="button"
                      onClick={() => handlePathChange(path.id)}
                      className={`rounded-lg border p-3 text-left transition ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/70 bg-background hover:bg-muted/50"
                      }`}
                      data-testid={`button-compose-path-${path.id}`}
                    >
                      <span className="block text-sm font-semibold">{path.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{path.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3 rounded-lg border border-border/70 bg-background p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{activePathLabel}</p>
                  <label htmlFor="compose-primary-input" className="text-base font-medium">
                    {inputLabel}
                  </label>
                </div>
                <MessageCircle className="mt-1 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <Textarea
                id="compose-primary-input"
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setMessageCopied(false);
                  setAcceptedDraft(null);
                  if (acceptedRewrite) {
                    setAcceptedRewrite(false);
                  }
                }}
                placeholder={inputPlaceholder}
                className="min-h-[150px] resize-none border-0 bg-transparent p-0 text-base focus-visible:ring-0"
                data-testid="textarea-compose-message"
              />
            </section>

            {activePath === "disagreement" ? (
              <section className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
                <label htmlFor="compose-outcome-input" className="text-base font-medium">
                  What outcome do you want?
                </label>
                <Textarea
                  id="compose-outcome-input"
                  value={desiredOutcome}
                  onChange={(event) => {
                    setDesiredOutcome(event.target.value);
                    setMessageCopied(false);
                    setAcceptedDraft(null);
                  }}
                  placeholder="Example: agree on a pickup time for Friday without arguing..."
                  className="min-h-[96px] resize-none bg-background text-base"
                  data-testid="textarea-compose-outcome"
                />
              </section>
            ) : null}

            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-compose-analyzing">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking what may happen next...
              </div>
            ) : null}

            {analysisError ? (
              <div className="rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/20 dark:text-red-100">
                {analysisError}
              </div>
            ) : null}

            {guestSessionNotice ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
                {guestSessionNotice}
              </div>
            ) : null}

            {previewContent.trim() ? (
              <section
                className={`rounded-lg border p-4 ${analysis ? TONE_STYLES[analysis.tone] : "border-border/70 bg-muted/20"}`}
                data-testid="card-compose-tone-feedback"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl" aria-hidden="true">{analysis?.emoji || "..."}</div>
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        What this may sound like
                      </p>
                      <p className="font-medium">{toneLabel(analysis?.tone)}</p>
                      <p className="text-sm opacity-90">{interpretationFor(activePath, analysis)}</p>
                    </div>

                    {showOutcomePrompt ? (
                      <div className="rounded-lg border border-border/60 bg-background/75 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          What outcome do you want?
                        </p>
                        <p className="mt-1 text-sm leading-relaxed">
                          {activePath === "received"
                            ? "Reply to the issue, not the emotional temperature."
                            : desiredOutcome.trim() || "Name one practical outcome before sending anything."}
                        </p>
                      </div>
                    ) : null}

                    {analysis?.flags && analysis.flags.length > 0 ? (
                      <details className="rounded-lg border border-border/60 bg-background/70 p-3 text-sm">
                        <summary className="cursor-pointer font-medium">Why PeacePad paused here</summary>
                        <ul className="mt-2 space-y-1 text-muted-foreground">
                          {analysis.flags.map((flag) => (
                            <li key={flag}>- {flag}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}

                    {pauseRecommended(analysis) ? (
                      <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                        <div className="flex items-start gap-2">
                          <TimerReset className="mt-0.5 h-4 w-4" aria-hidden="true" />
                          <div>
                            <p className="font-medium">You may want to slow this down.</p>
                            <p className="text-sm opacity-90">
                              Waiting a few minutes before replying may help keep the conversation focused.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                        Try this instead
                      </p>
                      <p className="text-sm leading-relaxed" data-testid="text-compose-suggestion">
                        {acceptedDraft || suggestedDraft || "PeacePad will suggest a calmer next step here."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleUseSuggestion}
                          disabled={!suggestedDraft.trim()}
                          data-testid="button-compose-use-suggestion"
                        >
                          Use this version
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleCopyMessage}
                          disabled={!canCopy}
                          data-testid="button-compose-copy-suggestion"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {messageCopied ? "Copied!" : "Copy to send"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">Choose the next action when you are ready.</p>
                  <p className="text-sm text-muted-foreground">
                    Copy is here when you need it. The pause comes first.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCopyMessage}
                  disabled={!canCopy}
                  data-testid="button-compose-copy-send"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {messageCopied ? "Copied!" : "Copy to send"}
                </Button>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Start without an account. Sign in later if you want saved history and sync.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/prep-chat">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Talk it through
                  </Link>
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/settings">Invite partner</Link>
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/onboarding?auth=upgrade">Sign in later</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={showUpgradePrompt}
        onOpenChange={(open) => {
          setShowUpgradePrompt(open);
          if (!open) {
            localStorage.setItem(UPGRADE_PROMPT_DISMISSED_KEY, "true");
          }
        }}
      >
        <DialogContent className="max-w-md" data-testid="dialog-compose-upgrade-prompt">
          <DialogHeader>
            <DialogTitle>Keep PeacePad with you</DialogTitle>
            <DialogDescription>
              Sign in if you want saved history and sync across devices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>With an account, PeacePad can help you keep track of:</p>
            <ul className="space-y-1">
              <li>- Saved message history</li>
              <li>- Patterns that help you pause earlier</li>
              <li>- Access from more than one device</li>
            </ul>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={handleUpgradeLater}>
              Maybe later
            </Button>
            <Button type="button" onClick={handleUpgradeNow} data-testid="button-compose-upgrade-now">
              Sign in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
