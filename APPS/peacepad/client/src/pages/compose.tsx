import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Copy, RefreshCw, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ensureGuestSession } from "@/lib/guestSession";
import { SEOHead } from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function ComposePage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState<PreviewResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isPreparingGuest, setIsPreparingGuest] = useState(false);
  const latestRequestId = useRef(0);

  useEffect(() => {
    let cancelled = false;

    if (isLoading || user) {
      return;
    }

    setIsPreparingGuest(true);
    ensureGuestSession()
      .catch((error) => {
        if (!cancelled) {
          setAnalysisError(error instanceof Error ? error.message : "PeacePad could not start a guest session.");
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
      return;
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

    setMessage(analysis.rewordingSuggestion);
    setAnalysis(null);
    setAnalysisError(null);
  };

  const handleCopyMessage = async () => {
    const textToCopy = analysis?.rewordingSuggestion || message.trim();
    if (!textToCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied",
        description: "Your calmer draft is ready to paste wherever you need it.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please select the text manually and copy it.",
        variant: "destructive",
      });
    }
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
                onChange={(event) => setMessage(event.target.value)}
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
                          <Button type="button" size="sm" variant="outline" onClick={handleCopyMessage}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy calmer draft
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

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
                  <Link href="/onboarding?auth=upgrade">Sign in to save history</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
