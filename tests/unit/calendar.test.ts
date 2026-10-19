import { describe, expect, it } from "vitest";
import {
  buildCalendar,
  CALENDAR,
  endOfYear,
  firstVisible,
  inRange,
  localDate,
  monthOf,
  monthTitle,
  monthWeeks,
  openingMonth,
  ovalLabel,
  rangeProblem,
  shiftMonth,
  visibleProjects,
  type CalendarInput,
} from "@/ui/calendar";
import { buildToday } from "@/ui/today";

// The deadline calendar (AC 81, 82): a copy of today's map panel with a month calendar in place of the map. Month
// grids and weekdays were worked out independently of this code.

function site(id: string, name: string, crewStatus: string, date: string | undefined, extra: Partial<CalendarInput> = {}): CalendarInput {
  return { id, name, crewStatus, shortageCount: 0, dataProblemCount: 0, date, ...extra };
}

const SAMPLE: CalendarInput[] = [
  site("site-a", "Cedar Court, Block A", "clear", "2026-10-23"),
  site("site-b", "Quayside House, Levels 3 to 5", "blocked", "2026-10-27", { shortageCount: 2 }),
  site("site-c", "Northgate Depot, Phase 2", "blocked", "2026-11-03", { shortageCount: 1, dataProblemCount: 4 }),
  site("site-d", "Foundry Lane Annex", "nothing_planned", "2026-11-13"),
];

describe("AC 81: the calendar is today's panel with a calendar for its map", () => {
  it("keeps the panel's verdict, totals, bar and tabs, and gives each project its deadline and its signal", () => {
    const calendar = buildCalendar(SAMPLE);
    const today = buildToday(SAMPLE);
    expect(calendar.headline).toBe(today.headline);
    expect(calendar.totals).toBe(today.totals);
    expect(calendar.segments).toEqual(today.segments);
    expect(calendar.tabs).toEqual(today.tabs);
    expect(calendar.initialTab).toBe("go");
    const [cedar, quayside, , foundry] = calendar.projects;
    expect(cedar).toMatchObject({ id: "site-a", group: "go", deadline: { iso: "2026-10-23", text: "Fri 23 Oct 2026" } });
    expect(cedar?.signal).toEqual({ tone: "go", shape: "circle", knob: "right", mark: "I" });
    expect(quayside?.signal).toMatchObject({ tone: "stop", shape: "octagon", knob: "left" });
    expect(foundry?.signal).toMatchObject({ tone: "idle", shape: "ring" });
    expect(buildCalendar([site("u", "U", "unavailable", "2026-10-23")]).projects[0]?.signal.tone).toBe("unknown");
    // No date, or no real date: no place on the calendar.
    expect(buildCalendar([site("n", "N", "clear", undefined)]).projects[0]?.deadline).toBeNull();
    expect(buildCalendar([site("n", "N", "clear", "2026-02-30")]).projects[0]?.deadline).toBeNull();
  });

  it("names each oval by its project, status and deadline", () => {
    const [cedar, quayside] = buildCalendar(SAMPLE).projects;
    expect(ovalLabel(cedar!)).toBe("Cedar Court, Block A, Crew can go, deadline Fri 23 Oct 2026");
    expect(ovalLabel(quayside!)).toBe("Quayside House, Levels 3 to 5, Blocked · 2 shortages, deadline Tue 27 Oct 2026");
    expect(ovalLabel(buildCalendar([site("n", "Nowhere", "clear", undefined)]).projects[0]!)).toBe("Nowhere, Crew can go");
  });

  it("lays out a month Monday first, filled out with the days of the months either side", () => {
    const october = monthWeeks({ year: 2026, month: 9 });
    expect(october).toHaveLength(5);
    expect(october[0]?.map((day) => day.iso)).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(october[0]?.map((day) => day.inMonth)).toEqual([false, false, false, true, true, true, true]);
    expect(october[0]?.[3]).toEqual({ iso: "2026-10-01", day: 1, inMonth: true });
    expect(october[4]?.at(-1)).toEqual({ iso: "2026-11-01", day: 1, inMonth: false });
    const november = monthWeeks({ year: 2026, month: 10 });
    expect(november).toHaveLength(6);
    expect(november[0]?.[0]?.iso).toBe("2026-10-26");
    expect(november[5]?.[6]?.iso).toBe("2026-12-06");
    // A month starting on a Monday with 28 days fills exactly four weeks.
    const february = monthWeeks({ year: 2027, month: 1 });
    expect(february).toHaveLength(4);
    expect(february[0]?.[0]?.iso).toBe("2027-02-01");
    expect(february[3]?.[6]?.iso).toBe("2027-02-28");
    expect(monthWeeks({ year: 2027, month: 0 })[0]?.[0]?.iso).toBe("2026-12-28");
  });

  it("names a month, moves between months across years, and reads the month of a date", () => {
    expect(monthTitle({ year: 2026, month: 9 })).toBe("October 2026");
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2026, month: 9 }, 14)).toEqual({ year: 2027, month: 11 });
    expect(monthOf("2026-11-03")).toEqual({ year: 2026, month: 10 });
    expect(monthOf("2026-02-30")).toBeNull();
    expect(monthOf("")).toBeNull();
  });

  it("opens on the chosen project's month, else the start of the dates, else today's month", () => {
    const [, , northgate] = buildCalendar(SAMPLE).projects;
    expect(openingMonth(northgate!, "2026-10-20", "2026-10-20")).toEqual({ year: 2026, month: 10 });
    expect(openingMonth(null, "2026-12-05", "2026-10-20")).toEqual({ year: 2026, month: 11 });
    expect(openingMonth(null, "", "2026-10-20")).toEqual({ year: 2026, month: 9 });
    const undated = buildCalendar([site("n", "N", "clear", undefined)]).projects[0]!;
    expect(openingMonth(undated, "", "2026-10-20")).toEqual({ year: 2026, month: 9 });
    // Before the phone's date is known (the server's render) and with no dated project, there is no month to open on yet.
    expect(openingMonth(null, "", "")).toBeNull();
  });
});

