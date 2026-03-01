import type { Event } from "@shared/schema";

/**
 * Generates an iCalendar (iCal/ICS) file content from PeacePad events
 * Compatible with Google Calendar, Apple Calendar, Outlook, etc.
 */
export function generateICalFromEvents(events: Event[], calendarName: string = "PeacePad Custody Schedule"): string {
  const now = new Date();
  const timestamp = formatDateToICalTimestamp(now);
  
  // iCal header
  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PeacePad//Co-Parenting Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICalText(calendarName)}`,
    'X-WR-TIMEZONE:UTC',
  ].join('\r\n');

  // Add each event
  events.forEach(event => {
    icalContent += '\r\n' + generateICalEvent(event);
  });

  // iCal footer
  icalContent += '\r\nEND:VCALENDAR';

  return icalContent;
}

/**
 * Generates a single VEVENT component
 */
function generateICalEvent(event: Event): string {
  const uid = `${event.id}@peacepad.ca`;
  const dtstamp = formatDateToICalTimestamp(event.createdAt || new Date());
  const dtstart = formatDateToICalTimestamp(event.startDate);
  const dtend = event.endDate 
    ? formatDateToICalTimestamp(event.endDate)
    : formatDateToICalTimestamp(new Date(event.startDate.getTime() + 60 * 60 * 1000)); // +1 hour default
  
  // Build description
  const descriptionParts: string[] = [];
  if (event.description) {
    descriptionParts.push(event.description);
  }
  if (event.childName) {
    descriptionParts.push(`Child: ${event.childName}`);
  }
  if (event.notes) {
    descriptionParts.push(`Notes: ${event.notes}`);
  }
  
  const description = escapeICalText(descriptionParts.join('\\n'));
  const summary = escapeICalText(event.title);
  const location = event.location ? escapeICalText(event.location) : '';
  
  // Build event lines
  const eventLines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
  ];

  if (description) {
    eventLines.push(`DESCRIPTION:${description}`);
  }
  
  if (location) {
    eventLines.push(`LOCATION:${location}`);
  }

  // Add category based on event type
  const category = mapEventTypeToCategory(event.type);
  if (category) {
    eventLines.push(`CATEGORIES:${category}`);
  }

  // Add recurrence rule if applicable
  if (event.recurring && event.recurring !== 'none') {
    const rrule = generateRecurrenceRule(event.recurring);
    if (rrule) {
      eventLines.push(`RRULE:${rrule}`);
    }
  }

  eventLines.push('END:VEVENT');

  return eventLines.join('\r\n');
}

/**
 * Converts a Date object to iCal timestamp format (YYYYMMDDTHHMMSSZ)
 */
function formatDateToICalTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escapes special characters for iCal text fields
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')  // Backslash
    .replace(/;/g, '\\;')     // Semicolon
    .replace(/,/g, '\\,')     // Comma
    .replace(/\n/g, '\\n')    // Newline
    .replace(/\r/g, '');       // Remove carriage returns
}

/**
 * Maps PeacePad event types to iCal categories
 */
function mapEventTypeToCategory(type: string): string {
  const categoryMap: Record<string, string> = {
    'pickup': 'CUSTODY,PICKUP',
    'dropoff': 'CUSTODY,DROPOFF',
    'custody_switch': 'CUSTODY',
    'appointment': 'APPOINTMENT',
    'other': 'PERSONAL',
  };
  
  return categoryMap[type] || 'PERSONAL';
}

/**
 * Generates an iCal recurrence rule (RRULE) from PeacePad recurring value
 */
function generateRecurrenceRule(recurring: string): string | null {
  const rruleMap: Record<string, string> = {
    'daily': 'FREQ=DAILY',
    'weekly': 'FREQ=WEEKLY',
    'biweekly': 'FREQ=WEEKLY;INTERVAL=2',
    'monthly': 'FREQ=MONTHLY',
  };
  
  return rruleMap[recurring] || null;
}
