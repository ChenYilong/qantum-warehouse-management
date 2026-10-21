import { expect, test, type Page } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Read-only on the server: a pick-up is kept in this browser's localStorage (AC 94), and each test has its own.

const KEY = "team-leader:site-pickups";
const PAGE = "/sites/site-b/picks/pickup?line=b-sealant";

function picks(page: Page) {
  return page.getByRole("region", { name: "Picks" });
}

function rows(page: Page) {
  return page.getByRole("list", { name: "Sites to pick up from" }).locator(":scope > li");
}

function card(page: Page, name: string) {
  return rows(page).filter({ hasText: name });
}

test("AC 92: a blocked site's material rows each offer Pick up from other sites beside Review; a clear site's don't", async ({ page }) => {
  await gotoApp(page, "/sites/site-b");
  const lines = picks(page).getByRole("listitem");
  await expect(lines).toHaveCount(4);
  for (const [index, lineId] of ["b-sealant", "b-collar", "b-batt", "b-wrap"].entries()) {
    const row = lines.nth(index);
    await expect(row.getByRole("link", { name: "Review" })).toBeVisible();
    await expect(row.getByRole("link", { name: "Pick up from other sites" })).toHaveAttribute("href", `/sites/site-b/picks/pickup?line=${lineId}`);
  }
  await assertTargets(page);
  await assertNoOverflow(page);

  await gotoApp(page, "/sites/site-a");
  await expect(picks(page).getByRole("link", { name: "Review" })).toHaveCount(2);
  await expect(picks(page).getByRole("link", { name: "Pick up from other sites" })).toHaveCount(0);

  await gotoApp(page, "/sites/site-b");
  await lines.nth(0).getByRole("link", { name: "Pick up from other sites" }).click();
  await expect(page).toHaveURL(/\/sites\/site-b\/picks\/pickup\?line=b-sealant$/);
  await expect(page.getByRole("heading", { level: 1, name: "Pick up from other sites" })).toBeVisible();
});

