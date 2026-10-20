import { describe, expect, it } from "vitest";
import { makeStubs } from "@/adapters/stub";
import { describePenetration, listCandidates, proposeSubstitution } from "@/application";
import { solutionInventory } from "@/domain";
import { capturedText, INVENTORY, inventoryView } from "@/ui/inventory";
import { testDependencies } from "../api/support";
import solutionStockFile from "../../data/sample/solution-stock.json";

const count = { internalCode: "0451", availableQuantity: 12, unit: "install kit", capturedAt: "2026-10-19T20:00:00Z" };

describe("AC 90: solution stock is READY only with a usable count of at least one kit", () => {
  it("READY with enough kits, SHORTAGE with too few, none, or a bad count", () => {
    expect(solutionInventory("0451", count)).toEqual({
      internalCode: "0451",
      status: "READY",
      reason: "SUFFICIENT_QUANTITY",
      availableQuantity: 12,
      unit: "install kit",
      capturedAt: "2026-10-19T20:00:00Z",
    });
    expect(solutionInventory("0451", { ...count, availableQuantity: 0 }).status).toBe("SHORTAGE");
    expect(solutionInventory("0451", count, 13)).toMatchObject({ status: "SHORTAGE", reason: "INSUFFICIENT_QUANTITY", availableQuantity: 12 });
    expect(solutionInventory("0451", undefined)).toEqual({
      internalCode: "0451",
      status: "SHORTAGE",
      reason: "INSUFFICIENT_QUANTITY",
      availableQuantity: null,
      unit: null,
      capturedAt: null,
    });
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -3]) {
      expect(solutionInventory("0451", { ...count, availableQuantity: bad })).toMatchObject({ status: "SHORTAGE", availableQuantity: null });
    }
    expect(solutionInventory("0451", count, 0).status).toBe("SHORTAGE");
    expect(solutionInventory("0451", count, Number.NaN).status).toBe("SHORTAGE");
  });

  it("shows the capture in New Zealand time and the status in the stock app's words", () => {
    expect(capturedText("2026-10-19T20:00:00Z")).toBe("20 Oct 2026, 9:00 am NZDT");
    expect(capturedText("not a time")).toBe("Unknown");
    expect(capturedText(null)).toBe("Unknown");
    expect(inventoryView(solutionInventory("0451", count))).toEqual({
      captured: "20 Oct 2026, 9:00 am NZDT",
      capturedIso: "2026-10-19T20:00:00Z",
      status: { label: "READY", tone: "success", icon: "check" },
      reason: "Quantity available",
      available: "12 install kits counted",
      ready: true,
    });
    expect(inventoryView(solutionInventory("0451", { ...count, availableQuantity: 1 })).available).toBe("1 install kit counted");
    expect(inventoryView(solutionInventory("0451", { ...count, unit: "kits", availableQuantity: 2 })).available).toBe("2 kits counted");
    expect(inventoryView(solutionInventory("0451", undefined))).toEqual({
      captured: "Unknown",
      capturedIso: null,
      status: { label: "SHORTAGE", tone: "danger", icon: "stop" },
      reason: "Insufficient quantity",
      available: null,
      ready: false,
    });
    expect(INVENTORY.planNotice).toBe("Selecting a Solution changes the material plan. It does not reserve stock.");
  });

  it("the sample file counts every one of the 148 catalogue solutions, all in stock, marked invented", () => {
    expect(solutionStockFile.label).toMatch(/^INVENTED SAMPLE DATA/);
    expect(solutionStockFile.solutions).toHaveLength(148);
    expect(new Set(solutionStockFile.solutions.map((item) => item.internalCode)).size).toBe(148);
    for (const item of solutionStockFile.solutions) expect(item.availableQuantity).toBeGreaterThan(0);
  });

  it("the stub keeps only the codes asked for, and fails like any upstream when down or malformed", async () => {
    const records = await makeStubs().solutionStock.getSolutionStock(["0451", "0464", "nope"]);
    expect(records.map((record) => record.internalCode).sort()).toEqual(["0451", "0464"]);
    expect(await makeStubs({ solutionStock: "empty" }).solutionStock.getSolutionStock(["0451"])).toEqual([]);
    await expect(makeStubs({ solutionStock: "down" }).solutionStock.getSolutionStock(["0451"])).rejects.toMatchObject({ code: "upstream_unavailable", system: "solution_stock" });
    await expect(makeStubs({ solutionStock: "malformed" }).solutionStock.getSolutionStock(["0451"])).rejects.toMatchObject({ code: "upstream_invalid", system: "solution_stock" });
  });

  it("the penetration page's nominated solution and every candidate carry their stock", async () => {
    const deps = testDependencies();
    const detail = await describePenetration(deps, "site-b", "pen-b-01");
    expect(detail.inventory).toMatchObject({ internalCode: "0438", status: "READY", capturedAt: "2026-10-19T20:00:00Z" });
    const listed = await listCandidates(deps, "site-b", "pen-b-01");
    expect(listed.candidates.length).toBeGreaterThan(0);
    for (const candidate of listed.candidates) expect(candidate.inventory).toMatchObject({ internalCode: candidate.internalCode, status: "READY" });
    const none = await listCandidates(testDependencies({ solutionStock: "empty" }), "site-b", "pen-b-01");
    for (const candidate of none.candidates) expect(candidate.inventory.status).toBe("SHORTAGE");
    // No stock feed at all: nothing is known, so nothing is READY.
    const { solutionStock: _unused, ...withoutFeed } = deps;
    expect((await describePenetration(withoutFeed, "site-b", "pen-b-01")).inventory.status).toBe("SHORTAGE");
  });

  it("only a substitute in stock can be proposed: otherwise 409 substitute_not_in_stock and nothing is stored", async () => {
    const input = {
      siteId: "site-b",
      penetrationId: "pen-b-01",
      fromInternalCode: "0438",
      toInternalCode: "0451",
      reason: "closer rating",
      createdBy: "lead",
      idempotencyKey: "stock-check",
    };
    const empty = testDependencies({ solutionStock: "empty" });
    await expect(proposeSubstitution(empty, input)).rejects.toMatchObject({ status: 409, code: "substitute_not_in_stock" });
    expect(await empty.actions.findSubstitutionProposalByKey("lead", "stock-check")).toBeNull();
    const stocked = await proposeSubstitution(testDependencies(), input);
    expect(stocked.record.status).toBe("proposed");
  });
});
