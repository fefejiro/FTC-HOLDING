import { useState } from "react";
import { ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LyricLine } from "@shared/schema";

interface LyricLineCardProps {
  lyricLine: LyricLine;
  language: string;
  onGenerateMeaning: (lineId: string) => void;
  onVote: (lineId: string, voteType: "upvote" | "downvote") => void;
  isGenerating?: boolean;
}

export function LyricLineCard({
  lyricLine,
  language,
  onGenerateMeaning,
  onVote,
  isGenerating = false,
}: LyricLineCardProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const hasTranslation = !!lyricLine.translation;

  const handleVote = (voteType: "upvote" | "downvote") => {
    if (!hasVoted) {
      onVote(lyricLine.id, voteType);
      setHasVoted(true);
    }
  };

  return (
    <Card
      className="p-6 mb-6 border-l-4 border-l-primary"
      data-testid={`card-lyric-${lyricLine.id}`}
    >
      {lyricLine.startTime && lyricLine.endTime && (
        <p className="text-sm text-muted-foreground mb-2">
          [{lyricLine.startTime} - {lyricLine.endTime}]
        </p>
      )}

      <p
        className="font-serif text-lg leading-relaxed mb-4"
        data-testid={`text-lyric-${lyricLine.id}`}
      >
        {lyricLine.text}
      </p>

      {!hasTranslation && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onGenerateMeaning(lyricLine.id)}
          disabled={isGenerating}
          data-testid={`button-generate-${lyricLine.id}`}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isGenerating ? "Generating..." : "Generate Meaning"}
        </Button>
      )}

      {isGenerating && !hasTranslation && (
        <div className="mt-4 space-y-2 pl-6 border-l-2 border-muted">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      )}

      {hasTranslation && (
        <div
          className="mt-4 pl-6 border-l-2 border-muted bg-muted/20 -ml-6 p-4 rounded-md"
          data-testid={`translation-${lyricLine.id}`}
        >
          <div className="mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Translation:
            </p>
            <p className="text-base">{lyricLine.translation}</p>
          </div>

          {lyricLine.culturalMeaning && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Cultural Meaning:
              </p>
              <p className="text-sm text-muted-foreground">
                {lyricLine.culturalMeaning}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote("upvote")}
              disabled={hasVoted}
              data-testid={`button-upvote-${lyricLine.id}`}
            >
              <ThumbsUp className="w-4 h-4 mr-1" />
              <span data-testid={`count-upvotes-${lyricLine.id}`}>
                {lyricLine.upvotes}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote("downvote")}
              disabled={hasVoted}
              data-testid={`button-downvote-${lyricLine.id}`}
            >
              <ThumbsDown className="w-4 h-4 mr-1" />
              <span data-testid={`count-downvotes-${lyricLine.id}`}>
                {lyricLine.downvotes}
              </span>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
