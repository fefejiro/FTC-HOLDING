import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDailyAffirmation } from "@/data/affirmations";

export default function AffirmationBanner() {
  const [affirmation, setAffirmation] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissedToday = localStorage.getItem("affirmation_dismissed_date");
    const today = new Date().toDateString();
    
    if (dismissedToday === today) {
      setIsDismissed(true);
      return;
    }

    const daily = getDailyAffirmation();
    setAffirmation(daily);
    
    // Show with fade-in after a brief delay
    setTimeout(() => setIsVisible(true), 500);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      localStorage.setItem("affirmation_dismissed_date", new Date().toDateString());
    }, 300);
  };

  if (isDismissed || !affirmation) return null;

  return (
    <div
      className={`
        relative px-6 py-4 mb-4 mx-4 sm:mx-6 mt-4
        bg-gradient-to-r from-purple-50 to-amber-50 
        dark:from-purple-950/30 dark:to-amber-950/30
        border border-purple-200 dark:border-purple-800
        rounded-lg shadow-sm
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
      data-testid="affirmation-banner"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm sm:text-base text-foreground/90 font-medium italic flex-1">
          "{affirmation}"
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 hover:bg-background/50"
          onClick={handleDismiss}
          data-testid="button-dismiss-affirmation"
          aria-label="Dismiss affirmation"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
