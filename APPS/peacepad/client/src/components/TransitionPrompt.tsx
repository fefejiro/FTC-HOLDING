import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { getRandomTransitionPrompt } from "@/data/empathetic-prompts";
import { useActivity } from "./ActivityProvider";

export default function TransitionPrompt() {
  const { showTransitionPrompt, dismissTransitionPrompt } = useActivity();
  const [isVisible, setIsVisible] = useState(false);
  const prompt = useMemo(() => getRandomTransitionPrompt(), [showTransitionPrompt]);

  useEffect(() => {
    if (showTransitionPrompt) {
      setIsVisible(true);
      
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        dismissTransitionPrompt();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [showTransitionPrompt, dismissTransitionPrompt]);

  const handleClose = () => {
    setIsVisible(false);
    dismissTransitionPrompt();
  };

  if (!isVisible) return null;

  return (
    <Card 
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 bg-primary/5 border-primary/20 shadow-lg animate-in slide-in-from-bottom-4 z-50"
      data-testid="transition-prompt"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-foreground">
            {prompt.title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {prompt.description}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleClose}
          className="shrink-0 h-6 w-6 -mr-1 -mt-1"
          data-testid="button-close-transition-prompt"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
