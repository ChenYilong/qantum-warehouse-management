import { expect, test, type Page } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Read-only, on the main server, which has no Mapbox token: today's panel at the top of the projects list (AC 77 to
// 79), after the author's design "I · Verdict + tabs + map (B+D+E)". Without a token the pins sit on a plain panel.

const verdict = (page: Page) => page.locator("[data-verdict]");
const tabs = (page: Page) => page.getByRole("tablist", { name: "Projects by status" }).getByRole("tab");
const tab = (page: Page, name: string) => page.getByRole("tablist", { name: "Projects by status" }).getByRole("tab", { name, exact: true });
const card = (page: Page) => page.getByRole("region", { name: "Selected project" });
const listCard = (page: Page, name: string) => page.getByRole("list", { name: "Projects" }).getByRole("listitem").filter({ hasText: name });
const pins = (page: Page) => page.locator("[data-pin]");
const pin = (page: Page, id: string) => page.locator(`[data-pin="${id}"]`);

/** Each segment of this panel's bar with its opacity: lit at 1, faded below it. The deadline calendar has its own (AC 81). */
async function segments(page: Page): Promise<string[]> {
  return page.locator("[data-verdict] [data-segment]").evaluateAll((items) => items.map((item) => `${item.getAttribute("data-segment")}:${getComputedStyle(item).opacity}`));
}

/** The card's look and build: every element's tag and class, and the box's own style. Ids are left out on purpose. */
async function cardShape(root: ReturnType<Page["locator"]>): Promise<{ build: string; style: string }> {
  return root.evaluate((element) => {
    const build = [element, ...element.querySelectorAll("*")].map((node) => `${node.tagName}.${node.getAttribute("class") ?? ""}`).join("|");
    const style = getComputedStyle(element);
    return {
      build,
      style: [style.backgroundColor, style.borderTopWidth, style.borderTopStyle, style.borderTopColor, style.borderRadius, style.padding, style.gap].join(" "),
    };
  });
}

async function dotWidth(page: Page, id: string): Promise<number> {
  return pin(page, id)
    .locator("[data-pin-dot]")
    .evaluate((dot) => dot.getBoundingClientRect().width);
}

