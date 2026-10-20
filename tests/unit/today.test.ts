import { describe, expect, it } from "vitest";
import sitesFile from "../../data/sample/sites.json";
import {
  buildToday,
  firstProject,
  headline,
  initialTab,
  inTab,
  nextTab,
  schematicPositions,
  segmentGroup,
  segmentLit,
  shortName,
  TODAY,
  TODAY_TABS,
  todayText,
  todayGroup,
  totalsLine,
  type TodayInput,
} from "@/ui/today";

// Today's panel on the projects list (AC 77 to 79), after the author's design "I · Verdict + tabs + map (B+D+E)".

function site(id: string, name: string, crewStatus: string, extra: Partial<TodayInput> = {}): TodayInput {
  return { id, name, crewStatus, shortageCount: 0, dataProblemCount: 0, ...extra };
}

// The sample's four projects as the list shows them: two blocked, one clear, one with nothing planned.
const SAMPLE: TodayInput[] = [
  site("site-a", "Cedar Court, Block A", "clear", { location: { lat: -36.8443, lng: 174.7676 } }),
  site("site-b", "Quayside House, Levels 3 to 5", "blocked", { shortageCount: 2, location: { lat: -36.841, lng: 174.7571 } }),
  site("site-c", "Northgate Depot, Phase 2", "blocked", { shortageCount: 1, dataProblemCount: 4, location: { lat: -36.7309, lng: 174.702 } }),
  site("site-d", "Foundry Lane Annex", "nothing_planned", { location: { lat: -36.9228, lng: 174.786 } }),
];

describe("AC 77: today's verdict", () => {
  it("reads the sample as the design does: 2 of 3 crews can't go yet, 3 shortages and 4 data problems, one green and two red", () => {
    const today = buildToday(SAMPLE);
    expect(today.tone).toBe("stop");
    expect(today.headline).toBe("2 of 3 crews can't go yet");
    expect(today.totals).toBe("3 shortages · 4 data problems");
    expect(today.segments).toEqual(["go", "blocked", "blocked"]);
    expect(today.barLabel).toBe("1 can go, 2 blocked");
  });

  it("counts a crew as a project with work planned, and one that can't be checked as one that can't go", () => {
    expect(headline(2, 3)).toBe("2 of 3 crews can't go yet");
    expect(headline(1, 1)).toBe("1 of 1 crew can't go yet");
    expect(headline(0, 3)).toBe("3 of 3 crews can go");
    expect(headline(0, 1)).toBe("1 of 1 crew can go");
    expect(headline(0, 0)).toBe("No crews have work planned");
    const unchecked = buildToday([site("a", "A", "clear"), site("b", "B", "unavailable"), site("c", "C", "nothing_planned")]);
    expect(unchecked.tone).toBe("stop");
    expect(unchecked.headline).toBe("1 of 2 crews can't go yet");
    expect(unchecked.segments).toEqual(["go", "unchecked"]);
    expect(unchecked.barLabel).toBe("1 can go, 1 can't be checked");
    // Anything unknown is treated as can't be checked, never as can go.
    expect(buildToday([site("x", "X", "something new")]).segments).toEqual(["unchecked"]);
  });

  it("is green when every crew can go, neutral with no crew, and has no bar without a crew", () => {
    const allGo = buildToday([site("a", "A", "clear"), site("b", "B", "clear"), site("c", "C", "nothing_planned")]);
    expect(allGo.tone).toBe("go");
    expect(allGo.headline).toBe("2 of 2 crews can go");
    expect(allGo.totals).toBe("No shortages · no data problems");
    expect(allGo.segments).toEqual(["go", "go"]);
    const none = buildToday([site("c", "C", "nothing_planned")]);
    expect(none.tone).toBe("none");
    expect(none.headline).toBe("No crews have work planned");
    expect(none.segments).toEqual([]);
    expect(none.barLabel).toBe("");
  });

  it("adds up shortages and data problems, and never counts them when any crew's stock can't be checked", () => {
    expect(totalsLine(3, 4, false)).toBe("3 shortages · 4 data problems");
    expect(totalsLine(1, 0, false)).toBe("1 shortage · no data problems");
    expect(totalsLine(0, 1, false)).toBe("No shortages · 1 data problem");
    expect(totalsLine(0, 0, false)).toBe("No shortages · no data problems");
    expect(totalsLine(3, 4, true)).toBe("Stock can't be checked");
    expect(buildToday([...SAMPLE, site("e", "E", "unavailable")]).totals).toBe("Stock can't be checked");
  });
});

