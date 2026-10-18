import { describe, expect, it } from "vitest";
import { blockedText, contactRoles, holdText, readyText, siteAction, smsHref, telHref, type SiteActionInput } from "@/ui/contacts";

const mere = { name: "Mere Tane", phone: "+44 7700 900156" };
const sam = { name: "Sam Lee", phone: "+44 7700 900157" };
const wiremu = { name: "Wiremu Ngata", phone: "+44 7700 900158" };
const collar = { name: "Pipe collar for 25 mm pipe", kind: "short" as const };
const sealant = { name: "Intumescent sealant, 310 ml cartridge", kind: "short" as const };
const mastic = { name: "Fire mastic tube", kind: "unknown" as const };

const clear: SiteActionInput = {
  id: "site-a",
  name: "Riverside Plaza, Block A",
  reference: "RP-A2",
  crewStatus: "clear",
  shortageCount: 0,
  dataProblemCount: 0,
  operator: mere,
};
const blocked: SiteActionInput = {
  id: "site-b",
  name: "Harbour Point, Levels 3 to 5",
  reference: "HP-345",
  crewStatus: "blocked",
  shortageCount: 2,
  dataProblemCount: 0,
  shortages: [collar, sealant],
  operator: wiremu,
};

function body(href: string): string {
  return decodeURIComponent(href.split("body=")[1] ?? "");
}

describe("AC 49, AC 54: a tap on the signal calls the operator, like Call operator", () => {
  it("a clear site with an operator: go, a tap calls, and the operator can be texted or called", () => {
    const action = siteAction(clear);
    expect(action.signal.tone).toBe("go");
    expect(action.tap).toEqual({ kind: "call", href: "tel:+447700900156", hint: "Tap to call" });
    expect(action.operator).not.toBeNull();
    expect(action.operator?.name).toBe("Mere Tane");
    expect(action.operator?.callHref).toBe("tel:+447700900156");
    expect(action.operator?.textHref.startsWith("sms:+447700900156?&body=")).toBe(true);
    expect(action.tap.kind === "call" && action.tap.href).toBe(action.operator?.callHref);
    expect(action.decide).toBeNull();
    expect(action.short).toEqual({ items: [], more: 0 });
  });

  it("the hint never contains the button names, so the signal's name does not repeat them", () => {
    const hint = siteAction(clear).tap.hint ?? "";
    expect(hint.toLowerCase()).not.toContain("call operator");
    expect(hint.toLowerCase()).not.toContain("text operator");
    expect(hint).not.toContain(clear.name);
  });

  it("a blocked site with an operator: stop, a tap calls the operator, and Sort out shortages stays", () => {
    const action = siteAction(blocked);
    expect(action.signal.tone).toBe("stop");
    expect(action.tap).toEqual({ kind: "call", href: "tel:+447700900158", hint: "Tap to call" });
    expect(action.operator?.callHref).toBe("tel:+447700900158");
    expect(action.decide).toEqual({ label: "Sort out shortages", href: "/sites/site-b#action-needed" });
    expect(action.short).toEqual({ items: ["Pipe collar for 25 mm pipe", "Intumescent sealant, 310 ml cartridge"], more: 0 });
  });

  it("a blocked site with only data problems goes to those, and lists no shortages", () => {
    const action = siteAction({ ...blocked, id: "site-c", shortageCount: 0, dataProblemCount: 4, shortages: [] });
    expect(action.decide).toEqual({ label: "Check data problems", href: "/sites/site-c?show=data-problems" });
    expect(action.short).toEqual({ items: [], more: 0 });
    expect(action.operator).not.toBeNull();
  });

  it("without an operator the signal cannot be tapped and says so, but a blocked site still goes to its decisions", () => {
    expect(siteAction({ ...clear, operator: undefined }).tap).toEqual({ kind: "none", hint: "No operator assigned" });
    expect(siteAction({ ...clear, operator: undefined }).operator).toBeNull();
    const noOne = siteAction({ ...blocked, operator: undefined });
    expect(noOne.tap).toEqual({ kind: "none", hint: "No operator assigned" });
    expect(noOne.operator).toBeNull();
    expect(noOne.decide?.label).toBe("Sort out shortages");
    expect(noOne.signal.tone).toBe("stop");
  });

  it("a site that can't be checked checks again when tapped and never calls", () => {
    for (const crewStatus of ["unavailable", "clear-ish", ""]) {
      const action = siteAction({ ...clear, crewStatus });
      expect(action.signal.tone).toBe("unknown");
      expect(action.tap).toEqual({ kind: "retry", hint: "Tap to check again" });
      expect(action.decide).toBeNull();
    }
  });

  it("nothing planned has nothing to tap, no operator row and no decision link", () => {
    const action = siteAction({ ...clear, crewStatus: "nothing_planned" });
    expect(action.signal.tone).toBe("idle");
    expect(action.tap).toEqual({ kind: "none", hint: null });
    expect(action.operator).toBeNull();
    expect(action.decide).toBeNull();
  });

  it("phone links keep only the plus and the digits, and the text is encoded", () => {
    expect(telHref("+44 7700 900156")).toBe("tel:+447700900156");
    expect(smsHref("+44 7700 900156", "Go & see")).toBe("sms:+447700900156?&body=Go%20%26%20see");
  });
});

