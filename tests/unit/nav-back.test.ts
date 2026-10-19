import { afterEach, describe, expect, it } from "vitest";
import { backTarget, clearNavHistory, noteNavigation, previousScreen, subscribeNavHistory } from "@/ui/nav-history";

afterEach(() => clearNavHistory());

const projects = { href: "/sites", name: "Projects" };

describe("AC 85: back goes where the visit came from", () => {
  it("names the top-level page underneath, and returns to it", () => {
    expect(backTarget(projects, "/map")).toEqual({ href: "/map", name: "Map" });
    expect(backTarget(projects, "/calendar")).toEqual({ href: "/calendar", name: "Calendar" });
    expect(backTarget(projects, "/about-this-demo")).toEqual({ href: "/about-this-demo", name: "Guide" });
    expect(backTarget(projects, "/materials")).toEqual({ href: "/materials", name: "Inventory" });
    expect(backTarget(projects, "/actions")).toEqual({ href: "/actions", name: "Decisions" });
  });

  it("keeps the page's own target when nothing came before, when it is underneath already, or when it can't name the screen", () => {
    expect(backTarget(projects, null)).toEqual(projects);
    expect(backTarget(projects, "/sites?status=shortage")).toEqual(projects);
    const log = { href: "/actions#site-site-b", name: "Decisions" };
    expect(backTarget(log, "/actions")).toEqual(log);
    const site = { href: "/sites/site-b", name: "Quayside House, Levels 3 to 5" };
    expect(backTarget(site, "/sites/site-b/penetrations/pen-b-01")).toEqual(site);
  });

  it("tells a listener when the screen underneath changes", () => {
    let calls = 0;
    const stop = subscribeNavHistory(() => {
      calls += 1;
    });
    expect(previousScreen()).toBeNull();
    noteNavigation("/map", false);
    noteNavigation("/sites/site-a", false);
    expect(previousScreen()).toBe("/map");
    noteNavigation("/sites/site-a", false);
    noteNavigation("/map", true);
    expect(previousScreen()).toBeNull();
    expect(calls).toBe(3);
    stop();
    noteNavigation("/calendar", false);
    expect(calls).toBe(3);
  });
});
