import { describe, expect, it } from "vitest";
import sitesFile from "../../data/sample/sites.json";
import {
  buildToday,
  firstProject,
  headline,
  initialGroup,
  nextTab,
  schematicPositions,
  segmentGroup,
  shortName,
  todayGroup,
  totalsLine,
  type TodayInput,
} from "@/ui/today";

// Today's panel on the projects list (AC 77 to 79), after the author's design "I · Verdict + tabs + map (B+D+E)".

const operator = { name: "Mere Tane", phone: "+44 7700 900156" };

function site(id: string, name: string, crewStatus: string, extra: Partial<TodayInput> = {}): TodayInput {
  return { id, name, reference: `JOB-${id}`, crewStatus, shortageCount: 0, dataProblemCount: 0, operator, ...extra };
}

// The sample's four projects as the list shows them: two blocked, one clear, one with nothing planned.
const SAMPLE: TodayInput[] = [
  site("site-a", "Cedar Court, Block A", "clear", { location: { lat: -36.8443, lng: 174.7676 } }),
  site("site-b", "Quayside House, Levels 3 to 5", "blocked", {
    shortageCount: 2,
    shortages: [
      { name: "Pipe collar for 25 mm pipe", kind: "short" },
      { name: "Intumescent sealant, 310 ml cartridge", kind: "short" },
    ],
    location: { lat: -36.841, lng: 174.7571 },
  }),
  site("site-c", "Northgate Depot, Phase 2", "blocked", {
    shortageCount: 1,
    dataProblemCount: 4,
    shortages: [{ name: "Fire mastic tube", kind: "unknown" }],
    location: { lat: -36.7309, lng: 174.702 },
  }),
  site("site-d", "Foundry Lane Annex", "nothing_planned", { operator: undefined, location: { lat: -36.9228, lng: 174.786 } }),
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
  it("holds Blocked 2, Can go 1 and Idle 1 for the sample, in that order, and opens on Can go", () => {
    const today = buildToday(SAMPLE);
    expect(today.tabs.map((tab) => tab.label)).toEqual(["Blocked 2", "Can go 1", "Idle 1"]);
    expect(today.tabs.map((tab) => tab.group)).toEqual(["blocked", "go", "idle"]);
    expect(today.initialGroup).toBe("go");
  });

  it("puts every crew that can't go under Blocked, and opens on Blocked, then Idle, when Can go is empty", () => {
    expect(todayGroup("clear")).toBe("go");
    expect(todayGroup("blocked")).toBe("blocked");
    expect(todayGroup("unavailable")).toBe("blocked");
    expect(todayGroup("nothing_planned")).toBe("idle");
    expect(todayGroup("anything else")).toBe("blocked");
    const tabs = (blocked: number, go: number, idle: number) => [
      { group: "blocked" as const, label: "", count: blocked },
      { group: "go" as const, label: "", count: go },
      { group: "idle" as const, label: "", count: idle },
    ];
    expect(initialGroup(tabs(2, 1, 1))).toBe("go");
    expect(initialGroup(tabs(3, 0, 1))).toBe("blocked");
    expect(initialGroup(tabs(0, 0, 1))).toBe("idle");
    expect(initialGroup(tabs(0, 0, 0))).toBe("go");
    expect(initialGroup([])).toBe("go");
  });

  it("lights the bar's segments of the chosen tab: can go under Can go, blocked and unchecked under Blocked", () => {
    expect(segmentGroup("go")).toBe("go");
    expect(segmentGroup("blocked")).toBe("blocked");
    expect(segmentGroup("unchecked")).toBe("blocked");
  });

  it("moves between tabs with the arrow keys, Home and End, wrapping round, and ignores other keys", () => {
    const groups = ["blocked", "go", "idle"] as const;
    expect(nextTab(groups, "go", "ArrowRight")).toBe("idle");
    expect(nextTab(groups, "idle", "ArrowRight")).toBe("blocked");
    expect(nextTab(groups, "go", "ArrowLeft")).toBe("blocked");
    expect(nextTab(groups, "blocked", "ArrowLeft")).toBe("idle");
    expect(nextTab(groups, "go", "Home")).toBe("blocked");
    expect(nextTab(groups, "go", "End")).toBe("idle");
    expect(nextTab(groups, "go", "Enter")).toBeNull();
    // With no tabs there is nowhere to move.
    for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) expect(nextTab([], "go", key), key).toBeNull();
  });
});

describe("AC 79: the map's pins and the drawer", () => {
  it("chooses the tab's first project in list order, or none for an empty tab", () => {
    const { projects } = buildToday(SAMPLE);
    expect(firstProject(projects, "blocked")?.id).toBe("site-b");
    expect(firstProject(projects, "go")?.id).toBe("site-a");
    expect(firstProject(projects, "idle")?.id).toBe("site-d");
    expect(firstProject(projects.slice(0, 1), "blocked")).toBeNull();
  });

  it("gives each project what the drawer shows, in the project's own words", () => {
    const [cedar, quayside, northgate, foundry] = buildToday(SAMPLE).projects;
    expect(cedar).toMatchObject({
      id: "site-a",
      shortName: "Cedar Court",
      href: "/sites/site-a",
      group: "go",
      colour: "#3ddc6c",
      location: { lat: -36.8443, lng: 174.7676 },
      details: ["Materials for the planned work are on hand (shared, not reserved)."],
      decide: null,
    });
    expect(cedar?.status.label).toBe("Crew can go");
    expect(cedar?.operator?.name).toBe("Mere Tane");
    expect(cedar?.operator?.callHref).toBe("tel:+447700900156");
    expect(quayside?.status.label).toBe("Blocked · 2 shortages");
    expect(quayside?.details).toEqual(["Short: Pipe collar for 25 mm pipe", "Short: Intumescent sealant, 310 ml cartridge"]);
    expect(quayside?.decide).toEqual({ label: "Sort out shortages", href: "/sites/site-b#action-needed" });
    expect(northgate?.status.label).toBe("Blocked · 1 shortage, 4 data problems");
    expect(northgate?.details).toEqual(["Short: Fire mastic tube (stock unknown)", "4 data problems to check"]);
    expect(foundry).toMatchObject({ group: "idle", colour: "#5c5c5c", details: ["No work planned at this project."], operator: null, decide: null });
    const unchecked = buildToday([site("u", "Unchecked Yard", "unavailable")]).projects[0];
    expect(unchecked?.details).toEqual(["Stock can't be checked right now, so don't send the crew yet."]);
    expect(unchecked?.colour).toBe("#fed105");
    const many = buildToday([
      site("m", "Many", "blocked", {
        shortageCount: 5,
        shortages: ["A", "B", "C", "D", "E"].map((name) => ({ name, kind: "short" as const })),
      }),
    ]).projects[0];
    expect(many?.details).toEqual(["Short: A", "Short: B", "Short: C", "and 2 more"]);
    expect(buildToday([site("p", "P", "blocked", { dataProblemCount: 1 })]).projects[0]?.details).toEqual(["1 data problem to check"]);
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
