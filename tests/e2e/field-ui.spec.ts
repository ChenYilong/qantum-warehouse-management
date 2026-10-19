import { expect, test, type Locator } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

async function fillOf(signal: Locator): Promise<[number, number, number]> {
  const css = await signal.evaluate((element) => getComputedStyle(element).backgroundColor);
  const [r, g, b] = (css.match(/\d+/g) ?? []).map(Number);
  return [r ?? -1, g ?? -1, b ?? -1];
}

async function messageOf(link: Locator): Promise<string> {
  const href = (await link.getAttribute("href")) ?? "";
  return decodeURIComponent(href.split("body=")[1] ?? "");
}

test("AC 48: the header's Online switch stays at the top while the page scrolls, with the picker's last action under it", async ({ page }) => {
  await gotoApp(page, "/sites/site-b");
  const header = page.getByRole("banner");
  const online = header.getByRole("switch", { name: "Online" });
  await expect(online).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("switch", { name: "Online" })).toHaveCount(1);
  // The picker's last action is the first line under the header.
  const headerBox = await header.boundingBox();
  const pickerBox = await page.getByText(/^Picker last action · /).boundingBox();
  expect(Math.round(pickerBox?.y ?? -1)).toBeGreaterThanOrEqual(Math.round((headerBox?.y ?? 0) + (headerBox?.height ?? 0)) - 1);
  // Scrolled to the end of a long page, the switch is still in the header at the top of the screen.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  const box = await online.boundingBox();
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.y ?? 99) + (box?.height ?? 0)).toBeLessThanOrEqual(56);
  // On every kind of screen: a top-level page, an inner page and the error page have the same switch in the header.
  for (const path of ["/sites", "/sites/site-b/penetrations/pen-b-01", "/materials", "/about-this-demo"]) {
    await gotoApp(page, path);
    await expect(page.getByRole("banner").getByRole("switch", { name: "Online" }), path).toBeVisible();
  }
});

