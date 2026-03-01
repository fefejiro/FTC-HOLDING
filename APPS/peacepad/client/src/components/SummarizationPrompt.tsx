import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Ear, Check, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SummarizationPromptProps {
  originalContent: string;
  senderName: string;
  onValidationComplete: (result: ValidationResult, summaryText: string) => void;
  onSkip: () => void;
  context?: string;
  initialSummary?: string;
  isSubmitting?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  score: number;
  capturedPoints: string[];
  missedPoints: string[];
  feedback: string;
  encouragement: string;
}

export function SummarizationPrompt({
  originalContent,
  senderName,
  onValidationComplete,
  onSkip,
  context,
  initialSummary = "",
  isSubmitting: externalIsSubmitting
}: SummarizationPromptProps) {
  const [summaryText, setSummaryText] = useState(initialSummary);
  const [isEditing, setIsEditing] = useState(!initialSummary);
  const { toast } = useToast();

  const validateMutation = useMutation({
    mutationFn: async (data: { originalContent: string; summaryText: string; context?: string }) => {
      const response = await apiRequest("POST", "/api/summaries/validate", data);
      return response.json() as Promise<ValidationResult>;
    },
    onSuccess: (result, variables) => {
      onValidationComplete(result, variables.summaryText);
    },
    onError: () => {
      toast({
        title: "Couldn't check your summary",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleConfirm = () => {
    if (!summaryText.trim()) return;
    validateMutation.mutate({
      originalContent,
      summaryText,
      context
    });
  };

  const handleClarify = () => {
    setIsEditing(true);
  };

  const isSubmitting = externalIsSubmitting ?? validateMutation.isPending;

  // Option A: AI-generated summary available - show confirmation flow
  if (initialSummary && !isEditing) {
    return (
      <Card className="border-0 shadow-lg bg-card/95 backdrop-blur-sm" data-testid="card-summarization-prompt">
        <CardHeader className="pb-2 text-center">
          <div className="mx-auto p-3 rounded-full bg-primary/10 mb-2">
            <Ear className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl" data-testid="text-summarization-title">
            Here's what I understood you to say:
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 text-base italic" data-testid="text-ai-summary">
            "{initialSummary}"
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={isSubmitting}
              className="flex-1 text-muted-foreground hover:text-foreground"
              data-testid="button-skip-summary"
            >
              Skip
            </Button>
            
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1"
              data-testid="button-confirm-summary"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Yes, that's right
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Option B: Fallback - user enters their own reflection
  return (
    <Card className="border-0 shadow-lg bg-card/95 backdrop-blur-sm" data-testid="card-summarization-prompt">
      <CardHeader className="pb-2 text-center">
        <div className="mx-auto p-3 rounded-full bg-primary/10 mb-2">
          <Ear className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl" data-testid="text-summarization-title">
          Before responding, restate what you heard
        </CardTitle>
        <CardDescription className="text-base" data-testid="text-summarization-description">
          What did you understand {senderName} to say?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="I heard you say..."
          value={summaryText}
          onChange={(e) => setSummaryText(e.target.value)}
          className="min-h-[80px] text-base"
          disabled={isSubmitting}
          data-testid="input-summary-text"
          autoFocus
        />

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isSubmitting}
            className="flex-1"
            data-testid="button-skip-summary"
          >
            Continue
          </Button>
          
          <Button
            onClick={handleConfirm}
            disabled={!summaryText.trim() || isSubmitting}
            className="flex-1"
            data-testid="button-submit-summary"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "That's what I heard"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
