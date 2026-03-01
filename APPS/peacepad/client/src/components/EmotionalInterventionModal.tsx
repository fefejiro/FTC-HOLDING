
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Wind } from "lucide-react";
import { getRandomBreathingPrompt } from "@/data/empathetic-prompts";

interface EmotionalInterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedEmotion: "frustrated" | "tense" | "defensive";
  onTakeBreath: () => void;
}

export function EmotionalInterventionModal({
  isOpen,
  onClose,
  detectedEmotion,
  onTakeBreath,
}: EmotionalInterventionModalProps) {
  const breathingPrompt = getRandomBreathingPrompt();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Heart className="h-5 w-5" />
            Take a Moment
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-4">
            <p className="text-base text-foreground font-medium">
              {breathingPrompt}
            </p>
            
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-3">
                Our AI noticed the conversation is getting tense. This is a good time to:
              </p>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Take three deep breaths
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Remember you're both on the same team
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Focus on your children's wellbeing
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={onTakeBreath}
                className="flex-1 gap-2"
                data-testid="button-breathing-exercise"
              >
                <Wind className="h-4 w-4" />
                Breathing Exercise
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
                data-testid="button-continue-carefully"
              >
                Continue (Carefully)
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
