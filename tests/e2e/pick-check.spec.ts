import { expect, test, type Page } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Read-only: these look at the pick check and switch the connection; no report is sent.

function picks(page: Page) {
  return page.getByRole("region", { name: "Picks" });
}

test("AC 61, AC 62: the site screen checks picks against the plan, not the warehouse's Picked", async ({ page }) => {
  await gotoApp(page, "/sites/site-b");
  const section = picks(page);
  await expect(section.getByText("Not ready · 3 pick issues")).toBeVisible();
  await expect(section.getByText("The warehouse marked every line Picked, but these don't match the plan.", { exact: false })).toBeVisible();
  await expect(section.getByRole("link", { name: "Review pick issues" })).toHaveAttribute("href", "/sites/site-b/picks");

  // Who picked, marked as sample data, with Call and Email.
  await expect(section.getByText("Sam Lee (sample)")).toBeVisible();
  await expect(section.getByText(/^Last action: marked picked · /)).toBeVisible();
  await expect(section.getByRole("link", { name: "Call", exact: true })).toHaveAttribute("href", "tel:+447700900157");
  await expect(section.getByRole("link", { name: "Email", exact: true })).toHaveAttribute(
    "href",
    "mailto:sam.lee@example.com?subject=Quayside%20House%2C%20Levels%203%20to%205%20pick%20issues",
  );

  // Each material planned against picked, with its label; every row opens its card.
  const rows = section.getByRole("listitem");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0)).toContainText("Need 10 · picked 6 · Applicator gun nozzle missing");
  await expect(rows.nth(0)).toContainText("Part-picked");
  await expect(rows.nth(1)).toContainText("Need 6 · picked 6 · Fixing kit (anchors and screws) missing");
  await expect(rows.nth(1)).toContainText("Missing parts");
  await expect(rows.nth(2)).toContainText("Plan FRR −/120/120 · picked FRR −/60/60");
  await expect(rows.nth(2)).toContainText("Wrong spec");
  await expect(rows.nth(3)).toContainText("Matches plan");
  await expect(rows.nth(1).getByRole("link", { name: /Pipe collar for 25 mm pipe/ })).toHaveAttribute("href", "/sites/site-b/picks#pick-b-collar");

  // Locked while any pick is wrong, and never worded as the go state.
  const send = section.getByRole("button", { name: "Send the crew" });
  await expect(send).toBeDisabled();
  await expect(section.getByText("Unlocks when every material matches the plan.")).toBeVisible();
  await expect(page.getByText("Crew can go")).toHaveCount(0);
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  // Every line matches and the site is clear: Send the crew texts the operator.
  await gotoApp(page, "/sites/site-a");
  await expect(picks(page).getByText("Picks match the plan")).toBeVisible();
  await expect(picks(page).getByRole("link", { name: "Send the crew" })).toHaveAttribute("href", /^sms:\+447700900156\?&body=/);

  // No pick list: can't check, never ready, and no one to call about it.
  await gotoApp(page, "/sites/site-d");
  await expect(picks(page).getByText("Can't check picks")).toBeVisible();
  await expect(picks(page).getByRole("button", { name: "Send the crew" })).toBeDisabled();
  await expect(picks(page).getByRole("link")).toHaveCount(0);

  // The home page is unchanged: the pick check lives on the site screens only.
  await gotoApp(page, "/sites");
  await expect(picks(page)).toHaveCount(0);
});

test("AC 63: offline, the pick check reads as last known and Send the crew is never decided from saved data", async ({ page }) => {
  await gotoApp(page, "/sites/site-a");
  await expect(picks(page).getByRole("link", { name: "Send the crew" })).toBeVisible();
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "offline");
  // Even where every saved line matched, it is locked.
  await expect(picks(page).getByRole("button", { name: "Send the crew" })).toBeDisabled();
  await expect(picks(page).getByText("Needs a live check. Never decided from saved data.")).toBeVisible();
  await expect(picks(page).getByText("Was matching")).toHaveCount(2);
  await expect(picks(page).getByText("Matches plan")).toHaveCount(0);

  await gotoApp(page, "/sites/site-b");
  const section = picks(page);
  await expect(section.getByText("Can't confirm · offline")).toBeVisible();
  await expect(section.getByText("Last known: 3 pick issues.", { exact: false })).toBeVisible();
  await expect(section.getByRole("link", { name: "Review saved pick issues" })).toBeVisible();
  for (const label of ["Was part-picked", "Was missing parts", "Was wrong spec", "Was matching"]) {
    await expect(section.getByText(label), label).toBeVisible();
  }
  await expect(section.getByText("Picked by · warehouse (saved contact)")).toBeVisible();
  await expect(section.getByRole("link", { name: "Call (works offline)" })).toHaveAttribute("href", "tel:+447700900157");
  await expect(section.getByRole("button", { name: "Send the crew" })).toBeDisabled();
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "online");
  await expect(picks(page).getByText("Not ready · 3 pick issues")).toBeVisible();
});