test("AC 93: the projects list with a tick on the left of each card; a ticked site reads Blocked at once", async ({ page }) => {
  await gotoApp(page, PAGE);
  // The header keeps the Online switch; Cancel top left and Confirm top right sit on the row under it, above the title.
  await expect(page.locator("header").first().getByRole("switch", { name: "Online" })).toBeVisible();
  const actions = page.locator("[data-pickup-actions]");
  const cancel = actions.getByRole("link", { name: "Cancel" });
  const confirm = actions.getByRole("button", { name: "Confirm" });
  await expect(cancel).toHaveAttribute("href", "/sites/site-b");
  const [cancelBox, confirmBox, titleBox] = [await cancel.boundingBox(), await confirm.boundingBox(), await page.getByRole("heading", { level: 1 }).boundingBox()];
  expect(cancelBox!.x).toBeLessThan(24);
  expect(confirmBox!.x + confirmBox!.width).toBeGreaterThan(375 - 24);
  expect(Math.abs(cancelBox!.y - confirmBox!.y)).toBeLessThan(1);
  expect(cancelBox!.y).toBeLessThan(titleBox!.y);
  await expect(confirm).toBeDisabled();

  await expect(page.getByRole("region", { name: "The line to pick up for" })).toContainText("Intumescent sealant, 310 ml cartridge");
  await expect(page.getByText("Needs 4 more: 4 cartridges of Intumescent sealant, 310 ml cartridge.")).toBeVisible();
  await expect(page.getByText("No site ticked yet.")).toBeVisible();

  // The list Projects shows, with Use my location and the filter, without this site.
  await expect(page.getByRole("button", { name: "Use my location" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Filter projects" })).toBeVisible();
  await expect(rows(page)).toHaveCount(4);
  await expect(rows(page).filter({ hasText: "Quayside House" })).toHaveCount(0);
  const cedar = page.getByRole("checkbox", { name: "Pick up from Cedar Court, Block A" });
  await expect(card(page, "Cedar Court").getByText("Has 2 cartridges")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Pick up from Northgate Depot, Phase 2" })).toBeDisabled();
  await expect(card(page, "Northgate Depot").getByText("Has none of this material")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Pick up from Foundry Lane Annex" })).toBeDisabled();
  await expect(page.getByRole("checkbox", { name: "Pick up from Harbour View, Unit 7" })).toBeDisabled();
  // The tick sits on the card's left.
  const tickBox = await cedar.boundingBox();
  const cardBox = await card(page, "Cedar Court").locator("[data-pickup-site] > :nth-child(2)").boundingBox();
  expect(tickBox!.x).toBeLessThan(cardBox!.x);

  await expect(card(page, "Cedar Court").locator('[data-signal="go"]')).toHaveCount(1);
  await cedar.check();
  await expect(card(page, "Cedar Court").locator('[data-signal="stop"]')).toHaveCount(1);
  await expect(card(page, "Cedar Court")).toContainText("Blocked · 1 shortage");
  await expect(card(page, "Cedar Court").getByText("Has 2 cartridges · takes 2")).toBeVisible();
  await expect(page.locator("[data-pickup-plan]")).toHaveText("Takes 2 of the 4 cartridges needed. 2 cartridges still short.");
  await expect(confirm).toBeEnabled();
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  // Unticked, it is as it was.
  await cedar.uncheck();
  await expect(card(page, "Cedar Court").locator('[data-signal="go"]')).toHaveCount(1);
  await expect(confirm).toBeDisabled();

  // The filter keeps the line and the tick.
  await cedar.check();
  const form = page.getByRole("form", { name: "Filter projects" });
  await form.getByLabel("Search projects").fill("cedar");
  await form.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/\/sites\/site-b\/picks\/pickup\?line=b-sealant&pick=site-a&q=cedar&status=all$/);
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByRole("checkbox", { name: "Pick up from Cedar Court, Block A" })).toBeChecked();
  await expect(page.getByText("1 of 4 projects")).toBeVisible();

  // Cancel goes back to the site and keeps nothing.
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/sites\/site-b$/);
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
});

test("AC 94: Confirm keeps each site the move touched on this device, and asks for a new deadline and operator", async ({ page }) => {
  await gotoApp(page, PAGE);
  await page.getByRole("checkbox", { name: "Pick up from Cedar Court, Block A" }).check();
  await page.getByRole("button", { name: "Confirm" }).click();
  const notice = page.getByRole("alertdialog");
  await expect(notice).toHaveText(
    "Quayside House, Levels 3 to 5 picked up 2 cartridges from Cedar Court, Block A. Because its status changed to Blocked, change the deadline and the operator of that site.OK",
  );
  await notice.getByRole("button", { name: "OK" }).click();
  await expect(notice).toBeHidden();

  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, { status: string; lines: Record<string, unknown> }>, KEY);
  expect(Object.keys(stored).sort()).toEqual(["site-a", "site-b"]);
  expect(stored["site-a"]!.status).toBe("blocked");
  expect(stored["site-a"]!.lines["a-sealant"]).toEqual({ materialName: "Intumescent sealant, 310 ml cartridge", unit: "cartridge", plannedQty: 2, pickedQty: 0, pickedUpQty: 0, lentQty: 2 });
  expect(stored["site-a"]!.lines["a-collar"]).toMatchObject({ pickedQty: 4, lentQty: 0 });
  expect(stored["site-b"]!.lines["b-sealant"]).toMatchObject({ plannedQty: 10, pickedQty: 8, pickedUpQty: 2 });
  expect(Object.keys(stored["site-b"]!.lines)).toEqual(["b-sealant", "b-collar", "b-batt", "b-wrap"]);

  // The page now says what changed; the site that gave keeps its card, Blocked, with its deadline and operator to change.
  await expect(page.getByRole("status").filter({ hasText: "Status changed." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Done" })).toHaveAttribute("href", "/sites/site-b");
  await expect(page.getByText("Needs 2 more: 2 cartridges of Intumescent sealant, 310 ml cartridge.")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Pick up from Cedar Court, Block A" })).toBeDisabled();
  await expect(card(page, "Cedar Court").getByText("Has none of this material")).toBeVisible();
  await expect(card(page, "Cedar Court")).toContainText("Blocked · 1 shortage");
  await expect(card(page, "Cedar Court").getByRole("button", { name: /^Deadline/ })).toBeVisible();
  await expect(card(page, "Cedar Court").getByRole("button", { name: /^Operator/ })).toBeVisible();
});

test("AC 95: the cards and the site screens read this device's pick-ups first, then the sample data", async ({ page }) => {
  await gotoApp(page, PAGE);
  await page.getByRole("checkbox", { name: "Pick up from Cedar Court, Block A" }).check();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "OK" }).click();

  // The projects list: Cedar Court is Blocked, and Ready has nobody left.
  await gotoApp(page, "/sites?status=all");
  const cedar = page.getByRole("list", { name: "Projects" }).locator(":scope > li").filter({ hasText: "Cedar Court" });
  await expect(cedar.locator('[data-signal="stop"]')).toHaveCount(1);
  await expect(cedar).toContainText("Intumescent sealant, 310 ml cartridge");
  await gotoApp(page, "/sites?status=ready");
  await expect(page.getByText("No projects match these filters.")).toBeVisible();
  await gotoApp(page, "/sites?status=shortage");
  await expect(page.getByText("4 of 5 projects")).toBeVisible();

  // The site that gave: Blocked, the line short, and Send the crew locked.
  await gotoApp(page, "/sites/site-a");
  await expect(page.locator("main [data-signal]").first()).toHaveAttribute("data-signal", "stop");
  const given = picks(page).getByRole("listitem").nth(0);
  await expect(given).toContainText("Need 2 · picked 0");
  await expect(given).toContainText("2 given to another site · on this phone");
  await expect(given).toContainText("Part-picked");
  await expect(given.getByRole("link", { name: "Pick up from other sites" })).toBeVisible();
  await expect(picks(page).getByText("Not ready · 1 pick issue")).toBeVisible();
  await expect(picks(page).getByRole("button", { name: "Send the crew" })).toBeDisabled();

  // The site that picked up: the gain on its line.
  await gotoApp(page, "/sites/site-b");
  const gained = picks(page).getByRole("listitem").nth(0);
  await expect(gained).toContainText("Need 10 · picked 8");
  await expect(gained).toContainText("2 picked up from other sites · on this phone");

  // A stored line that can't be read is bad data, never the sample's number.
  await page.evaluate((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        "site-a": { status: "blocked", lines: { "a-sealant": { pickedQty: -3 } } },
      }),
    );
  }, KEY);
  await gotoApp(page, "/sites/site-a");
  await expect(picks(page).getByRole("listitem").nth(0)).toContainText("Can't read");
});

