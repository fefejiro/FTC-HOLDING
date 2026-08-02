import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Star, Heart, X } from "lucide-react";
import { hapticSuccess, hapticTap } from "@/lib/haptics";

interface AppRatingPromptProps {
  /** Trigger name for tracking which action prompted the rating */
  trigger?: string;
}

export function AppRatingPrompt({ trigger = 'unknown' }: AppRatingPromptProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if we should show the rating prompt
    const shouldShow = checkShouldShowRating();
    if (shouldShow) {
      // Delay showing by 2 seconds to avoid interrupting user flow
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleRate = () => {
    hapticSuccess();
    
    // Track that user agreed to rate
    localStorage.setItem('app-rating-status', 'rated');
    localStorage.setItem('app-rating-date', new Date().toISOString());
    localStorage.setItem('app-rating-trigger', trigger);
    
    // Open appropriate app store
    // For now, we'll redirect to a generic review page
    // In production PWA, this would detect iOS/Android and use deep links
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      window.open('https://apps.apple.com/app/id6793350735?action=write-review', '_blank', 'noopener,noreferrer');
    } else if (isAndroid) {
      window.open('https://play.google.com/store/apps/details?id=ca.peacepad.family', '_blank', 'noopener,noreferrer');
    } else {
      // Fallback for desktop/web
      window.open('https://peacepad.ca/review', '_blank');
    }
    
    setIsOpen(false);
  };

  const handleRemindLater = () => {
    hapticTap();
    
    // Set reminder for 7 days from now
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 7);
    
    localStorage.setItem('app-rating-status', 'remind-later');
    localStorage.setItem('app-rating-remind-date', reminderDate.toISOString());
    localStorage.setItem('app-rating-remind-count', 
      String(Number(localStorage.getItem('app-rating-remind-count') || '0') + 1)
    );
    
    setIsOpen(false);
  };

  const handleDismiss = () => {
    hapticTap();
    
    // Permanently dismiss (but allow reset in settings)
    localStorage.setItem('app-rating-status', 'dismissed');
    localStorage.setItem('app-rating-dismiss-date', new Date().toISOString());
    
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-sm" data-testid="app-rating-prompt">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 rounded-full p-4">
              <Heart className="h-12 w-12 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Enjoying PeacePad?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-2">
            <p>
              Your feedback helps us improve co-parenting communication for everyone.
            </p>
            <p className="text-sm">
              Would you mind rating us? It only takes a moment.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleRate}
            className="w-full"
            data-testid="button-rate-app"
          >
            <Star className="h-4 w-4 mr-2" />
            Rate PeacePad
          </Button>
          <Button
            variant="outline"
            onClick={handleRemindLater}
            className="w-full"
            data-testid="button-remind-later"
          >
            Remind Me Later
          </Button>
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="w-full text-muted-foreground"
            data-testid="button-dismiss-rating"
          >
            No Thanks
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Check if we should show the app rating prompt
 * Criteria:
 * - User has been active for 7+ days
 * - User has completed at least 3 positive actions
 * - User hasn't already rated, or dismissed, or is within remind-later window
 * - User hasn't been reminded more than 3 times
 */
function checkShouldShowRating(): boolean {
  // Check rating status
  const status = localStorage.getItem('app-rating-status');
  
  // Never show if already rated or permanently dismissed
  if (status === 'rated' || status === 'dismissed') {
    return false;
  }
  
  // Check if we're in a remind-later window
  if (status === 'remind-later') {
    const remindDate = localStorage.getItem('app-rating-remind-date');
    const remindCount = Number(localStorage.getItem('app-rating-remind-count') || '0');
    
    // Stop asking after 3 remind-laters
    if (remindCount >= 3) {
      return false;
    }
    
    // Check if remind date has passed
    if (remindDate && new Date(remindDate) > new Date()) {
      return false;
    }
  }
  
  // Check user tenure (7+ days)
  const accountCreatedDate = localStorage.getItem('account-created-date');
  if (accountCreatedDate) {
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(accountCreatedDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation < 7) {
      return false;
    }
  } else {
    // If no creation date, set it now and don't show prompt yet
    localStorage.setItem('account-created-date', new Date().toISOString());
    return false;
  }
  
  // Check positive action count
  const positiveActionCount = Number(localStorage.getItem('positive-action-count') || '0');
  if (positiveActionCount < 3) {
    return false;
  }
  
  // All criteria met!
  return true;
}

/**
 * Track a positive action (call this from other components)
 * Examples: completed task, sent message, created event, etc.
 */
export function trackPositiveAction(actionType: string) {
  const currentCount = Number(localStorage.getItem('positive-action-count') || '0');
  localStorage.setItem('positive-action-count', String(currentCount + 1));
  
  // Also track the specific action types
  const actions = JSON.parse(localStorage.getItem('positive-actions') || '[]');
  actions.push({
    type: actionType,
    timestamp: new Date().toISOString(),
  });
  // Keep only last 50 actions
  const recentActions = actions.slice(-50);
  localStorage.setItem('positive-actions', JSON.stringify(recentActions));
}

/**
 * Reset rating prompt (for testing or settings)
 */
export function resetAppRating() {
  localStorage.removeItem('app-rating-status');
  localStorage.removeItem('app-rating-date');
  localStorage.removeItem('app-rating-trigger');
  localStorage.removeItem('app-rating-remind-date');
  localStorage.removeItem('app-rating-remind-count');
  localStorage.removeItem('app-rating-dismiss-date');
  localStorage.removeItem('positive-action-count');
  localStorage.removeItem('positive-actions');
}
