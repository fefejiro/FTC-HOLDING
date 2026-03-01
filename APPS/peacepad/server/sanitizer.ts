import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a DOMPurify instance with jsdom for server-side use
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Configure DOMPurify for maximum safety
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span'],
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link', 'base'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
};

/**
 * Sanitize user input to prevent XSS attacks
 * Removes all potentially dangerous HTML and JavaScript
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remove any null bytes
  let cleaned = input.replace(/\0/g, '');
  
  // Use DOMPurify to clean HTML
  cleaned = purify.sanitize(cleaned, PURIFY_CONFIG);
  
  // Additional safety: remove any remaining event handlers
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  cleaned = cleaned.replace(/javascript:/gi, '');
  
  return cleaned.trim();
}

/**
 * Sanitize an object's string properties recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = { ...obj };
  
  for (const key in sanitized) {
    const value = sanitized[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item: any) => 
        typeof item === 'string' ? sanitizeInput(item) : 
        (item && typeof item === 'object' ? sanitizeObject(item) : item)
      );
    }
  }
  
  return sanitized as T;
}

/**
 * Escape HTML entities for safe display
 * Use this when displaying user content that should not contain ANY HTML
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, char => map[char]);
}