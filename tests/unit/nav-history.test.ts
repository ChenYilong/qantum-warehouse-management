import { beforeEach, describe, expect, it } from "vitest";
import { canGoBack, clearNavHistory, noteNavigation, previousScreen, retractPush, returnsToPrevious } from "@/ui/nav-history";

describe("AC 42: the back control pops the screen underneath", () => {
  beforeEach(() => {
    clearNavHistory();
  });

  it("pops to the material page after a site was opened from it", () => {
    noteNavigation("/materials/MAT-COLLAR-25?from=pen-b-01#site-site-b", false);
    noteNavigation("/sites/site-b?fromMaterial=MAT-COLLAR-25", false);
    expect(returnsToPrevious("/materials/MAT-COLLAR-25#site-site-b")).toBe(true);
    expect(returnsToPrevious("/sites")).toBe(false);
  });

  it("pops to the penetration after the material page was opened from it", () => {
    noteNavigation("/sites/site-b/penetrations/pen-b-01", false);
    noteNavigation("/materials/MAT-COLLAR-25?from=pen-b-01#site-site-b", false);
    expect(returnsToPrevious("/sites/site-b/penetrations/pen-b-01")).toBe(true);
  });

  it("follows the link when the material page was opened directly", () => {
    noteNavigation("/materials/MAT-COLLAR-25?from=pen-b-01", false);
    expect(returnsToPrevious("/sites/site-b/penetrations/pen-b-01")).toBe(false);
  });

  it("pops to a filtered site even though the back link leaves the query off", () => {
    noteNavigation("/sites/site-b?show=shortages", false);
    noteNavigation("/sites/site-b/penetrations/pen-b-01", false);
    expect(returnsToPrevious("/sites/site-b")).toBe(true);
  });

  it("does not pop when the named screen is a different query, or a different path", () => {
    noteNavigation("/sites/site-b?show=shortages", false);
    noteNavigation("/sites/site-b/penetrations/pen-b-01", false);
    expect(returnsToPrevious("/sites/site-b?show=acted")).toBe(false);
    expect(returnsToPrevious("/sites/site-b?show=shortages")).toBe(true);
    expect(returnsToPrevious("/sites")).toBe(false);
  });

  it("ignores a hash, and does not record the same screen twice", () => {
    noteNavigation("/materials/MAT-COLLAR-25?from=pen-b-01#site-site-b", false);
    noteNavigation("/materials/MAT-COLLAR-25?from=pen-b-01", false);
    expect(returnsToPrevious("/materials/MAT-COLLAR-25?from=pen-b-01")).toBe(false);
  });

  it("drops screens above the one a browser back returned to", () => {
    noteNavigation("/sites/site-b", false);
    noteNavigation("/sites/site-b/penetrations/pen-b-01", false);
    noteNavigation("/materials/MAT-COLLAR-25?from=pen-b-01", false);
    noteNavigation("/sites/site-b/penetrations/pen-b-01", true);
    expect(returnsToPrevious("/sites/site-b")).toBe(true);
    expect(returnsToPrevious("/materials/MAT-COLLAR-25?from=pen-b-01")).toBe(false);
  });

  it("forgets the parent when a pop lands on a screen it never recorded", () => {
    noteNavigation("/sites", false);
    noteNavigation("/materials", true);
    expect(returnsToPrevious("/sites")).toBe(false);
  });
});

describe("AC 96: a back the way the browser goes", () => {
  beforeEach(() => clearNavHistory());

  it("can go back only with a screen under this one in the visit", () => {
    expect(canGoBack()).toBe(false);
    noteNavigation("/sites/site-b", false);
    expect(canGoBack()).toBe(false);
    noteNavigation("/sites/site-b/picks/pickup?line=b-sealant", false);
    expect(canGoBack()).toBe(true);
    noteNavigation("/sites/site-b", true);
    expect(canGoBack()).toBe(false);
  });

  it("takes back a push that was really a back, so the screen under it is kept", () => {
    noteNavigation("/map", false);
    noteNavigation("/sites/site-b", false);
    noteNavigation("/sites/site-b/picks/pickup?line=b-sealant", false);
    // Next re-rendered first: the effect recorded the screen the back landed on as a visit.
    noteNavigation("/sites/site-b", false);
    retractPush("/sites/site-b");
    noteNavigation("/sites/site-b", true);
    expect(previousScreen()).toBe("/map");
    // Only the top entry, and only that screen.
    retractPush("/map");
    expect(previousScreen()).toBe("/map");
    clearNavHistory();
    retractPush("/map");
    expect(canGoBack()).toBe(false);
  });
});
