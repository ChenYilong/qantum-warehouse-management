import { describe, expect, it } from "vitest";
import { DEADLINE, deadlineOf } from "@/ui/deadline";

// AC 80: a project's deadline, a calendar date shown in English. Weekdays worked out independently of this code.

describe("AC 80: a project's deadline, in English", () => {
  it("writes a calendar date as its weekday, day, short month and year, exactly as written", () => {
    expect(DEADLINE.label).toBe("Deadline");
    expect(deadlineOf("2026-10-23")).toEqual({ iso: "2026-10-23", text: "Fri 23 Oct 2026" });
    expect(deadlineOf("2026-10-27")).toEqual({ iso: "2026-10-27", text: "Tue 27 Oct 2026" });
    expect(deadlineOf("2026-11-03")).toEqual({ iso: "2026-11-03", text: "Tue 3 Nov 2026" });
    expect(deadlineOf("2026-11-13")).toEqual({ iso: "2026-11-13", text: "Fri 13 Nov 2026" });
    // A leap day, and both ends of a year.
    expect(deadlineOf("2028-02-29")?.text).toBe("Tue 29 Feb 2028");
    expect(deadlineOf("2026-01-01")?.text).toBe("Thu 1 Jan 2026");
    expect(deadlineOf("2026-12-31")?.text).toBe("Thu 31 Dec 2026");
  });

  it("shows nothing for a missing, malformed or impossible date, never a made-up one", () => {
    const bad: unknown[] = [
      undefined,
      null,
      "",
      20261023,
      { year: 2026 },
      "23/10/2026",
      "2026-10-23T09:00:00Z",
      " 2026-10-23",
      "2026-1-5",
      "2026-02-30",
      "2026-02-29",
      "2026-13-01",
      "2026-00-10",
      "2026-10-00",
      "2026-10-32",
      "0099-01-01",
    ];
    for (const value of bad) expect(deadlineOf(value), JSON.stringify(value)).toBeNull();
  });
});
