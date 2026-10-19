import { afterEach, describe, expect, it } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getSites } from "@/app/api/sites/route";
import { SiteSchema } from "@/ports";
import { setDependenciesForTests } from "@/server/deps";
import { readResponse, testDependencies } from "./support";

afterEach(() => {
  setDependenciesForTests(null);
});

describe("AC 48: the Online switch's health check", () => {
  it("answers ok with the stock feed's time, and is never cached", async () => {
    setDependenciesForTests(testDependencies());
    const response = await readResponse(await getHealth());
    expect(response.status).toBe(200);
    expect(response.cache).toBe("no-store");
    expect(response.body).toEqual({ status: "ok", stockAsOf: "2026-10-03T08:00:00Z" });
  });

  it("still answers ok when the stock feed is down or junk, with no time rather than a made-up one", async () => {
    for (const stock of ["down", "malformed"] as const) {
      setDependenciesForTests(testDependencies({ stock }));
      const response = await readResponse(await getHealth());
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ok", stockAsOf: null });
    }
  });
});

describe("AC 49: sites carry who to call", () => {
  it("lists each sample site's operator and picker, and Northgate's one person does both", async () => {
    setDependenciesForTests(testDependencies());
    const { body } = await readResponse(await getSites());
    const sites = body.sites as { id: string; operator?: { name: string; phone: string }; picker?: { name: string; phone: string } }[];
    expect(sites.map((site) => [site.id, site.operator?.name, site.picker?.name])).toEqual([
      ["site-a", "Mere Tane", "Sam Lee"],
      ["site-b", "Wiremu Ngata", "Sam Lee"],
      ["site-c", "Tama Rewi", "Tama Rewi"],
      ["site-d", "Mere Tane", "Sam Lee"],
    ]);
    // Ofcom's drama range: dialling a sample number reaches no one.
    for (const site of sites) expect(site.operator?.phone).toMatch(/^\+44 7700 900\d{3}$/);
  });

  it("rejects a contact without a name or with a number that is not international digits", () => {
    const site = { id: "s", name: "S", reference: "R" };
    expect(SiteSchema.safeParse({ ...site, operator: { name: "A", phone: "+44 7700 900156" } }).success).toBe(true);
    expect(SiteSchema.safeParse(site).success).toBe(true);
    for (const operator of [
      { name: " ", phone: "+44 7700 900156" },
      { name: "A", phone: "07700 900156" },
      { name: "A", phone: "+44 7700 900156; call me" },
      { name: "A", phone: "+4" },
    ]) {
      expect(SiteSchema.safeParse({ ...site, operator }).success).toBe(false);
    }
  });
});