test("AC 64: the Pick check page explains each issue and leads to the report", async ({ page }) => {
  await gotoApp(page, "/sites/site-b/picks");
  await expect(page.getByRole("heading", { level: 1, name: "Pick check · 3 issues" })).toBeVisible();
  await expect(page.getByText("The warehouse status never overrides this check.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Quayside House, Levels 3 to 5" })).toHaveAttribute("href", "/sites/site-b");

  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  const sealant = page.getByRole("article", { name: "Intumescent sealant, 310 ml cartridge" });
  await expect(sealant.getByText("1 · Partly picked, accessory missing")).toBeVisible();
  await expect(sealant.getByRole("img", { name: "6 of 10 picked" })).toBeVisible();
  await expect(sealant.getByText("Applicator gun nozzle", { exact: true })).toBeVisible();
  await expect(sealant.getByText("0 of 1")).toBeVisible();
  await expect(sealant.getByText("4 cartridges short for 12 openings", { exact: false })).toBeVisible();

  const collar = page.getByRole("article", { name: "Pipe collar for 25 mm pipe" });
  await expect(collar.getByText("2 · Marked picked, parts missing")).toBeVisible();
  await expect(collar.getByText("6 of 6")).toBeVisible();
  await expect(collar.getByText("0 of 6")).toBeVisible();

  const batt = page.getByRole("article", { name: "Mineral wool batt" });
  await expect(batt.getByText("3 · Wrong spec")).toBeVisible();
  await expect(batt.getByText("FRR −/120/120")).toBeVisible();
  await expect(batt.getByText("FRR −/60/60")).toBeVisible();

  await expect(page.getByRole("link", { name: "Call Sam Lee" })).toHaveAttribute("href", "tel:+447700900157");
  await expect(page.getByRole("link", { name: "Report to warehouse" })).toHaveAttribute("href", "/sites/site-b/picks/report?line=b-sealant");
  await expect(page.getByRole("link", { name: "Wait for re-pick" })).toHaveAttribute("href", "/sites/site-b");
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  // Opened from the site screen's row, the page lands on that line's card.
  await gotoApp(page, "/sites/site-b");
  await picks(page).getByRole("link", { name: /Pipe collar for 25 mm pipe/ }).click();
  await expect(page).toHaveURL(/\/sites\/site-b\/picks#pick-b-collar$/);

  // Offline it says the issues are the last known.
  await gotoApp(page, "/sites/site-b/picks");
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.getByText("These issues are the last known.", { exact: false })).toBeVisible();
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "online");
});

test("AC 67: every material has its own Review, the lines that match the plan too, and the review asks with two big answers", async ({ page }) => {
  await gotoApp(page, "/sites/site-b");
  const rows = picks(page).getByRole("listitem");
  await expect(rows).toHaveCount(4);
  const lines = [
    ["b-sealant", "Intumescent sealant, 310 ml cartridge", "Part-picked"],
    ["b-collar", "Pipe collar for 25 mm pipe", "Missing parts"],
    ["b-batt", "Mineral wool batt", "Wrong spec"],
    ["b-wrap", "Intumescent wrap strip", "Matches plan"],
  ] as const;
  for (const [index, [id, name, label]] of lines.entries()) {
    const row = rows.nth(index);
    await expect(row, name).toContainText(label);
    const review = row.getByRole("link", { name: "Review", exact: true });
    await expect(review, name).toHaveAttribute("href", `/sites/site-b/picks/review?line=${id}`);
    await expect(review, name).toHaveAccessibleDescription(name);
    const box = await review.boundingBox();
    expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(48);
  }
  await assertTargets(page);
  await assertNoOverflow(page);

  // Offline the rows still offer it: a review can wait on the phone (AC 71).
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "offline");
  await expect(picks(page).getByRole("link", { name: "Review", exact: true })).toHaveCount(4);
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "online");

  // Each Pick check card offers it too.
  await gotoApp(page, "/sites/site-b/picks");
  await expect(page.getByRole("article").getByRole("link", { name: "Review", exact: true })).toHaveCount(3);

  // The review of a line that matches the plan: what was picked, then Yes in green and No in red, both big.
  await gotoApp(page, "/sites/site-a");
  await picks(page).getByRole("listitem").filter({ hasText: "Pipe collar for 25 mm pipe" }).getByRole("link", { name: "Review", exact: true }).click();
  await expect(page).toHaveURL(/\/sites\/site-a\/picks\/review\?line=a-collar$/);
  await expect(page.getByRole("heading", { level: 1, name: "Review on site" })).toBeVisible();
  const card = page.getByRole("region", { name: "Pipe collar for 25 mm pipe" });
  await expect(card.getByText("Need 4 · picked 4")).toBeVisible();
  await expect(card.getByText("Matches plan")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Is it right on site?" })).toBeVisible();
  const yes = page.getByRole("button", { name: /^Yes, it's right/ });
  const no = page.getByRole("link", { name: /^No, something's wrong/ });
  await expect(no).toHaveAttribute("href", "/sites/site-a/picks/report?line=a-collar&from=review");
  for (const answer of [yes, no]) {
    const box = await answer.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(88);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(300);
  }
  await expect(page.getByRole("link", { name: "Back to Cedar Court, Block A" })).toHaveAttribute("href", "/sites/site-a");
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  // A line that is not on this site's pick list has nothing to review.
  await gotoApp(page, "/sites/site-a/picks/review?line=b-collar");
  await expect(page.getByText("That line is not on this site's pick list.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Yes, it's right/ })).toHaveCount(0);
});
