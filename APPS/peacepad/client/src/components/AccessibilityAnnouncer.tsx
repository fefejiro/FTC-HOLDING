import { useEffect, useState } from 'react';

/**
 * ARIA Live Region for Screen Reader Announcements
 * Provides important updates to assistive technology users
 */
export function AccessibilityAnnouncer() {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  useEffect(() => {
    // Listen for custom announcement events
    const handleAnnouncement = (e: CustomEvent) => {
      const { message, priority = 'polite' } = e.detail;
      
      if (priority === 'assertive') {
        setAssertiveMessage(message);
        setTimeout(() => setAssertiveMessage(''), 1000);
      } else {
        setPoliteMessage(message);
        setTimeout(() => setPoliteMessage(''), 1000);
      }
    };

    window.addEventListener('announce' as any, handleAnnouncement);

    return () => {
      window.removeEventListener('announce' as any, handleAnnouncement);
    };
  }, []);

  return (
    <>
      {/* Polite announcements - don't interrupt screen reader */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      {/* Assertive announcements - interrupt screen reader immediately */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </>
  );
}

/**
 * Helper function to announce messages to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const event = new CustomEvent('announce', {
    detail: { message, priority }
  });
  window.dispatchEvent(event);
}
