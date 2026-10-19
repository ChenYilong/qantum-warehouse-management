import { expect, test, type Page } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Read-only, on the main server, which has no Mapbox token: today's panel at the top of the projects list (AC 77 to
// 79), after the author's design "I · Verdict + tabs + map (B+D+E)". Without a token the pins sit on a plain panel.

const verdict = (page: Page) => page.locator("[data-verdict]");
const tabs = (page: Page) => page.getByRole("tablist", { name: "Projects by status" }).getByRole("tab");
const tab = (page: Page, name: string) => page.getByRole("tablist", { name: "Projects by status" }).getByRole("tab", { name, exact: true });
const drawer = (page: Page) => page.getByRole("region", { name: "Selected project" });
const pins = (page: Page) => page.locator("[data-pin]");
const pin = (page: Page, id: string) => page.locator(`[data-pin="${id}"]`);

/** Each segment of the bar with its opacity: lit at 1, faded below it. */
async function segments(page: Page): Promise<string[]> {
  return page.locator("[data-segment]").evaluateAll((items) => items.map((item) => `${item.getAttribute("data-segment")}:${getComputedStyle(item).opacity}`));
}

async function dotWidth(page: Page, id: string): Promise<number> {
  return pin(page, id)
    .locator("[data-pin-dot]")
    .evaluate((dot) => dot.getBoundingClientRect().width);
}

test("AC 77: the projects list opens with today's verdict: 2 of 3 crews can't go yet, the totals, and a bar of one green and two red", async ({ page }) => {
  await gotoApp(page, "/sites");
  // The page's h1 stays first in main, for structure; the verdict leads what you see.
  await expect(page.locator("main > h1")).toHaveText("Projects");
  await expect(verdict(page).getByRole("heading", { level: 2 })).toHaveText("2 of 3 crews can't go yet");
  await expect(verdict(page).getByText("Today", { exact: true })).toBeVisible();
  await expect(verdict(page).getByText("3 shortages · 4 data problems", { exact: true })).toBeVisible();
  const bar = verdict(page).getByRole("img", { name: "1 can go, 2 blocked" });
  await expect(bar.locator("[data-segment]")).toHaveCount(3);
  expect(await segments(page)).toEqual(["go:1", "blocked:0.35", "blocked:0.35"]);
  // The project's stop red with white text.
  const colours = await verdict(page).evaluate((section) => {
    const style = getComputedStyle(section);
    return { background: style.backgroundColor, text: style.color };
  });
  expect(colours).toEqual({ background: "rgb(179, 0, 27)", text: "rgb(255, 255, 255)" });
  // Full bleed on a phone, as in the design.
  const width = await verdict(page).evaluate((section) => [section.getBoundingClientRect().left, section.getBoundingClientRect().right]);
  expect(width).toEqual([0, 375]);
  // At the top: the panel, then the map and its drawer, then the list's filter.
  const top = await verdict(page).boundingBox();
  const filter = await page.getByRole("form", { name: "Filter projects" }).boundingBox();
  expect((top?.y ?? Infinity) < (filter?.y ?? 0)).toBe(true);
  await assertAxe(page);
  await assertTargets(page);
  await assertNoOverflow(page);
});

test("AC 78: three tabs inside the verdict open on Can go, and the chosen tab's segments are lit while the others fade", async ({ page }) => {
  await gotoApp(page, "/sites");
  await expect(tabs(page)).toHaveText(["Blocked 2", "Can go 1", "Idle 1"]);
  await expect(tab(page, "Can go 1")).toHaveAttribute("aria-selected", "true");
  // Inside the panel, right under the bar.
  const bar = await verdict(page).getByRole("img").boundingBox();
  const list = await page.getByRole("tablist", { name: "Projects by status" }).boundingBox();
  const gap = (list?.y ?? 0) - ((bar?.y ?? 0) + (bar?.height ?? 0));
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThan(24);
  expect(await verdict(page).getByRole("tablist").count()).toBe(1);
  await tab(page, "Blocked 2").click();
  await expect(tab(page, "Blocked 2")).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => segments(page)).toEqual(["go:0.35", "blocked:1", "blocked:1"]);
  await tab(page, "Idle 1").click();
  await expect.poll(() => segments(page)).toEqual(["go:0.35", "blocked:0.35", "blocked:0.35"]);
  // A tablist: one tab in the tab order; the arrows, Home and End move and choose, wrapping round.
  await expect(page.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
  await tab(page, "Idle 1").focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Blocked 2")).toBeFocused();
  await expect(tab(page, "Blocked 2")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tab(page, "Idle 1")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(tab(page, "Blocked 2")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "Idle 1")).toBeFocused();
  await expect(tab(page, "Idle 1")).toHaveAttribute("aria-selected", "true");
});

