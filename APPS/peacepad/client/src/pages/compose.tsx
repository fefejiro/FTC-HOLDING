import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Copy, RefreshCw, Sparkles } from "lucide-react";
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

type PreviewResponse = {
  tone: "calm" | "tense" | "escalating";
  summary: string;
  emoji: string;
  confidence: number;
  flags: string[];
  rewordingSuggestion: string | null;
  originalMessage: string;
};

const TONE_STYLES: Record<PreviewResponse["tone"], string> = {
  calm: "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100",
  tense: "border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100",
  escalating: "border-red-200 bg-red-50/80 text-red-950 dark:border-red-900 dark:bg-red-950/20 dark:text-red-100",
};

const COPY_COUNT_KEY = "peacepad_guest_copy_count";
const UPGRADE_PROMPT_DISMISSED_KEY = "peacepad_guest_upgrade_prompt_dismissed";

function readCopyCount(): number {
  const raw = localStorage.getItem(COPY_COUNT_KEY);
  const parsed = Number.parseInt(raw || "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ComposePage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
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
  const [lastToneCategory, setLastToneCategory] = useState<PreviewResponse["tone"] | null>(null);
  const latestRequestId = useRef(0);

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
          setGuestSessionNotice("Cloud sync is offline right now. You can still draft, refine manually, and copy your message.");
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
    const draft = message.trim();
    if (!draft) {
      setAnalysis(null);
      setAnalysisError(null);
      setIsAnalyzing(false);
      setAcceptedRewrite(false);
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
  }, [message]);

  const handleUseSuggestion = () => {
    if (!analysis?.rewordingSuggestion) {
      return;
    }

    trackEvent("compose_rewrite_accepted", {
      tone_category: analysis.tone,
      message_length: message.trim().length,
    });
    setMessage(analysis.rewordingSuggestion);
    setAnalysis(null);
    setAnalysisError(null);
    setAcceptedRewrite(true);
  };

  const handleCopyMessage = async () => {
    const textToCopy = analysis?.rewordingSuggestion || message.trim();
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
        description: "Paste it into your messaging app to send it to your co-parent.",
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

  return (
    <>
      <SEOHead
        title="Compose - PeacePad"
        description="Draft a message, check the tone, and soften it before you send."
        noindex
      />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-4">
        <Card className="border-border/60">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">No login required</Badge>
              {(isPreparingGuest || isLoading) && (
                <Badge variant="outline" className="gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Starting guest session
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">Compose your message</CardTitle>
              <CardDescription>
                Type what you want to say. PeacePad will flag tense wording and suggest a calmer version before you send it.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
              <Textarea
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setMessageCopied(false);
                  if (acceptedRewrite) {
                    setAcceptedRewrite(false);
                  }
                }}
                placeholder="Type your message to your co-parent..."
                className="min-h-[180px] resize-none border-0 bg-transparent p-0 text-base focus-visible:ring-0"
                data-testid="textarea-compose-message"
              />
            </div>

            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-compose-analyzing">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking tone...
              </div>
            ) : null}

            {analysisError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/20 dark:text-red-100">
                {analysisError}
              </div>
            ) : null}

            {guestSessionNotice ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
                {guestSessionNotice}
              </div>
            ) : null}

            {analysis ? (
              <div className={`rounded-2xl border p-4 ${TONE_STYLES[analysis.tone]}`} data-testid="card-compose-tone-feedback">
                <div className="flex items-start gap-3">
                  <div className="text-2xl" aria-hidden="true">{analysis.emoji}</div>
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <p className="font-medium">{analysis.summary}</p>
                      <p className="text-sm opacity-85">
                        Confidence: {Math.round(analysis.confidence * 100)}%
                      </p>
                    </div>

                    {analysis.flags.length > 0 ? (
                      <details className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm">
                        <summary className="cursor-pointer font-medium">Why?</summary>
                        <ul className="mt-2 space-y-1 text-muted-foreground">
                          {analysis.flags.map((flag) => (
                            <li key={flag}>• {flag}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}

                    {analysis.rewordingSuggestion ? (
                      <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Try this instead
                        </p>
                        <p className="text-sm leading-relaxed">{analysis.rewordingSuggestion}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" size="sm" onClick={handleUseSuggestion} data-testid="button-compose-use-suggestion">
                            Use this version
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={handleCopyMessage} data-testid="button-compose-copy-suggestion">
                            <Copy className="mr-2 h-4 w-4" />
                            {messageCopied ? "Copied!" : "Copy to send"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">Ready to send it outside PeacePad?</p>
                  <p className="text-sm text-muted-foreground">
                    Copy your draft, then paste it into text, email, WhatsApp, or wherever you co-parent.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleCopyMessage}
                  disabled={!message.trim()}
                  data-testid="button-compose-copy-send"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {messageCopied ? "Copied!" : "Copy to Send"}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                PeacePad helps you refine the message first. You stay in control of where it gets sent.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Save and sync later if you want history across devices.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/prep-chat">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Need help shaping it?
                  </Link>
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/settings">Invite partner</Link>
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/onboarding?auth=upgrade">Sign in to save history</Link>
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
            <DialogTitle>You're using PeacePad like a pro</DialogTitle>
            <DialogDescription>
              Sign in to keep your progress and unlock a smoother cross-device workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Sign in to unlock:</p>
            <ul className="space-y-1">
              <li>• Save message history</li>
              <li>• Track your progress over time</li>
              <li>• Access PeacePad from any device</li>
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