describe("AC 78: the tabs inside the verdict", () => {
  it("holds All 4, Blocked 2, Crew can go 1 and Other 1 for the sample, in that order, and opens on Crew can go", () => {
    const today = buildToday(SAMPLE);
    expect(today.tabs.map((tab) => tab.label)).toEqual(["All 4", "Blocked 2", "Crew can go 1", "Other 1"]);
    expect(today.tabs.map((tab) => tab.id)).toEqual(["all", "blocked", "go", "idle"]);
    expect(TODAY_TABS).toEqual(["all", "blocked", "go", "idle"]);
    expect(today.initialTab).toBe("go");
  });

  it("puts every crew that can't go under Blocked, and opens on Blocked, then Other, when Crew can go is empty", () => {
    expect(todayGroup("clear")).toBe("go");
    expect(todayGroup("blocked")).toBe("blocked");
    expect(todayGroup("unavailable")).toBe("blocked");
    expect(todayGroup("nothing_planned")).toBe("idle");
    expect(todayGroup("anything else")).toBe("blocked");
    const tabs = (blocked: number, go: number, idle: number) => [
      { id: "all" as const, label: "", count: blocked + go + idle },
      { id: "blocked" as const, label: "", count: blocked },
      { id: "go" as const, label: "", count: go },
      { id: "idle" as const, label: "", count: idle },
    ];
    expect(initialTab(tabs(2, 1, 1))).toBe("go");
    expect(initialTab(tabs(3, 0, 1))).toBe("blocked");
    expect(initialTab(tabs(0, 0, 1))).toBe("idle");
    expect(initialTab(tabs(0, 0, 0))).toBe("all");
    expect(initialTab([])).toBe("all");
  });

  it("shows every project under All, and each group under its own tab", () => {
    const { projects } = buildToday(SAMPLE);
    expect(projects.filter((project) => inTab(project, "all")).map((project) => project.id)).toEqual(["site-a", "site-b", "site-c", "site-d"]);
    expect(projects.filter((project) => inTab(project, "blocked")).map((project) => project.id)).toEqual(["site-b", "site-c"]);
    expect(projects.filter((project) => inTab(project, "go")).map((project) => project.id)).toEqual(["site-a"]);
    expect(projects.filter((project) => inTab(project, "idle")).map((project) => project.id)).toEqual(["site-d"]);
  });

  it("lights the bar's segments of the chosen tab: every one under All, can go under Crew can go, blocked and unchecked under Blocked", () => {
    expect(segmentGroup("go")).toBe("go");
    expect(segmentGroup("blocked")).toBe("blocked");
    expect(segmentGroup("unchecked")).toBe("blocked");
    for (const kind of ["go", "blocked", "unchecked"] as const) expect(segmentLit(kind, "all"), kind).toBe(true);
    expect(segmentLit("go", "go")).toBe(true);
    expect(segmentLit("blocked", "go")).toBe(false);
    expect(segmentLit("unchecked", "blocked")).toBe(true);
    expect(segmentLit("go", "idle")).toBe(false);
  });

  it("moves between the four tabs with the arrow keys, Home and End, wrapping round, and ignores other keys", () => {
    expect(nextTab(TODAY_TABS, "go", "ArrowRight")).toBe("idle");
    expect(nextTab(TODAY_TABS, "idle", "ArrowRight")).toBe("all");
    expect(nextTab(TODAY_TABS, "go", "ArrowLeft")).toBe("blocked");
    expect(nextTab(TODAY_TABS, "all", "ArrowLeft")).toBe("idle");
    expect(nextTab(TODAY_TABS, "go", "Home")).toBe("all");
    expect(nextTab(TODAY_TABS, "go", "End")).toBe("idle");
    expect(nextTab(TODAY_TABS, "go", "Enter")).toBeNull();
    // With no tabs there is nowhere to move.
    for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) expect(nextTab([], "go", key), key).toBeNull();
  });
});

