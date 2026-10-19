import { expect, test, type Locator, type Page } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Read-only, on the main server: the deadline calendar at the top of the projects list (AC 81, 82). The phone's clock
// is fixed to Tuesday 20 October 2026, so today and the default dates never move under the sample's deadlines.

const NOW = new Date("2026-10-20T09:00:00+13:00");
const panel = (page: Page) => page.locator("[data-calendar-panel]");
const tabs = (page: Page) => page.getByRole("tablist", { name: "Deadlines by status" }).getByRole("tab");
const tab = (page: Page, name: string) => page.getByRole("tablist", { name: "Deadlines by status" }).getByRole("tab", { name, exact: true });
const calendar = (page: Page) => page.getByRole("region", { name: "Deadline calendar" });
const card = (page: Page) => page.getByRole("region", { name: "Project on the calendar" });
const month = (page: Page) => calendar(page).getByRole("heading", { level: 3 });
const ovals = (page: Page) => page.locator("[data-calendar-site]");
const oval = (page: Page, id: string) => page.locator(`[data-calendar-site="${id}"]`);
const cell = (page: Page, iso: string) => calendar(page).locator(`td[data-date="${iso}"]`);

async function fill(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).backgroundColor);
}

async function width(locator: Locator): Promise<number> {
  return (await locator.boundingBox())?.width ?? 0;
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW);
});

