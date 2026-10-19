import { describe, expect, it } from "vitest";
import { actionNeeded, actionSummary, affectedLine, shortageLine } from "@/ui/action-needed";

const materials = {
  "MAT-SEALANT": { name: "Intumescent sealant, 310 ml cartridge", unit: "cartridge" },
  "MAT-MASTIC": { name: "Fire mastic tube", unit: "tube" },
};

describe("AC 50: a blocked site says what needs a decision", () => {
  it("states each figure with its unit, and unknown stock is never a number", () => {
    expect(shortageLine({ kind: "short", requiredQty: 10, shortfallQty: 2 }, "cartridge")).toBe("Short 2 of 10 cartridges");
    expect(shortageLine({ kind: "short", requiredQty: 4, shortfallQty: 2 }, "each")).toBe("Short 2 of 4");
    expect(shortageLine({ kind: "unknown", requiredQty: 1, shortfallQty: null }, "tube")).toBe("Stock unknown · needs 1 tube");
    expect(shortageLine({ kind: "short", requiredQty: 3, shortfallQty: null }, "tube")).toBe("Stock unknown · needs 3 tubes");
  });

  it("counts penetrations out loud, never a bare number", () => {
    expect(affectedLine(1)).toBe("1 penetration affected");
    expect(affectedLine(12)).toBe("12 penetrations affected");
    expect(actionSummary(2, 0)).toBe("Can't go yet: 2 shortages");
    expect(actionSummary(1, 4)).toBe("Can't go yet: 1 shortage · 4 data problems");
    expect(actionSummary(0, 1)).toBe("Can't go yet: 1 data problem");
    expect(actionSummary(0, 0)).toBe("Can't go yet");
  });

  it("lists the shortages with links to their penetrations, and what is covered apart from them", () => {
    const view = actionNeeded({
      siteId: "site-b",
      siteName: "Quayside House, Levels 3 to 5",
      shortages: [
        { id: "site-b:MAT-SEALANT", materialId: "MAT-SEALANT", kind: "short", requiredQty: 10, shortfallQty: 2, penetrationIds: ["p1", "p2", "p2"] },
      ],
      blockers: [],
      materials,
      referenced: { "MAT-SEALANT": materials["MAT-SEALANT"], "MAT-BATT": { name: "Mineral wool batt", unit: "each" } },
    });
    expect(view.summary).toBe("Can't go yet: 1 shortage");
    expect(view.shortages).toEqual([
      {
        id: "site-b:MAT-SEALANT",
        name: "Intumescent sealant, 310 ml cartridge",
        line: "Short 2 of 10 cartridges",
        affected: "2 penetrations affected",
        href: "/sites/site-b?material=MAT-SEALANT#penetrations-heading",
        target: "Intumescent sealant, 310 ml cartridge at Quayside House, Levels 3 to 5",
        tone: "danger",
      },
    ]);
    expect(view.dataProblems).toBeNull();
    expect(view.covered).toEqual(["Mineral wool batt"]);
  });

  it("names data problems by penetration, warns on unknown stock, and never lists covered when the work is unknown", () => {
    const view = actionNeeded({
      siteId: "site-c",
      siteName: "Northgate Depot, Phase 2",
      shortages: [{ id: "site-c:MAT-MASTIC", materialId: "MAT-MASTIC", kind: "unknown", requiredQty: 1, shortfallQty: null, penetrationIds: ["c4"] }],
      blockers: [{ penetrationId: "c1" }, { penetrationId: "c2" }, { penetrationId: "c2" }],
      materials: {},
      referenced: null,
    });
    expect(view.shortages[0]).toMatchObject({ name: "MAT-MASTIC", line: "Stock unknown · needs 1", tone: "warning" });
    expect(view.dataProblems).toEqual({
      line: "3 data problems",
      affected: "2 penetrations affected",
      href: "/sites/site-c?show=data-problems#penetrations-heading",
    });
    expect(view.covered).toEqual([]);
  });
});
