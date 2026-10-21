import { describe, expect, it } from "vitest";
import { checkPickLine, checkPicks, type PickLine, type PickList } from "@/domain";
import {
  applyPickup,
  available,
  heldLines,
  heldSite,
  isHeldBlocked,
  lineMoves,
  lineNeed,
  parsePickups,
  pickupPath,
  PICKUP,
  PICKUPS_KEY,
  planPickup,
  readPickups,
  sameMaterial,
  withPickups,
  writePickups,
  type Lender,
  type PickupStorage,
} from "@/ui/pickups";

function memory(initial: string | null = null): PickupStorage & { value: string | null } {
  const store = {
    value: initial,
    getItem: (key: string) => (key === PICKUPS_KEY ? store.value : null),
    setItem: (key: string, value: string) => {
      if (key === PICKUPS_KEY) store.value = value;
    },
  };
  return store;
}

function line(id: string, materialName: string, plannedQty: number, pickedQty: number, extra: Partial<PickLine> = {}): PickLine {
  return {
    id,
    materialName,
    unit: "cartridge",
    usedAt: null,
    plannedQty,
    pickedQty,
    pickedUpQty: 0,
    plannedSpec: null,
    pickedSpec: null,
    requiredParts: [],
    warehouseStatus: "picked",
    ...extra,
  };
}

const SEALANT = "Intumescent sealant, 310 ml cartridge";
const siteA = [line("a-sealant", SEALANT, 2, 2), line("a-collar", "Pipe collar for 25 mm pipe", 4, 4, { unit: "each" })];
const siteB = [line("b-sealant", SEALANT, 10, 6), line("b-wrap", "Intumescent wrap strip", 2, 2, { unit: "metre" })];
const siteC = [line("c-mastic", "Fire mastic tube", 1, 1, { unit: "tube" })];
const AT = "2026-10-20T09:00:00.000Z";

describe("AC 92: the button and the sample's field", () => {
  it("opens the pick-up page for one line", () => {
    expect(pickupPath("site-b", "b-sealant")).toBe("/sites/site-b/picks/pickup?line=b-sealant");
    expect(pickupPath("site-b", "a b")).toBe("/sites/site-b/picks/pickup?line=a%20b");
    expect(PICKUP.button).toBe("Pick up from other sites");
  });

  it("reads the sample's pickedUpQty, 0 when absent or bad", () => {
    const held = heldLines("site-b", [line("x", SEALANT, 1, 1, { pickedUpQty: 1 }), line("y", SEALANT, 1, 1, { pickedUpQty: undefined }), line("z", SEALANT, 1, 1, { pickedUpQty: -2 })], {});
    expect(held.map((item) => item.pickedUpQty)).toEqual([1, 0, 0]);
    expect(held.every((item) => item.lentQty === 0)).toBe(true);
  });
});

describe("AC 93: what a line needs and what another site holds", () => {
  it("needs the gap to the plan, and nothing when it has enough or its numbers are bad", () => {
    expect(lineNeed({ plannedQty: 10, pickedQty: 6 })).toBe(4);
    expect(lineNeed({ plannedQty: 4, pickedQty: 4 })).toBe(0);
    expect(lineNeed({ plannedQty: 4, pickedQty: 9 })).toBe(0);
    expect(lineNeed({ plannedQty: NaN, pickedQty: 1 })).toBe(0);
    expect(lineNeed({ plannedQty: 4, pickedQty: -1 })).toBe(0);
  });

  it("matches a material by name whatever the case and spacing, and counts only trusted numbers", () => {
    expect(sameMaterial("  Pipe  collar ", "pipe collar")).toBe(true);
    expect(sameMaterial("Pipe collar", "Fire putty")).toBe(false);
    const held = heldLines("site-a", [...siteA, line("a-more", "intumescent  sealant, 310 ml cartridge", 1, 3), line("a-bad", SEALANT, 1, NaN)], {});
    expect(available(held, SEALANT)).toBe(5);
    expect(available(held, "Fire mastic tube")).toBe(0);
  });
});

