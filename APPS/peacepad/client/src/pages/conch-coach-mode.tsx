import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PracticeVoiceRecorder } from "@/components/PracticeVoiceRecorder";
import {
  normalizeCoachVoiceTranscript,
  shouldAutoSendCoachVoiceTurn,
} from "@/lib/coachVoice";
import { AudioLines, Loader2, Send, Volume2, VolumeX } from "lucide-react";

interface CoachTurn {
  role: "user" | "coach";
  content: string;
  createdAt: string;
}

interface PrepChatSessionResponse {
  id: string;
}

interface CoachMessageResponse {
  coachMessage?: string;
}

export default function ConchCoachModePage() {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");
  const [turns, setTurns] = useState<CoachTurn[]>([]);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "transcribing" | "error">("idle");
  const [speakResponses, setSpeakResponses] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const ensureSession = async (): Promise<string> => {
    if (sessionId) {
      return sessionId;
    }

    const response = await apiRequest("POST", "/api/prep-chat/sessions", {
      topic: "conch_coaching",
      customTopic: "Conch Coach Voice",
      emotionalStateStart: "neutral",
    });
    const session = (await response.json()) as PrepChatSessionResponse;
    setSessionId(session.id);
    return session.id;
  };

  const speak = (text: string) => {
    if (!speakResponses) {
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  const sendTurnMutation = useMutation({
    mutationFn: async (content: string) => {
      const activeSessionId = await ensureSession();
      const response = await apiRequest("POST", `/api/prep-chat/sessions/${activeSessionId}/messages`, {
        content,
      });
      return (await response.json()) as CoachMessageResponse;
    },
    onSuccess: (data, content) => {
      const timestamp = new Date().toISOString();
      setTurns((prev) => [
        ...prev,
        { role: "user", content, createdAt: timestamp },
        {
          role: "coach",
          content: data.coachMessage || "I hear you. Let's keep this calm and constructive.",
          createdAt: new Date().toISOString(),
        },
      ]);

      if (data.coachMessage) {
        speak(data.coachMessage);
      }
    },
    onError: () => {
      toast({
        title: "Coach request failed",
        description: "I couldn't send that turn. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendTurn = (rawContent: string) => {
    const content = normalizeCoachVoiceTranscript(rawContent);
    if (!shouldAutoSendCoachVoiceTurn(content, sendTurnMutation.isPending)) {
      return;
    }

    sendTurnMutation.mutate(content);
    setDraft("");
  };

  const handleTranscript = (transcript: string) => {
    const normalized = normalizeCoachVoiceTranscript(transcript);
    if (!normalized) {
      return;
    }

    setLastTranscript(normalized);
    setDraft(normalized);
    handleSendTurn(normalized);
  };

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 160)}px`;
    }
  }, [draft]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="px-4 py-4 space-y-4" data-testid="panel-conch-coach-mode">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <AudioLines className="h-5 w-5 text-primary" />
              Coach Voice
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSpeakResponses((prev) => !prev)}
              data-testid="button-conch-coach-tts-toggle"
            >
              {speakResponses ? (
                <>
                  <Volume2 className="h-4 w-4 mr-1" />
                  Speak back on
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 mr-1" />
                  Speak back off
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Tap mic, speak naturally, and PeacePad will transcribe and send automatically.
            Use manual send if you want to type instead.
          </p>
          {lastTranscript && (
            <p className="rounded-md bg-muted px-3 py-2 text-foreground" data-testid="text-conch-last-transcript">
              Last transcript: {lastTranscript}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[42vh] overflow-y-auto" data-testid="list-conch-coach-turns">
          {turns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Start talking and I will coach you turn by turn.</p>
          ) : (
            turns.map((turn, index) => (
              <div
                key={`${turn.createdAt}-${index}`}
                className={`rounded-lg px-3 py-2 text-sm ${
                  turn.role === "user" ? "bg-primary/10 text-foreground" : "bg-muted text-foreground"
                }`}
                data-testid={`turn-${turn.role}-${index}`}
              >
                <p className="text-xs uppercase tracking-wide mb-1 opacity-70">
                  {turn.role === "user" ? "You" : "PeacePad Coach"}
                </p>
                <p>{turn.content}</p>
              </div>
            ))
          )}
          {sendTurnMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-conch-coach-loading">
              <Loader2 className="h-4 w-4 animate-spin" />
              Coach is responding...
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textAreaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                voiceStatus === "listening"
                  ? "Listening..."
                  : voiceStatus === "transcribing"
                    ? "Transcribing..."
                    : "Type here if you prefer manual send"
              }
              className="min-h-[44px] max-h-[160px] resize-none"
              data-testid="input-conch-coach-draft"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSendTurn(draft);
                }
              }}
            />
            <Button
              size="icon"
              onClick={() => handleSendTurn(draft)}
              disabled={!draft.trim() || sendTurnMutation.isPending}
              data-testid="button-conch-coach-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <PracticeVoiceRecorder
              onRecordingStart={() => {
                setDraft("");
              }}
              onStatusChange={setVoiceStatus}
              onTranscription={handleTranscript}
              disabled={sendTurnMutation.isPending}
            />
            {(voiceStatus === "listening" || voiceStatus === "transcribing") && (
              <p className="text-xs text-muted-foreground" data-testid="text-conch-coach-voice-status">
                {voiceStatus === "listening" ? "Listening now..." : "Transcribing..."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
