import { describe, expect, it } from "vitest";
import { checkPickLine, checkPicks, type PickLine, type PickList } from "@/domain";

function line(overrides: Partial<PickLine> = {}): PickLine {
  return {
    id: "L1",
    materialName: "Backing rod 10 mm",
    unit: "roll",
    usedAt: null,
    plannedQty: 2,
    pickedQty: 2,
    plannedSpec: null,
    pickedSpec: null,
    requiredParts: [],
    warehouseStatus: "picked",
    ...overrides,
  };
}

function list(lines: PickLine[]): PickList {
  return { siteId: "site-b", picker: "Sam", lastActionAt: null, lastAction: null, lines };
}

describe("AC 61: the pick check, planned against picked", () => {
  it("wrong spec: the right product at a lower rating is not ready, though the warehouse says picked", () => {
    const checked = checkPickLine(line({ plannedSpec: "FRR −/120/120", pickedSpec: "FRR −/60/60" }));
    expect(checked.kind).toBe("wrong_spec");
    expect(checkPicks(list([checked.line])).status).toBe("not_ready");
  });

  it("marked picked but the fixing kit is missing: NOT_READY", () => {
    const collar = line({
      materialName: "Pipe collar 110 mm",
      plannedQty: 6,
      pickedQty: 6,
      requiredParts: [{ id: "kit", name: "Fixing kit", plannedQty: 6, pickedQty: 0 }],
    });
    const checked = checkPickLine(collar);
    expect(checked.kind).toBe("missing_parts");
    expect(checked.shortParts.map((part) => part.id)).toEqual(["kit"]);
    expect(checkPicks(list([collar])).status).toBe("not_ready");
  });

  it("partly picked with an accessory missing: named partly picked, and both problems are kept", () => {
    const sealant = line({
      materialName: "Intumescent sealant 310 ml",
      plannedQty: 10,
      pickedQty: 6,
      requiredParts: [{ id: "nozzle", name: "Applicator nozzle", plannedQty: 1, pickedQty: 0 }],
    });
    const checked = checkPickLine(sealant);
    expect(checked.kind).toBe("part_picked");
    expect(checked.issues).toEqual(["part_picked", "missing_parts"]);
    expect(checkPicks(list([sealant])).issueCount).toBe(1);
  });

  it("ignores the warehouse status: a line marked anything matches when the numbers and spec do", () => {
    for (const warehouseStatus of ["picked", "not picked", ""]) {
      expect(checkPickLine(line({ warehouseStatus })).kind, warehouseStatus).toBeNull();
    }
    const matching = list([line(), line({ id: "L2", plannedSpec: "FRR −/60/60", pickedSpec: " frr  −/60/60 " })]);
    expect(checkPicks(matching)).toMatchObject({ status: "ready", issueCount: 0 });
  });

  it("counts lines, not problems, and a picked surplus is not an issue", () => {
    const check = checkPicks(
      list([
        line({ id: "a", plannedSpec: "A", pickedSpec: "B" }),
        line({ id: "b", pickedQty: 1 }),
        line({ id: "c", pickedQty: 5 }),
      ]),
    );
    expect(check.status).toBe("not_ready");
    expect(check.issueCount).toBe(2);
    expect(check.lines.map((checked) => checked.kind)).toEqual(["wrong_spec", "part_picked", null]);
  });

  it("fails closed on bad numbers and a missing spec: they block, never cover a shortfall", () => {
    for (const bad of [
      line({ pickedQty: Number.NaN }),
      line({ plannedQty: -1 }),
      line({ pickedQty: Number.POSITIVE_INFINITY }),
      line({ requiredParts: [{ id: "p", name: "Part", plannedQty: 1, pickedQty: -2 }] }),
      line({ plannedSpec: "FRR −/120/120", pickedSpec: null }),
      line({ plannedSpec: "FRR −/120/120", pickedSpec: "  " }),
    ]) {
      const checked = checkPickLine(bad);
      expect(checked.kind).toBe("bad_data");
      expect(checkPicks(list([bad])).status).toBe("not_ready");
    }
  });

  it("a site with no pick list, or an empty one, can't be checked and is never ready", () => {
    expect(checkPicks(null)).toEqual({ status: "unknown", lines: [], issueCount: 0 });
    expect(checkPicks(list([])).status).toBe("unknown");
  });
});
