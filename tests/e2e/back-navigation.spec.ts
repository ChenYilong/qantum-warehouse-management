import { expect, test, type Page } from "@playwright/test";
import { gotoApp } from "./support";

// AC 85: a project's back control returns where the visit came from, not always to Projects.

const back = (page: Page) => page.getByRole("banner").getByRole("link", { name: /^Back to / });

async function openCedarFrom(page: Page, path: string, region: string | null) {
  await gotoApp(page, path);
  const scope = region ? page.getByRole("region", { name: region }) : page.getByRole("list", { name: "Projects" });
  await scope.getByRole("link", { name: "Cedar Court, Block A" }).first().click();
  await expect(page).toHaveURL(/\/sites\/site-a$/);
}

test("AC 85: a project opened from Map, Calendar or Projects goes back there", async ({ page }) => {
  for (const [path, region, name] of [
    ["/map", "Selected project", "Map"],
    ["/calendar", "Project on the calendar", "Calendar"],
    ["/sites", null, "Projects"],
  ] as const) {
    await openCedarFrom(page, path, region);
    await expect(back(page), path).toHaveAccessibleName(`Back to ${name}`);
    await back(page).click();
    await expect(page, path).toHaveURL(new RegExp(`${path}$`));
  }
});

test("AC 85: from the Guide's tour back is the Guide; opened directly it is Projects", async ({ page }) => {
  await gotoApp(page, "/about-this-demo");
  await page.getByRole("main").getByRole("link", { name: "Quayside House", exact: true }).click();
  await expect(page).toHaveURL(/\/sites\/site-b$/);
  await expect(back(page)).toHaveAccessibleName("Back to Guide");
  await back(page).click();
  await expect(page).toHaveURL(/\/about-this-demo$/);

  await gotoApp(page, "/sites/site-a");
  await expect(back(page)).toHaveAccessibleName("Back to Projects");
  await back(page).click();
  await expect(page).toHaveURL(/\/sites$/);
});