test("AC 96: Cancel goes back the way the browser does, so the site screen's own back still leads where it led", async ({ page }) => {
  // Map, Blocked, Quayside House's card, then its first row's Pick up from other sites.
  await gotoApp(page, "/map");
  await page.getByRole("tablist", { name: "Projects by status" }).getByRole("tab", { name: "Blocked 3", exact: true }).click();
  await page.getByRole("region", { name: "Selected project" }).getByRole("link", { name: "Quayside House, Levels 3 to 5" }).first().click();
  await expect(page).toHaveURL(/\/sites\/site-b$/);
  await expect(page.getByRole("link", { name: "Back to Map" })).toBeVisible();
  await picks(page).getByRole("listitem").nth(0).getByRole("link", { name: "Pick up from other sites" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pick up from other sites" })).toBeVisible();

  // Cancel pops this page, adding no history entry: the site screen comes back with its back still Map.
  const entries = await page.evaluate(() => history.length);
  await page.locator("[data-pickup-actions]").getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/sites\/site-b$/);
  await expect(page.getByRole("link", { name: "Back to Map" })).toBeVisible();
  expect(await page.evaluate(() => history.length)).toBe(entries);
  await page.getByRole("link", { name: "Back to Map" }).click();
  await expect(page).toHaveURL(/\/map$/);

  // Opened directly, with nothing under it, Cancel opens the site.
  await gotoApp(page, PAGE);
  await page.locator("[data-pickup-actions]").getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/sites\/site-b$/);
});

