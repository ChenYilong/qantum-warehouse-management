import { expect, test } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Read-only, on the main server, which has no Mapbox token: no map, but Directions and the straight-line distance
// still work (AC 74, 75). The maps themselves are in site-maps-token.spec.ts, on a server with a token.

const HERE = { latitude: -36.8615, longitude: 174.769 };

const PROJECTS = [
  ["Cedar Court, Block A", "site-a", "-36.8443%2C174.7676", "1.9 km in a straight line · no drive time"],
  ["Quayside House, Levels 3 to 5", "site-b", "-36.841%2C174.7571", "2.5 km in a straight line · no drive time"],
  ["Northgate Depot, Phase 2", "site-c", "-36.7309%2C174.702", "15.7 km in a straight line · no drive time"],
  ["Foundry Lane Annex", "site-d", "-36.9228%2C174.786", "7.0 km in a straight line · no drive time"],
] as const;

test.describe("with the phone's location allowed", () => {
  test.use({ geolocation: HERE, permissions: ["geolocation"] });

  test("AC 74, AC 75: without a token there is no map, but Directions and the straight-line distance work", async ({ page }) => {
    const mapbox: string[] = [];
    page.on("request", (request) => {
      if (/mapbox\.com/.test(request.url())) mapbox.push(request.url());
    });
    await gotoApp(page, "/sites");
    await expect(page.locator("[data-map]")).toHaveCount(0);
    for (const [name, id, destination, line] of PROJECTS) {
      const card = page.getByRole("listitem").filter({ hasText: name });
      const directions = card.getByRole("link", { name: "Directions" });
      await expect(directions, name).toHaveAttribute("href", `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`);
      await expect(directions, name).toHaveAttribute("target", "_blank");
      await expect(directions, name).toHaveAccessibleDescription(name);
      // Already allowed, so the page asked by itself; with no token there is no route, so no drive time.
      await expect(page.locator(`[data-travel="${id}"]`), name).toHaveText(line);
    }
    await page.getByRole("button", { name: "Update distance and time" }).click();
    await expect(page.locator('[data-travel="site-a"]')).toHaveText("1.9 km in a straight line · no drive time");
    expect(mapbox).toEqual([]);
    await assertTargets(page);
    await assertNoOverflow(page);
    await assertAxe(page);
  });
});

test("AC 75: nothing is asked or said before the tap, and a refused location says so", async ({ page }) => {
  await gotoApp(page, "/sites");
  await expect(page.getByText("Uses this phone's location once.", { exact: false })).toBeVisible();
  await expect(page.locator("[data-travel]")).toHaveCount(0);
  await page.context().clearPermissions();
  await page.getByRole("button", { name: "Show distance and time" }).click();
  await expect(page.locator('[data-travel="site-a"]')).toHaveText(/^(Location is off, so no distance\.|Can't find where you are right now\.)$/);
  await expect(page.locator("[data-travel]").filter({ hasText: "km" })).toHaveCount(0);
});
