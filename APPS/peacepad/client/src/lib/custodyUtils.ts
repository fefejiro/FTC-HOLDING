import { Partnership, Event } from "@shared/schema";
import { differenceInDays, startOfDay, isWithinInterval } from "date-fns";

export type CustodyParent = "user1" | "user2" | null;

/**
 * Calculate which parent has custody on a given date based on the custody pattern
 * Checks vacation/holiday events first to override the regular pattern
 */
export function getCustodyForDate(
  date: Date,
  partnership: Partnership | undefined,
  events?: Event[]
): CustodyParent {
  // First check if there's a vacation or holiday event on this date
  if (events && partnership) {
    const targetDate = startOfDay(date);
    
    for (const event of events) {
      if (event.type === "vacation" || event.type === "holiday") {
        const eventStart = startOfDay(new Date(event.startDate));
        const eventEnd = event.endDate ? startOfDay(new Date(event.endDate)) : eventStart;
        
        if (isWithinInterval(targetDate, { start: eventStart, end: eventEnd })) {
          // Determine which parent created this vacation/holiday event
          if (event.createdBy === partnership.user1Id) {
            return "user1";
          } else if (event.createdBy === partnership.user2Id) {
            return "user2";
          }
        }
      }
    }
  }
  if (!partnership?.custodyEnabled || !partnership.custodyPattern || !partnership.custodyStartDate) {
    return null;
  }

  const startDate = startOfDay(new Date(partnership.custodyStartDate));
  const targetDate = startOfDay(date);
  const daysSinceStart = differenceInDays(targetDate, startDate);

  if (daysSinceStart < 0) {
    return null;
  }

  const primaryParent = (partnership.custodyPrimaryParent || "user1") as "user1" | "user2";
  const secondaryParent: "user1" | "user2" = primaryParent === "user1" ? "user2" : "user1";

  switch (partnership.custodyPattern) {
    case "week_on_off":
      // Alternating weeks - primary parent starts first week
      const weekNumber = Math.floor(daysSinceStart / 7);
      return weekNumber % 2 === 0 ? primaryParent : secondaryParent;

    case "every_other_weekend":
      // Primary parent has weekdays, secondary gets alternating weekends
      const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      if (!isWeekend) {
        return primaryParent; // Weekdays always with primary parent
      }
      
      // For weekends, alternate every 2 weeks
      const weekendNumber = Math.floor(daysSinceStart / 7);
      return weekendNumber % 2 === 0 ? primaryParent : secondaryParent;

    case "two_two_three":
      // 2-2-3 pattern: 2 days primary, 2 days secondary, 3 days alternating
      // Pattern repeats every 7 days: [P, P, S, S, P/S, P/S, P/S]
      // Week 1: P, P, S, S, P, P, P  (3 days primary at end)
      // Week 2: P, P, S, S, S, S, S  (3 days secondary at end)
      const dayInCycle = daysSinceStart % 7;
      const weekInPattern = Math.floor(daysSinceStart / 7) % 2;
      
      // Days 0-1: Primary parent
      if (dayInCycle < 2) {
        return primaryParent;
      }
      // Days 2-3: Secondary parent
      if (dayInCycle < 4) {
        return secondaryParent;
      }
      // Days 4-6: Alternating by week
      return weekInPattern === 0 ? primaryParent : secondaryParent;

    default:
      return null;
  }
}

/**
 * Get the color for a parent based on their role in the partnership
 */
export function getParentColor(
  parent: CustodyParent,
  partnership: Partnership | undefined
): string | null {
  if (!parent || !partnership) return null;
  
  if (parent === "user1") {
    return partnership.user1Color || "#3b82f6"; // Default soft blue
  } else {
    return partnership.user2Color || "#10b981"; // Default soft green
  }
}

/**
 * Convert hex color to RGB with opacity for background
 */
export function hexToRgba(hex: string, opacity: number = 0.1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