test("AC 97: Harbour View picks up the one collar it lacks from Cedar Court and reads Crew can go everywhere", async ({ page }) => {
  // Harbour View is short one pipe collar for 25 mm pipe; Cedar Court, the one crew that can go, holds four.
  await gotoApp(page, "/map");
  await page.getByRole("tablist", { name: "Projects by status" }).getByRole("tab", { name: "Blocked 3", exact: true }).click();
  await page.locator('[data-pin="site-e"]').click();
  await page.getByRole("region", { name: "Selected project" }).getByRole("link", { name: "Harbour View, Unit 7" }).first().click();
  await expect(page).toHaveURL(/\/sites\/site-e$/);
  await expect(page.locator("main [data-signal]").first()).toHaveAttribute("data-signal", "stop");
  await expect(page.locator("#action-needed")).toHaveCount(1);
  const row = picks(page).getByRole("listitem").nth(0);
  await expect(row).toContainText("Need 3 · picked 2");
  await row.getByRole("link", { name: "Pick up from other sites" }).click();

  await expect(page.getByText("Needs 1 more: 1 item of Pipe collar for 25 mm pipe.")).toBeVisible();
  await expect(card(page, "Cedar Court").getByText("Has 4 items")).toBeVisible();
  await page.getByRole("checkbox", { name: "Pick up from Cedar Court, Block A" }).check();
  await expect(page.locator("[data-pickup-plan]")).toHaveText("Takes the 1 item needed.");
  await page.locator("[data-pickup-actions]").getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("alertdialog")).toHaveText(
    "Harbour View, Unit 7 picked up 1 item from Cedar Court, Block A. Because its status changed to Blocked, change the deadline and the operator of that site.OK",
  );
  await page.getByRole("alertdialog").getByRole("button", { name: "OK" }).click();
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, { status: string }>, KEY);
  expect(stored["site-e"]!.status).toBe("clear");
  expect(stored["site-a"]!.status).toBe("blocked");

  // Done goes back to Harbour View: Crew can go, the picks match, Send the crew is open and nothing needs a decision.
  await page.locator("[data-pickup-actions]").getByRole("link", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/sites\/site-e$/);
  await expect(page.locator("main [data-signal]").first()).toHaveAttribute("data-signal", "go");
  await expect(page.locator("main [data-signal]").first()).toContainText("Crew can go");
  await expect(picks(page).getByText("Picks match the plan")).toBeVisible();
  await expect(picks(page).getByRole("link", { name: "Send the crew" })).toHaveAttribute("href", /^sms:\+447700900160/);
  await expect(page.locator("#action-needed")).toHaveCount(0);
  await expect(row).toContainText("1 picked up from other sites · on this phone");

  // Back on Map, after a reload too: Harbour View is the crew that can go, Cedar Court is blocked.
  await page.getByRole("link", { name: "Back to Map" }).click();
  await expect(page).toHaveURL(/\/map$/);
  await page.reload();
  const tablist = page.getByRole("tablist", { name: "Projects by status" });
  await expect(tablist.getByRole("tab")).toHaveText(["All 5", "Blocked 3", "Crew can go 1", "Other 1"]);
  await expect(tablist.getByRole("tab", { name: "Crew can go 1", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-pin]")).toHaveCount(1);
  await expect(page.locator('[data-pin="site-e"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "Selected project" }).getByRole("link", { name: "Harbour View, Unit 7" }).first()).toBeVisible();
  await tablist.getByRole("tab", { name: "Blocked 3", exact: true }).click();
  await expect(page.locator('[data-pin="site-a"]')).toHaveCount(1);

  // Calendar: Harbour View's oval on Fri 30 Oct is green under Crew can go.
  await gotoApp(page, "/calendar");
  const deadlines = page.getByRole("tablist", { name: "Deadlines by status" });
  await expect(deadlines.getByRole("tab", { name: "Crew can go 1", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[data-calendar-site="site-e"] [data-oval]')).toHaveAttribute("data-tone", "go");
  await expect(page.locator('[data-calendar-site="site-a"]')).toHaveCount(0);

  // Projects: Ready is Harbour View alone; Shortage holds Cedar Court.
  await gotoApp(page, "/sites?status=ready");
  const listed = page.getByRole("list", { name: "Projects" }).locator(":scope > li");
  await expect(listed).toHaveCount(1);
  await expect(listed).toContainText("Harbour View, Unit 7");
  await expect(listed.locator('[data-signal="go"]')).toHaveCount(1);
  await gotoApp(page, "/sites?status=shortage");
  await expect(listed.filter({ hasText: "Cedar Court, Block A" })).toHaveCount(1);
  await assertNoOverflow(page);
});
