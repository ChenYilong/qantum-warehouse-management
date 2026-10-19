import { expect, test } from "@playwright/test";
import { answerMapbox, E2E_MAPBOX_TOKEN } from "./mapbox-fake";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// On the maps server, started with a (fake) public Mapbox token. Every Mapbox request is answered here (AC 74 to 76).

const HERE = { latitude: -36.8615, longitude: 174.769 };
test.use({ geolocation: HERE, permissions: ["geolocation"] });

const IDS = ["site-a", "site-b", "site-c", "site-d"] as const;

test("AC 74: each project has its map with a pin, and a tap on the map opens the directions", async ({ page }) => {
  await answerMapbox(page);
  // The directions open in a new tab; answer Google here too, so the test never leaves the machine.
  await page.context().route("https://www.google.com/**", (route) => route.fulfill({ contentType: "text/plain", body: "directions" }));
  await gotoApp(page, "/sites");
  await expect(page.locator("[data-map]")).toHaveCount(4);
  for (const id of IDS) {
    const map = page.locator(`[data-map="${id}"]`);
    await map.scrollIntoViewIfNeeded();
    await expect(map, id).toHaveAttribute("data-map-state", "ready");
    await expect(map.locator("canvas"), id).toHaveCount(1);
    await expect(map.locator(".mapboxgl-marker"), id).toHaveCount(1);
  }
  // A tap on the map is a tap on the link laid over it; keyboards and screen readers skip it for Directions.
  const overlay = page.locator('[data-map="site-b"] [data-map-link]');
  await expect(overlay).toHaveAttribute("tabindex", "-1");
  await expect(overlay).toHaveAttribute("aria-hidden", "true");
  const [directions] = await Promise.all([page.waitForEvent("popup"), page.locator('[data-map="site-b"]').click({ position: { x: 40, y: 40 } })]);
  expect(directions.url()).toBe("https://www.google.com/maps/dir/?api=1&destination=-36.841%2C174.7571&travelmode=driving");
  await directions.close();
  // Mapbox's credits stay above the link, so their own links still work.
  const credits = page.locator('[data-map="site-b"] .mapboxgl-ctrl-logo');
  await expect(credits).toBeVisible();
  const creditsOnTop = await credits.evaluate((logo) => {
    const box = logo.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return hit !== null && logo.contains(hit);
  });
  expect(creditsOnTop).toBe(true);
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);
});

test("AC 74: each project's map sits under its name and above its signal, exactly as wide as the signal", async ({ page }) => {
  await answerMapbox(page);
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await gotoApp(page, "/sites");
    for (const id of IDS) {
      const where = `${id} at ${width}px`;
      const map = page.locator(`[data-map="${id}"]`);
      const signal = page.getByRole("listitem").filter({ has: map }).locator("[data-signal]");
      await map.scrollIntoViewIfNeeded();
      await expect(map, where).toHaveAttribute("data-map-state", "ready");
      const [name, strip, box] = await Promise.all([page.locator(`#site-card-${id}`).boundingBox(), map.boundingBox(), signal.boundingBox()]);
      if (!name || !strip || !box) throw new Error(`${where}: name, map or signal is not on the page`);
      // In that order down the card: the name, the map, the signal.
      expect(name.y + name.height, where).toBeLessThanOrEqual(strip.y + 0.5);
      expect(strip.y + strip.height, where).toBeLessThanOrEqual(box.y + 0.5);
      // The same left edge and the same width as the signal under it.
      expect(Math.abs(strip.x - box.x), where).toBeLessThanOrEqual(0.5);
      expect(Math.abs(strip.width - box.width), where).toBeLessThanOrEqual(0.5);
    }
  }
  await assertNoOverflow(page);
});

const DRIVES = ["2.3 km · 7 min drive", "3.1 km · 9 min drive", "16.8 km · 21 min drive", "7.4 km · 13 min drive"];
const FROM_PHONE = "/directions-matrix/v1/mapbox/driving/174.769,-36.8615;174.7676,-36.8443;174.7571,-36.841;174.702,-36.7309;174.786,-36.9228";
const FROM_DEFAULT = "/directions-matrix/v1/mapbox/driving/174.7661,-36.8643;174.7676,-36.8443;174.7571,-36.841;174.702,-36.7309;174.786,-36.9228";

test.describe("before the phone shares where it is", () => {
  test.use({ permissions: [] });

  test("AC 75: one request from 5 Arawa Street gives each project its drive, until the phone's location replaces it", async ({ page }) => {
    const matrix = await answerMapbox(page);
    await gotoApp(page, "/sites");
    for (const [index, id] of IDS.entries()) await expect(page.locator(`[data-travel="${id}"]`), id).toHaveText(`${DRIVES[index]!} from 5 Arawa Street`);
    expect(matrix.map((url) => new URL(url).pathname)).toEqual([FROM_DEFAULT]);
    await expect(page.getByRole("button", { name: "Use my location" })).toBeVisible();
    // The phone shares where it is: its own drive replaces the default, without the address.
    await page.context().grantPermissions(["geolocation"]);
    await page.getByRole("button", { name: "Use my location" }).click();
    for (const [index, id] of IDS.entries()) await expect(page.locator(`[data-travel="${id}"]`), id).toHaveText(DRIVES[index]!);
    expect(matrix.map((url) => new URL(url).pathname)).toEqual([FROM_DEFAULT, FROM_PHONE]);
    await expect(page.getByRole("button", { name: "Update my location" })).toBeVisible();
    await expect(page.locator("[data-travel-note]")).toHaveText("Distances are from where this phone is. Only Mapbox sees its location, to work out the drive.");
  });
});

test("AC 75, AC 76: one driving-matrix request from the phone, with the public token, gives each project its drive; offline, the straight line", async ({ page }) => {
  const matrix = await answerMapbox(page);
  await gotoApp(page, "/sites");
  for (const [index, id] of IDS.entries()) await expect(page.locator(`[data-travel="${id}"]`), id).toHaveText(DRIVES[index]!);
  // The phone already allows its location, so the page finds it at once; a request from the default it started first
  // may have gone out before the fix came in, and is never shown once the phone's answer is in.
  const paths = matrix.map((url) => new URL(url).pathname);
  expect(paths.filter((path) => path === FROM_PHONE)).toHaveLength(1);
  expect(paths.filter((path) => path !== FROM_PHONE && path !== FROM_DEFAULT)).toEqual([]);
  expect(paths.at(-1)).toBe(FROM_PHONE);
  const asked = new URL(matrix.at(-1)!);
  expect(asked.searchParams.get("sources")).toBe("0");
  expect(asked.searchParams.get("destinations")).toBe("1;2;3;4");
  expect(asked.searchParams.get("annotations")).toBe("distance,duration");
  expect(asked.searchParams.get("access_token")).toBe(E2E_MAPBOX_TOKEN);

  // Working offline nothing goes to Mapbox: each project gets the straight line and no drive time.
  const askedBefore = matrix.length;
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "offline");
  await expect(page.locator('[data-travel="site-a"]')).toHaveText("1.9 km in a straight line · no drive time");
  expect(matrix).toHaveLength(askedBefore);
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "online");
  await expect(page.locator('[data-travel="site-a"]')).toHaveText("2.3 km · 7 min drive");
});
