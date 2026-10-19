import { describe, expect, it } from "vitest";
import { ENTRY_KEY, entryRedirect } from "@/ui/entry";
import { NAV_ITEMS } from "@/ui/nav-section";

describe("AC 84: a visit opened on the projects list starts on the first tab", () => {
  it("sends the first page of a visit from /sites to the tab bar's first entry, Map", () => {
    expect(NAV_ITEMS[0]?.href).toBe("/map");
    expect(entryRedirect("/sites", "", false)).toBe("/map");
    expect(ENTRY_KEY).toBe("team-leader:entered");
  });

  it("leaves a visit already under way, a filtered link and every other page where they are", () => {
    expect(entryRedirect("/sites", "", true)).toBeNull();
    expect(entryRedirect("/sites", "?status=shortage", false)).toBeNull();
    for (const path of ["/map", "/calendar", "/about-this-demo", "/sites/site-a", "/materials"]) expect(entryRedirect(path, "", false), path).toBeNull();
  });
});
