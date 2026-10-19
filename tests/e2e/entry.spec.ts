import { expect, test } from "@playwright/test";

// AC 84: a fresh visit (a new browser tab) that opens the projects list starts on the first tab. No gotoApp here:
// it marks the visit as under way before the first page loads.

const tabs = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "Main" });

test("AC 84: opening /sites starts the visit on Map, and Projects still shows the list afterwards", async ({ page }) => {
  await page.goto("/sites");
  await expect(page).toHaveURL(/\/map$/);
  await expect(tabs(page).getByRole("link", { name: "Map", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("[data-verdict]")).toBeVisible();
  // Later in the same visit Projects is the list, and a reload keeps it.
  await tabs(page).getByRole("link", { name: "Projects", exact: true }).click();
  await expect(page).toHaveURL(/\/sites$/);
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/sites$/);
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
});

test("AC 84: the entry is replaced, so Back does not return to it", async ({ page }) => {
  await page.goto("/sites");
  await expect(page).toHaveURL(/\/map$/);
  await page.goBack().catch(() => null);
  await expect(page).not.toHaveURL(/\/sites$/);
});

test("AC 84: a link with a filter opens the filtered list", async ({ page }) => {
  await page.goto("/sites?status=shortage");
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  await expect(page).toHaveURL(/\/sites\?status=shortage$/);
});