describe("AC 79: the map's pins and the card under it", () => {
  it("chooses the tab's first project in list order, or none for an empty tab", () => {
    const { projects } = buildToday(SAMPLE);
    expect(firstProject(projects, "all")?.id).toBe("site-a");
    expect(firstProject(projects, "blocked")?.id).toBe("site-b");
    expect(firstProject(projects, "go")?.id).toBe("site-a");
    expect(firstProject(projects, "idle")?.id).toBe("site-d");
    expect(firstProject(projects.slice(0, 1), "blocked")).toBeNull();
    expect(firstProject([], "all")).toBeNull();
  });

  it("gives each pin its name, status, colour and point", () => {
    const [cedar, quayside, northgate, foundry] = buildToday(SAMPLE).projects;
    expect(cedar).toEqual({
      id: "site-a",
      name: "Cedar Court, Block A",
      shortName: "Cedar Court",
      group: "go",
      status: { label: "Crew can go", tone: "success", icon: "check" },
      colour: "#3ddc6c",
      location: { lat: -36.8443, lng: 174.7676 },
    });
    expect(quayside?.status.label).toBe("Blocked · 2 shortages");
    expect(northgate?.status.label).toBe("Blocked · 1 shortage, 4 data problems");
    expect(foundry).toMatchObject({ group: "idle", colour: "#5c5c5c", status: { label: "Nothing planned" } });
    const unchecked = buildToday([site("u", "Unchecked Yard", "unavailable")]).projects[0];
    expect(unchecked).toMatchObject({ group: "blocked", colour: "#fed105", status: { label: "Can't check" } });
  });

  it("labels a pin with the name before its first comma, and keeps a project with no valid point off the map", () => {
    expect(shortName("Quayside House, Levels 3 to 5")).toBe("Quayside House");
    expect(shortName("Foundry Lane Annex")).toBe("Foundry Lane Annex");
    expect(shortName(", odd")).toBe(", odd");
    expect(buildToday([site("n", "Nowhere", "clear", { location: { lat: 0, lng: 0 } })]).projects[0]?.location).toBeNull();
    expect(buildToday([site("n", "Nowhere", "clear")]).projects[0]?.location).toBeNull();
  });

  it("places pins on the plain panel in their relative places, the wider span filling the room, north up", () => {
    const box = { width: 400, height: 300, insetX: 50, insetTop: 40, insetBottom: 60 };
    // One project: the middle of the room the pins may use (40 from the top, 60 from the bottom: y 40 to 240).
    expect(schematicPositions([{ lat: -36.84, lng: 174.76 }], box)).toEqual([{ x: 200, y: 140 }]);
    // Two projects east and west: the full width, at the same height.
    const eastWest = schematicPositions(
      [
        { lat: -36.84, lng: 174.7 },
        { lat: -36.84, lng: 174.8 },
      ],
      box,
    );
    expect(eastWest).toEqual([
      { x: 50, y: 140 },
      { x: 350, y: 140 },
    ]);
    // North is up: the northern project (less negative latitude) is higher on the panel.
    const [north, south] = schematicPositions(
      [
        { lat: -36.7, lng: 174.75 },
        { lat: -36.9, lng: 174.75 },
      ],
      box,
    );
    expect(north?.y).toBe(40);
    expect(south?.y).toBe(240);
    expect(north?.x).toBe(200);
    // The sample's four places all stay inside the room.
    const points = SAMPLE.map((input) => input.location as { lat: number; lng: number });
    for (const position of schematicPositions(points, box)) {
      expect(position.x).toBeGreaterThanOrEqual(50);
      expect(position.x).toBeLessThanOrEqual(350);
      expect(position.y).toBeGreaterThanOrEqual(40);
      expect(position.y).toBeLessThanOrEqual(240);
    }
    expect(schematicPositions([], box)).toEqual([]);
  });

  it("works from the real sample file too", () => {
    const sites = sitesFile.sites.map((sample, index) =>
      site(sample.id, sample.name, ["clear", "blocked", "blocked", "nothing_planned"][index]!, { location: sample.location }),
    );
    expect(buildToday(sites).projects.map((project) => project.shortName)).toEqual(["Cedar Court", "Quayside House", "Northgate Depot", "Foundry Lane Annex"]);
  });
});

describe("the panel's first line names the open tab, then today from the browser, in English", () => {
  it("writes the weekday, day, month and year in full", () => {
    expect(todayText(new Date(2026, 9, 20, 12))).toBe("Tuesday 20 October 2026");
    expect(todayText(new Date(2027, 0, 1, 0, 5))).toBe("Friday 1 January 2027");
    expect(TODAY.todayIs).toBe("today is");
  });
});
