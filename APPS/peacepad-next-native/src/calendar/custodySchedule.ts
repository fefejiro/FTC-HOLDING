/**
 * Parenting-time rules ported from the legacy PeacePad calendar.
 *
 * The native client deliberately keeps this module free of identity, legal,
 * or server concerns. It only calculates the visible schedule; persistence is
 * still handled by the existing parenting-time calendar-event contract.
 */

export type CustodyPattern = "week_on_off" | "every_other_weekend" | "two_two_three";
export type CustodyParent = "you" | "other";

export type CustodySchedule = Readonly<{
  enabled: boolean;
  pattern: CustodyPattern;
  startDate: string;
  primaryParent: CustodyParent;
}>;

export type CustodyDay = Readonly<{
  date: string;
  parent: CustodyParent;
}>;

export type CustodyBlock = Readonly<{
  startDate: string;
  endDate: string;
  parent: CustodyParent;
}>;

function parseDateOnly(value: string): Date | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
    ? parsed
    : undefined;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, amount: number): Date {
  const next = new Date(value.getTime());
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function differenceInDays(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / 86_400_000);
}

function opposite(parent: CustodyParent): CustodyParent {
  return parent === "you" ? "other" : "you";
}

/** Return the parent who has parenting time on a UTC calendar date. */
export function custodyParentForDate(date: Date | string, schedule?: CustodySchedule): CustodyParent | null {
  if (!schedule?.enabled) return null;
  const startDate = parseDateOnly(schedule.startDate);
  if (!startDate) return null;
  if (schedule.primaryParent !== "you" && schedule.primaryParent !== "other") return null;
  const targetDate = typeof date === "string" ? parseDateOnly(date) : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (!targetDate) return null;
  if (Number.isNaN(targetDate.getTime())) return null;

  const daysSinceStart = differenceInDays(targetDate, startDate);
  if (daysSinceStart < 0) return null;
  const primary = schedule.primaryParent;
  const secondary = opposite(primary);

  switch (schedule.pattern) {
    case "week_on_off":
      return Math.floor(daysSinceStart / 7) % 2 === 0 ? primary : secondary;
    case "every_other_weekend": {
      const dayOfWeek = targetDate.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (!isWeekend) return primary;
      return Math.floor(daysSinceStart / 7) % 2 === 0 ? primary : secondary;
    }
    case "two_two_three": {
      const dayInCycle = daysSinceStart % 7;
      if (dayInCycle < 2) return primary;
      if (dayInCycle < 4) return secondary;
      return Math.floor(daysSinceStart / 7) % 2 === 0 ? primary : secondary;
    }
  }
  return null;
}

/** Build a bounded preview without creating or mutating any user data. */
export function buildCustodyPreview(schedule: CustodySchedule, days = 28): readonly CustodyDay[] {
  const startDate = parseDateOnly(schedule.startDate);
  const count = Number.isFinite(days) ? Math.min(Math.max(Math.floor(days), 0), 366) : 0;
  if (!schedule.enabled || !startDate || count <= 0) return [];
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(startDate, index);
    return { date: dateOnly(date), parent: custodyParentForDate(date, schedule)! };
  });
}

/**
 * Compress consecutive preview days into calendar event ranges. End dates are
 * exclusive so the blocks map directly to all-day schedule events.
 */
export function buildCustodyBlocks(schedule: CustodySchedule, days = 28): readonly CustodyBlock[] {
  const preview = buildCustodyPreview(schedule, days);
  if (!preview.length) return [];
  const blocks: CustodyBlock[] = [];
  let start = preview[0];
  let previous = preview[0];
  for (const current of preview.slice(1)) {
    const contiguous = differenceInDays(new Date(`${current.date}T00:00:00.000Z`), new Date(`${previous.date}T00:00:00.000Z`)) === 1;
    if (contiguous && current.parent === start.parent) {
      previous = current;
      continue;
    }
    blocks.push({ startDate: start.date, endDate: dateOnly(addDays(new Date(`${previous.date}T00:00:00.000Z`), 1)), parent: start.parent });
    start = current;
    previous = current;
  }
  blocks.push({ startDate: start.date, endDate: dateOnly(addDays(new Date(`${previous.date}T00:00:00.000Z`), 1)), parent: start.parent });
  return blocks;
}