describe("AC 82: the dates the calendar holds", () => {
  it("starts at today, on the phone, and ends on the last day of the year", () => {
    expect(localDate(new Date(2026, 9, 20, 8, 56))).toBe("2026-10-20");
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(endOfYear("2026-10-20")).toBe("2026-12-31");
    expect(endOfYear("")).toBe("");
    expect(CALENDAR.from).toBe("From");
    expect(CALENDAR.to).toBe("To");
  });

  it("holds a deadline between the dates, both ends included, an empty end open, and nothing without a real date", () => {
    const [cedar] = buildCalendar(SAMPLE).projects;
    const deadline = cedar!.deadline;
    expect(inRange(deadline, "2026-10-20", "2026-12-31")).toBe(true);
    expect(inRange(deadline, "2026-10-23", "2026-10-23")).toBe(true);
    expect(inRange(deadline, "2026-10-24", "2026-12-31")).toBe(false);
    expect(inRange(deadline, "2026-10-01", "2026-10-22")).toBe(false);
    expect(inRange(deadline, "", "")).toBe(true);
    expect(inRange(deadline, "", "2026-10-22")).toBe(false);
    expect(inRange(null, "", "")).toBe(false);
  });

  it("says when From is after To, and then holds none", () => {
    expect(rangeProblem("2026-11-01", "2026-10-01")).toBe("From is after To.");
    expect(rangeProblem("2026-10-01", "2026-10-01")).toBeNull();
    expect(rangeProblem("", "2026-10-01")).toBeNull();
    expect(rangeProblem("2026-10-01", "")).toBeNull();
    expect(visibleProjects(buildCalendar(SAMPLE).projects, "all", "2026-11-01", "2026-10-01")).toEqual([]);
  });

  it("shows the chosen tab's projects between the dates, in list order, and opens on the first", () => {
    const { projects } = buildCalendar(SAMPLE);
    const ids = (tab: Parameters<typeof visibleProjects>[1], from: string, to: string) => visibleProjects(projects, tab, from, to).map((item) => item.id);
    expect(ids("all", "2026-10-20", "2026-12-31")).toEqual(["site-a", "site-b", "site-c", "site-d"]);
    expect(ids("blocked", "2026-10-20", "2026-12-31")).toEqual(["site-b", "site-c"]);
    expect(ids("go", "2026-10-20", "2026-12-31")).toEqual(["site-a"]);
    expect(ids("idle", "2026-10-20", "2026-12-31")).toEqual(["site-d"]);
    expect(ids("all", "2026-10-20", "2026-10-31")).toEqual(["site-a", "site-b"]);
    expect(ids("all", "2026-10-24", "")).toEqual(["site-b", "site-c", "site-d"]);
    expect(firstVisible(projects, "blocked", "2026-10-28", "2026-12-31")?.id).toBe("site-c");
    expect(firstVisible(projects, "go", "2026-10-24", "2026-12-31")).toBeNull();
    expect(CALENDAR.noDeadlines).toBe("No deadlines between these dates.");
    expect(CALENDAR.noProjects).toBe("No projects in this group.");
  });
});
