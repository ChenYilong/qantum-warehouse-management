import { expect, test, type Page } from "@playwright/test";
import { answerMapbox, E2E_MAPBOX_TOKEN } from "./mapbox-fake";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// The list's cards. Today's panel shows one of them again above the list (AC 79), so a locator for a card's parts is scoped here.
const inList = (page: Page) => page.getByRole("list", { name: "Projects" });

// On the maps server, started with a (fake) public Mapbox token. Every Mapbox request is answered here (AC 74 to 76).

const HERE = { latitude: -36.8615, longitude: 174.769 };
test.use({ geolocation: HERE, permissions: ["geolocation"] });

const IDS = ["site-a", "site-b", "site-c", "site-d"] as const;

test("AC 74: each project has its map with a pin, and a tap on the map opens the directions", async ({ page }) => {
  await answerMapbox(page);
  // The directions open in a new tab; answer Google here too, so the test never leaves the machine.
  await page.context().route("https://www.google.com/**", (route) => route.fulfill({ contentType: "text/plain", body: "directions" }));
  await gotoApp(page, "/sites");
  await expect(inList(page).locator("[data-map]")).toHaveCount(4);
  for (const id of IDS) {
    const map = inList(page).locator(`[data-map="${id}"]`);
    await map.scrollIntoViewIfNeeded();
    await expect(map, id).toHaveAttribute("data-map-state", "ready");
    await expect(map.locator("canvas"), id).toHaveCount(1);
    await expect(map.locator(".mapboxgl-marker"), id).toHaveCount(1);
  }
  // A tap on the map is a tap on the link laid over it; keyboards and screen readers skip it for Directions.
  const overlay = inList(page).locator('[data-map="site-b"] [data-map-link]');
  await expect(overlay).toHaveAttribute("tabindex", "-1");
  await expect(overlay).toHaveAttribute("aria-hidden", "true");
  const [directions] = await Promise.all([page.waitForEvent("popup"), inList(page).locator('[data-map="site-b"]').click({ position: { x: 40, y: 40 } })]);
  expect(directions.url()).toBe("https://www.google.com/maps/dir/?api=1&destination=-36.841%2C174.7571&travelmode=driving");
  await directions.close();
  // Mapbox's credits stay above the link, so their own links still work.
  const credits = inList(page).locator('[data-map="site-b"] .mapboxgl-ctrl-logo');
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

test("AC 79: with a token the pins sit on a Mapbox map fitted to the chosen tab, with Mapbox's credits clear of the card under it", async ({ page }) => {
  await answerMapbox(page);
  await gotoApp(page, "/map");
  const map = page.locator("[data-projects-map]");
  await expect(map).toHaveAttribute("data-projects-map", "ready");
  await expect(map.locator("canvas")).toHaveCount(1);
  const room = await map.boundingBox();
  // The map fills its room: a canvas of no height would put every pin and the credits anywhere.
  const canvas = await map.locator("canvas").boundingBox();
  expect(Math.abs((canvas?.height ?? 0) - (room?.height ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((canvas?.width ?? 0) - (room?.width ?? 0))).toBeLessThanOrEqual(1);
  const card = page.getByRole("region", { name: "Selected project" });
  // Measured afresh each time: a tap scrolls the page, and the deadline calendar above the map makes it scroll more.
  const insideMap = async (id: string) => {
    const [dot, box] = [await page.locator(`[data-pin="${id}"] [data-pin-dot]`).boundingBox(), await map.boundingBox()];
    if (!dot || !box) return false;
    return dot.x >= box.x && dot.x + dot.width <= box.x + box.width && dot.y >= box.y && dot.y + dot.height <= box.y + box.height;
  };
  await expect(page.locator("[data-pin]")).toHaveCount(1);
  expect(await insideMap("site-a")).toBe(true);
  // Blocked: the map fits both of its projects, 13 km apart.
  // The map panel's own tabs; the deadline calendar above it has a set of its own (AC 81).
  await page.getByRole("tablist", { name: "Projects by status" }).getByRole("tab", { name: "Blocked 2", exact: true }).click();
  await expect(page.locator("[data-pin]")).toHaveCount(2);
  await expect.poll(async () => (await insideMap("site-b")) && (await insideMap("site-c"))).toBe(true);
  // Mapbox's wordmark, required on every map, is never under the card.
  const logo = await map.locator(".mapboxgl-ctrl-logo").boundingBox();
  const sheet = await card.boundingBox();
  expect((logo?.y ?? Infinity) + (logo?.height ?? 0)).toBeLessThanOrEqual(sheet?.y ?? 0);
  await page.locator('[data-pin="site-c"]').click();
  await expect(card.getByRole("link", { name: "Northgate Depot, Phase 2" }).first()).toBeVisible();
  await expect(page.locator('[data-pin="site-c"]')).toHaveAttribute("aria-pressed", "true");
  await assertTargets(page);
  await assertAxe(page);
});

test("AC 74: each project's map sits under its name and above its signal, exactly as wide as the signal", async ({ page }) => {
  await answerMapbox(page);
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await gotoApp(page, "/sites");
    for (const id of IDS) {
      const where = `${id} at ${width}px`;
      const map = inList(page).locator(`[data-map="${id}"]`);
      const signal = page.getByRole("listitem").filter({ has: page.locator(`[data-map="${id}"]`) }).locator("[data-signal]");
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

  test("AC 75: one request from Auckland city warehouse gives each project its drive, until the phone's location replaces it", async ({ page }) => {
    const matrix = await answerMapbox(page);
    await gotoApp(page, "/sites");
    for (const [index, id] of IDS.entries()) await expect(inList(page).locator(`[data-travel="${id}"]`), id).toHaveText(`${DRIVES[index]!} from Auckland city warehouse`);
    expect(matrix.map((url) => new URL(url).pathname)).toEqual([FROM_DEFAULT]);
    await expect(page.getByRole("button", { name: "Use my location" })).toBeVisible();
    // The phone shares where it is: its own drive replaces the default, without the address.
    await page.context().grantPermissions(["geolocation"]);
    await page.getByRole("button", { name: "Use my location" }).click();
    for (const [index, id] of IDS.entries()) await expect(inList(page).locator(`[data-travel="${id}"]`), id).toHaveText(DRIVES[index]!);
    expect(matrix.map((url) => new URL(url).pathname)).toEqual([FROM_DEFAULT, FROM_PHONE]);
    await expect(page.getByRole("button", { name: "Update my location" })).toBeVisible();
    await expect(page.locator("[data-travel-note]")).toHaveText("Distances are from where this phone is. Only Mapbox sees its location, to work out the drive.");
  });
});

test("AC 75, AC 76: one driving-matrix request from the phone, with the public token, gives each project its drive; offline, the straight line", async ({ page }) => {
  const matrix = await answerMapbox(page);
  await gotoApp(page, "/sites");
  for (const [index, id] of IDS.entries()) await expect(inList(page).locator(`[data-travel="${id}"]`), id).toHaveText(DRIVES[index]!);
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
  await expect(inList(page).locator('[data-travel="site-a"]')).toHaveText("1.9 km in a straight line · no drive time");
  expect(matrix).toHaveLength(askedBefore);
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "online");
  await expect(inList(page).locator('[data-travel="site-a"]')).toHaveText("2.3 km · 7 min drive");
});
