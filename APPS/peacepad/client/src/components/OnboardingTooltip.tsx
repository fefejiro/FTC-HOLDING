import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface OnboardingTooltipProps {
  id: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  onDismiss?: () => void;
}

const TOOLTIP_STORAGE_KEY = "peacepad_seen_tooltips";

function getSeenTooltips(): string[] {
  try {
    const stored = localStorage.getItem(TOOLTIP_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markTooltipSeen(id: string) {
  const seen = getSeenTooltips();
  if (!seen.includes(id)) {
    seen.push(id);
    localStorage.setItem(TOOLTIP_STORAGE_KEY, JSON.stringify(seen));
  }
}

export function useOnboardingTooltip(id: string) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const seen = getSeenTooltips();
    if (!seen.includes(id)) {
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [id]);

  const dismiss = () => {
    markTooltipSeen(id);
    setIsVisible(false);
  };

  return { isVisible, dismiss };
}

export default function OnboardingTooltip({ 
  id, 
  title, 
  description, 
  position = 'bottom',
  onDismiss 
}: OnboardingTooltipProps) {
  const { isVisible, dismiss } = useOnboardingTooltip(id);

  const handleDismiss = () => {
    dismiss();
    onDismiss?.();
  };

  if (!isVisible) return null;

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-primary border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-primary border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-primary border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-primary border-y-transparent border-l-transparent'
  };

  return (
    <div 
      className={`absolute z-50 ${positionClasses[position]} animate-in fade-in slide-in-from-bottom-2 duration-300`}
      data-testid={`tooltip-${id}`}
    >
      <div className="relative bg-primary text-primary-foreground rounded-lg shadow-lg p-4 max-w-xs">
        <div className={`absolute border-8 ${arrowClasses[position]}`} />
        
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-primary-foreground/70 hover:text-primary-foreground"
          data-testid={`button-dismiss-tooltip-${id}`}
        >
          <X className="w-4 h-4" />
        </button>

        <h4 className="font-semibold text-sm mb-1 pr-6">{title}</h4>
        <p className="text-xs text-primary-foreground/85 leading-relaxed">{description}</p>
        
        <Button 
          size="sm" 
          variant="secondary"
          onClick={handleDismiss}
          className="mt-3 w-full text-xs h-8"
          data-testid={`button-got-it-${id}`}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}

export const TOOLTIP_CONTENT = {
  practiceChat: {
    id: "practice-chat",
    title: "Practice before sending",
    description: "Write your message here and see how it may be perceived before sending."
  },
  chat: {
    id: "chat",
    title: "Calm messaging",
    description: "PeacePad suggests calmer wording but never blocks you. You choose what to send."
  },
  calendar: {
    id: "calendar",
    title: "Shared parenting schedule",
    description: "Track pickups, drop-offs, and events in one shared calendar."
  },
  expenses: {
    id: "expenses",
    title: "Shared expenses made simple",
    description: "Log expenses and track reimbursements transparently."
  }
};
