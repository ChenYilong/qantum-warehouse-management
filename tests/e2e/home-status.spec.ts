import { expect, test } from "@playwright/test";
import { gotoApp } from "./support";

test("the sites list shows crew can go for Cedar Court and nothing planned for Foundry Lane", async ({ page }) => {
  // Read-only. Does not record an action.
  await gotoApp(page, "/sites");
  const riverside = page.getByRole("listitem").filter({ hasText: "Cedar Court, Block A" });
  await expect(riverside.getByText("Crew can go")).toBeVisible();
  const harbour = page.getByRole("listitem").filter({ hasText: "Quayside House, Levels 3 to 5" });
  await expect(harbour.getByText("Blocked · 2 shortages")).toBeVisible();
  const kingsway = page.getByRole("listitem").filter({ hasText: "Northgate Depot, Phase 2" });
  await expect(kingsway.getByText("Blocked · 1 shortage, 4 data problems")).toBeVisible();
  const mill = page.getByRole("listitem").filter({ hasText: "Foundry Lane Annex" });
  await expect(mill.getByText("Nothing planned")).toBeVisible();
});

test("landing page explains the demo, no screen carries a Demo tag, and there is no demo footer", async ({ page }) => {
  // Read-only. Follows links only. Does not record an action.
  await gotoApp(page, "/");
  await expect(page).toHaveURL(/\/about-this-demo$/);
  await expect(page.getByRole("heading", { level: 1, name: "Know which crews can roll out today" })).toBeVisible();
  // A brochure in plain words (AC 83): the four tabs as they are today, the colours, three steps and a short tour.
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 2 })).toHaveText(["Your four tabs", "What the colours mean", "Your morning in three taps", "Try it in two minutes", "Good to know", "Make it yours"]);
  const tabCards = main.getByRole("list").first().getByRole("listitem");
  await expect(tabCards).toHaveCount(4);
  await expect(tabCards.locator("span").first()).toHaveText("Map");
  for (const [name, href] of [
    ["Open Map", "/map"],
    ["Open Calendar", "/calendar"],
    ["Open Projects", "/sites"],
  ] as const) {
    await expect(main.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
  // No tab it no longer has: Inventory and Decisions are pages, not tabs.
  await expect(main.getByText(/\b(tab|tabs)\b.*\b(Inventory|Decisions)\b/)).toHaveCount(0);
  await expect(page.getByText("Everything here is sample data", { exact: false })).toBeVisible();
  await expect(page.getByText("Sign in as qantum with the password sdfkjh&_24", { exact: false })).toBeVisible();
  await expect(page.getByText("shares one set of choices", { exact: false })).toBeVisible();
  // One pointer to the source, specs and agent briefs; a plain link in the list, not a menu item.
  await expect(page.getByRole("link", { name: "Browse the source on GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/ChenYilong/qantum-warehouse-management",
  );
  await expect(page.getByRole("link", { name: /^Demo/ })).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open sites" })).toHaveCount(0);
  // The tour links to the pages it names.
  for (const [name, href] of [
    ["Quayside House", "/sites/site-b"],
    ["L3, Riser 2", "/sites/site-b/penetrations/pen-b-01"],
    ["Northgate Depot", "/sites/site-c?show=data-problems"],
    ["Map", "/map"],
    ["Calendar", "/calendar"],
    ["Inventory", "/materials"],
    ["Decisions", "/actions"],
  ] as const) {
    await expect(main.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
  await expect(page.getByRole("banner").getByRole("link", { name: /^Back to / })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Projects" }).click();
  await expect(page).toHaveURL(/\/sites$/);

  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  await expect(page.getByText(/\bref CC-A2\b/i)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to projects" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to site" })).toHaveCount(0);

  await gotoApp(page, "/sites/site-b");
  await expect(page.getByRole("heading", { level: 1, name: "Quayside House, Levels 3 to 5" })).toBeVisible();
  await expect(page.getByText(/Stock figures from 3 Oct 2026, 08:00 UTC \(\d+ days? old\)/)).toBeVisible();
  await expect(page.getByText("These stock figures are more than a day old. Check with the warehouse before relying on them.")).toBeVisible();
  await expect(page.locator("main p").filter({ hasText: "Job ref QH-345" })).toHaveText(/^Job ref QH-345\s*12 penetrations, 5 solutions$/);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Demo/ })).toHaveCount(0);

  const back = page.getByRole("link", { name: "Back to projects" });
  const box = await back.boundingBox();
  if (!box) throw new Error("back control has no box");
  await expect(back).toContainText("Projects");
  const headerBox = await page.getByRole("banner").boundingBox();
  if (!headerBox) throw new Error("header has no box");
  // The header is one compact row; the back control sits inside it. The title is the h1 in main, in full, below the header.
  expect(box.y).toBeGreaterThanOrEqual(headerBox.y);
  expect(box.y + box.height).toBeLessThanOrEqual(headerBox.y + headerBox.height + 1);
  expect(headerBox.height).toBeLessThan(64);
  const title = page.getByRole("main").getByRole("heading", { level: 1, name: "Quayside House, Levels 3 to 5" });
  await expect(title).toBeVisible();
  const titleBox = await title.boundingBox();
  if (!titleBox) throw new Error("title has no box");
  expect(titleBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
  await expect(page.getByRole("banner").getByRole("heading")).toHaveCount(0);
  await back.click();
  await expect(page).toHaveURL(/\/sites$/);
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();

  await gotoApp(page, "/sites/site-b");
  await expect(page.getByRole("link", { name: "Shortages 12" })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 500 });
  // In dev the stylesheet can land after hydration, so retry until the full-height layout can scroll.
  await expect
    .poll(() =>
      page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        return window.scrollY > 0;
      }),
    )
    .toBe(true);
  // The sticky header keeps the back control in view at the end of a long page.
  await expect(page.getByRole("banner")).toBeInViewport();
  await expect(page.getByRole("link", { name: "Back to projects" })).toBeInViewport();

  await gotoApp(page, "/sites/site-d");
  await expect(page.getByText("Nothing planned for this site")).toBeVisible();
  await expect(page.getByText("On hand, shared, not reserved")).toHaveCount(0);
  await expect(page.getByText(/^As of /)).toHaveCount(0);
  await expect(page.getByText("Stock figures from")).toHaveCount(0);
  await expect(page.getByText("more than a day old")).toHaveCount(0);
});
