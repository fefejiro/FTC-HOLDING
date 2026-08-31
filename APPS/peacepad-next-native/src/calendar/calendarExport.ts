import type { ParentingScheduleException, ScheduleEvent } from "../domain/v2";
import { buildCustodyBlocks, type CustodySchedule } from "./custodySchedule";

type CalendarExportInput = Readonly<{
  schedule?: CustodySchedule;
  scheduleEvents: readonly ScheduleEvent[];
  exceptions: readonly ParentingScheduleException[];
  actorIdentityId?: string;
  generatedAt?: Date;
}>;

const escapeText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const dateValue = (value: string) => value.slice(0, 10).replace(/-/g, "");
const utcValue = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const uid = (value: string) => `${value.replace(/[^a-zA-Z0-9-]/g, "-")}@peacepad.family`;

function eventLines(id: string, title: string, start: string, end: string, description?: string | null): readonly string[] {
  const allDay = /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end);
  return [
    "BEGIN:VEVENT",
    `UID:${uid(id)}`,
    allDay ? `DTSTART;VALUE=DATE:${dateValue(start)}` : `DTSTART:${utcValue(start)}`,
    allDay ? `DTEND;VALUE=DATE:${dateValue(end)}` : `DTEND:${utcValue(end)}`,
    `SUMMARY:${escapeText(title)}`,
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    "END:VEVENT"
  ];
}

/** Builds a portable RFC 5545 calendar without exposing account or family IDs. */
export function buildPeacePadCalendar(input: CalendarExportInput): string {
  const generatedAt = (input.generatedAt ?? new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Una Labs//PeacePad Native V2//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `DTSTAMP:${generatedAt}`];

  if (input.schedule?.enabled) {
    buildCustodyBlocks(input.schedule, 366).forEach((block, index) => {
      lines.push(...eventLines(`parenting-plan-${index}-${block.startDate}`, block.parent === "you" ? "Parenting time - your time" : "Parenting time - other parent's time", block.startDate, block.endDate));
    });
  }
  input.scheduleEvents.forEach((event) => lines.push(...eventLines(`event-${event.id}`, event.title, event.startsAt, event.endsAt, event.description)));
  input.exceptions.filter((item) => item.status === "accepted").forEach((item) => {
    const owner = item.assignedParentIdentityId === input.actorIdentityId ? "your time" : "other parent's time";
    lines.push(...eventLines(`exception-${item.id}`, `Parenting change - ${owner}`, item.startDate, nextDate(item.endDate), item.note));
  });
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function nextDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}
