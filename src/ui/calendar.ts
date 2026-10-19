import { deadlineOf, type Deadline } from "./deadline";
import { signalView, type SignalView } from "./signal";
import { buildToday, inTab, type Today, type TodayInput, type TodayProject, type TodayTabId } from "./today";

/**
 * The deadline calendar on the projects list (AC 81, 82): a copy of today's map panel with a month calendar in place
 * of the map. Its verdict, bar and tabs are today's panel's own rules (`today.ts`, unchanged); this module adds what
 * the calendar needs: each project's deadline and signal, the dates it holds, and the month grid. Pure, so every
 * date and word is tested here.
 */

export interface CalendarInput extends TodayInput {
  readonly date?: unknown;
}

/** A pin's project, with the deadline it sits on and the signal its oval copies. */
export interface CalendarProject extends TodayProject {
  readonly deadline: Deadline | null;
  readonly signal: SignalView;
}

export interface CalendarModel extends Omit<Today, "projects"> {
  readonly projects: readonly CalendarProject[];
}

/** A month: its year and its index, 0 for January. */
export interface Month {
  readonly year: number;
  readonly month: number;
}

export interface CalendarDay {
  readonly iso: string;
  readonly day: number;
  readonly inMonth: boolean;
}

export const CALENDAR = {
  tabsLabel: "Deadlines by status",
  calendarLabel: "Deadline calendar",
  cardLabel: "Project on the calendar",
  rangeLabel: "Deadlines between",
  from: "From",
  to: "To",
  previous: "Previous month",
  next: "Next month",
  noProjects: "No projects in this group.",
  noDeadlines: "No deadlines between these dates.",
  badRange: "From is after To.",
  weekdays: [
    ["Mon", "Monday"],
    ["Tue", "Tuesday"],
    ["Wed", "Wednesday"],
    ["Thu", "Thursday"],
    ["Fri", "Friday"],
    ["Sat", "Saturday"],
    ["Sun", "Sunday"],
  ],
} as const;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const DAY_MS = 86_400_000;

/** Today's verdict, bar and tabs over every project, and each project with its deadline and signal. */
export function buildCalendar(sites: readonly CalendarInput[]): CalendarModel {
  const today = buildToday(sites);
  return {
    ...today,
    projects: today.projects.map((project, index) => {
      const site = sites[index] as CalendarInput;
      return { ...project, deadline: deadlineOf(site.date), signal: signalView(site.crewStatus) };
    }),
  };
}

/** "Cedar Court, Block A, Crew can go, deadline Fri 23 Oct 2026": what the oval's button is called. */
export function ovalLabel(project: CalendarProject): string {
  const base = `${project.name}, ${project.status.label}`;
  return project.deadline ? `${base}, deadline ${project.deadline.text}` : base;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/** A date's own calendar day in the phone's time zone, written YYYY-MM-DD. */
export function localDate(at: Date): string {
  return `${pad(at.getFullYear(), 4)}-${pad(at.getMonth() + 1, 2)}-${pad(at.getDate(), 2)}`;
}

/** The last day of the year a day falls in; nothing before the day is known. */
export function endOfYear(day: string): string {
  return day ? `${day.slice(0, 4)}-12-31` : "";
}

/** Whether a deadline falls between the dates, both ends included; an empty end is open. No real date, never. */
export function inRange(deadline: Deadline | null, from: string, to: string): boolean {
  if (!deadline) return false;
  if (from && deadline.iso < from) return false;
  if (to && deadline.iso > to) return false;
  return true;
}

export function rangeProblem(from: string, to: string): string | null {
  return from && to && from > to ? CALENDAR.badRange : null;
}

/** The chosen tab's projects whose deadlines fall between the dates, in list order; none when From is after To. */
export function visibleProjects(projects: readonly CalendarProject[], tab: TodayTabId, from: string, to: string): CalendarProject[] {
  if (rangeProblem(from, to)) return [];
  return projects.filter((project) => inTab(project, tab) && inRange(project.deadline, from, to));
}

/** The project a tab opens on: its first in list order whose deadline the calendar holds. */
export function firstVisible(projects: readonly CalendarProject[], tab: TodayTabId, from: string, to: string): CalendarProject | null {
  return visibleProjects(projects, tab, from, to)[0] ?? null;
}

export function monthOf(day: string): Month | null {
  const deadline = deadlineOf(day);
  if (!deadline) return null;
  return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) - 1 };
}

export function shiftMonth(month: Month, by: number): Month {
  const total = month.year * 12 + month.month + by;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export function monthTitle(month: Month): string {
  return `${MONTH_NAMES[month.month]} ${month.year}`;
}

/** The month the calendar opens on: the chosen project's, else the month From starts in, else today's. */
export function openingMonth(chosen: CalendarProject | null, from: string, today: string): Month | null {
  return (chosen?.deadline ? monthOf(chosen.deadline.iso) : null) ?? monthOf(from) ?? monthOf(today);
}

/** A month's weeks, Monday first, filled out with the days of the months either side; worked out in UTC. */
export function monthWeeks(month: Month): CalendarDay[][] {
  const first = Date.UTC(month.year, month.month, 1);
  const offset = (new Date(first).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  const weeks: CalendarDay[][] = [];
  for (let index = 0; index < cells; index += 1) {
    const at = new Date(first + (index - offset) * DAY_MS);
    const day = { iso: `${pad(at.getUTCFullYear(), 4)}-${pad(at.getUTCMonth() + 1, 2)}-${pad(at.getUTCDate(), 2)}`, day: at.getUTCDate(), inMonth: at.getUTCMonth() === month.month };
    if (index % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1]!.push(day);
  }
  return weeks;
}