test("AC 79: the map shows only the chosen tab's pins, the drawer opens on its first project, and a tapped pin takes the drawer", async ({ page }) => {
  await gotoApp(page, "/sites");
  // Can go: Cedar Court alone, chosen.
  await expect(pins(page)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Cedar Court, Block A, Crew can go" })).toHaveAttribute("aria-pressed", "true");
  await expect(pin(page, "site-a")).toContainText("Cedar Court");
  await expect(drawer(page).getByRole("link", { name: "Cedar Court, Block A" })).toHaveAttribute("href", "/sites/site-a");
  await expect(drawer(page)).toContainText("Crew can go");
  await expect(drawer(page)).toContainText("Materials for the planned work are on hand (shared, not reserved).");
  await expect(drawer(page).getByText("Operator · Mere Tane")).toBeVisible();
  await expect(drawer(page).getByRole("link", { name: "Call operator" })).toHaveAttribute("href", "tel:+447700900156");
  await expect(drawer(page).getByRole("link", { name: "Text operator" })).toHaveAttribute("href", /^sms:\+447700900156\?&body=/);

  // Blocked: two pins, and the drawer opens on Quayside House, the first in list order.
  await tab(page, "Blocked 2").click();
  await expect(pins(page)).toHaveCount(2);
  await expect(pin(page, "site-b")).toHaveAttribute("aria-pressed", "true");
  await expect(pin(page, "site-c")).toHaveAttribute("aria-pressed", "false");
  await expect(drawer(page).getByRole("link", { name: "Quayside House, Levels 3 to 5" })).toBeVisible();
  await expect(drawer(page)).toContainText("Blocked · 2 shortages");
  await expect(drawer(page)).toContainText("Short: Pipe collar for 25 mm pipe");
  await expect(drawer(page).getByRole("link", { name: "Sort out shortages" })).toHaveAttribute("href", "/sites/site-b#action-needed");
  expect(await dotWidth(page, "site-b")).toBeGreaterThan(await dotWidth(page, "site-c"));
  // In their relative places: Northgate Depot is north-west of Quayside House.
  const quayside = await pin(page, "site-b").locator("[data-pin-dot]").boundingBox();
  const northgate = await pin(page, "site-c").locator("[data-pin-dot]").boundingBox();
  expect(northgate!.y).toBeLessThan(quayside!.y);
  expect(northgate!.x).toBeLessThan(quayside!.x);

  // A tap on Northgate's pin: the drawer follows and that pin grows.
  await pin(page, "site-c").click();
  await expect(pin(page, "site-c")).toHaveAttribute("aria-pressed", "true");
  await expect(drawer(page).getByRole("link", { name: "Northgate Depot, Phase 2" })).toBeVisible();
  await expect(drawer(page)).toContainText("4 data problems to check");
  await expect.poll(async () => (await dotWidth(page, "site-c")) > (await dotWidth(page, "site-b"))).toBe(true);
  await assertAxe(page);
  await assertTargets(page);
  // The tab bar stays over the drawer: what is at its middle is the tab bar.
  const onTop = await page.evaluate(() => {
    const bar = document.querySelector("[data-tab-bar]")?.getBoundingClientRect();
    if (!bar) return false;
    const hit = document.elementFromPoint(bar.left + bar.width / 2, bar.top + bar.height / 2);
    return hit?.closest("[data-tab-bar]") !== null;
  });
  expect(onTop).toBe(true);

  // Idle: Foundry Lane Annex, nothing planned and nobody to call.
  await tab(page, "Idle 1").click();
  await expect(pins(page)).toHaveCount(1);
  await expect(drawer(page)).toContainText("No work planned at this project.");
  await expect(drawer(page).getByRole("link", { name: "Call operator" })).toHaveCount(0);
  // Back on Blocked the drawer opens on its first project again.
  await tab(page, "Blocked 2").click();
  await expect(pin(page, "site-b")).toHaveAttribute("aria-pressed", "true");
  await assertNoOverflow(page);
});

test("AC 77, AC 78: the verdict counts every project, whatever the list's filter", async ({ page }) => {
  await gotoApp(page, "/sites?status=ready");
  await expect(verdict(page).getByRole("heading", { level: 2 })).toHaveText("2 of 3 crews can't go yet");
  await expect(tabs(page)).toHaveText(["Blocked 2", "Can go 1", "Idle 1"]);
});
