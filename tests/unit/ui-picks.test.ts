import { describe, expect, it } from "vitest";
import { checkPickLine, type PickLine } from "@/domain";
import { addToOutbox, afterSend, OUTBOX_KEY, parseOutbox, readOutbox, removeFromOutbox, waitingFor, type OutboxEntry } from "@/ui/pick-outbox";
import {
  crewGate,
  initials,
  missingPartText,
  pickAmountLine,
  pickCardTitle,
  pickEmailHref,
  pickLineAnchor,
  parseAmount,
  pickLineLabel,
  pickReportPath,
  picksPath,
  reportKindFor,
} from "@/ui/picks";
import { AUTH, PICKS } from "@/ui/messages";
import { pickReportUrl } from "@/ui/decisions/api-client";

function line(overrides: Partial<PickLine> = {}): PickLine {
  return {
    id: "L1",
    materialName: "Pipe collar for 25 mm pipe",
    unit: "each",
    usedAt: null,
    plannedQty: 6,
    pickedQty: 6,
    plannedSpec: null,
    pickedSpec: null,
    requiredParts: [],
    warehouseStatus: "picked",
    ...overrides,
  };
}

const kit = { id: "kit", name: "Fixing kit", plannedQty: 6, pickedQty: 0 };

describe("AC 62, AC 63: pick labels and lines", () => {
  it("labels a live issue red and a match green; saved data reads Was … in amber, never green", () => {
    expect(pickLineLabel("part_picked", false)).toEqual({ label: "Part-picked", tone: "danger", icon: "stop" });
    expect(pickLineLabel("missing_parts", false).label).toBe("Missing parts");
    expect(pickLineLabel("wrong_spec", false).label).toBe("Wrong spec");
    expect(pickLineLabel("bad_data", false).label).toBe("Can't read");
    expect(pickLineLabel(null, false)).toEqual({ label: "Matches plan", tone: "success", icon: "check" });
    expect(pickLineLabel("part_picked", true)).toEqual({ label: "Was part-picked", tone: "warning", icon: "warning" });
    expect(pickLineLabel("bad_data", true).label).toBe("Was unreadable");
    expect(pickLineLabel(null, true)).toEqual({ label: "Was matching", tone: "warning", icon: "warning" });
  });

  it("says need and picked, the specs for a wrong spec, and what is short of each part", () => {
    expect(pickAmountLine(checkPickLine(line({ requiredParts: [kit] })))).toBe("Need 6 · picked 6 · Fixing kit missing");
    expect(pickAmountLine(checkPickLine(line({ pickedQty: 4, requiredParts: [{ ...kit, pickedQty: 2 }] })))).toBe("Need 6 · picked 4 · Fixing kit 2 of 6");
    expect(pickAmountLine(checkPickLine(line({ plannedSpec: "FRR −/120/120", pickedSpec: "FRR −/60/60" })))).toBe("Plan FRR −/120/120 · picked FRR −/60/60");
    expect(pickAmountLine(checkPickLine(line({ pickedQty: Number.NaN })))).toBe("Need 6 · picked unknown");
    // A wrong spec whose picked spec is missing is bad data, and says so rather than inventing one.
    expect(pickAmountLine(checkPickLine(line({ plannedSpec: "A", pickedSpec: "B", plannedQty: -1 })))).toBe("Plan A · picked B");
  });

  it("titles each card by its issue, and suggests a report kind and the missing part", () => {
    expect(pickCardTitle(checkPickLine(line({ plannedSpec: "A", pickedSpec: "B" })))).toBe("Wrong spec");
    expect(pickCardTitle(checkPickLine(line({ pickedQty: 2 })))).toBe("Partly picked");
    expect(pickCardTitle(checkPickLine(line({ pickedQty: 2, requiredParts: [kit] })))).toBe("Partly picked, accessory missing");
    expect(pickCardTitle(checkPickLine(line({ requiredParts: [kit] })))).toBe("Marked picked, parts missing");
    expect(pickCardTitle(checkPickLine(line({ plannedQty: -1 })))).toBe("Can't read this line");
    expect(pickCardTitle(checkPickLine(line()))).toBe("Matches plan");
    expect(reportKindFor("wrong_spec")).toBe("wrong_spec");
    expect(reportKindFor("part_picked")).toBe("part_picked");
    expect(reportKindFor("missing_parts")).toBe("missing_parts");
    expect(reportKindFor("bad_data")).toBe("other");
    expect(reportKindFor(null)).toBe("other");
    expect(missingPartText(checkPickLine(line({ requiredParts: [kit, { id: "n", name: "Nozzle", plannedQty: 1, pickedQty: 0 }] })))).toBe("Fixing kit × 6, Nozzle × 1");
  });

  it("builds the paths, the anchor, the email link and the avatar initials", () => {
    expect(picksPath("site-b")).toBe("/sites/site-b/picks");
    expect(pickReportPath("site-b")).toBe("/sites/site-b/picks/report");
    expect(pickReportPath("site-b", "b collar")).toBe("/sites/site-b/picks/report?line=b%20collar");
    expect(pickLineAnchor("b-collar")).toBe("pick-b-collar");
    expect(pickEmailHref("sam.lee@example.com", "Quayside House")).toBe("mailto:sam.lee@example.com?subject=Quayside%20House%20pick%20issues");
    expect(initials("Sam Lee")).toBe("SL");
    expect(initials("Mary Ann  de Vries")).toBe("MV");
    expect(initials("Tama")).toBe("T");
  });
});

