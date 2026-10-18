import { expect, test } from "@playwright/test";
import { gotoApp } from "./support";

test("AC 9: stock down shows can't check and never crew can go", async ({ page }) => {
  // Runs on the stock-down server (STUB_STOCK_MODE=down), not the main server.
  await gotoApp(page, "/sites");
  await expect(page.getByText("Can't check")).toHaveCount(4);
  await expect(page.getByText("Crew can go")).toHaveCount(0);

  // AC 52, AC 54: every signal is amber and checks again when tapped. None is a link, so none can call or text.
  await expect(page.locator('[data-signal="unknown"]')).toHaveCount(4);
  await expect(page.locator('[data-signal="go"], [data-signal="stop"]')).toHaveCount(0);
  await expect(page.locator("a[data-signal]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Can't check/ })).toHaveCount(4);
  // AC 55: the operator can still be told to hold, and the text never says go.
  const hold = page.getByRole("listitem").filter({ hasText: "Riverside Plaza, Block A" }).getByRole("link", { name: "Text operator" });
  const holdText = decodeURIComponent(((await hold.getAttribute("href")) ?? "").split("body=")[1] ?? "");
  expect(holdText).toBe("Riverside Plaza, Block A, Job ref RP-A2: I can't check the materials right now. Don't go until I confirm. From your team leader.");

  await gotoApp(page, "/sites/site-b");
  await expect(page.getByRole("main").getByText("Can't check this site right now. Don't assume it's clear. Try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to sites" })).toBeVisible();
  await expect(page.getByText("Crew can go")).toHaveCount(0);
  // AC 57: no signal on a site that can't be checked; its banner and Try again stay, and the operator is told to hold.
  await expect(page.locator("[data-signal]")).toHaveCount(0);
  const siteHold = page.getByRole("main").getByRole("link", { name: "Text operator" });
  expect(decodeURIComponent(((await siteHold.getAttribute("href")) ?? "").split("body=")[1] ?? "")).toContain("Don't go until I confirm.");

  // No filter counts when readiness is unknown, and this page has no actions log control.
  await expect(page.getByRole("navigation", { name: "Filter penetrations" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Actions log/ })).toHaveCount(0);
  await expect(page.getByText("Crew can go")).toHaveCount(0);

  // Stock is down, so the penetration cannot be checked. The page says so and never invents an empty log.
  await gotoApp(page, "/sites/site-b/penetrations/pen-b-01");
  await expect(page.getByRole("heading", { level: 1, name: "Harbour Point, Levels 3 to 5" })).toBeVisible();
  await expect(page.getByText("Can't check this site right now. Don't assume it's clear. Try again.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Penetration" })).toHaveCount(0);
  await expect(page.getByText("Nothing recorded")).toHaveCount(0);
  await expect(page.getByText("0", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Crew can go")).toHaveCount(0);

  // Stock down makes every site's log unreadable, so the page says it cannot be loaded.
  await gotoApp(page, "/actions");
  await expect(page.getByRole("heading", { level: 1, name: "Actions log" })).toBeVisible();
  await expect(page.getByText("We can't load the actions log right now. Try again shortly.")).toBeVisible();
  await expect(page.getByText("Nothing recorded")).toHaveCount(0);
  await expect(page.getByText("Crew can go")).toHaveCount(0);
});

test("AC 38, AC 39: with the stock down, the materials pages say they can't check, never zero or not short", async ({ page }) => {
  await gotoApp(page, "/materials");
  await expect(page.getByText("Can't check stock right now. Don't assume any material is in stock. Try again.")).toBeVisible();
  await expect(page.locator("main a[href^='/materials/']")).toHaveCount(0);
  await expect(page.getByText(/On hand \d|Not short/)).toHaveCount(0);

  await gotoApp(page, "/materials/MAT-SEALANT");
  await expect(page.getByRole("heading", { level: 1, name: "Material" })).toBeVisible();
  await expect(page.getByText("Can't check stock right now. Don't assume any material is in stock. Try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Wait|Escalate/ })).toHaveCount(0);
  await expect(page.getByText(/Needs \d/)).toHaveCount(0);
  await expect(page.getByText("Nothing recorded")).toHaveCount(0);
  await expect(page.getByText("0", { exact: true })).toHaveCount(0);
  const tabs = page.getByRole("navigation", { name: "Material" });
  await expect(tabs.getByRole("link", { name: "Stock" })).toHaveAttribute("aria-current", "page");
  await expect(tabs.getByRole("link", { name: "Actions log" })).not.toContainText(/\d/);

  await gotoApp(page, "/materials/MAT-SEALANT?tab=log");
  await expect(page.getByText("We can't load this material's actions right now. Try again shortly.")).toBeVisible();
  await expect(page.getByText("Nothing recorded")).toHaveCount(0);
  await expect(page.getByText("0", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Material" }).getByRole("link", { name: "Actions log" })).not.toContainText(/\d/);
});
