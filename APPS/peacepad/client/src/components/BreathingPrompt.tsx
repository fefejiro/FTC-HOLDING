import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { getRandomBreathingPrompt } from "@/data/empathetic-prompts";

interface BreathingPromptProps {
  onClose?: () => void;
}

export default function BreathingPrompt({ onClose }: BreathingPromptProps) {
  const [prompt, setPrompt] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Get a random breathing prompt
    setPrompt(getRandomBreathingPrompt());
    
    // Show prompt briefly
    setIsVisible(true);
    
    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <Card 
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 bg-primary/5 border-primary/20 shadow-lg animate-in slide-in-from-bottom-4 z-50"
      data-testid="breathing-prompt"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Gentle Reminder
            </p>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {prompt}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleClose}
          className="shrink-0 h-6 w-6 -mr-1 -mt-1"
          data-testid="button-close-breathing-prompt"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
