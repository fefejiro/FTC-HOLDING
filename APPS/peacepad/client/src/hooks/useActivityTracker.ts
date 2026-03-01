import { useEffect, useCallback, useState, useRef } from 'react';

interface ActivityTrackerOptions {
  onActivityChange?: (isActive: boolean) => void;
  dormantThreshold?: number; // milliseconds of inactivity before considered dormant
}

export type ActivityType = 'messaging' | 'call' | 'navigation' | 'interaction';

export function useActivityTracker(options: ActivityTrackerOptions = {}) {
  const { onActivityChange, dormantThreshold = 3 * 60 * 1000 } = options; // Default 3 minutes

  const lastActivityRef = useRef<number>(Date.now());
  const isDormantRef = useRef<boolean>(false);
  const dormantTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeSessionRef = useRef<Set<ActivityType>>(new Set());

  // Track activity
  const trackActivity = useCallback((activityType: ActivityType) => {
    const now = Date.now();
    const wasActive = activeSessionRef.current.size > 0;

    lastActivityRef.current = now;
    activeSessionRef.current.add(activityType);

    // If was dormant, now active
    if (isDormantRef.current) {
      isDormantRef.current = false;
      onActivityChange?.(!isDormantRef.current);
    }

    // Reset dormant timer
    if (dormantTimerRef.current) {
      clearTimeout(dormantTimerRef.current);
    }

    // Set new dormant timer
    dormantTimerRef.current = setTimeout(() => {
      isDormantRef.current = true;
      onActivityChange?.(!isDormantRef.current);
    }, dormantThreshold);
  }, [onActivityChange, dormantThreshold]);

  // End specific activity session
  const endActivity = useCallback((activityType: ActivityType) => {
    activeSessionRef.current.delete(activityType);

    // If no more active sessions, let dormant timer run
    if (activeSessionRef.current.size === 0) {
      // Timer already running from last activity
    }
  }, []);

  // Check if currently active
  const isActive = useCallback(() => {
    return activeSessionRef.current.size > 0 || !isDormantRef.current;
  }, []);

  // Check if dormant (no activity for threshold period)
  const isDormant = useCallback(() => {
    return isDormantRef.current && activeSessionRef.current.size === 0;
  }, []);

  // Get time since last activity
  const getTimeSinceLastActivity = useCallback(() => {
    return Date.now() - lastActivityRef.current;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (dormantTimerRef.current) {
        clearTimeout(dormantTimerRef.current);
      }
    };
  }, []);

  return {
    trackActivity,
    endActivity,
    isActive,
    isDormant,
    getTimeSinceLastActivity,
  };
}