import { afterEach, describe, expect, it } from "vitest";
import { GET as getSites } from "@/app/api/sites/route";
import { SitesFileSchema } from "@/ports/schemas";
import { setDependenciesForTests } from "@/server/deps";
import { validLocation } from "@/ui/travel";
import sitesFile from "../../data/sample/sites.json";
import { readResponse, testDependencies } from "./support";

// AC 74: the sites API carries each site's location for its map, an additive field.

afterEach(() => setDependenciesForTests(null));

describe("AC 74: GET /api/sites carries each site's location", () => {
  it("gives every sample site a valid point", async () => {
    setDependenciesForTests(testDependencies());
    const listed = await readResponse(await getSites());
    expect(listed.status).toBe(200);
    const sites = listed.body.sites as { id: string; location?: unknown }[];
    expect(sites).toHaveLength(4);
    for (const site of sites) expect(validLocation(site.location), site.id).not.toBeNull();
  });

  it("is strict on the structure and lenient on the values, like every upstream field", () => {
    const base = SitesFileSchema.parse(sitesFile).sites[0]!;
    const { location, ...withoutLocation } = base;
    expect(location).toBeDefined();
    // No location is allowed: that site just has no map.
    expect(SitesFileSchema.parse({ sites: [withoutLocation] }).sites[0]?.location).toBeUndefined();
    // A wrong shape rejects the response, as any wrong type does.
    for (const bad of [{ lat: "-36.8", lng: 174.7 }, { lat: -36.8 }, "-36.8,174.7"]) {
      expect(SitesFileSchema.safeParse({ sites: [{ ...withoutLocation, location: bad }] }).success, JSON.stringify(bad)).toBe(false);
    }
    // A number out of range passes the schema; the map then treats it as no location.
    const outOfRange = SitesFileSchema.parse({ sites: [{ ...withoutLocation, location: { lat: 123, lng: 174.7 } }] }).sites[0]?.location;
    expect(outOfRange).toEqual({ lat: 123, lng: 174.7 });
    expect(validLocation(outOfRange)).toBeNull();
  });
});
