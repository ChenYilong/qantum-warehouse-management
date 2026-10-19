import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { ABOUT_PATH } from "@/ui/format";
import { NAV_ITEMS } from "@/ui/nav-section";

describe("AC 37, AC 47: the menu's entries and the root", () => {
  it("lists Projects, Inventory and Decisions, in that order, for the tab bar at every width", () => {
    expect(NAV_ITEMS.map((item) => [item.section, item.href, item.label])).toEqual([
      ["sites", "/sites", "Projects"],
      ["materials", "/materials", "Inventory"],
      ["actions", "/actions", "Decisions"],
    ]);
  });

  it("AC 47: the root redirects to the About page, temporarily so it can change later", async () => {
    expect(ABOUT_PATH).toBe("/about-this-demo");
    expect(await nextConfig.redirects?.()).toEqual([{ source: "/", destination: ABOUT_PATH, permanent: false }]);
  });
});
