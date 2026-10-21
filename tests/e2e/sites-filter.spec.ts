import { expect, test, type Page } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Read-only: the projects filter (AC 72, 73) narrows the list and records nothing.

const ALL = ["Cedar Court, Block A", "Quayside House, Levels 3 to 5", "Northgate Depot, Phase 2", "Foundry Lane Annex", "Harbour View, Unit 7"];

function projects(page: Page) {
  return page.getByRole("list", { name: "Projects" }).locator(":scope > li");
}

function form(page: Page) {
  return page.getByRole("form", { name: "Filter projects" });
}

async function expectShown(page: Page, names: readonly string[]): Promise<void> {
  await expect(projects(page)).toHaveCount(names.length);
  for (const name of names) await expect(projects(page).filter({ hasText: name }), name).toHaveCount(1);
}

async function apply(page: Page, readiness: string, url: RegExp): Promise<void> {
  await form(page).getByLabel("Readiness").selectOption(readiness);
  await form(page).getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(url);
}

test("AC 72: Readiness shows the ready, shortage or unknown projects, and All statuses shows every one", async ({ page }) => {
  await gotoApp(page, "/sites");
  const readiness = form(page).getByLabel("Readiness");
  await expect(readiness).toHaveValue("all");
  await expect(readiness.locator("option")).toHaveText(["All statuses", "Ready", "Shortage", "Unknown"]);
  await expectShown(page, ALL);
  await expect(page.getByText(/ of 5 projects$/)).toHaveCount(0);

  // Ready is the project whose crew can go.
  await apply(page, "ready", /\/sites\?q=&status=ready$/);
  await expectShown(page, ["Cedar Court, Block A"]);
  await expect(page.getByText("1 of 5 projects")).toBeVisible();
  await expect(form(page).getByLabel("Readiness")).toHaveValue("ready");
  await expect(projects(page).locator('[data-signal="go"]')).toHaveCount(1);

  // Shortage is the blocked projects.
  await apply(page, "shortage", /\/sites\?q=&status=shortage$/);
  await expectShown(page, ["Quayside House, Levels 3 to 5", "Northgate Depot, Phase 2", "Harbour View, Unit 7"]);
  await expect(page.getByText("3 of 5 projects")).toBeVisible();
  await expect(projects(page).locator('[data-signal="stop"]')).toHaveCount(3);

  // Unknown is the project with nothing planned (and any that can't be checked: see the stock-down spec).
  await apply(page, "unknown", /\/sites\?q=&status=unknown$/);
  await expectShown(page, ["Foundry Lane Annex"]);
  await expect(page.getByText("1 of 5 projects")).toBeVisible();
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  await apply(page, "all", /\/sites\?q=&status=all$/);
  await expectShown(page, ALL);
  await expect(page.getByText(/ of 5 projects$/)).toHaveCount(0);
});

test("AC 73: search by name, job ref or address; nothing matching; Reset; a bad status in the URL", async ({ page }) => {
  await gotoApp(page, "/sites");
  const search = form(page).getByLabel("Search projects");
  await expect(search).toHaveAttribute("placeholder", "Name, job ref or address");
  await expect(search).toHaveAttribute("maxlength", "100");
  await search.fill("quayside");
  await form(page).getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/\/sites\?q=quayside&status=all$/);
  await expectShown(page, ["Quayside House, Levels 3 to 5"]);
  await expect(page.getByText("1 of 5 projects")).toBeVisible();
  await expect(form(page).getByLabel("Search projects")).toHaveValue("quayside");

  // The job ref and the address, in any case.
  await gotoApp(page, "/sites?q=cc-a2");
  await expectShown(page, ["Cedar Court, Block A"]);
  await gotoApp(page, "/sites?q=FOUNDRY%20LANE");
  await expectShown(page, ["Foundry Lane Annex"]);

  // Search and readiness together; nothing matches.
  await gotoApp(page, "/sites?q=quayside&status=ready");
  await expect(projects(page)).toHaveCount(0);
  await expect(page.getByText("No projects match these filters.")).toBeVisible();
  await expect(page.getByText(/ of 5 projects$/)).toHaveCount(0);
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  // Reset brings every project back.
  await form(page).getByRole("link", { name: "Reset" }).click();
  await expect(page).toHaveURL(/\/sites$/);
  await expectShown(page, ALL);
  await expect(form(page).getByLabel("Search projects")).toHaveValue("");

  // A status the app doesn't know is All statuses.
  await gotoApp(page, "/sites?status=nope");
  await expect(form(page).getByLabel("Readiness")).toHaveValue("all");
  await expectShown(page, ALL);
});
