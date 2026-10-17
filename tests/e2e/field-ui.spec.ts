import { expect, test } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

test("AC 48: the connection bar shows Online, and working offline sends nothing until Sync now", async ({ page }) => {
  // Read-only: the one decision tried while offline is never sent, and the route is blocked as well to be sure.
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") sent.push(request.url());
  });
  await page.route("**/api/sites/*/shortages/**", (route) => route.abort());
  await gotoApp(page, "/sites/site-b");
  const online = page.getByRole("switch", { name: "Online" });
  await expect(online).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Picker last action ·", { exact: false })).toBeVisible();
  await expect(page.getByText("Picker last action · unknown")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Offline" })).toHaveCount(0);

  await online.click();
  await expect(online).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "offline");
  await expect(page.getByText(/^Updated \d\d:\d\d$/)).toBeVisible();
  const banner = page.getByRole("region", { name: "Offline" });
  await expect(banner.getByText(/^You're offline\. You're seeing data from \d\d:\d\d\./)).toBeVisible();
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  await page.getByRole("button", { name: "Wait Pipe collar for 25 mm pipe at Harbour Point, Levels 3 to 5" }).click();
  const wait = page.getByRole("dialog", { name: /^Wait: / });
  await wait.getByRole("button", { name: "Send wait" }).click();
  await expect(wait.getByText("You're offline, so nothing was sent.", { exact: false })).toBeVisible();
  await wait.getByRole("button", { name: "Cancel" }).click();
  expect(sent).toEqual([]);

  await banner.getByRole("button", { name: "Offline details" }).click();
  const details = page.getByRole("dialog", { name: "Offline details" });
  await expect(details.getByText("Stock figures from")).toBeVisible();
  await expect(details.getByText("Not synced on this phone yet")).toBeVisible();
  await assertTargets(page);
  await details.getByRole("button", { name: "Sync now" }).click();
  await expect(online).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("region", { name: "Offline" })).toHaveCount(0);
  await expect(page.locator("[data-announcer]")).toHaveText("Synced");
});

test("AC 49: each site card has one main action, and action names never repeat the site name", async ({ page }) => {
  await gotoApp(page, "/sites");
  const riverside = page.getByRole("listitem").filter({ hasText: "Riverside Plaza, Block A" });
  await expect(riverside.getByText("Operator · Mere Tane")).toBeVisible();
  const text = riverside.getByRole("link", { name: "Text operator" });
  await expect(text).toHaveAttribute("href", /^sms:\+447700900156\?&body=Riverside%20Plaza%2C%20Block%20A%2C%20Job%20ref%20RP-A2/);
  await expect(riverside.getByRole("link", { name: "Call operator" })).toHaveAttribute("href", "tel:+447700900156");

  for (const [name, href] of [
    ["Harbour Point, Levels 3 to 5", "/sites/site-b#action-needed"],
    ["Kingsway Works, Phase 2", "/sites/site-c#action-needed"],
  ] as const) {
    const card = page.getByRole("listitem").filter({ hasText: name });
    await expect(card.getByRole("link", { name: "Sort out shortages" })).toHaveAttribute("href", href);
    await expect(page.getByRole("link", { name })).toHaveCount(1);
  }
  const mill = page.getByRole("listitem").filter({ hasText: "Old Mill Annex" });
  await expect(mill.getByRole("link")).toHaveCount(1);
  await expect(mill.getByRole("button")).toHaveCount(0);
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  await page.getByRole("listitem").filter({ hasText: "Harbour Point, Levels 3 to 5" }).getByRole("link", { name: "Sort out shortages" }).click();
  await expect(page).toHaveURL(/\/sites\/site-b#action-needed$/);
  await expect(page.getByRole("heading", { level: 2, name: "Needs your decision" })).toBeVisible();
});

test("AC 50: a blocked site opens with what needs a decision; a clear site has no panel", async ({ page }) => {
  await gotoApp(page, "/sites/site-b");
  const panel = page.getByRole("region", { name: "Needs your decision" });
  await expect(panel.getByText("Can't go yet: 2 shortages")).toBeVisible();
  await expect(panel.getByText("Short 2 of 4", { exact: true })).toBeVisible();
  await expect(panel.getByText("Short 2 of 10 cartridges", { exact: true })).toBeVisible();
  await expect(panel.getByRole("link", { name: "4 penetrations affected" })).toHaveAttribute(
    "href",
    "/sites/site-b?material=MAT-COLLAR-25#penetrations-heading",
  );
  await expect(panel.getByRole("link", { name: "12 penetrations affected" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Escalate Intumescent sealant, 310 ml cartridge at Harbour Point, Levels 3 to 5" })).toBeVisible();
  await expect(panel.getByText("Mineral wool batt", { exact: false })).toBeVisible();
  await expect(panel.getByText("Stock is shared and not reserved, so another site can still use it first.")).toBeVisible();
  await expect(panel.getByRole("link", { name: "Call Sam Lee, picker (warehouse)" })).toHaveAttribute("href", "tel:+447700900157");
  await expect(panel.getByRole("link", { name: "Call Wiremu Ngata, operator" })).toHaveAttribute("href", "tel:+447700900158");
  await expect(page.getByText("Crew can go")).toHaveCount(0);
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  await gotoApp(page, "/sites/site-c");
  const kingsway = page.getByRole("region", { name: "Needs your decision" });
  await expect(kingsway.getByText("Can't go yet: 1 shortage · 4 data problems")).toBeVisible();
  await expect(kingsway.getByText("Stock unknown · needs 1 tube", { exact: true })).toBeVisible();
  await expect(kingsway.getByRole("link", { name: "4 data problems · 4 penetrations affected" })).toHaveAttribute(
    "href",
    "/sites/site-c?show=data-problems#penetrations-heading",
  );
  await expect(kingsway.getByText("Picker and operator")).toBeVisible();
  await expect(kingsway.getByRole("link", { name: /^Call / })).toHaveCount(1);

  await gotoApp(page, "/sites/site-a");
  await expect(page.getByRole("region", { name: "Needs your decision" })).toHaveCount(0);
  await expect(page.getByText("Crew can go")).toBeVisible();
});

test("AC 51: body text is 18px, and every target is 48 by 48 on the field screens", async ({ page }) => {
  for (const path of ["/sites", "/sites/site-b", "/sites/site-b/penetrations/pen-b-01", "/materials/MAT-SEALANT"]) {
    await gotoApp(page, path);
    expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe("18px");
    await assertTargets(page);
    await assertNoOverflow(page);
  }
});