describe("AC 65: amounts typed into the report", () => {
  it("keeps whole numbers from 0 to 100000, reads empty as none, and refuses the rest", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("  ")).toBeNull();
    expect(parseAmount("0")).toBe(0);
    expect(parseAmount(" 6 ")).toBe(6);
    expect(parseAmount("100000")).toBe(100000);
    for (const bad of ["-1", "2.5", "1e3", "abc", "100001", "1234567"]) expect(parseAmount(bad), bad).toBe("bad");
  });
});

describe("AC 62, AC 63: Crew can go", () => {
  it("opens only with picks matching, the site clear and a live connection", () => {
    expect(crewGate("ready", true, "online")).toEqual({ enabled: true, reason: PICKS.crewTell });
    expect(crewGate("not_ready", true, "online")).toEqual({ enabled: false, reason: PICKS.crewLocked });
    expect(crewGate("unknown", true, "online").enabled).toBe(false);
    expect(crewGate("unavailable", true, "online").enabled).toBe(false);
    expect(crewGate("ready", false, "online")).toEqual({ enabled: false, reason: PICKS.crewNotClear });
  });

  it("is never decided from saved data: offline or still checking, it stays locked whatever the picks say", () => {
    for (const phase of ["offline", "checking"] as const) {
      expect(crewGate("ready", true, phase)).toEqual({ enabled: false, reason: PICKS.crewOffline });
    }
  });
});

function storage(fail = false) {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => {
      if (fail) throw new Error("blocked");
      return items.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (fail) throw new Error("blocked");
      items.set(key, value);
    },
  };
}

const entry: OutboxEntry = { key: "k-1", siteId: "site-b", body: { lineId: "b-collar" }, savedAt: 1 };

