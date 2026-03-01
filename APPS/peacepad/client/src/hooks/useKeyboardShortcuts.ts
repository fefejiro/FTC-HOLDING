import { useEffect } from 'react';

export type KeyboardShortcut = {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  callback: (e: KeyboardEvent) => void;
  description: string;
};

/**
 * Hook to register keyboard shortcuts
 * Enables power users to navigate the app efficiently
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      for (const shortcut of shortcuts) {
        const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey === undefined || e.ctrlKey === shortcut.ctrlKey;
        const shiftMatches = shortcut.shiftKey === undefined || e.shiftKey === shortcut.shiftKey;
        const altMatches = shortcut.altKey === undefined || e.altKey === shortcut.altKey;
        const metaMatches = shortcut.metaKey === undefined || e.metaKey === shortcut.metaKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
          // Don't trigger if user is typing in an input
          const target = e.target as HTMLElement;
          const isTyping = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;

          if (!isTyping) {
            e.preventDefault();
            shortcut.callback(e);
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
}

/**
 * Common keyboard shortcuts for the app
 */
export const commonShortcuts = {
  escape: (callback: () => void): KeyboardShortcut => ({
    key: 'Escape',
    callback,
    description: 'Close dialog or modal',
  }),
  
  search: (callback: () => void): KeyboardShortcut => ({
    key: 'k',
    ctrlKey: true,
    callback,
    description: 'Open search',
  }),
  
  newMessage: (callback: () => void): KeyboardShortcut => ({
    key: 'n',
    ctrlKey: true,
    callback,
    description: 'New message',
  }),
  
  help: (callback: () => void): KeyboardShortcut => ({
    key: '?',
    shiftKey: true,
    callback,
    description: 'Show keyboard shortcuts',
  }),
};