describe("AC 55: the text to the operator says what the state is", () => {
  it("a clear site's text keeps the shared-stock wording and says the crew can go", () => {
    const text = body(siteAction(clear).operator?.textHref ?? "");
    expect(text).toBe(readyText("Riverside Plaza, Block A", "RP-A2"));
    expect(text).toBe(
      "Riverside Plaza, Block A, Job ref RP-A2: materials for the planned work are on hand (shared, not reserved). You can go. From your team leader.",
    );
  });

  it("a blocked site's text says the parts are NOT complete, to hold, what is short and that word will follow", () => {
    const text = body(siteAction(blocked).operator?.textHref ?? "");
    expect(text).toBe(blockedText("Harbour Point, Levels 3 to 5", "HP-345", [collar, sealant], 0));
    expect(text).toBe(
      "Harbour Point, Levels 3 to 5, Job ref HP-345: parts are NOT complete. Don't go yet. Short: Pipe collar for 25 mm pipe; Intumescent sealant, 310 ml cartridge. I'll message you when it's sorted. From your team leader.",
    );
    expect(text).not.toMatch(/can go/i);
    expect(text).not.toMatch(/on hand/i);
  });

  it("names three short materials at most and counts the rest", () => {
    const many = ["A", "B", "C", "D", "E"].map((name) => ({ name, kind: "short" as const }));
    expect(blockedText("Site", "R1", many, 0)).toBe(
      "Site, Job ref R1: parts are NOT complete. Don't go yet. Short: A; B; C and 2 more. I'll message you when it's sorted. From your team leader.",
    );
  });

  it("unknown stock is said as unknown, never as a number, and data problems are counted", () => {
    expect(blockedText("Kingsway Works, Phase 2", "KW-P2", [mastic], 4)).toBe(
      "Kingsway Works, Phase 2, Job ref KW-P2: parts are NOT complete. Don't go yet. Short: Fire mastic tube (stock unknown). Also 4 data problems to check. I'll message you when it's sorted. From your team leader.",
    );
    expect(blockedText("Kingsway Works, Phase 2", "KW-P2", [mastic], 1)).toContain("Also 1 data problem to check.");
  });

  it("a site with only data problems says the materials can't be confirmed, and still holds the crew", () => {
    const text = blockedText("Kingsway Works, Phase 2", "KW-P2", [], 4);
    expect(text).toBe(
      "Kingsway Works, Phase 2, Job ref KW-P2: I can't confirm the materials yet. Don't go yet. 4 data problems to check. I'll message you when it's sorted. From your team leader.",
    );
    expect(text).not.toMatch(/can go/i);
  });

  it("a blocked site that names no reason still holds the crew and never says go", () => {
    const action = siteAction({ ...blocked, shortages: undefined, shortageCount: 0, dataProblemCount: 0 });
    expect(action.short).toEqual({ items: [], more: 0 });
    expect(body(action.operator?.textHref ?? "")).toBe(
      "Harbour Point, Levels 3 to 5, Job ref HP-345: I can't confirm the materials yet. Don't go yet. I'll message you when it's sorted. From your team leader.",
    );
    expect(action.decide?.label).toBe("Check data problems");
  });

  it("a site that can't be checked gets a hold text that never says go", () => {
    const text = body(siteAction({ ...clear, crewStatus: "unavailable" }).operator?.textHref ?? "");
    expect(text).toBe(holdText("Riverside Plaza, Block A", "RP-A2"));
    expect(text).toBe("Riverside Plaza, Block A, Job ref RP-A2: I can't check the materials right now. Don't go until I confirm. From your team leader.");
    expect(text).not.toMatch(/can go|you can/i);
  });

  it("every text names the site and its job ref", () => {
    for (const input of [clear, blocked, { ...clear, crewStatus: "unavailable" }]) {
      const text = body(siteAction(input).operator?.textHref ?? "");
      expect(text.startsWith(`${input.name}, Job ref ${input.reference}: `)).toBe(true);
    }
  });
});

describe("AC 49, AC 50: who to call", () => {
  it("one person who picks and installs is listed once", () => {
    expect(contactRoles(mere, { ...mere })).toEqual([{ role: "Picker and operator", contact: mere }]);
  });

  it("otherwise the picker comes first, then the operator, and missing people are left out", () => {
    expect(contactRoles(mere, sam)).toEqual([
      { role: "Picker (warehouse)", contact: sam },
      { role: "Operator", contact: mere },
    ]);
    expect(contactRoles(undefined, sam)).toEqual([{ role: "Picker (warehouse)", contact: sam }]);
    expect(contactRoles(mere, undefined)).toEqual([{ role: "Operator", contact: mere }]);
    expect(contactRoles(undefined, undefined)).toEqual([]);
  });
});
