import { expect, test, type Page } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp, tabTo } from "./support";

// Read-only. Runs before the write project, so no decisions are recorded yet.

function tabsOf(page: Page) {
  return page.getByRole("navigation", { name: "Main" });
}

test("AC 37: the landing page shows the same tab bar, and About this demo is current", async ({ page }) => {
  await gotoApp(page, "/");
  await expect(page.getByRole("banner").getByRole("link", { name: /^Back to / })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open sites" })).toHaveCount(0);
  const tabs = tabsOf(page);
  await expect(tabs.getByRole("link", { name: "About this demo" })).toHaveAttribute("aria-current", "page");
  await expect(tabs.getByRole("link", { name: "Sites" })).not.toHaveAttribute("aria-current", "page");
  await expect(tabs.getByRole("link", { name: "Materials" })).not.toHaveAttribute("aria-current", "page");
  await tabs.getByRole("link", { name: "Sites" }).click();
  await expect(page).toHaveURL(/\/sites$/);
  await expect(tabsOf(page).getByRole("link", { name: "Sites" })).toHaveAttribute("aria-current", "page");
});

test("AC 37: the tab bar is fixed to the foot of the screen with every entry, the current one marked", async ({ page }) => {
  await gotoApp(page, "/sites");
  // The top-level list has the tab bar, never a back control, and no menu button.
  await expect(page.getByRole("banner").getByRole("link", { name: /^Back to / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /menu/i })).toHaveCount(0);
  const tabs = tabsOf(page);
  await expect(tabs.getByRole("link")).toHaveText(["Sites", "Materials", "Actions log", "About this demo"]);
  await expect(tabs.getByRole("link", { name: "Sites" })).toHaveAttribute("aria-current", "page");
  await expect(tabs.getByRole("link", { name: "Materials" })).not.toHaveAttribute("aria-current", "page");
  await expect(tabs.getByRole("link", { name: "About this demo" })).toHaveAttribute("href", "/about-this-demo");

  // Pinned to the bottom of the viewport, full width, and it stays there while the page scrolls.
  const viewport = page.viewportSize();
  const pinned = async () => {
    const box = await tabs.boundingBox();
    return box === null || viewport === null ? null : { x: box.x, width: box.width, bottom: Math.round(box.y + box.height) };
  };
  await expect.poll(pinned).toEqual({ x: 0, width: viewport?.width, bottom: viewport?.height });
  await page.mouse.wheel(0, 2000);
  await expect.poll(pinned).toEqual({ x: 0, width: viewport?.width, bottom: viewport?.height });
  // The page keeps room for it, so the last row is never stuck behind it.
  const room = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom));
  expect(room).toBeGreaterThanOrEqual((await tabs.boundingBox())?.height ?? Infinity);
  await assertTargets(page);
  await assertAxe(page);
  await assertNoOverflow(page);

  await tabTo(page, /^Materials\s*$/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/materials$/);
  await expect(page.getByRole("heading", { level: 1, name: "Materials" })).toBeVisible();
  await expect(tabsOf(page).getByRole("link", { name: "Materials" })).toHaveAttribute("aria-current", "page");
});

test("AC 37: inner screens drop the tab bar and lead with the back control", async ({ page }) => {
  await gotoApp(page, "/sites");
  await tabsOf(page).getByRole("link", { name: "Actions log" }).click();
  await expect(page).toHaveURL(/\/actions$/);
  await expect(page.getByRole("banner").getByRole("link", { name: /^Back to / })).toHaveCount(0);

  for (const path of ["/sites/site-b", "/sites/site-b/penetrations/pen-b-01", "/materials/MAT-COLLAR-25"]) {
    await gotoApp(page, path);
    await expect(page.locator("[data-tab-bar]"), path).toHaveCount(0);
    await expect(page.getByRole("banner").getByRole("link", { name: /^Back to / }), path).toBeVisible();
    const room = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom));
    expect(room, path).toBe(0);
  }
  // Back on a top-level page, it returns.
  await page.getByRole("link", { name: "Back to Materials" }).click();
  await expect(page).toHaveURL(/\/materials$/);
  await expect(tabsOf(page)).toBeVisible();
});

test("AC 38: the materials list shows each planned material against the shared stock, across sites", async ({ page }) => {
  await gotoApp(page, "/materials");
  await expect(page.getByText("On hand, shared, not reserved")).toBeVisible();
  const rows = page.locator("main a[href^='/materials/']");
  await expect(rows).toHaveCount(6);
  // By name; putty is mapped only to a substitute nobody nominates, so no site plans it.
  await expect(rows.first()).toContainText("Fire mastic tube");
  await expect(page.locator("main a[href='/materials/MAT-PUTTY']")).toHaveCount(0);

  const collar = page.locator("main a[href='/materials/MAT-COLLAR-25']");
  await expect(collar).toContainText("On hand 2 · planned across sites 6");
  await expect(collar).toContainText("Short at 1 site");
  const mastic = page.locator("main a[href='/materials/MAT-MASTIC']");
  await expect(mastic).toContainText("Planned across sites 1 tube");
  await expect(mastic).toContainText("Stock unknown · needed at 1 site");
  await expect(mastic).not.toContainText("Not short");
  // Status chips carry an icon, never colour alone.
  await expect(mastic.locator("svg[aria-hidden='true']")).not.toHaveCount(0);
  const wrap = page.locator("main a[href='/materials/MAT-WRAP']");
  await expect(wrap).toContainText("Not short at any site");
  await expect(page.getByText(/\bready\b/i)).toHaveCount(0);
  await assertTargets(page);
  await assertNoOverflow(page);

  await collar.click();
  await expect(page).toHaveURL(/\/materials\/MAT-COLLAR-25$/);
  await expect(page.getByRole("link", { name: "Back to Materials" })).toBeVisible();
});

test("AC 37: the header's theme choice pins light or dark, is remembered on this device, and System follows the device", async ({ page }) => {
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.emulateMedia({ colorScheme: "light" });
  await gotoApp(page, "/sites");
  const theme = page.getByRole("banner").getByRole("group", { name: "Theme" });
  await expect(theme.getByRole("radio", { name: "System" })).toBeChecked();

  await theme.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await background()).toBe("rgb(18, 19, 22)");
  await assertAxe(page);
  await assertTargets(page);

  // Remembered: stamped before the page paints, and shown as the choice.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(theme.getByRole("radio", { name: "Dark" })).toBeChecked();

  // Arrow keys move the choice, as in any radio group.
  await theme.getByRole("radio", { name: "Dark" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(theme.getByRole("radio", { name: "Light" })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  // Light overrides a dark device; System hands it back.
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await background()).toBe("rgb(255, 255, 255)");
  await theme.getByRole("radio", { name: "System" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  expect(await background()).toBe("rgb(18, 19, 22)");
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
});
