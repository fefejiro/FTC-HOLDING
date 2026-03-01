import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceNoteMessageProps {
  audioUrl: string;
  duration?: string;
  transcript?: string;
  isSender?: boolean;
}

export function VoiceNoteMessage({ 
  audioUrl, 
  duration, 
  transcript,
  isSender = false 
}: VoiceNoteMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDuration = (durationInSeconds: string) => {
    const seconds = parseInt(durationInSeconds || '0');
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card 
      className={cn(
        "p-3 space-y-2 max-w-md",
        isSender ? "ml-auto" : "mr-auto"
      )}
      data-testid={`voice-note-${isSender ? 'sent' : 'received'}`}
    >
      <div className="flex items-center gap-2">
        <audio 
          src={audioUrl}
          controls 
          controlsList="nodownload"
          className="flex-1"
          data-testid="audio-player"
          preload="metadata"
          onError={(e) => {
            console.error('[VoiceNote] Audio playback error:', e);
            console.error('[VoiceNote] Audio URL:', audioUrl);
            console.error('[VoiceNote] Error details:', {
              error: e.currentTarget.error,
              src: e.currentTarget.src,
              networkState: e.currentTarget.networkState,
              readyState: e.currentTarget.readyState
            });
          }}
        >
          Your browser does not support audio playback.
        </audio>
        {duration && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDuration(duration)}
          </span>
        )}
      </div>

      {transcript && transcript !== '[Transcription unavailable]' && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between p-2 h-auto"
            data-testid="button-toggle-transcript"
          >
            <span className="text-xs text-muted-foreground">
              {isExpanded ? 'Hide transcript' : 'View transcript'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </Button>

          {isExpanded && (
            <div 
              className="mt-2 p-3 bg-muted/50 rounded-md text-sm"
              data-testid="text-transcript"
            >
              {transcript}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
