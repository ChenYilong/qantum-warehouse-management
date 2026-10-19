/**
 * A project's deadline (AC 80): a calendar date written YYYY-MM-DD, shown in English as "Fri 23 Oct 2026". Pure, so
 * the words are tested here. Worked out in UTC from the date's own numbers, so no time zone can move it by a day; a
 * missing or impossible date is no deadline, never a made-up one.
 */

export const DEADLINE = { label: "Deadline" } as const;

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export interface Deadline {
  /** The date as written, for the `time` element. */
  readonly iso: string;
  /** "Fri 23 Oct 2026". */
  readonly text: string;
}

export function deadlineOf(value: unknown): Deadline | null {
  if (typeof value !== "string") return null;
  const match = CALENDAR_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const at = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls 30 February into March and reads years under 100 as 19xx: either is not the date written.
  if (at.getUTCFullYear() !== year || at.getUTCMonth() !== month - 1 || at.getUTCDate() !== day) return null;
  return { iso: value, text: `${WEEKDAYS[at.getUTCDay()]} ${day} ${MONTHS[month - 1]} ${year}` };
}
