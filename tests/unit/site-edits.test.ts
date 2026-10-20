import { describe, expect, it } from "vitest";
import { deadlineOf } from "@/ui/deadline";
import {
  effectiveDate,
  effectiveOperator,
  operatorCandidates,
  parseSiteEdits,
  readSiteEdits,
  sameContact,
  SITE_EDITS,
  SITE_EDITS_KEY,
  withDeadline,
  withEditedDeadlines,
  withOperator,
  writeSiteEdits,
  type EditStorage,
} from "@/ui/site-edits";

const mere = { name: "Mere Tane", phone: "+44 7700 900156" };
const sam = { name: "Sam Lee", phone: "+44 7700 900157" };
const wiremu = { name: "Wiremu Ngata", phone: "+44 7700 900158" };
const tama = { name: "Tama Rewi", phone: "+44 7700 900159" };

function memory(initial: string | null = null): EditStorage & { value: string | null } {
  const store = {
    value: initial,
    getItem: (key: string) => (key === SITE_EDITS_KEY ? store.value : null),
    setItem: (key: string, value: string) => {
      if (key === SITE_EDITS_KEY) store.value = value;
    },
  };
  return store;
}

describe("AC 86, AC 87: a schedule change is kept on this device and read before the sample data", () => {
  it("reads nothing from no value, junk, an array or a non-object", () => {
    expect(parseSiteEdits(null)).toEqual({});
    expect(parseSiteEdits("")).toEqual({});
    expect(parseSiteEdits("{not json")).toEqual({});
    expect(parseSiteEdits("[1,2]")).toEqual({});
    expect(parseSiteEdits("42")).toEqual({});
    expect(parseSiteEdits("null")).toEqual({});
  });

  it("keeps a real date and a well-formed operator, and drops everything else", () => {
    const raw = JSON.stringify({
      "site-a": { date: "2026-10-30", operator: { name: "  Wiremu Ngata ", phone: "+44 7700 900158" } },
      "site-b": { date: "2026-02-30" },
      "site-c": { date: "30/10/2026", operator: { name: "Tama", phone: "07700 900159" } },
      "site-d": { operator: { name: "", phone: "+44 7700 900156" } },
      "site-e": { operator: { name: "x".repeat(81), phone: "+44 7700 900156" } },
      "site-f": { operator: { name: 7, phone: "+44 7700 900156" } },
      "site-g": { operator: "Mere" },
      "site-h": null,
      "site-i": { date: 20261030 },
      "bad:id": { date: "2026-10-30" },
      "site-j": { operator: tama },
    });
    expect(parseSiteEdits(raw)).toEqual({
      "site-a": { date: "2026-10-30", operator: wiremu },
      "site-j": { operator: tama },
    });
  });

  it("reads and writes through the browser's storage, and survives a storage that refuses", () => {
    expect(readSiteEdits(null)).toEqual({});
    expect(writeSiteEdits(null, {})).toBe(false);
    const store = memory();
    expect(writeSiteEdits(store, withDeadline({}, "site-a", "2026-10-30"))).toBe(true);
    expect(readSiteEdits(store)).toEqual({ "site-a": { date: "2026-10-30" } });
    const broken: EditStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(readSiteEdits(broken)).toEqual({});
    expect(writeSiteEdits(broken, {})).toBe(false);
  });

  it("a new deadline and a new operator sit side by side, and replace only their own field", () => {
    const one = withDeadline({}, "site-a", "2026-10-30");
    const two = withOperator(one, "site-a", { ...wiremu, extra: "dropped" } as typeof wiremu);
    expect(two).toEqual({ "site-a": { date: "2026-10-30", operator: wiremu } });
    expect(withDeadline(two, "site-a", "2026-11-02")).toEqual({ "site-a": { date: "2026-11-02", operator: wiremu } });
    expect(one).toEqual({ "site-a": { date: "2026-10-30" } });
  });

  it("this device's change comes first, then the sample data's value", () => {
    const edits = withOperator(withDeadline({}, "site-a", "2026-10-30"), "site-b", sam);
    expect(effectiveDate(edits, "site-a", "2026-10-23")).toBe("2026-10-30");
    expect(effectiveDate(edits, "site-b", "2026-10-27")).toBe("2026-10-27");
    expect(effectiveDate({}, "site-c", undefined)).toBeUndefined();
    expect(effectiveOperator(edits, "site-b", wiremu)).toEqual(sam);
    expect(effectiveOperator(edits, "site-a", mere)).toEqual(mere);
    expect(effectiveOperator({}, "site-a", undefined)).toBeUndefined();
  });

  it("the calendar puts a moved deadline on its new date and leaves the rest", () => {
    const projects = [
      { id: "site-a", deadline: deadlineOf("2026-10-23") },
      { id: "site-b", deadline: deadlineOf("2026-10-27") },
    ];
    const moved = withEditedDeadlines(projects, withOperator(withDeadline({}, "site-a", "2026-11-20"), "site-b", sam));
    expect(moved[0]?.deadline).toEqual({ iso: "2026-11-20", text: "Fri 20 Nov 2026" });
    expect(moved[1]).toBe(projects[1]);
  });
});

describe("AC 87: who the operator can be changed to", () => {
  it("one person is the same name and the same number, however it is spaced", () => {
    expect(sameContact(mere, { name: "Mere Tane", phone: "+447700900156" })).toBe(true);
    expect(sameContact(mere, { name: "Mere Tane", phone: "+44 7700 900157" })).toBe(false);
    expect(sameContact(mere, { ...mere, name: "Mere" })).toBe(false);
    expect(sameContact(mere, undefined)).toBe(false);
    expect(sameContact(undefined, undefined)).toBe(true);
  });

  it("every operator and picker once, in first-seen order, the current operator first", () => {
    const sites = [
      { operator: mere, picker: sam },
      { operator: wiremu, picker: sam },
      { operator: tama, picker: tama },
      { operator: mere, picker: { ...sam, phone: "+447700900157" } },
      {},
    ];
    expect(operatorCandidates(sites)).toEqual([mere, sam, wiremu, tama]);
    const stranger = { name: "Aroha Kerr", phone: "+44 7700 900160" };
    expect(operatorCandidates(sites, stranger)).toEqual([stranger, mere, sam, wiremu, tama]);
  });

  it("says what changed, in English, and that it stays on this device", () => {
    expect(SITE_EDITS.deadlineUpdated("Cedar Court, Block A", "Fri 30 Oct 2026")).toBe("Cedar Court, Block A: deadline updated to Fri 30 Oct 2026.");
    expect(SITE_EDITS.operatorUpdated("Cedar Court, Block A", "Wiremu Ngata")).toBe("You've updated the operator for Cedar Court, Block A to Wiremu Ngata.");
    expect(SITE_EDITS.savedHere).toBe("Saved on this device only.");
  });
});