describe("AC 94: Confirm takes from the ticked sites in tick order and stores every site it touched", () => {
  const target = heldLines("site-b", siteB, {})[0]!;
  const lenders: Lender[] = [
    { siteId: "site-a", name: "Cedar Court", lines: heldLines("site-a", siteA, {}) },
    { siteId: "site-c", name: "Northgate", lines: heldLines("site-c", siteC, {}) },
    { siteId: "site-x", name: "Unreadable", lines: null },
    { siteId: "site-y", name: "Big store", lines: heldLines("site-y", [line("y-sealant", SEALANT, 0, 3), line("y-sealant-2", SEALANT, 0, 9)], {}) },
  ];

  it("takes up to what each site holds, in tick order, and skips sites with none or an unreadable list", () => {
    const plan = planPickup(target, lenders, ["site-x", "site-c", "site-a"]);
    expect(plan).toEqual({ need: 4, moves: [{ siteId: "site-a", lineId: "a-sealant", qty: 2 }], total: 2, short: 2, siteIds: ["site-a"] });
    const more = planPickup(target, lenders, ["site-y", "site-a"]);
    expect(more.moves).toEqual([
      { siteId: "site-y", lineId: "y-sealant", qty: 3 },
      { siteId: "site-y", lineId: "y-sealant-2", qty: 1 },
    ]);
    expect(more.siteIds).toEqual(["site-y"]);
    expect(more.short).toBe(0);
    expect(planPickup(target, lenders, ["site-nobody"]).total).toBe(0);
    expect(planPickup(heldLines("site-b", siteB, {})[1]!, lenders, ["site-a"]).need).toBe(0);
  });

  it("stores the site that picked up and each site that gave, whole, as Blocked", () => {
    const plan = planPickup(target, lenders, ["site-a"]);
    const next = applyPickup({}, { siteId: "site-b", lineId: "b-sealant", lines: heldLines("site-b", siteB, {}) }, lenders, plan, AT);
    expect(next["site-b"]).toEqual({
      status: "blocked",
      updatedAt: AT,
      lines: {
        "b-sealant": { materialName: SEALANT, unit: "cartridge", plannedQty: 10, pickedQty: 8, pickedUpQty: 2, lentQty: 0 },
        "b-wrap": { materialName: "Intumescent wrap strip", unit: "metre", plannedQty: 2, pickedQty: 2, pickedUpQty: 0, lentQty: 0 },
      },
    });
    expect(next["site-a"]!.lines["a-sealant"]).toEqual({ materialName: SEALANT, unit: "cartridge", plannedQty: 2, pickedQty: 0, pickedUpQty: 0, lentQty: 2 });
    expect(next["site-a"]!.lines["a-collar"]).toMatchObject({ pickedQty: 4, lentQty: 0 });
    expect(next["site-c"]).toBeUndefined();
    // Nothing to take changes nothing.
    const none = planPickup(target, lenders, []);
    expect(applyPickup(next, { siteId: "site-b", lineId: "b-sealant", lines: [] }, lenders, none, AT)).toBe(next);
  });

  it("writes and reads the store, and says when the browser refuses", () => {
    const storage = memory();
    const plan = planPickup(target, lenders, ["site-a"]);
    const next = applyPickup({}, { siteId: "site-b", lineId: "b-sealant", lines: heldLines("site-b", siteB, {}) }, lenders, plan, AT);
    expect(writePickups(storage, next)).toBe(true);
    expect(readPickups(storage)).toEqual(next);
    expect(writePickups(null, next)).toBe(false);
    expect(readPickups(null)).toEqual({});
    const refusing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); } };
    expect(writePickups(refusing, next)).toBe(false);
    expect(readPickups(refusing)).toEqual({});
    expect(PICKUP.changed("Quayside House", 2, "cartridge", ["Cedar Court"])).toBe(
      "Quayside House picked up 2 cartridges from Cedar Court. Because its status changed to Blocked, change the deadline and the operator of that site.",
    );
    expect(PICKUP.changed("Quayside House", 1, "each", ["Cedar Court", "Northgate", "Foundry"])).toBe(
      "Quayside House picked up 1 item from Cedar Court, Northgate and Foundry. Because their status changed to Blocked, change the deadline and the operator of each of those sites.",
    );
  });
});

