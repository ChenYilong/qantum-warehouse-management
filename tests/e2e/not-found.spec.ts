import { expect, test } from "@playwright/test";
import { gotoApp } from "./support";

test("unknown site and penetration render the not-found page with a link back", async ({ page }) => {
  // Read-only.
  for (const path of ["/sites/nope", "/sites/site-b/penetrations/nope"]) {
    await gotoApp(page, path);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByText("That page does not exist.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to projects" })).toHaveAttribute("href", "/sites");
  }
  await page.getByRole("link", { name: "Back to projects" }).click();
  // The projects list's own h1; "All projects" under today's panel is an h2 (AC 77).
  await expect(page.getByRole("heading", { name: "Projects", level: 1, exact: true })).toBeVisible();
});
