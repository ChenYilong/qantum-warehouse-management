import { describe, expect, it } from "vitest";
import { contactRoles, readyText, siteAction, smsHref, telHref, type SiteActionInput } from "@/ui/contacts";

const mere = { name: "Mere Tane", phone: "+44 7700 900156" };
const sam = { name: "Sam Lee", phone: "+44 7700 900157" };
const base: SiteActionInput = {
  id: "site-a",
  name: "Riverside Plaza, Block A",
  reference: "RP-A2",
  crewStatus: "clear",
  shortageCount: 0,
  dataProblemCount: 0,
  operator: mere,
};

describe("AC 49: one main action per site card", () => {
  it("a clear site texts or calls its operator, with the shared-stock wording", () => {
    const action = siteAction(base);
    expect(action.kind).toBe("notify");
    if (action.kind !== "notify") return;
    expect(action.operator).toEqual(mere);
    expect(action.callHref).toBe("tel:+447700900156");
    expect(action.textHref.startsWith("sms:+447700900156?&body=")).toBe(true);
    const body = decodeURIComponent(action.textHref.split("body=")[1] ?? "");
    expect(body).toBe(readyText("Riverside Plaza, Block A", "RP-A2"));
    expect(body).toContain("Job ref RP-A2");
    expect(body).toContain("shared, not reserved");
  });

  it("a clear site without an operator offers nothing to press", () => {
    expect(siteAction({ ...base, operator: undefined })).toEqual({ kind: "none" });
  });

  it("a blocked site goes to what needs a decision: shortages first, else its data problems", () => {
    expect(siteAction({ ...base, id: "site-b", crewStatus: "blocked", shortageCount: 2 })).toEqual({
      kind: "decide",
      label: "Sort out shortages",
      href: "/sites/site-b#action-needed",
    });
    expect(siteAction({ ...base, id: "site-c", crewStatus: "blocked", shortageCount: 0, dataProblemCount: 4 })).toEqual({
      kind: "decide",
      label: "Check data problems",
      href: "/sites/site-c?show=data-problems",
    });
  });

  it("nothing planned has no action, and an unavailable or unknown status only offers a retry", () => {
    expect(siteAction({ ...base, crewStatus: "nothing_planned" })).toEqual({ kind: "none" });
    expect(siteAction({ ...base, crewStatus: "unavailable" })).toEqual({ kind: "retry" });
    expect(siteAction({ ...base, crewStatus: "clear-ish" })).toEqual({ kind: "retry" });
  });

  it("phone links keep only the plus and the digits, and the text is encoded", () => {
    expect(telHref("+44 7700 900156")).toBe("tel:+447700900156");
    expect(smsHref("+44 7700 900156", "Go & see")).toBe("sms:+447700900156?&body=Go%20%26%20see");
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
    expect(contactRoles(undefined, undefined)).toEqual([]);
  });
});