test("AC 77: the Map tab opens with today's verdict: 2 of 3 crews can't go yet, the totals, and a bar of one green and two red", async ({ page }) => {
  await gotoApp(page, "/map");
  // The page's h1 stays first in main, for structure; the verdict leads what you see.
  await expect(page.locator("main > h1")).toHaveText("Map");
  await expect(verdict(page).getByRole("heading", { level: 2 })).toHaveText("2 of 3 crews can't go yet");
  await expect(verdict(page).locator("[data-today-label]")).toHaveText(/^Map · today is (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d{1,2} [A-Z][a-z]+ \d{4}$/);
  await expect(verdict(page).getByText("3 shortages · 4 data problems", { exact: true })).toBeVisible();
  const bar = verdict(page).getByRole("img", { name: "1 can go, 2 blocked" });
  await expect(bar.locator("[data-segment]")).toHaveCount(3);
  expect(await segments(page)).toEqual(["go:1", "blocked:0.5", "blocked:0.5"]);
  // The app's theme, black with white text, whatever the verdict; only the segments are green and red.
  const colours = await verdict(page).evaluate((section) => {
    const style = getComputedStyle(section);
    return { background: style.backgroundColor, text: style.color };
  });
  expect(colours).toEqual({ background: "rgb(0, 0, 0)", text: "rgb(255, 255, 255)" });
  // Full bleed on a phone, as in the design.
  const width = await verdict(page).evaluate((section) => [section.getBoundingClientRect().left, section.getBoundingClientRect().right]);
  expect(width).toEqual([0, 375]);
  // The Map tab holds this panel and nothing else (AC 83): no projects list, no calendar.
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Map", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("list", { name: "Projects" })).toHaveCount(0);
  await expect(page.locator("[data-calendar-panel]")).toHaveCount(0);
  // Only the panel: main holds its h1, the location button at the top (AC 83) and the panel, nothing else.
  await expect(page.locator("main > *")).toHaveCount(3);
  await assertAxe(page);
  await assertTargets(page);
  await assertNoOverflow(page);
});

test("AC 78: four tabs inside the verdict open on Crew can go, and the chosen tab's segments are lit while the others fade", async ({ page }) => {
  await gotoApp(page, "/map");
  await expect(tabs(page)).toHaveText(["All 4", "Blocked 2", "Crew can go 1", "Other 1"]);
  await expect(tab(page, "Crew can go 1")).toHaveAttribute("aria-selected", "true");
  // Inside the panel, right under the bar.
  const bar = await verdict(page).getByRole("img").boundingBox();
  const list = await page.getByRole("tablist", { name: "Projects by status" }).boundingBox();
  const gap = (list?.y ?? 0) - ((bar?.y ?? 0) + (bar?.height ?? 0));
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThan(24);
  expect(await verdict(page).getByRole("tablist").count()).toBe(1);
  await tab(page, "Blocked 2").click();
  await expect(tab(page, "Blocked 2")).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => segments(page)).toEqual(["go:0.5", "blocked:1", "blocked:1"]);
  await tab(page, "Other 1").click();
  await expect.poll(() => segments(page)).toEqual(["go:0.5", "blocked:0.5", "blocked:0.5"]);
  // All: no filter, every segment lit.
  await tab(page, "All 4").click();
  await expect.poll(() => segments(page)).toEqual(["go:1", "blocked:1", "blocked:1"]);
  // A tablist: one tab in the tab order; the arrows, Home and End move and choose, wrapping round.
  await expect(page.getByRole("tablist", { name: "Projects by status" }).locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
  await tab(page, "Other 1").click();
  await tab(page, "Other 1").focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "All 4")).toBeFocused();
  await expect(tab(page, "All 4")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tab(page, "Other 1")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(tab(page, "All 4")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "Other 1")).toBeFocused();
  await expect(tab(page, "Other 1")).toHaveAttribute("aria-selected", "true");
});

