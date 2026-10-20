import { describe, expect, it } from "vitest";
import {
  buildEvidenceSummary,
  EVIDENCE,
  EVIDENCE_KEY,
  parseDrafts,
  readDraft,
  selectedHere,
  writeDraft,
  type DraftStorage,
  type EvidenceRequirement,
} from "@/ui/evidence";

const sealant: EvidenceRequirement = {
  id: "site-b:MAT-SEALANT",
  status: "SHORTAGE",
  name: "Intumescent sealant, 310 ml cartridge",
  unit: "cartridge",
  required: 10,
  available: 8,
  missing: 2,
  capturedAt: "2026-10-03T08:00:00Z",
};
const mastic: EvidenceRequirement = { id: "site-b:MAT-MASTIC", status: "UNKNOWN", name: "Fire mastic tube", unit: "tube", required: 1, available: null, missing: null, capturedAt: null };
const context = {
  siteName: "Quayside House, Levels 3 to 5",
  reference: "Job ref QH-345",
  penetration: "L3, Riser 2",
  nominatedCode: "0438",
  substituteCode: "0451",
  substituteStatus: "READY",
};

function memory(initial: string | null = null): DraftStorage & { value: string | null } {
  const store = {
    value: initial,
    getItem: (key: string) => (key === EVIDENCE_KEY ? store.value : null),
    setItem: (key: string, value: string) => {
      if (key === EVIDENCE_KEY) store.value = value;
    },
  };
  return store;
}

describe("AC 91: portable evidence, kept in this browser by site id", () => {
  it("reads only well-formed drafts", () => {
    expect(parseDrafts(null)).toEqual({});
    expect(parseDrafts("{bad")).toEqual({});
    expect(parseDrafts("[]")).toEqual({});
    expect(parseDrafts("3")).toEqual({});
    const raw = JSON.stringify({
      "site-b": { selected: ["site-b:MAT-SEALANT", "site-b:MAT-SEALANT", 7, "no-colon"], note: "x".repeat(600) },
      "site-c": { selected: "all", note: 5 },
      "bad id": { selected: [], note: "" },
      "site-d": null,
    });
    const drafts = parseDrafts(raw);
    expect(Object.keys(drafts)).toEqual(["site-b", "site-c"]);
    expect(drafts["site-b"]).toEqual({ selected: ["site-b:MAT-SEALANT"], note: "x".repeat(500) });
    expect(drafts["site-c"]).toEqual({ selected: [], note: "" });
  });

  it("writes one site's draft beside the others and reads it back by site id", () => {
    const store = memory(JSON.stringify({ "site-a": { selected: [], note: "keep me" } }));
    expect(writeDraft(store, "site-b", { selected: ["site-b:MAT-SEALANT"], note: "call purchasing" })).toBe(true);
    expect(readDraft(store, "site-b")).toEqual({ selected: ["site-b:MAT-SEALANT"], note: "call purchasing" });
    expect(readDraft(store, "site-a")).toEqual({ selected: [], note: "keep me" });
    expect(readDraft(store, "site-z")).toEqual({ selected: [], note: "" });
    expect(readDraft(null, "site-b")).toEqual({ selected: [], note: "" });
    expect(writeDraft(null, "site-b", { selected: [], note: "" })).toBe(false);
    const broken: DraftStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(readDraft(broken, "site-b")).toEqual({ selected: [], note: "" });
    expect(writeDraft(broken, "site-b", { selected: [], note: "" })).toBe(false);
  });

  it("keeps only the ticks that are still blocking requirements here", () => {
    expect(selectedHere({ selected: ["site-b:MAT-MASTIC", "site-b:GONE", "site-b:MAT-SEALANT"], note: "" }, [sealant, mastic])).toEqual([
      "site-b:MAT-SEALANT",
      "site-b:MAT-MASTIC",
    ]);
  });

  it("builds the summary from the ticked requirements, with the note, and refuses an empty or over-long one", () => {
    expect(buildEvidenceSummary(context, [sealant, mastic], { selected: ["site-b:MAT-SEALANT", "site-b:MAT-MASTIC"], note: "  Call purchasing  " })).toBe(
      [
        "MATERIAL SHORTAGE SUMMARY",
        "Site: Quayside House, Levels 3 to 5 (Job ref QH-345)",
        "Penetration: L3, Riser 2",
        "Nominated solution: 0438",
        "Substitute considered: 0451 (catalogue match, not verified; stock READY)",
        "Blocking requirements:",
        "- [SHORTAGE] Intumescent sealant, 310 ml cartridge",
        "  Required: 10 cartridge",
        "  Available: 8 cartridge",
        "  Missing: 2 cartridge",
        "  Inventory captured: 3 Oct 2026, 9:00 pm NZDT",
        "  Reason: Insufficient quantity",
        "- [UNKNOWN] Fire mastic tube",
        "  Required: 1 tube",
        "  Available: Unknown",
        "  Missing: Unknown",
        "  Inventory captured: Unknown",
        "  Reason: Inventory snapshot missing",
        "",
        "Note: Call purchasing",
      ].join("\n"),
    );
    expect(buildEvidenceSummary(context, [sealant], { selected: ["site-b:MAT-SEALANT"], note: "" })).not.toContain("Note:");
    expect(buildEvidenceSummary(context, [sealant], { selected: [], note: "x" })).toBeNull();
    expect(buildEvidenceSummary(context, [sealant], { selected: ["site-b:MAT-SEALANT"], note: "x".repeat(501) })).toBeNull();
    expect(EVIDENCE.intro).toBe("Choose the blocking requirements to include. Copying creates no record and does not send the summary.");
  });
});
