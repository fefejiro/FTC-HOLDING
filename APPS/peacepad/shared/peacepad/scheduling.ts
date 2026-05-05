export interface SchedulableEvent {
  title?: string | null;
  type?: string | null;
  startDate: Date | string;
  endDate?: Date | string | null;
}

export interface NormalizedSchedulableEvent {
  title: string;
  type: string | null;
  start: Date;
  end: Date;
  isAllDay: boolean;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function hasMidnightTime(date: Date): boolean {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

export function getDisplayEventTitle(title?: string | null): string {
  const trimmed = title?.trim();
  const looksOpaque =
    !!trimmed &&
    /^[A-Za-z0-9_-]{8,}$/.test(trimmed) &&
    (
      /^[a-f0-9-]{8,}$/i.test(trimmed) ||
      /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(trimmed) ||
      (/[a-z]/.test(trimmed) && /[A-Z]/.test(trimmed) && !/[aeiou]/i.test(trimmed))
    );

  if (!trimmed || looksOpaque) {
    return "Untitled event";
  }

  return trimmed;
}

export function normalizeSchedulableEvent(
  event: SchedulableEvent,
): NormalizedSchedulableEvent | null {
  const start = new Date(event.startDate);
  if (!isValidDate(start)) {
    return null;
  }

  const explicitEnd = event.endDate ? new Date(event.endDate) : null;
  let end = explicitEnd && isValidDate(explicitEnd) ? explicitEnd : null;
  let isAllDay = false;

  if (end && end.getTime() > start.getTime()) {
    const durationMs = end.getTime() - start.getTime();
    isAllDay = durationMs >= DAY_IN_MS - 60 * 60 * 1000 && hasMidnightTime(start);
  } else if (!end && hasMidnightTime(start)) {
    isAllDay = true;
    end = new Date(start.getTime() + DAY_IN_MS);
  } else {
    end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);
  }

  if (end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);
    isAllDay = false;
  }

  return {
    title: getDisplayEventTitle(event.title),
    type: event.type?.trim() || null,
    start,
    end,
    isAllDay,
  };
}

export function eventsOverlap(
  first: NormalizedSchedulableEvent,
  second: NormalizedSchedulableEvent,
): boolean {
  return first.start < second.end && second.start < first.end;
}

export function findScheduleConflicts(
  events: SchedulableEvent[],
  locale = "en-US",
): string[] {
  const normalized = events
    .map(normalizeSchedulableEvent)
    .filter((event): event is NormalizedSchedulableEvent => Boolean(event));

  const conflicts: string[] = [];

  for (let index = 0; index < normalized.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < normalized.length; compareIndex += 1) {
      const current = normalized[index];
      const comparison = normalized[compareIndex];

      if (!eventsOverlap(current, comparison)) {
        continue;
      }

      conflicts.push(
        `"${current.title}" overlaps with "${comparison.title}" on ${current.start.toLocaleDateString(locale)}`,
      );
    }
  }

  return conflicts;
}