describe("AC 95: the store is read before the sample data, and only ever blocks", () => {
  it("reads nothing from no value, junk, an array or a non-object", () => {
    for (const raw of [null, "", "{not json", "[1]", "42", "null"]) expect(parsePickups(raw)).toEqual({});
  });

  it("drops a bad site id or any status but Blocked, and keeps an unreadable line as unreadable", () => {
    const good = { materialName: SEALANT, unit: "cartridge", plannedQty: 2, pickedQty: 0, pickedUpQty: 0, lentQty: 2 };
    const parsed = parsePickups(
      JSON.stringify({
        "site-a": { status: "blocked", updatedAt: AT, lines: { "a-sealant": good, "a-collar": { ...good, pickedQty: -1 }, "bad id!": good } },
        "site-b": { status: "clear", lines: { "b-sealant": good } },
        "bad id!": { status: "blocked", lines: {} },
        "site-c": { status: "blocked", lines: [] },
        "site-d": "blocked",
        "site-e": { status: "blocked", updatedAt: 5, lines: { e1: { ...good, materialName: " " }, e2: { ...good, unit: 3 }, e3: { ...good, pickedUpQty: 5 }, e4: "x", e5: { ...good, plannedQty: 1.5 } } },
      }),
    );
    expect(Object.keys(parsed)).toEqual(["site-a", "site-e"]);
    expect(parsed["site-a"]!.lines).toEqual({ "a-sealant": good, "a-collar": null });
    expect(parsed["site-e"]!.updatedAt).toBe("");
    expect(Object.values(parsed["site-e"]!.lines)).toEqual([null, null, null, null, null]);
  });

  it("holds the stored quantities first, the sample's for what it doesn't hold, and bad data for an unreadable line", () => {
    const pickups = parsePickups(
      JSON.stringify({
        "site-a": { status: "blocked", updatedAt: AT, lines: { "a-sealant": { materialName: SEALANT, unit: "cartridge", plannedQty: 2, pickedQty: 0, pickedUpQty: 0, lentQty: 2 }, "a-collar": "junk" } },
      }),
    );
    const held = heldLines("site-a", [...siteA, line("a-new", "Fire putty pad", 3, 3)], pickups);
    expect(held[0]).toMatchObject({ pickedQty: 0, lentQty: 2 });
    expect(held[1]!.pickedQty).toBeNaN();
    expect(held[2]).toMatchObject({ pickedQty: 3, lentQty: 0 });
    expect(lineMoves("site-a", "a-sealant", pickups)).toEqual({ pickedUp: 0, lent: 2 });
    expect(lineMoves("site-a", "a-collar", pickups)).toEqual({ pickedUp: 0, lent: 0 });
    expect(lineMoves("site-z", "x", pickups)).toEqual({ pickedUp: 0, lent: 0 });
  });

  it("judges each stored line again, so the site that gave reads short and the one that picked up reads the gain", () => {
    const listA: PickList = { siteId: "site-a", picker: null, lastAction: null, lastActionAt: null, lines: siteA };
    const lenders: Lender[] = [{ siteId: "site-a", name: "Cedar Court", lines: heldLines("site-a", siteA, {}) }];
    const target = heldLines("site-b", [line("b-sealant", SEALANT, 2, 0)], {});
    const plan = planPickup(target[0]!, lenders, ["site-a"]);
    const pickups = applyPickup({}, { siteId: "site-b", lineId: "b-sealant", lines: target }, lenders, plan, AT);

    const a = withPickups("site-a", checkPicks(listA), pickups);
    expect(a.status).toBe("not_ready");
    expect(a.lines[0]!.kind).toBe("part_picked");
    expect(a.lines[1]!.kind).toBeNull();

    const listB: PickList = { siteId: "site-b", picker: null, lastAction: null, lastActionAt: null, lines: [line("b-sealant", SEALANT, 2, 0), line("b-extra", SEALANT, 1, 1)] };
    const b = withPickups("site-b", checkPicks(listB), pickups);
    expect(b.lines[0]!.line).toMatchObject({ pickedQty: 2, pickedUpQty: 2 });
    expect(b.status).toBe("ready");
    // A line the store doesn't hold is the sample's, unchanged.
    expect(b.lines[1]).toEqual(checkPicks(listB).lines[1]);
    // No record, or no lines: the check as the server made it.
    const plain = checkPicks(listA);
    expect(withPickups("site-z", plain, pickups)).toBe(plain);
    const empty = checkPicks(null);
    expect(withPickups("site-a", empty, pickups)).toBe(empty);
  });

  it("keeps a site report open, and a review's check, when a line is judged again", () => {
    const report = {
      id: "r1", siteId: "site-a", lineId: "a-sealant", kind: "damaged" as const, plannedQty: null, pickedQty: null, missingPart: null,
      note: null, sendToPicker: true, sendToPurchasing: false, photoAttached: false, affectedQty: null, request: null,
      createdBy: "lead", createdAt: "2026-10-03T08:00:00Z",
    };
    const reported = checkPickLine(siteA[0]!, { reports: [report as never], reviews: [] });
    const reviewed = checkPickLine(siteA[1]!, { reports: [], reviews: [{ id: "v", siteId: "site-a", lineId: "a-collar", createdBy: "lead", createdAt: "2026-10-03T09:00:00Z" }] });
    const pickups = parsePickups(
      JSON.stringify({
        "site-a": {
          status: "blocked",
          lines: {
            "a-sealant": { materialName: SEALANT, unit: "cartridge", plannedQty: 2, pickedQty: 2, pickedUpQty: 0, lentQty: 0 },
            "a-collar": { materialName: "Pipe collar for 25 mm pipe", unit: "each", plannedQty: 4, pickedQty: 4, pickedUpQty: 0, lentQty: 0 },
          },
        },
      }),
    );
    const again = withPickups("site-a", { status: "not_ready", lines: [reported, reviewed], issueCount: 1 }, pickups);
    expect(again.lines[0]!.kind).toBe("reported");
    expect(again.lines[0]!.openReport).toEqual(report);
    expect(again.lines[1]!.checkedAt).toBe("2026-10-03T09:00:00Z");
    expect(again.lines[1]!.kind).toBeNull();
  });

  it("blocks a site stored or ticked as Blocked, listing what it gave, and leaves every other site as it was", () => {
    const pickups = parsePickups(
      JSON.stringify({
        "site-a": { status: "blocked", lines: { "a-sealant": { materialName: SEALANT, unit: "cartridge", plannedQty: 2, pickedQty: 0, pickedUpQty: 0, lentQty: 2 }, "a-collar": "junk" } },
      }),
    );
    const clear = { id: "site-a", name: "Cedar Court", reference: "CC", crewStatus: "clear", shortageCount: 0, dataProblemCount: 0, shortages: [] };
    expect(heldSite(clear, pickups, null)).toEqual({ ...clear, crewStatus: "blocked", shortageCount: 1, dataProblemCount: 0, shortages: [{ name: SEALANT, kind: "short" }] });
    expect(isHeldBlocked("site-a", pickups, false)).toBe(true);
    expect(isHeldBlocked("site-c", pickups, false)).toBe(false);

    const other = { ...clear, id: "site-c" };
    expect(heldSite(other, pickups, null)).toBe(other);
    // Ticked on the pick-up page: blocked at once, with the material it would give.
    expect(heldSite(other, pickups, "Fire mastic tube")).toMatchObject({ crewStatus: "blocked", shortageCount: 1, shortages: [{ name: "Fire mastic tube", kind: "short" }] });

    // Already blocked: its own shortages and data problems stay, and a material it already lacks is not listed twice.
    const blocked = { ...clear, id: "site-a", crewStatus: "blocked", shortageCount: 1, dataProblemCount: 2, shortages: [{ name: SEALANT, kind: "short" as const }] };
    expect(heldSite(blocked, pickups, "Fire putty pad")).toMatchObject({ shortageCount: 2, dataProblemCount: 2, shortages: [{ name: SEALANT }, { name: "Fire putty pad" }] });
    const noList = { ...blocked, shortages: undefined };
    expect(heldSite(noList, pickups, null)).toMatchObject({ shortageCount: 2, shortages: [{ name: SEALANT }] });
  });
});

