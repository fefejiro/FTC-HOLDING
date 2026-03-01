import { useEffect } from 'react';

/**
 * Hook to handle safe viewport sizing that accounts for device-specific safe areas
 * like Samsung's gesture navigation bar (~48px) and iOS's bottom bar
 * 
 * Sets CSS custom properties:
 * - --app-viewport-height: The actual usable viewport height in pixels
 * - --safe-area-bottom: The bottom safe area inset (max of env() and 1rem)
 */
export function useSafeViewport() {
  useEffect(() => {
    const updateViewportHeight = () => {
      // Get the actual viewport height
      const vh = window.innerHeight;
      
      // Use visualViewport if available (more accurate on mobile)
      const visualHeight = window.visualViewport?.height || vh;
      
      // Set CSS custom properties
      document.documentElement.style.setProperty('--app-viewport-height', `${visualHeight}px`);
      
      // Note: env(safe-area-inset-bottom) is handled in CSS
    };
    
    // Initial update
    updateViewportHeight();
    
    // Update on resize and orientation change
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);
    
    // Update on visual viewport change (soft keyboard, etc)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
    }
    
    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportHeight);
      }
    };
  }, []);
}