test("AC 79: the map shows only the chosen tab's pins, and under it the chosen project's card is the list's own card, as wide as the map", async ({ page }) => {
  // The list's own cards, read on the projects list first (AC 83 puts the panel on a page of its own).
  await gotoApp(page, "/sites");
  const cedarCard = await cardShape(listCard(page, "Cedar Court, Block A").locator(":scope > div"));
  const quaysideCard = await cardShape(listCard(page, "Quayside House, Levels 3 to 5").locator(":scope > div"));
  const cedarTrip = (await listCard(page, "Cedar Court, Block A").locator('[data-travel="site-a"]').textContent()) ?? "";
  await gotoApp(page, "/map");
  // Crew can go: Cedar Court alone, chosen.
  await expect(pins(page)).toHaveCount(1);
  await expect(page.locator("[data-projects-map]").getByRole("button", { name: "Cedar Court, Block A, Crew can go" })).toHaveAttribute("aria-pressed", "true");
  await expect(pin(page, "site-a")).toContainText("Cedar Court");
  await expect(card(page).getByRole("link", { name: "Cedar Court, Block A" }).first()).toHaveAttribute("href", "/sites/site-a");
  await expect(card(page).locator("[data-signal]")).toHaveAttribute("data-signal", "go");
  await expect(card(page).getByText("Operator · Mere Tane")).toBeVisible();
  await expect(card(page).getByRole("link", { name: "Call operator" })).toHaveAttribute("href", "tel:+447700900156");
  // The very card the list shows: the same build and the same look, as wide as the map.
  const top = card(page).locator(":scope > div");
  expect(await cardShape(top)).toEqual(cedarCard);
  await expect(card(page).locator('[data-travel="site-a"]')).toHaveText(cedarTrip);
  const map = await page.locator("[data-projects-map]").boundingBox();
  const box = await top.boundingBox();
  expect(Math.abs((box?.width ?? 0) - (map?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((box?.x ?? 0) - (map?.x ?? 0))).toBeLessThanOrEqual(1);
  // Right under the map.
  expect(Math.abs((box?.y ?? 0) - ((map?.y ?? 0) + (map?.height ?? 0)))).toBeLessThanOrEqual(1);
  // No id on the page repeats, though the card is shown twice.
  const repeated = await page.evaluate(() => {
    const seen = new Map<string, number>();
    for (const element of document.querySelectorAll("[id]")) seen.set(element.id, (seen.get(element.id) ?? 0) + 1);
    return [...seen].filter(([, count]) => count > 1).map(([id]) => id);
  });
  expect(repeated).toEqual([]);

  // Blocked: two pins, and the card is Quayside House, the first in list order.
  await tab(page, "Blocked 2").click();
  await expect(pins(page)).toHaveCount(2);
  await expect(pin(page, "site-b")).toHaveAttribute("aria-pressed", "true");
  await expect(pin(page, "site-c")).toHaveAttribute("aria-pressed", "false");
  await expect(card(page).getByRole("link", { name: "Quayside House, Levels 3 to 5" }).first()).toBeVisible();
  await expect(card(page).getByText("Blocked · 2 shortages")).toBeVisible();
  await expect(card(page).getByRole("link", { name: "Sort out shortages" })).toHaveAttribute("href", "/sites/site-b#action-needed");
  expect(await cardShape(card(page).locator(":scope > div"))).toEqual(quaysideCard);
  expect(await dotWidth(page, "site-b")).toBeGreaterThan(await dotWidth(page, "site-c"));
  // In their relative places: Northgate Depot is north-west of Quayside House.
  const quayside = await pin(page, "site-b").locator("[data-pin-dot]").boundingBox();
  const northgate = await pin(page, "site-c").locator("[data-pin-dot]").boundingBox();
  expect(northgate!.y).toBeLessThan(quayside!.y);
  expect(northgate!.x).toBeLessThan(quayside!.x);

  // A tap on Northgate's pin: the card follows and that pin grows.
  await pin(page, "site-c").click();
  await expect(pin(page, "site-c")).toHaveAttribute("aria-pressed", "true");
  await expect(card(page).getByRole("link", { name: "Northgate Depot, Phase 2" }).first()).toBeVisible();
  await expect.poll(async () => (await dotWidth(page, "site-c")) > (await dotWidth(page, "site-b"))).toBe(true);
  await assertAxe(page);
  await assertTargets(page);
  // The tab bar stays over the card: what is at its middle is the tab bar.
  const onTop = await page.evaluate(() => {
    const bar = document.querySelector("[data-tab-bar]")?.getBoundingClientRect();
    if (!bar) return false;
    const hit = document.elementFromPoint(bar.left + bar.width / 2, bar.top + bar.height / 2);
    return hit?.closest("[data-tab-bar]") !== null;
  });
  expect(onTop).toBe(true);

  // All: every project's pin, no filter; the card opens on the first in list order.
  await tab(page, "All 4").click();
  await expect(pins(page)).toHaveCount(4);
  await expect(pin(page, "site-a")).toHaveAttribute("aria-pressed", "true");
  await expect(card(page).getByRole("link", { name: "Cedar Court, Block A" }).first()).toBeVisible();
  // Other: Foundry Lane Annex, nothing planned.
  await tab(page, "Other 1").click();
  await expect(pins(page)).toHaveCount(1);
  await expect(card(page).locator("[data-signal]")).toHaveAttribute("data-signal", "idle");
  // Back on Blocked the card opens on its first project again.
  await tab(page, "Blocked 2").click();
  await expect(pin(page, "site-b")).toHaveAttribute("aria-pressed", "true");
  await assertNoOverflow(page);
});

test("AC 77, AC 78, AC 83: from a filtered projects list, the Map tab's verdict still counts every project", async ({ page }) => {
  await gotoApp(page, "/sites?status=ready");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Map", exact: true }).click();
  await expect(page).toHaveURL(/\/map$/);
  await expect(verdict(page).getByRole("heading", { level: 2 })).toHaveText("2 of 3 crews can't go yet");
  await expect(tabs(page)).toHaveText(["All 4", "Blocked 2", "Crew can go 1", "Other 1"]);
});
