import { expect, test } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Read-only. Runs before the write project, so no actions are recorded yet.

const SITES = [
  ["site-a", "Cedar Court, Block A"],
  ["site-b", "Quayside House, Levels 3 to 5"],
  ["site-c", "Northgate Depot, Phase 2"],
  ["site-d", "Foundry Lane Annex"],
] as const;

test("AC 43, AC 83: the Guide opens the actions log, one section per site; it has no tab of its own", async ({ page }) => {
  await gotoApp(page, "/about-this-demo");
  const item = page.getByRole("main").getByRole("link", { name: "Decisions", exact: true }).first();
  await expect(item).toBeVisible();
  await item.click();
  await expect(page).toHaveURL(/\/actions$/);
  await expect(page.getByRole("heading", { level: 1, name: "Decisions" })).toBeVisible();

  const tabs = page.getByRole("navigation", { name: "Main" });
  await expect(tabs.getByRole("link")).toHaveText(["Projects", "Map", "Calendar", "Guide"]);
  await expect(tabs.locator('[aria-current="page"]')).toHaveCount(0);

  for (const [id, name] of SITES) {
    const section = page.locator(`#site-${id}`);
    await expect(section.getByRole("heading", { level: 2, name })).toBeVisible();
    const heading = section.getByRole("heading", { level: 2, name });
    // The site's kind icon leads its heading, and the heading sticks while the section scrolls.
    await expect(heading.locator("svg").first()).toBeVisible();
    await expect(heading).toHaveCSS("position", "sticky");
    await expect(section.getByRole("link", { name })).toHaveAttribute("href", `/sites/${id}?fromLog=${id}`);
  }

  // A site opened from the log goes back to the log, by popping it, not to the sites list.
  await page.locator("#site-site-b").getByRole("link", { name: "Quayside House, Levels 3 to 5" }).click();
  await expect(page).toHaveURL(/\/sites\/site-b\?fromLog=site-b$/);
  // Filter chips keep the way back.
  await page.getByRole("link", { name: /^Acted/ }).click();
  await expect(page).toHaveURL(/show=acted&fromLog=site-b$/);
  await page.getByRole("link", { name: "Back to Decisions" }).click();
  await expect(page).toHaveURL(/\/actions(#site-site-b)?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Decisions" })).toBeVisible();

  // A foreign or missing origin leaves back on the parent.
  await gotoApp(page, "/sites/site-b?fromLog=site-c");
  await expect(page.getByRole("link", { name: "Back to Projects" })).toBeVisible();
  await gotoApp(page, "/sites/site-b/penetrations/pen-b-01?fromLog=site-b");
  await expect(page.getByRole("link", { name: "Back to Decisions" })).toHaveAttribute("href", "/actions#site-site-b");
  await gotoApp(page, "/materials/MAT-COLLAR-25?fromLog=site-c");
  await expect(page.getByRole("link", { name: "Back to Inventory" })).toBeVisible();
  await gotoApp(page, "/materials/MAT-COLLAR-25?fromLog=site-b#site-site-b");
  await expect(page.getByRole("link", { name: "Back to Decisions" })).toHaveAttribute("href", "/actions#site-site-b");
  await gotoApp(page, "/actions");

  await gotoApp(page, "/sites/site-b/actions");
  await expect(page).toHaveURL(/\/actions#site-site-b$/);
  await expect(page.locator("#site-site-b")).toBeInViewport();

  await assertAxe(page);
  await assertTargets(page);
  await assertNoOverflow(page);
});
