import { describe, expect, it } from "vitest";
import { SITE_FILTER } from "@/ui/messages";
import { feedSites, filterSites, isFiltered, parseQuery, parseReadiness, parseSiteFilters, readinessOf, READINESS_FILTERS, SEARCH_MAX } from "@/ui/site-filters";

// The projects list's filter (AC 72, 73), after qantum-stock's work-package list: readiness and search, in the URL.

function site(id: string, name: string, reference: string, address: string, crewStatus: string) {
  return { id, name, reference, address, crewStatus };
}

const SITES = [
  site("site-a", "Cedar Court, Block A", "CC-A2", "12 Quay Road", "clear"),
  site("site-b", "Quayside House, Levels 3 to 5", "QH-345", "4 Dock Street", "blocked"),
  site("site-c", "Northgate Depot, Phase 2", "ND-P2", "88 Mill Road", "blocked"),
  site("site-d", "Foundry Lane Annex", "FL-1", "3 Foundry Lane", "nothing_planned"),
  site("site-e", "Harbour Yard", "HY-9", "1 Wharf Street", "unavailable"),
];

function ids(list: readonly { id: string }[]): string[] {
  return list.map((item) => item.id);
}

describe("AC 72: the readiness filter", () => {
  it("offers All statuses, Ready, Shortage and Unknown, in that order", () => {
    expect(READINESS_FILTERS).toEqual(["all", "ready", "shortage", "unknown"]);
    expect(READINESS_FILTERS.map((filter) => SITE_FILTER.options[filter])).toEqual(["All statuses", "Ready", "Shortage", "Unknown"]);
  });

  it("reads the status from the URL in any case; missing, unknown, empty or repeated is All statuses", () => {
    expect(parseReadiness("ready")).toBe("ready");
    expect(parseReadiness("SHORTAGE")).toBe("shortage");
    expect(parseReadiness(" unknown ")).toBe("unknown");
    expect(parseReadiness("all")).toBe("all");
    for (const value of [undefined, "", "nope", "clear", "blocked", ["ready", "shortage"], ["ready"]]) {
      expect(parseReadiness(value), JSON.stringify(value)).toBe("all");
    }
  });

  it("puts crew can go under Ready, blocked under Shortage, and nothing planned, can't check and anything else under Unknown", () => {
    expect(readinessOf("clear")).toBe("ready");
    expect(readinessOf("blocked")).toBe("shortage");
    expect(readinessOf("nothing_planned")).toBe("unknown");
    expect(readinessOf("unavailable")).toBe("unknown");
    // Fail closed: a status the app doesn't know is never Ready.
    expect(readinessOf("ready")).toBe("unknown");
    expect(readinessOf("")).toBe("unknown");
  });

  it("keeps only the projects under the chosen readiness, and every project under All statuses", () => {
    expect(ids(filterSites(SITES, { status: "all", query: "" }))).toEqual(["site-a", "site-b", "site-c", "site-d", "site-e"]);
    expect(ids(filterSites(SITES, { status: "ready", query: "" }))).toEqual(["site-a"]);
    expect(ids(filterSites(SITES, { status: "shortage", query: "" }))).toEqual(["site-b", "site-c"]);
    expect(ids(filterSites(SITES, { status: "unknown", query: "" }))).toEqual(["site-d", "site-e"]);
  });
});

describe("AC 73: search, and the words around the filter", () => {
  it("reads the search trimmed and at most 100 characters; missing or repeated is no search", () => {
    expect(parseQuery("  quay  ")).toBe("quay");
    expect(parseQuery("x".repeat(SEARCH_MAX + 20))).toHaveLength(SEARCH_MAX);
    expect(SEARCH_MAX).toBe(100);
    for (const value of [undefined, "", "   ", ["quay", "dock"]]) expect(parseQuery(value), JSON.stringify(value)).toBe("");
    expect(parseSiteFilters({ q: " Cedar ", status: "READY" })).toEqual({ query: "Cedar", status: "ready" });
    expect(parseSiteFilters({})).toEqual({ query: "", status: "all" });
  });

  it("matches the name, the job ref or the address, in any case", () => {
    expect(ids(filterSites(SITES, { status: "all", query: "quayside" }))).toEqual(["site-b"]);
    expect(ids(filterSites(SITES, { status: "all", query: "cc-a2" }))).toEqual(["site-a"]);
    expect(ids(filterSites(SITES, { status: "all", query: "MILL ROAD" }))).toEqual(["site-c"]);
    // "Quay" is in a name and an address.
    expect(ids(filterSites(SITES, { status: "all", query: "quay" }))).toEqual(["site-a", "site-b"]);
    expect(ids(filterSites(SITES, { status: "all", query: "zzz" }))).toEqual([]);
    // A project without an address upstream is still found by its name, and never by an address it doesn't have.
    const noAddress = [{ id: "site-x", name: "Wharf Shed", reference: "WS-1", crewStatus: "clear" }];
    expect(ids(filterSites(noAddress, { status: "all", query: "wharf" }))).toEqual(["site-x"]);
    expect(ids(filterSites(noAddress, { status: "all", query: "road" }))).toEqual([]);
  });

  it("combines search and readiness, and knows when a filter is on", () => {
    expect(ids(filterSites(SITES, { status: "shortage", query: "quay" }))).toEqual(["site-b"]);
    expect(ids(filterSites(SITES, { status: "ready", query: "dock" }))).toEqual([]);
    expect(isFiltered({ status: "all", query: "" })).toBe(false);
    expect(isFiltered({ status: "unknown", query: "" })).toBe(true);
    expect(isFiltered({ status: "all", query: "quay" })).toBe(true);
  });

  it("counts what is shown against every project, and says when nothing matches", () => {
    expect(SITE_FILTER.count(1, 4)).toBe("1 of 4 projects");
    expect(SITE_FILTER.count(0, 1)).toBe("0 of 1 project");
    expect(SITE_FILTER.noMatch).toBe("No projects match these filters.");
    expect([SITE_FILTER.label, SITE_FILTER.search, SITE_FILTER.searchPlaceholder, SITE_FILTER.readiness, SITE_FILTER.apply, SITE_FILTER.reset]).toEqual([
      "Filter projects",
      "Search projects",
      "Name, job ref or address",
      "Readiness",
      "Apply",
      "Reset",
    ]);
  });
});

describe("AC 93, AC 95: the list's client side gets only what the filter reads", () => {
  it("keeps the id, name, job ref, address and status, and nothing else", () => {
    const site = { id: "site-a", name: "Cedar Court", reference: "CC-A2", address: "12 Quay Road", crewStatus: "clear", operator: { name: "Mere", phone: "+44 7700 900156" } };
    expect(feedSites([site])).toEqual([{ id: "site-a", name: "Cedar Court", reference: "CC-A2", address: "12 Quay Road", crewStatus: "clear" }]);
  });
});
