import { expect, test, type Page } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Read-only. From 1024px the pages look as they do on a phone (AC 47): the header across the top with the Online
// switch, the tab bar at the foot, and no side menu. The 375px tab bar specs stay in navigation-tabs.spec.ts.

async function expectClean(page: Page): Promise<void> {
  await assertAxe(page);
  await assertTargets(page);
  await assertNoOverflow(page);
}

test("AC 47: at 1280px the projects list has the phone's header and tab bar, and no side menu", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, "/sites");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav).toHaveCount(1);
  await expect(page.locator("[data-tab-bar]")).toBeVisible();
  await expect(nav.getByRole("link", { name: "Projects", exact: true })).toHaveAttribute("aria-current", "page");
  // At the foot of the screen, its entries in the page's 45rem column.
  const bar = await page.locator("[data-tab-bar]").boundingBox();
  expect(Math.round((bar?.y ?? 0) + (bar?.height ?? 0))).toBe(800);
  const entries = await page.locator("[data-tab-bar] ul").boundingBox();
  expect(entries?.width ?? 0).toBeLessThanOrEqual(721);
  await expect(page.getByRole("banner").getByRole("switch", { name: "Online" })).toBeVisible();
  await expect(page.locator("aside")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^(Collapse|Expand) menu$/ })).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-sidebar");
  await expectClean(page);
});

test("AC 47: the tab bar marks Inventory, Decisions and Guide on their pages at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const [path, name] of [
    ["/materials", "Inventory"],
    ["/actions", "Decisions"],
    ["/about-this-demo", "Guide"],
  ] as const) {
    await gotoApp(page, path);
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name, exact: true }), path).toHaveAttribute("aria-current", "page");
  }
});

test("AC 47: an inner page keeps its back control and has no tab bar at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, "/sites/site-b/penetrations/pen-b-01");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Back to Quayside House, Levels 3 to 5" })).toBeVisible();
  await expect(header.getByRole("switch", { name: "Online" })).toBeVisible();
  await expect(page.locator("[data-tab-bar]")).toHaveCount(0);
  await expectClean(page);
});

test("AC 47: a sticky heading sticks directly below the header", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, "/actions");
  // Nothing is recorded yet, so the log is too short to scroll. Give the page room below (style only, no data),
  // then scroll Quayside House's heading 8px under the header's bottom: stuck, its top meets the header's bottom;
  // without the header's offset it would sit 8px higher, under the header.
  const { heading, header } = await page.evaluate(() => {
    document.querySelector("main")?.style.setProperty("padding-bottom", "100vh");
    const title = document.querySelector("#site-site-b h2");
    const bar = document.querySelector("header");
    if (!(title instanceof HTMLElement) || !(bar instanceof HTMLElement)) return { heading: Number.NaN, header: Number.NaN };
    window.scrollTo(0, title.getBoundingClientRect().top + window.scrollY - bar.getBoundingClientRect().bottom + 8);
    return { heading: title.getBoundingClientRect().top, header: bar.getBoundingClientRect().bottom };
  });
  expect(Math.abs(heading - header)).toBeLessThanOrEqual(2);
});

test("AC 47: wide pages pass axe, targets and overflow at 1280px and 1024px", async ({ page }) => {
  for (const width of [1280, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ["/sites", "/sites/site-b", "/about-this-demo"]) {
      await gotoApp(page, path);
      await expectClean(page);
    }
  }
});
