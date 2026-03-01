/**
 * Keyboard Navigation Utilities
 * Provides helpers for accessible keyboard interactions
 */

/**
 * Trap focus within a container element
 * Useful for modals, dialogs, and dropdowns
 */
export function trapFocus(container: HTMLElement) {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function handleTabKey(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        lastFocusable?.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        firstFocusable?.focus();
        e.preventDefault();
      }
    }
  }

  container.addEventListener('keydown', handleTabKey);
  
  // Focus the first element
  firstFocusable?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Handle escape key to close modals/dialogs
 */
export function handleEscapeKey(callback: () => void) {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      callback();
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Navigate through a list with arrow keys
 * Returns the new selected index
 */
export function handleArrowKeyNavigation(
  e: KeyboardEvent,
  currentIndex: number,
  totalItems: number
): number {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    return Math.min(currentIndex + 1, totalItems - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    return Math.max(currentIndex - 1, 0);
  } else if (e.key === 'Home') {
    e.preventDefault();
    return 0;
  } else if (e.key === 'End') {
    e.preventDefault();
    return totalItems - 1;
  }
  
  return currentIndex;
}

/**
 * Focus visible elements (skip sr-only)
 */
export function focusVisible(element: HTMLElement | null) {
  if (!element) return;
  
  // Skip if element has sr-only class
  if (element.classList.contains('sr-only')) {
    return;
  }
  
  element.focus();
}

/**
 * Get the next/previous focusable sibling
 */
export function getNextFocusable(
  element: HTMLElement,
  direction: 'next' | 'prev'
): HTMLElement | null {
  const focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  
  let current = element;
  
  while (true) {
    const sibling = direction === 'next' 
      ? current.nextElementSibling 
      : current.previousElementSibling;
      
    if (!sibling) return null;
    
    if (sibling.matches(focusableSelector)) {
      return sibling as HTMLElement;
    }
    
    // Check children
    const focusableChild = sibling.querySelector(focusableSelector);
    if (focusableChild) {
      return focusableChild as HTMLElement;
    }
    
    current = sibling as HTMLElement;
  }
}

/**
 * Skip links for screen readers
 * Allows users to jump to main content
 */
export function createSkipLink(targetId: string, label: string = 'Skip to main content') {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md';
  skipLink.textContent = label;
  
  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  
  return skipLink;
}