describe("AC 66: the report outbox on this phone", () => {
  it("keeps reports by key, replaces a resave, removes a sent one and counts by site", () => {
    const store = storage();
    expect(addToOutbox(store, entry)).toBe(true);
    expect(addToOutbox(store, { ...entry, savedAt: 2 })).toBe(true);
    expect(addToOutbox(store, { ...entry, key: "k-2", siteId: "site-a" })).toBe(true);
    const saved = readOutbox(store);
    expect(saved.map((item) => [item.key, item.savedAt])).toEqual([
      ["k-1", 2],
      ["k-2", 1],
    ]);
    expect(waitingFor(saved, "site-b")).toBe(1);
    removeFromOutbox(store, "k-1");
    expect(readOutbox(store).map((item) => item.key)).toEqual(["k-2"]);
  });

  it("drops anything in storage it did not write, and survives blocked storage", () => {
    expect(parseOutbox(null)).toEqual([]);
    expect(parseOutbox("{not json")).toEqual([]);
    expect(parseOutbox(JSON.stringify({ key: "k" }))).toEqual([]);
    const junk = [null, 3, { ...entry, key: "bad key" }, { ...entry, siteId: "a:b" }, { ...entry, body: [] }, { ...entry, body: null }, { ...entry, savedAt: "now" }, entry];
    expect(parseOutbox(JSON.stringify(junk))).toEqual([entry]);
    const blocked = storage(true);
    expect(readOutbox(blocked)).toEqual([]);
    expect(addToOutbox(blocked, entry)).toBe(false);
    removeFromOutbox(blocked, "k-1");
    expect(OUTBOX_KEY).toBe("team-leader:pick-report-outbox");
  });

  it("removes a report once sent or finally refused, and keeps it to retry otherwise", () => {
    expect(afterSend({ ok: true })).toBe("sent");
    for (const code of ["validation_failed", "pick_line_not_found", "site_not_found", "idempotency_key_reused", "payload_too_large", "invalid_json"]) {
      expect(afterSend({ ok: false, code }), code).toBe("drop");
    }
    for (const code of ["transport_failed", "internal_error", "upstream_unavailable"]) {
      expect(afterSend({ ok: false, code }), code).toBe("keep");
    }
  });
});

describe("AC 61 to 66: the pick wording", () => {
  it("counts in words, singular and plural, and names who and when", () => {
    expect(PICKS.notReady(1)).toBe("Not ready · 1 pick issue");
    expect(PICKS.notReady(3)).toBe("Not ready · 3 pick issues");
    expect(PICKS.offlineText(1)).toMatch(/^Last known: 1 pick issue\. /);
    expect(PICKS.offlineText(3)).toMatch(/^Last known: 3 pick issues\. /);
    expect(PICKS.waiting(1)).toBe("1 report waiting to send");
    expect(PICKS.waiting(2)).toBe("2 reports waiting to send");
    expect(PICKS.outboxSent(1)).toBe("1 pick report sent");
    expect(PICKS.outboxSent(2)).toBe("2 pick reports sent");
    expect(PICKS.checkTitle(0)).toBe("Pick check");
    expect(PICKS.checkTitle(1)).toBe("Pick check · 1 issue");
    expect(PICKS.checkTitle(3)).toBe("Pick check · 3 issues");
    expect(PICKS.lastAction("Marked picked", "07:40")).toBe("Last action: marked picked · 07:40");
    expect(PICKS.pickerLastAction("Sam", "Marked picked", "3 Oct, 07:40")).toBe("Sam's last action: marked picked · 3 Oct, 07:40");
    expect(PICKS.asKnownAt("08:02")).toBe("As known at 08:02");
    expect(PICKS.materialsSaved("08:02")).toBe("Materials · last known 08:02");
    expect(PICKS.callPicker("Sam Lee")).toBe("Call Sam Lee");
    expect(PICKS.reportTo("Quayside House", "Sam Lee")).toBe("Quayside House · to Sam Lee, warehouse");
    expect(PICKS.reportTo("Quayside House", null)).toBe("Quayside House");
    expect(PICKS.toPicker("Sam Lee")).toBe("Sam Lee · warehouse picker");
    expect(PICKS.photoAdded("pick.jpg")).toBe("Photo added: pick.jpg. It stays on this phone in the demo.");
    expect(pickReportUrl("site b")).toBe("/api/sites/site%20b/pick-reports");
  });

  it("never calls a substitute or a pick compatible or approved, and the locked button never reads as the go state", () => {
    const texts: string[] = [];
    const collect = (value: unknown) => {
      if (typeof value === "string") texts.push(value);
      else if (typeof value === "function") texts.push(String((value as (...args: unknown[]) => unknown)("2", "x", "y")));
      else if (value && typeof value === "object") Object.values(value).forEach(collect);
    };
    collect(PICKS);
    collect(AUTH);
    expect(texts.length).toBeGreaterThan(60);
    for (const text of texts) expect(text).not.toMatch(/compatible|approved/i);
    expect(PICKS.sendCrew).not.toMatch(/crew can go/i);
    for (const text of [PICKS.crewLocked, PICKS.crewNotClear, PICKS.crewOffline, PICKS.crewTell]) expect(text).not.toMatch(/crew can go/i);
  });
});