test("AC 48: the header's switch shows Online, and working offline sends nothing until Sync now", async ({ page }) => {
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

  await page.getByRole("button", { name: "Wait Pipe collar for 25 mm pipe at Quayside House, Levels 3 to 5" }).click();
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

test("AC 49: each site card keeps Text operator, Call operator and Sort out shortages, and action names never repeat the site name", async ({ page }) => {
  await gotoApp(page, "/sites");
  const riverside = page.getByRole("listitem").filter({ hasText: "Cedar Court, Block A" });
  await expect(riverside.getByText("Operator · Mere Tane")).toBeVisible();
  const text = riverside.getByRole("link", { name: "Text operator" });
  await expect(text).toHaveAttribute("href", /^sms:\+447700900156\?&body=Cedar%20Court%2C%20Block%20A%2C%20Job%20ref%20CC-A2/);
  await expect(riverside.getByRole("link", { name: "Call operator" })).toHaveAttribute("href", "tel:+447700900156");

  for (const [name, href, operator] of [
    ["Quayside House, Levels 3 to 5", "/sites/site-b#action-needed", "+447700900158"],
    ["Northgate Depot, Phase 2", "/sites/site-c#action-needed", "+447700900159"],
  ] as const) {
    const card = page.getByRole("listitem").filter({ hasText: name });
    await expect(card.getByRole("link", { name: "Sort out shortages" })).toHaveAttribute("href", href);
    // A blocked site's operator is told too, or they make a wasted trip (AC 55).
    await expect(card.getByRole("link", { name: "Call operator" })).toHaveAttribute("href", `tel:${operator}`);
    await expect(card.getByRole("link", { name: "Text operator" })).toHaveAttribute("href", new RegExp(`^sms:\\${operator}\\?&body=`));
    await expect(page.getByRole("link", { name })).toHaveCount(1);
  }
  const mill = page.getByRole("listitem").filter({ hasText: "Foundry Lane Annex" });
  // Nothing planned: its name and its Directions (AC 74), never a call or a text (AC 57).
  await expect(mill.getByRole("link")).toHaveCount(2);
  await expect(mill.getByRole("link", { name: "Directions" })).toHaveCount(1);
  await expect(mill.locator('a[href^="tel:"], a[href^="sms:"]')).toHaveCount(0);
  await expect(mill.getByRole("button")).toHaveCount(0);
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  await page.getByRole("listitem").filter({ hasText: "Quayside House, Levels 3 to 5" }).getByRole("link", { name: "Sort out shortages" }).click();
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
  await expect(panel.getByRole("button", { name: "Escalate Intumescent sealant, 310 ml cartridge at Quayside House, Levels 3 to 5" })).toBeVisible();
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

test("AC 52, AC 57: each site's signal differs by colour, knob shape and knob side, and is big enough for gloves", async ({ page }) => {
  await gotoApp(page, "/sites");
  const cases = [
    ["Cedar Court, Block A", "go", "circle", "right"],
    ["Quayside House, Levels 3 to 5", "stop", "octagon", "left"],
    ["Northgate Depot, Phase 2", "stop", "octagon", "left"],
    ["Foundry Lane Annex", "idle", "ring", "left"],
  ] as const;
  for (const [name, tone, shape, knob] of cases) {
    const signal = page.getByRole("listitem").filter({ hasText: name }).locator("[data-signal]");
    await expect(signal).toHaveCount(1);
    await expect(signal).toHaveAttribute("data-signal", tone);
    await expect(signal).toHaveAttribute("data-knob", knob);
    await expect(signal.locator(`svg[data-shape="${shape}"]`)).toBeVisible();
    const box = await signal.boundingBox();
    if (!box) throw new Error(`${name} has no signal box`);
    expect(box.height).toBeGreaterThanOrEqual(88);
    expect(box.width).toBeGreaterThanOrEqual(280);
  }

  // Very green means ready and very red means parts are missing (AC 53 pins the exact contrast).
  const [goR, goG, goB] = await fillOf(page.locator('[data-signal="go"]'));
  expect(goG).toBeGreaterThan(goR + 60);
  expect(goG).toBeGreaterThan(goB + 60);
  const [stopR, stopG, stopB] = await fillOf(page.locator('[data-signal="stop"]').first());
  expect(stopR).toBeGreaterThan(stopG + 100);
  expect(stopR).toBeGreaterThan(stopB + 100);
  const [idleR, idleG, idleB] = await fillOf(page.locator('[data-signal="idle"]'));
  expect(Math.max(idleR, idleG, idleB) - Math.min(idleR, idleG, idleB)).toBeLessThan(30);

  // The labels are the status wording, one per card.
  const riverside = page.getByRole("listitem").filter({ hasText: "Cedar Court, Block A" });
  await expect(riverside.getByText("Crew can go")).toBeVisible();
  const harbour = page.getByRole("listitem").filter({ hasText: "Quayside House, Levels 3 to 5" });
  await expect(harbour.getByText("Blocked · 2 shortages")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Foundry Lane Annex" }).getByText("Nothing planned")).toBeVisible();

  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  // The same tokens turn bright on the dark theme, still green, red and grey.
  await page.emulateMedia({ colorScheme: "dark" });
  const [darkGoR, darkGoG] = await fillOf(page.locator('[data-signal="go"]'));
  expect(darkGoG).toBeGreaterThan(darkGoR + 60);
  const [darkStopR, darkStopG] = await fillOf(page.locator('[data-signal="stop"]').first());
  expect(darkStopR).toBeGreaterThan(darkStopG + 100);
  await assertAxe(page);
});

test("AC 54: tapping the signal calls the operator, with the same link as Call operator", async ({ page }) => {
  await gotoApp(page, "/sites");
  for (const [name, label, operator, hint] of [
    ["Cedar Court, Block A", /^Crew can go/, "+447700900156", "Tap to call"],
    ["Quayside House, Levels 3 to 5", /^Blocked · 2 shortages/, "+447700900158", "Tap to call"],
    ["Northgate Depot, Phase 2", /^Blocked · 1 shortage, 4 data problems/, "+447700900159", "Tap to call"],
  ] as const) {
    const card = page.getByRole("listitem").filter({ hasText: name });
    const signal = card.getByRole("link", { name: label });
    await expect(signal).toHaveAttribute("href", `tel:${operator}`);
    await expect(signal).toContainText(hint);
    await expect(card.getByRole("link", { name: "Call operator" })).toHaveAttribute("href", `tel:${operator}`);
    await expect(signal).toHaveAttribute("data-signal", /^(go|stop)$/);
    // The signal's name never repeats the site name or the other buttons' names.
    const accessibleName = (await signal.textContent()) ?? "";
    expect(accessibleName).not.toContain(name);
    expect(accessibleName.toLowerCase()).not.toContain("call operator");
    expect(accessibleName.toLowerCase()).not.toContain("text operator");
  }
  // Nothing planned has nothing to tap: the card's one link is its title.
  const mill = page.getByRole("listitem").filter({ hasText: "Foundry Lane Annex" });
  await expect(mill.locator("a[href^='tel:'], a[href^='sms:'], button")).toHaveCount(0);
  await expect(page.locator("a[data-signal][href^='sms:']")).toHaveCount(0);
});

test("AC 55: the operator is told, and a blocked site's text says parts are not complete and what is short", async ({ page }) => {
  await gotoApp(page, "/sites");
  const harbour = page.getByRole("listitem").filter({ hasText: "Quayside House, Levels 3 to 5" });
  const blocked = await messageOf(harbour.getByRole("link", { name: "Text operator" }));
  expect(blocked).toBe(
    "Quayside House, Levels 3 to 5, Job ref QH-345: parts are NOT complete. Don't go yet. Short: Pipe collar for 25 mm pipe; Intumescent sealant, 310 ml cartridge. I'll message you when it's sorted. From your team leader.",
  );
  expect(blocked).not.toMatch(/can go/i);

  const kingsway = page.getByRole("listitem").filter({ hasText: "Northgate Depot, Phase 2" });
  const unknown = await messageOf(kingsway.getByRole("link", { name: "Text operator" }));
  expect(unknown).toContain("Short: Fire mastic tube (stock unknown).");
  expect(unknown).toContain("Also 4 data problems to check.");
  expect(unknown).not.toMatch(/can go/i);

  const riverside = page.getByRole("listitem").filter({ hasText: "Cedar Court, Block A" });
  const clear = await messageOf(riverside.getByRole("link", { name: "Text operator" }));
  expect(clear).toContain("(shared, not reserved). You can go.");

  // The card shows what is short, so the leader sees what the text will say.
  await expect(harbour.getByText("Short:", { exact: true })).toBeVisible();
  await expect(harbour.getByText("Pipe collar for 25 mm pipe", { exact: false })).toBeVisible();
  await expect(harbour.getByText("Intumescent sealant, 310 ml cartridge", { exact: false })).toBeVisible();
  await expect(kingsway.getByText("Fire mastic tube (stock unknown)", { exact: false })).toBeVisible();
  await expect(riverside.getByText("Short:", { exact: true })).toHaveCount(0);

  // The same text is a tap away at the top of the site.
  await gotoApp(page, "/sites/site-b");
  expect(await messageOf(page.getByRole("main").getByRole("link", { name: "Text operator" }))).toBe(blocked);
});

test("AC 57: the signal and the operator row open each site, before the Needs your decision panel", async ({ page }) => {
  await gotoApp(page, "/sites/site-b");
  const signal = page.getByRole("main").locator("[data-signal]");
  await expect(signal).toHaveCount(1);
  await expect(signal).toHaveAttribute("data-signal", "stop");
  await expect(signal.getByText("Blocked · 2 shortages")).toBeVisible();
  await expect(signal).toHaveAttribute("href", "tel:+447700900158");
  const operatorRow = page.getByRole("main").getByText("Operator · Wiremu Ngata");
  await expect(operatorRow).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Call operator" })).toHaveAttribute("href", "tel:+447700900158");
  const panel = page.getByRole("region", { name: "Needs your decision" });
  const [signalBox, rowBox, panelBox] = await Promise.all([signal.boundingBox(), operatorRow.boundingBox(), panel.boundingBox()]);
  if (!signalBox || !rowBox || !panelBox) throw new Error("a part of the site top has no box");
  expect(signalBox.height).toBeGreaterThanOrEqual(88);
  expect(signalBox.y + signalBox.height).toBeLessThanOrEqual(rowBox.y + 1);
  expect(rowBox.y + rowBox.height).toBeLessThanOrEqual(panelBox.y + 1);
  await expect(page.getByText("Blocked: hold the crew.")).toHaveCount(0);
  await expect(page.getByText("Crew can go")).toHaveCount(0);
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  // A clear site's signal replaces its banner.
  await gotoApp(page, "/sites/site-a");
  const clear = page.getByRole("main").locator("[data-signal]");
  await expect(clear).toHaveAttribute("data-signal", "go");
  await expect(clear).toHaveAttribute("href", "tel:+447700900156");
  await expect(page.getByText("Crew can go")).toHaveCount(1);
  await expect(page.getByRole("main").getByRole("link", { name: "Text operator" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Needs your decision" })).toHaveCount(0);
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  // Nothing planned: a grey signal that cannot be tapped, and nobody to tell.
  await gotoApp(page, "/sites/site-d");
  const idle = page.getByRole("main").locator("[data-signal]");
  await expect(idle).toHaveAttribute("data-signal", "idle");
  await expect(idle.getByText("Nothing planned for this site")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /operator/i })).toHaveCount(0);
  await expect(page.locator("main a[href^='tel:'], main a[href^='sms:']")).toHaveCount(0);
});
