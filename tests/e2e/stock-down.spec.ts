import { expect, test } from "@playwright/test";
import { appText, gotoApp } from "./support";

test("AC 9: stock down shows can't check and never crew can go", async ({ page }) => {
  // Runs on the stock-down server (STUB_STOCK_MODE=down), not the main server.
  await gotoApp(page, "/sites");
  // The list's cards; today's panel above them says the same in its own words (AC 77).
  await expect(page.getByRole("list", { name: "Projects" }).getByText("Can't check")).toHaveCount(4);
  // Exact: the tab "Crew can go 0" is a count, not a claim that a crew can go.
  await expect(page.getByText("Crew can go", { exact: true })).toHaveCount(0);

  // AC 52, AC 54: every signal is amber and checks again when tapped. None is a link, so none can call or text.
  const list = page.getByRole("list", { name: "Projects" });
  await expect(list.locator('[data-signal="unknown"]')).toHaveCount(4);
  await expect(page.locator('[data-signal="go"], [data-signal="stop"]')).toHaveCount(0);
  await expect(page.locator("a[data-signal]")).toHaveCount(0);
  await expect(list.getByRole("button", { name: /^Can't check/ })).toHaveCount(4);
  // AC 55: the operator can still be told to hold, and the text never says go.
  const hold = page.getByRole("listitem").filter({ hasText: "Cedar Court, Block A" }).getByRole("link", { name: "Text operator" });
  const holdText = decodeURIComponent(((await hold.getAttribute("href")) ?? "").split("body=")[1] ?? "");
  expect(holdText).toBe("Cedar Court, Block A, Job ref CC-A2: I can't check the materials right now. Don't go until I confirm. From your team leader.");

  await gotoApp(page, "/sites/site-b");
  await expect(page.getByRole("main").getByText("Can't check this site right now. Don't assume it's clear. Try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to projects" })).toBeVisible();
  await expect(page.getByText("Crew can go")).toHaveCount(0);
  // AC 57: no signal on a site that can't be checked; its banner and Try again stay, and the operator is told to hold.
  await expect(page.locator("[data-signal]")).toHaveCount(0);
  const siteHold = page.getByRole("main").getByRole("link", { name: "Text operator" });
  expect(decodeURIComponent(((await siteHold.getAttribute("href")) ?? "").split("body=")[1] ?? "")).toContain("Don't go until I confirm.");

  // No filter counts when readiness is unknown, and this page has no actions log control.
  await expect(page.getByRole("navigation", { name: "Filter penetrations" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Decisions/ })).toHaveCount(0);
  await expect(page.getByText("Crew can go")).toHaveCount(0);

  // Stock is down, so the penetration cannot be checked. The page says so and never invents an empty log.
  await gotoApp(page, "/sites/site-b/penetrations/pen-b-01");
  await expect(page.getByRole("heading", { level: 1, name: "Quayside House, Levels 3 to 5" })).toBeVisible();
  await expect(page.getByText("Can't check this site right now. Don't assume it's clear. Try again.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Penetration" })).toHaveCount(0);
  await expect(page.getByText("Nothing recorded")).toHaveCount(0);
  await expect(appText(page, "0")).toHaveCount(0);
  await expect(page.getByText("Crew can go")).toHaveCount(0);

  // Stock down makes every site's log unreadable, so the page says it cannot be loaded.
  await gotoApp(page, "/actions");
  await expect(page.getByRole("heading", { level: 1, name: "Decisions" })).toBeVisible();
  await expect(page.getByText("We can't load the decisions right now. Try again shortly.")).toBeVisible();
  await expect(page.getByText("Nothing recorded")).toHaveCount(0);
  await expect(page.getByText("Crew can go")).toHaveCount(0);
});

test("AC 77 to 79: with the stock down every crew counts as can't go, the totals never count, and the panel opens on Blocked", async ({ page }) => {
  await gotoApp(page, "/map");
  const verdict = page.locator("[data-verdict]");
  await expect(verdict.getByRole("heading", { level: 2 })).toHaveText("4 of 4 crews can't go yet");
  await expect(verdict.getByText("Stock can't be checked", { exact: true })).toBeVisible();
  await expect(verdict.getByRole("img", { name: "4 can't be checked" }).locator('[data-segment="unchecked"]')).toHaveCount(4);
  const tablist = page.getByRole("tablist", { name: "Projects by status" });
  await expect(tablist.getByRole("tab")).toHaveText(["All 4", "Blocked 4", "Crew can go 0", "Other 0"]);
  // Crew can go has no project, so the panel opens on Blocked, every pin in the can't-check yellow.
  await expect(tablist.getByRole("tab", { name: "Blocked 4" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-pin]")).toHaveCount(4);
  // Under the map, the list's own card for the first project: its amber signal checks again and never calls.
  const card = page.getByRole("region", { name: "Selected project" });
  await expect(card.locator('[data-signal="unknown"]')).toHaveCount(1);
  await expect(card.getByRole("button", { name: /^Can't check/ })).toBeVisible();
  await expect(card.getByRole("link", { name: /Sort out shortages|Check data problems/ })).toHaveCount(0);
  // An empty tab says so, and has no pin.
  await tablist.getByRole("tab", { name: "Crew can go 0" }).click();
  await expect(page.locator("[data-pin]")).toHaveCount(0);
  await expect(card).toContainText("No projects in this group.");
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
  await expect(appText(page, "0")).toHaveCount(0);
  const tabs = page.getByRole("navigation", { name: "Material" });
  await expect(tabs.getByRole("link", { name: "Stock" })).toHaveAttribute("aria-current", "page");
  await expect(tabs.getByRole("link", { name: "Decisions" })).not.toContainText(/\d/);

  await gotoApp(page, "/materials/MAT-SEALANT?tab=log");
  await expect(page.getByText("We can't load this material's actions right now. Try again shortly.")).toBeVisible();
  await expect(page.getByText("Nothing recorded")).toHaveCount(0);
  await expect(appText(page, "0")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Material" }).getByRole("link", { name: "Decisions" })).not.toContainText(/\d/);
});

test("AC 72: with stock down no project is Ready or Shortage, and Unknown shows every project", async ({ page }) => {
  // Fail closed: a project that can't be checked is never filtered in as ready or short.
  for (const status of ["ready", "shortage"]) {
    await gotoApp(page, `/sites?status=${status}`);
    await expect(page.getByText("No projects match these filters."), status).toBeVisible();
    // The list's cards; today's panel above it ignores the list's filter (AC 77).
    await expect(page.getByRole("list", { name: "Projects" }).locator("[data-signal]"), status).toHaveCount(0);
  }
  await gotoApp(page, "/sites?status=unknown");
  await expect(page.getByText("4 of 4 projects")).toBeVisible();
  await expect(page.getByRole("list", { name: "Projects" }).locator('[data-signal="unknown"]')).toHaveCount(4);
});