test("AC 81: the projects list opens with the deadline calendar, a copy of today's map panel with a calendar for its map", async ({ page }) => {
  await gotoApp(page, "/sites");
  // First on the page, above the map panel, which keeps its own tabs and card.
  expect((await panel(page).boundingBox())?.y ?? Infinity).toBeLessThan((await page.locator("[data-verdict]").boundingBox())?.y ?? 0);
  await expect(page.getByRole("tablist", { name: "Projects by status" }).getByRole("tab")).toHaveText(["All 4", "Blocked 2", "Crew can go 1", "Other 1"]);
  await expect(page.getByRole("region", { name: "Selected project" })).toHaveCount(1);
  // The same verdict, totals, bar and tabs as the map panel.
  await expect(panel(page).getByRole("heading", { level: 2 })).toHaveText("2 of 3 crews can't go yet");
  await expect(panel(page).getByText("3 shortages · 4 data problems", { exact: true })).toBeVisible();
  await expect(panel(page).getByRole("img", { name: "1 can go, 2 blocked" })).toBeVisible();
  await expect(tabs(page)).toHaveText(["All 4", "Blocked 2", "Crew can go 1", "Other 1"]);
  await expect(tab(page, "Crew can go 1")).toHaveAttribute("aria-selected", "true");
  // The month of the first project's deadline, Monday first, today ringed.
  await expect(month(page)).toHaveText("October 2026");
  await expect(calendar(page).locator("th")).toHaveText(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  await expect(cell(page, "2026-10-20")).toHaveAttribute("data-today-date", "");
  // Crew can go: Cedar Court alone, on Fri 23 Oct, as a small copy of its signal.
  await expect(ovals(page)).toHaveCount(1);
  const cedar = cell(page, "2026-10-23").getByRole("button", { name: "Cedar Court, Block A, Crew can go, deadline Fri 23 Oct 2026", exact: true });
  await expect(cedar).toHaveAttribute("aria-pressed", "true");
  await expect(cedar.locator("[data-oval]")).toHaveAttribute("data-tone", "go");
  await expect(cedar.locator("[data-oval]")).toHaveAttribute("data-knob", "right");
  await expect(cedar.locator('svg[data-shape="circle"]')).toHaveCount(1);
  // The card's own signal colour, and under the calendar the list's own card, as wide as the calendar.
  expect(await fill(cedar.locator("[data-oval]"))).toBe(await fill(card(page).locator("[data-signal]")));
  await expect(card(page).getByRole("link", { name: "Cedar Court, Block A" }).first()).toHaveAttribute("href", "/sites/site-a");
  expect(Math.abs((await width(card(page).locator(":scope > div"))) - (await width(calendar(page))))).toBeLessThanOrEqual(1);
  // No id repeats on the page, with three copies of a card.
  const repeated = await page.evaluate(() => {
    const seen = new Map<string, number>();
    for (const element of document.querySelectorAll("[id]")) seen.set(element.id, (seen.get(element.id) ?? 0) + 1);
    return [...seen].filter(([, count]) => count > 1).map(([id]) => id);
  });
  expect(repeated).toEqual([]);
  await assertAxe(page);
  await assertTargets(page);
  await assertNoOverflow(page);
});

test("AC 81: a tab puts its own projects on the calendar, opens on its first and its month, and a tapped oval takes the card", async ({ page }) => {
  await gotoApp(page, "/sites");
  // Blocked: Quayside House on Tue 27 Oct; Northgate Depot is in November.
  await tab(page, "Blocked 2").click();
  await expect(ovals(page)).toHaveCount(1);
  await expect(oval(page, "site-b")).toHaveAttribute("aria-pressed", "true");
  await expect(cell(page, "2026-10-27").locator('[data-calendar-site="site-b"] [data-oval]')).toHaveAttribute("data-tone", "stop");
  await expect(card(page).getByRole("link", { name: "Quayside House, Levels 3 to 5" }).first()).toBeVisible();
  await calendar(page).getByRole("button", { name: "Next month" }).click();
  await expect(month(page)).toHaveText("November 2026");
  await expect(ovals(page)).toHaveCount(1);
  await cell(page, "2026-11-03").getByRole("button", { name: /^Northgate Depot, Phase 2, Blocked/ }).click();
  await expect(oval(page, "site-c")).toHaveAttribute("aria-pressed", "true");
  await expect(card(page).getByRole("link", { name: "Northgate Depot, Phase 2" }).first()).toBeVisible();
  await calendar(page).getByRole("button", { name: "Previous month" }).click();
  await expect(month(page)).toHaveText("October 2026");
  // All: every project, opening on the first in list order.
  await tab(page, "All 4").click();
  await expect(month(page)).toHaveText("October 2026");
  await expect(ovals(page)).toHaveCount(2);
  await expect(oval(page, "site-a")).toHaveAttribute("aria-pressed", "true");
  await calendar(page).getByRole("button", { name: "Next month" }).click();
  await expect(ovals(page)).toHaveCount(2);
  await expect(cell(page, "2026-11-13").locator("[data-oval]")).toHaveAttribute("data-tone", "idle");
  // Other: Foundry Lane Annex, and the calendar opens on its month.
  await tab(page, "Other 1").click();
  await expect(month(page)).toHaveText("November 2026");
  await expect(oval(page, "site-d")).toHaveAttribute("aria-pressed", "true");
  await assertAxe(page);
  await assertTargets(page);
});

test("AC 82: From and To start at today and the end of the year, choose the deadlines the calendar holds, and say when they can't", async ({ page }) => {
  await gotoApp(page, "/sites");
  const from = calendar(page).getByLabel("From", { exact: true });
  const to = calendar(page).getByLabel("To", { exact: true });
  await expect(from).toHaveValue("2026-10-20");
  await expect(to).toHaveValue("2026-12-31");
  await tab(page, "All 4").click();
  await expect(ovals(page)).toHaveCount(2);
  // To the end of October: November's deadlines go.
  await to.fill("2026-10-31");
  await calendar(page).getByRole("button", { name: "Next month" }).click();
  await expect(ovals(page)).toHaveCount(0);
  await calendar(page).getByRole("button", { name: "Previous month" }).click();
  await expect(ovals(page)).toHaveCount(2);
  // From the 24th: Cedar Court's 23 Oct goes, and the card moves to the first that stays.
  await from.fill("2026-10-24");
  await expect(ovals(page)).toHaveCount(1);
  await expect(oval(page, "site-b")).toHaveAttribute("aria-pressed", "true");
  // Crew can go now holds no deadline between the dates; the tabs still count every project.
  await tab(page, "Crew can go 1").click();
  await expect(ovals(page)).toHaveCount(0);
  await expect(card(page)).toHaveText("No deadlines between these dates.");
  await expect(tabs(page)).toHaveText(["All 4", "Blocked 2", "Crew can go 1", "Other 1"]);
  // From after To: it says so and holds none.
  await from.fill("2026-11-05");
  await expect(calendar(page).getByText("From is after To.", { exact: true })).toBeVisible();
  await tab(page, "All 4").click();
  await expect(ovals(page)).toHaveCount(0);
  await expect(card(page)).toHaveText("No deadlines between these dates.");
  // Empty fields leave both ends open.
  await from.fill("");
  await to.fill("");
  await expect(ovals(page)).toHaveCount(2);
  await expect(oval(page, "site-a")).toHaveAttribute("aria-pressed", "true");
});
