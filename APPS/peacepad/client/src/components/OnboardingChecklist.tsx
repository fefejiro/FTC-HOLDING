import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Partnership, Task, Event } from "@shared/schema";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: {
    label: string;
    path: string;
  };
}

export function OnboardingChecklist() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if user has dismissed the checklist
  useEffect(() => {
    const dismissed = localStorage.getItem('onboarding-checklist-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Fetch user data to determine completion status
  // Only fetch when user is authenticated to prevent 401 spam after logout
  const { data: partnerships = [] } = useQuery<Partnership[]>({
    queryKey: ['/api/partnerships'],
    staleTime: 30000, // Cache for 30 seconds
    enabled: !!user, // Only run when authenticated
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    staleTime: 30000, // Cache for 30 seconds
    enabled: !!user, // Only run when authenticated
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/calendar'],
    staleTime: 30000, // Cache for 30 seconds
    enabled: !!user, // Only run when authenticated
  });

  // Build checklist items based on user progress
  const items: ChecklistItem[] = [
    {
      id: 'profile',
      title: 'Complete your profile',
      description: 'Add your photo and preferences',
      completed: !!(user?.profileImageUrl && user?.communicationStyle),
      action: {
        label: 'Go to Settings',
        path: '/settings',
      },
    },
    {
      id: 'partner',
      title: 'Connect with your co-parent',
      description: 'Send or scan a partnership invite code',
      completed: partnerships.length > 1 || (partnerships.length === 1 && !partnerships[0]?.user2Id),
      action: {
        label: 'Add Partner',
        path: '/settings',
      },
    },
    {
      id: 'calendar',
      title: 'Create your first calendar event',
      description: 'Add custody schedules or important dates',
      completed: events.length > 0,
      action: {
        label: 'Open Calendar',
        path: '/scheduling',
      },
    },
    {
      id: 'task',
      title: 'Add a shared task',
      description: 'Track to-dos together',
      completed: tasks.length > 0,
      action: {
        label: 'Create Task',
        path: '/tasks',
      },
    },
  ];

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progress = (completedCount / totalCount) * 100;
  const isComplete = completedCount === totalCount;

  // Auto-dismiss when complete
  useEffect(() => {
    if (isComplete && !isDismissed) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000); // Auto-dismiss after 5 seconds when complete
      return () => clearTimeout(timer);
    }
  }, [isComplete, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('onboarding-checklist-dismissed', 'true');
  };

  const handleReset = () => {
    setIsDismissed(false);
    localStorage.removeItem('onboarding-checklist-dismissed');
  };

  // Don't show if dismissed or if user has been active for a while
  if (isDismissed) {
    return null;
  }

  return (
    <Card className="rounded-2xl shadow-sm border-primary/20" data-testid="onboarding-checklist">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">
                {isComplete ? '🎉 Welcome to PeacePad!' : 'Get Started with PeacePad'}
              </h3>
              {isComplete && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isComplete 
                ? "You're all set! Start co-parenting with peace."
                : `${completedCount} of ${totalCount} steps completed`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? 'Expand checklist' : 'Collapse checklist'}
              data-testid="button-toggle-checklist"
              className="h-8 w-8"
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              aria-label="Dismiss checklist"
              data-testid="button-dismiss-checklist"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Progress value={progress} className="h-2 mb-3" data-testid="progress-onboarding" />

        {!isCollapsed && (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  item.completed 
                    ? 'bg-primary/5' 
                    : 'bg-muted/30 hover-elevate active-elevate-2'
                }`}
                data-testid={`checklist-item-${item.id}`}
              >
                <div className="mt-0.5">
                  {item.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${
                    item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}>
                    {item.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </div>
                  {!item.completed && item.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 mt-1 text-xs text-primary hover:text-primary/80"
                      data-testid={`button-action-${item.id}`}
                      onClick={() => setLocation(item.action!.path)}
                    >
                      {item.action.label} →
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export a reset function for testing/settings
export function resetOnboardingChecklist() {
  localStorage.removeItem('onboarding-checklist-dismissed');
  window.dispatchEvent(new Event('storage'));
}
