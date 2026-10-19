import { afterEach, describe, expect, it } from "vitest";
import { GET as getSites } from "@/app/api/sites/route";
import { SitesFileSchema } from "@/ports/schemas";
import { setDependenciesForTests } from "@/server/deps";
import { deadlineOf } from "@/ui/deadline";
import sitesFile from "../../data/sample/sites.json";
import { readResponse, testDependencies } from "./support";

// AC 80: the sites API carries each site's deadline, an additive field.

afterEach(() => setDependenciesForTests(null));

describe("AC 80: GET /api/sites carries each site's deadline", () => {
  it("gives every sample site a real calendar date", async () => {
    setDependenciesForTests(testDependencies());
    const listed = await readResponse(await getSites());
    expect(listed.status).toBe(200);
    const sites = listed.body.sites as { id: string; date?: unknown }[];
    expect(sites.map((site) => [site.id, site.date])).toEqual([
      ["site-a", "2026-10-23"],
      ["site-b", "2026-10-27"],
      ["site-c", "2026-11-03"],
      ["site-d", "2026-11-13"],
    ]);
    for (const site of sites) expect(deadlineOf(site.date), site.id).not.toBeNull();
  });

  it("is strict on the type and lenient on the value, like every upstream field", () => {
    const base = SitesFileSchema.parse(sitesFile).sites[0]!;
    const { date, ...withoutDate } = base;
    expect(date).toBe("2026-10-23");
    // No date is allowed: that project just shows no deadline.
    expect(SitesFileSchema.parse({ sites: [withoutDate] }).sites[0]?.date).toBeUndefined();
    // Anything but a string rejects the response, as any wrong type does.
    for (const bad of [20261023, { year: 2026 }, null]) {
      expect(SitesFileSchema.safeParse({ sites: [{ ...withoutDate, date: bad }] }).success, JSON.stringify(bad)).toBe(false);
    }
    // An impossible date passes the schema; the card then shows no deadline.
    const impossible = SitesFileSchema.parse({ sites: [{ ...withoutDate, date: "2026-02-30" }] }).sites[0]?.date;
    expect(impossible).toBe("2026-02-30");
    expect(deadlineOf(impossible)).toBeNull();
  });
});
