import { createContext, useContext, useEffect, useRef, ReactNode, useState } from 'react';

interface ActivityContextType {
  trackActivity: (activityType: 'messaging' | 'call' | 'navigation') => void;
  endActivity: (activityType: 'messaging' | 'call' | 'navigation') => void;
  showTransitionPrompt: boolean;
  dismissTransitionPrompt: () => void;
}

const ActivityContext = createContext<ActivityContextType | null>(null);

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return context;
}

interface ActivityProviderProps {
  children: ReactNode;
}

export function ActivityProvider({ children }: ActivityProviderProps) {
  const activeSessionsRef = useRef<Set<string>>(new Set());
  const dormantTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const wasActiveRef = useRef<boolean>(false);
  const [showTransitionPrompt, setShowTransitionPrompt] = useState(false);
  
  const DORMANT_THRESHOLD = 3 * 60 * 1000; // 3 minutes of inactivity

  const updateActivityState = (isActive: boolean) => {
    const state = isActive ? 'active' : 'dormant';
    localStorage.setItem('peacepad_activity_state', state);
    console.log('Activity state:', state);
    
    // Show transition prompt when moving from active to dormant
    if (wasActiveRef.current && !isActive) {
      setShowTransitionPrompt(true);
    }
    
    wasActiveRef.current = isActive;
  };
  
  const dismissTransitionPrompt = () => {
    setShowTransitionPrompt(false);
  };

  const trackActivity = (activityType: 'messaging' | 'call' | 'navigation') => {
    lastActivityRef.current = Date.now();
    activeSessionsRef.current.add(activityType);
    
    // Mark as active
    updateActivityState(true);

    // Reset dormant timer
    if (dormantTimerRef.current) {
      clearTimeout(dormantTimerRef.current);
    }

    // Set new dormant timer
    dormantTimerRef.current = setTimeout(() => {
      if (activeSessionsRef.current.size === 0) {
        updateActivityState(false);
      }
    }, DORMANT_THRESHOLD);
  };

  const endActivity = (activityType: 'messaging' | 'call' | 'navigation') => {
    activeSessionsRef.current.delete(activityType);
    
    // If no more active sessions, start dormant countdown
    if (activeSessionsRef.current.size === 0) {
      if (dormantTimerRef.current) {
        clearTimeout(dormantTimerRef.current);
      }
      
      dormantTimerRef.current = setTimeout(() => {
        updateActivityState(false);
      }, DORMANT_THRESHOLD);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dormantTimerRef.current) {
        clearTimeout(dormantTimerRef.current);
      }
    };
  }, []);

  return (
    <ActivityContext.Provider value={{ trackActivity, endActivity, showTransitionPrompt, dismissTransitionPrompt }}>
      {children}
    </ActivityContext.Provider>
  );
}
