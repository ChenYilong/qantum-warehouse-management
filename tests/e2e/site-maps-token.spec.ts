import { expect, test } from "@playwright/test";
import { answerMapbox, E2E_MAPBOX_TOKEN } from "./mapbox-fake";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// On the maps server, started with a (fake) public Mapbox token. Every Mapbox request is answered here (AC 74 to 76).

const HERE = { latitude: -36.8615, longitude: 174.769 };
test.use({ geolocation: HERE, permissions: ["geolocation"] });

const IDS = ["site-a", "site-b", "site-c", "site-d"] as const;

test("AC 74: each project has its map with a pin, and a tap on the map opens the directions", async ({ page }) => {
  await answerMapbox(page);
  await page.addInitScript(() => {
    const opened: string[] = [];
    (window as unknown as { opened: string[] }).opened = opened;
    window.open = ((url?: string | URL) => {
      opened.push(String(url));
      return null;
    }) as typeof window.open;
  });
  await gotoApp(page, "/sites");
  await expect(page.locator("[data-map]")).toHaveCount(4);
  for (const id of IDS) {
    const map = page.locator(`[data-map="${id}"]`);
    await map.scrollIntoViewIfNeeded();
    await expect(map, id).toHaveAttribute("data-map-state", "ready");
    await expect(map.locator("canvas"), id).toHaveCount(1);
    await expect(map.locator(".mapboxgl-marker"), id).toHaveCount(1);
  }
  await page.locator('[data-map="site-b"]').click({ position: { x: 40, y: 40 } });
  expect(await page.evaluate(() => (window as unknown as { opened: string[] }).opened)).toEqual([
    "https://www.google.com/maps/dir/?api=1&destination=-36.841%2C174.7571&travelmode=driving",
  ]);
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);
});

test("AC 75, AC 76: one driving-matrix request with the public token gives each project its drive; offline, the straight line", async ({ page }) => {
  const matrix = await answerMapbox(page);
  await gotoApp(page, "/sites");
  const drives = ["2.3 km · 7 min drive", "3.1 km · 9 min drive", "16.8 km · 21 min drive", "7.4 km · 13 min drive"];
  for (const [index, id] of IDS.entries()) await expect(page.locator(`[data-travel="${id}"]`), id).toHaveText(drives[index]!);
  expect(matrix).toHaveLength(1);
  const asked = new URL(matrix[0]!);
  expect(asked.pathname).toBe("/directions-matrix/v1/mapbox/driving/174.769,-36.8615;174.7676,-36.8443;174.7571,-36.841;174.702,-36.7309;174.786,-36.9228");
  expect(asked.searchParams.get("sources")).toBe("0");
  expect(asked.searchParams.get("destinations")).toBe("1;2;3;4");
  expect(asked.searchParams.get("annotations")).toBe("distance,duration");
  expect(asked.searchParams.get("access_token")).toBe(E2E_MAPBOX_TOKEN);

  // Working offline nothing goes to Mapbox: each project gets the straight line and no drive time.
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "offline");
  await expect(page.locator('[data-travel="site-a"]')).toHaveText("1.9 km in a straight line · no drive time");
  expect(matrix).toHaveLength(1);
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "online");
  await expect(page.locator('[data-travel="site-a"]')).toHaveText("2.3 km · 7 min drive");
});
