import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  detectSpeechRecognition,
  getSpeechRecognitionErrorMessage,
  normalizeSpeechTranscript,
  shouldFallbackToServerTranscription,
} from "@/lib/speechRecognitionSupport";

interface PracticeVoiceRecorderProps {
  onTranscription: (text: string) => void;
  onRecordingStart?: () => void;
  onStatusChange?: (status: "idle" | "listening" | "transcribing" | "error") => void;
  disabled?: boolean;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type VoiceStatus = "idle" | "listening" | "recording" | "transcribing" | "error";

export function PracticeVoiceRecorder({
  onTranscription,
  onRecordingStart,
  onStatusChange,
  disabled,
}: PracticeVoiceRecorderProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptBufferRef = useRef("");
  const fallbackStartedRef = useRef(false);

  const notifyStatus = (next: VoiceStatus) => {
    setStatus(next);
    if (onStatusChange) {
      if (next === "recording") {
        onStatusChange("listening");
        return;
      }
      onStatusChange(next);
    }
  };

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startServerRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stopMediaStream();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      notifyStatus("recording");
      onRecordingStart?.();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      notifyStatus("error");
      toast({
        title: "Microphone issue",
        description: "Could not access microphone. Please allow access and try again.",
        variant: "destructive",
      });
    }
  };

  const startBrowserRecognition = async () => {
    const availability = detectSpeechRecognition(window as unknown);
    if (!availability.supported) {
      await startServerRecording();
      return;
    }

    const RecognitionCtor = ((window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition) as new () => SpeechRecognitionLike;
    const recognition = new RecognitionCtor();
    recognitionRef.current = recognition;
    transcriptBufferRef.current = "";
    fallbackStartedRef.current = false;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript || "";
        if (result?.isFinal) {
          transcriptBufferRef.current = `${transcriptBufferRef.current} ${transcript}`.trim();
        }
      }
    };

    recognition.onerror = async (event: any) => {
      const errorCode = event?.error as string | undefined;
      notifyStatus("error");
      toast({
        title: "Voice input issue",
        description: getSpeechRecognitionErrorMessage(errorCode),
        variant: "destructive",
      });

      if (!fallbackStartedRef.current && shouldFallbackToServerTranscription(errorCode)) {
        fallbackStartedRef.current = true;
        await startServerRecording();
      }
    };

    recognition.onend = () => {
      const transcript = normalizeSpeechTranscript(transcriptBufferRef.current);
      transcriptBufferRef.current = "";
      if (transcript) {
        onTranscription(transcript);
        notifyStatus("idle");
        return;
      }
      if (status === "listening") {
        notifyStatus("idle");
      }
    };

    try {
      notifyStatus("listening");
      onRecordingStart?.();
      recognition.start();
    } catch (error) {
      console.error("Speech recognition start failed:", error);
      notifyStatus("error");
      await startServerRecording();
    }
  };

  const stopRecording = () => {
    if (status === "listening" && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.stop();
      notifyStatus("transcribing");
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    notifyStatus("transcribing");
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("model", "whisper-1");

      const response = await fetch("/api/openai/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription failed");

      const data = await response.json();
      if (data.text) {
        onTranscription(normalizeSpeechTranscript(data.text));
        notifyStatus("idle");
      } else {
        notifyStatus("error");
      }
    } catch (err) {
      console.error("Transcription error:", err);
      notifyStatus("error");
      toast({
        title: "Microphone issue",
        description: "Network was cut off or the audio wasn't clear. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startRecording = async () => {
    await startBrowserRecognition();
  };

  useEffect(() => {
    if (status !== "error") {
      return;
    }

    const timer = window.setTimeout(() => {
      notifyStatus("idle");
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      stopMediaStream();
    };
  }, []);

  const isRecording = status === "listening" || status === "recording";
  const isTranscribing = status === "transcribing";
  const buttonAriaLabel =
    status === "listening"
      ? "Stop voice listening"
      : status === "recording"
        ? "Stop voice recording"
        : "Start voice dictation";

  return (
    <div className="flex items-center justify-center">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-10 w-10 rounded-full transition-all",
          isRecording
            ? "bg-destructive text-destructive-foreground animate-calm-pulse shadow-lg scale-110"
            : status === "transcribing"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-primary/10 text-muted-foreground"
        )}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isTranscribing}
        aria-label={buttonAriaLabel}
        title={buttonAriaLabel}
        data-testid="button-voice-transcribe"
      >
        {isTranscribing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isRecording ? (
          <AudioLines className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
      <span className="sr-only" data-testid="text-voice-status">
        {status === "listening" || status === "recording"
          ? "Listening"
          : status === "transcribing"
            ? "Transcribing"
            : status === "error"
              ? "Voice input error"
              : "Idle"}
      </span>
    </div>
  );
}