describe("AC 93, AC 94: the pick-up page's words", () => {
  it("says what the line needs, what each site has and takes, and what is still short", () => {
    expect(PICKUP.amount("Quayside House", 10, 6)).toBe("Quayside House · need 10 · has 6");
    expect(PICKUP.amount("Quayside House", NaN, -1)).toBe("Quayside House · need unknown · has unknown");
    expect(PICKUP.need(4, "cartridge", SEALANT)).toBe(`Needs 4 more: 4 cartridges of ${SEALANT}.`);
    expect(PICKUP.need(1, "metre", "Intumescent wrap strip")).toBe("Needs 1 more: 1 metre of Intumescent wrap strip.");
    expect(PICKUP.has(2, "cartridge")).toBe("Has 2 cartridges");
    expect(PICKUP.has(1, "each")).toBe("Has 1 item");
    expect(PICKUP.has(3, "")).toBe("Has 3 items");
    expect(PICKUP.takes(2)).toBe("takes 2");
    expect(PICKUP.choose("Cedar Court, Block A")).toBe("Pick up from Cedar Court, Block A");
    expect(PICKUP.willTake(2, 4, "cartridge")).toBe("Takes 2 of the 4 cartridges needed.");
    expect(PICKUP.stillShort(1, "cartridge")).toBe("1 cartridge still short.");
    expect(PICKUP.fromOthers(2)).toBe("2 picked up from other sites · on this phone");
    expect(PICKUP.lent(2)).toBe("2 given to another site · on this phone");
    expect(PICKUP.backToSite("Quayside House")).toBe("Back to Quayside House");
    expect(PICKUP.changed("Quayside House", 2, "cartridge", [])).toBe(
      "Quayside House picked up 2 cartridges from . Because their status changed to Blocked, change the deadline and the operator of each of those sites.",
    );
  });
});
