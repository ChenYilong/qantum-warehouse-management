import { describe, expect, it } from "vitest";
import { checkPickLine, checkPicks, type PickLine, type PickList, type PickReport, type PickReview } from "@/domain";

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

describe("AC 68, AC 70: what the site found overrides a match until a review says the line is right", () => {
  const report = (overrides: Partial<PickReport> = {}): PickReport => ({
    id: "r1",
    siteId: "site-b",
    lineId: "L1",
    kind: "damaged",
    plannedQty: 2,
    pickedQty: 2,
    affectedQty: 1,
    request: "same_day",
    missingPart: null,
    note: null,
    sendToPicker: true,
    sendToPurchasing: false,
    photoAttached: true,
    createdBy: "lead",
    createdAt: "2026-10-19T01:00:00.000Z",
    ...overrides,
  });
  const review = (createdAt: string, lineId = "L1"): PickReview => ({ id: `v-${createdAt}`, siteId: "site-b", lineId, createdBy: "lead", createdAt });

  it("a site report on a line that matches the plan makes it Reported on site, and the picks not ready", () => {
    const found = report();
    const check = checkPicks(list([line()]), { reports: [found], reviews: [] });
    expect(check.status).toBe("not_ready");
    expect(check.issueCount).toBe(1);
    expect(check.lines[0]).toMatchObject({ kind: "reported", issues: ["reported"], openReport: found, checkedAt: null });
  });

  it("a review after the report closes it: the line matches again and reads checked on site", () => {
    const check = checkPicks(list([line()]), { reports: [report()], reviews: [review("2026-10-19T02:00:00.000Z")] });
    expect(check.status).toBe("ready");
    expect(check.lines[0]).toMatchObject({ kind: null, issues: [], openReport: null, checkedAt: "2026-10-19T02:00:00.000Z" });
  });

  it("a review from before the report, or for another line, does not close it", () => {
    for (const reviews of [[review("2026-10-19T00:30:00.000Z")], [review("2026-10-19T02:00:00.000Z", "L2")]]) {
      const checked = checkPickLine(line(), { reports: [report()], reviews });
      expect(checked.kind).toBe("reported");
      expect(checked.checkedAt).toBeNull();
    }
  });

  it("the latest of several reports is the one shown, and a review between them closes only the earlier one", () => {
    const later = report({ id: "r2", kind: "wrong_item", request: "repick", createdAt: "2026-10-19T03:00:00.000Z" });
    const checked = checkPickLine(line(), { reports: [report(), later], reviews: [review("2026-10-19T02:00:00.000Z")] });
    expect(checked.kind).toBe("reported");
    expect(checked.openReport).toEqual(later);
  });

  it("a review never turns a line that doesn't match the plan into a match", () => {
    const short = line({ pickedQty: 1 });
    const checked = checkPickLine(short, { reports: [], reviews: [review("2026-10-19T02:00:00.000Z")] });
    expect(checked.kind).toBe("part_picked");
    expect(checked.checkedAt).toBe("2026-10-19T02:00:00.000Z");
    expect(checkPicks(list([short]), { reports: [], reviews: [review("2026-10-19T02:00:00.000Z")] }).status).toBe("not_ready");
  });

  it("a report on a line with another issue keeps that issue's name and adds reported", () => {
    const checked = checkPickLine(line({ requiredParts: [{ id: "kit", name: "Fixing kit", plannedQty: 2, pickedQty: 0 }] }), { reports: [report()], reviews: [] });
    expect(checked.kind).toBe("missing_parts");
    expect(checked.issues).toEqual(["missing_parts", "reported"]);
    expect(checked.openReport?.id).toBe("r1");
  });

  it("fails closed on times it can't read: such a report stays open, and such a review closes nothing", () => {
    const unreadable = checkPickLine(line(), { reports: [report({ createdAt: "not a time" })], reviews: [review("2026-10-19T09:00:00.000Z")] });
    expect(unreadable.kind).toBe("reported");
    const badReview = checkPickLine(line(), { reports: [report()], reviews: [review("not a time")] });
    expect(badReview.kind).toBe("reported");
    expect(badReview.checkedAt).toBeNull();
  });

  it("without findings the check is as before, and reports for lines not on the list are ignored", () => {
    expect(checkPicks(list([line()])).lines[0]).toMatchObject({ kind: null, openReport: null, checkedAt: null });
    expect(checkPicks(list([line()]), { reports: [report({ lineId: "gone" })], reviews: [] }).status).toBe("ready");
    expect(checkPicks(null, { reports: [report()], reviews: [] }).status).toBe("unknown");
  });
});
