import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mapboxPublicToken, mapboxTokenForBuild } from "@/server/mapbox";

// AC 76: the Mapbox token is public or absent. A secret token stops the build instead of reaching the browser.

afterEach(() => vi.unstubAllEnvs());

describe("AC 76: the Mapbox token at build and at request time", () => {
  it("fails the build on a secret token, keeps a public one, and gives no map for anything else", () => {
    expect(() => mapboxTokenForBuild("sk.abc")).toThrow(/secret Mapbox token \(sk\.\)/);
    expect(() => mapboxTokenForBuild("  sk.abc ")).toThrow(/public token \(pk\.\)/);
    expect(mapboxTokenForBuild("pk.abc")).toBe("pk.abc");
    for (const value of [undefined, "", "tk.abc", "pk."]) expect(mapboxTokenForBuild(value)).toBe("");
  });

  it("next.config.ts passes the build-time token through that check, under a name that is not NEXT_PUBLIC_", () => {
    const config = readFileSync("next.config.ts", "utf8");
    expect(config).toContain("MAPBOX_PUBLIC_TOKEN: mapboxTokenForBuild(process.env.MAPBOX_PUBLIC_TOKEN)");
    expect(config).not.toMatch(/NEXT_PUBLIC_MAPBOX/);
  });

  it("hands the page the public token, or an empty one for no map", () => {
    vi.stubEnv("MAPBOX_PUBLIC_TOKEN", "pk.page");
    expect(mapboxPublicToken()).toBe("pk.page");
    vi.stubEnv("MAPBOX_PUBLIC_TOKEN", "sk.page");
    expect(mapboxPublicToken()).toBe("");
    vi.stubEnv("MAPBOX_PUBLIC_TOKEN", "");
    expect(mapboxPublicToken()).toBe("");
  });
});
