import { useState } from "react";
import { Sparkles, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface UserLyricInputProps {
  language: string;
  languageName: string;
  songId?: string;
  onGenerate: (lyricText: string) => Promise<{ translation: string; culturalMeaning: string }>;
}

export function UserLyricInput({
  language,
  languageName,
  songId,
  onGenerate,
}: UserLyricInputProps) {
  const [lyricText, setLyricText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    translation: string;
    culturalMeaning: string;
  } | null>(null);

  const handleGenerate = async () => {
    if (!lyricText.trim()) return;

    setIsGenerating(true);
    setResult(null);
    try {
      const translationResult = await onGenerate(lyricText);
      setResult(translationResult);
      setIsGenerating(false);
    } catch (error) {
      setIsGenerating(false);
      console.error("Error generating translation:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This song does not allow pre-loaded lyrics. Paste any lyric line you
          want explained, and we'll translate it without storing copyrighted
          content.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <label
          htmlFor="user-lyric-input"
          className="block text-sm font-medium mb-2"
        >
          Type or paste a lyric line from this song:
        </label>
        <Textarea
          id="user-lyric-input"
          placeholder={`Enter lyrics in ${languageName}...`}
          value={lyricText}
          onChange={(e) => setLyricText(e.target.value)}
          className="min-h-32 mb-4"
          data-testid="input-user-lyric"
        />
        <Button
          onClick={handleGenerate}
          disabled={!lyricText.trim() || isGenerating}
          data-testid="button-generate-user-lyric"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isGenerating ? "Translating..." : "Translate & Explain"}
        </Button>
      </Card>

      {isGenerating && (
        <Card className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </Card>
      )}

      {result && !isGenerating && (
        <Card className="p-6" data-testid="card-translation-result">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Translation:
              </h3>
              <p className="text-base" data-testid="text-translation">
                {result.translation}
              </p>
            </div>
            {result.culturalMeaning && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Cultural Meaning:
                </h3>
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="text-cultural-meaning"
                >
                  {result.culturalMeaning}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
