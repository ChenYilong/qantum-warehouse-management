import { expect, test, type Page } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// The list's cards. Today's panel shows one of them again above the list (AC 79), so a locator for a card's parts is scoped here.
const inList = (page: Page) => page.getByRole("list", { name: "Projects" });

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
      await expect(inList(page).locator(`[data-travel="${id}"]`), name).toHaveText(line);
    }
    await expect(page.locator("[data-travel-note]")).toHaveText("Distances are from where this phone is. Only Mapbox sees its location, to work out the drive.");
    await page.getByRole("button", { name: "Update my location" }).click();
    await expect(inList(page).locator('[data-travel="site-a"]')).toHaveText("1.9 km in a straight line · no drive time");
    expect(mapbox).toEqual([]);
    await assertTargets(page);
    await assertNoOverflow(page);
    await assertAxe(page);
  });
});

// From 5 Arawa Street, Grafton, the demo's default start, worked out independently of the app's code.
const FROM_DEFAULT = [
  ["site-a", "2.2 km in a straight line from 5 Arawa Street · no drive time"],
  ["site-b", "2.7 km in a straight line from 5 Arawa Street · no drive time"],
  ["site-c", "15.9 km in a straight line from 5 Arawa Street · no drive time"],
  ["site-d", "6.7 km in a straight line from 5 Arawa Street · no drive time"],
] as const;

test("AC 75: before the phone shares where it is, every project is measured from 5 Arawa Street, and a refused location keeps it", async ({ page }) => {
  await gotoApp(page, "/sites");
  // Nothing asked yet, and every card already says how far it is, from the default.
  await expect(page.locator("[data-travel-note]")).toHaveText(
    "Distances are from 5 Arawa Street, Grafton, Auckland 1023 until you use this phone's location. Only Mapbox sees it, to work out the drive.",
  );
  for (const [id, line] of FROM_DEFAULT) await expect(inList(page).locator(`[data-travel="${id}"]`), id).toHaveText(line);
  await page.context().clearPermissions();
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.locator("[data-travel-note]")).toHaveText(
    /^(Location is off|Can't find where you are right now), so distances are from 5\sArawa Street, Grafton, Auckland 1023\.$/,
  );
  for (const [id, line] of FROM_DEFAULT) await expect(inList(page).locator(`[data-travel="${id}"]`), id).toHaveText(line);
  await expect(page.getByRole("button", { name: "Use my location" })).toBeEnabled();
});
