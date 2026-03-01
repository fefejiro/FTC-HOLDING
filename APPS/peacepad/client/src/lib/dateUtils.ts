import { format, formatDistanceToNow } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const TORONTO_TZ = 'America/Toronto';

/**
 * Centralized date formatting utilities for consistent display across the app.
 * All functions handle both Date objects and ISO string inputs.
 * Times are displayed in Toronto timezone (America/Toronto) for consistent user experience.
 */

export const formatDate = {
  /**
   * Short date: Jan 15, 2025
   */
  short: (date: Date | string): string => {
    return formatInTimeZone(new Date(date), TORONTO_TZ, 'MMM d, yyyy');
  },

  /**
   * Long date: January 15, 2025
   */
  long: (date: Date | string): string => {
    return formatInTimeZone(new Date(date), TORONTO_TZ, 'MMMM d, yyyy');
  },

  /**
   * Full date with weekday: Monday, January 15, 2025
   */
  full: (date: Date | string): string => {
    return formatInTimeZone(new Date(date), TORONTO_TZ, 'EEEE, MMMM d, yyyy');
  },

  /**
   * Time only: 2:30 PM (Toronto timezone)
   */
  time: (date: Date | string): string => {
    return formatInTimeZone(new Date(date), TORONTO_TZ, 'h:mm a');
  },

  /**
   * Time with seconds: 2:30:45 PM (Toronto timezone)
   */
  timeWithSeconds: (date: Date | string): string => {
    return formatInTimeZone(new Date(date), TORONTO_TZ, 'h:mm:ss a');
  },

  /**
   * Date and time: Jan 15, 2025 at 2:30 PM (Toronto timezone)
   */
  dateTime: (date: Date | string): string => {
    return formatInTimeZone(new Date(date), TORONTO_TZ, "MMM d, yyyy 'at' h:mm a");
  },

  /**
   * Full date and time: Monday, January 15, 2025 at 2:30 PM (Toronto timezone)
   */
  fullDateTime: (date: Date | string): string => {
    return formatInTimeZone(new Date(date), TORONTO_TZ, "EEEE, MMMM d, yyyy 'at' h:mm a");
  },

  /**
   * Relative time: 5 minutes ago, 2 hours ago, 3 days ago
   */
  relative: (date: Date | string): string => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  },

  /**
   * ISO date for inputs: 2025-01-15
   */
  inputValue: (date: Date | string): string => {
    return formatInTimeZone(new Date(date), TORONTO_TZ, 'yyyy-MM-dd');
  },

  /**
   * Compact: 01/15/25
   */
  compact: (date: Date | string): string => {
    return formatInTimeZone(new Date(date), TORONTO_TZ, 'MM/dd/yy');
  },
};
