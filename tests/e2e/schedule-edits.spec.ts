import { expect, test, type Page } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// On the main server, but it writes nothing there: a change is kept in this browser's localStorage, which every test
// starts without (AC 86, 87).

function cedar(page: Page) {
  return page.getByRole("list", { name: "Projects" }).getByRole("listitem").filter({ hasText: "Cedar Court, Block A" });
}

test("AC 86: the deadline opens this project's month; a picked day is kept on Confirm, said in a pop-up, and read first", async ({ page }) => {
  await gotoApp(page, "/sites");
  const line = cedar(page).locator('[data-deadline="site-a"]');
  await expect(line).toHaveText("Deadline · Fri 23 Oct 2026");
  await line.click();

  const dialog = page.getByRole("dialog", { name: "Change deadline" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Cedar Court, Block A");
  await expect(dialog).toContainText("Deadline · Fri 23 Oct 2026");
  await expect(dialog.getByRole("heading", { name: "October 2026" })).toBeVisible();
  // Only this project is on the calendar: one oval, on its own deadline, which starts picked.
  await expect(dialog.locator("[data-oval]")).toHaveCount(1);
  await expect(dialog.locator('[data-edit-day="2026-10-23"] [data-oval]')).toHaveAttribute("data-tone", "go");
  await expect(dialog.getByRole("button", { name: "Fri 23 Oct 2026, current deadline" })).toHaveAttribute("aria-pressed", "true");
  // Cancel top left, Confirm top right.
  const cancel = await dialog.getByRole("button", { name: "Cancel" }).boundingBox();
  const confirm = await dialog.getByRole("button", { name: "Confirm" }).boundingBox();
  const title = await dialog.getByRole("heading", { name: "Change deadline" }).boundingBox();
  expect(cancel!.x).toBeLessThan(title!.x);
  expect(confirm!.x).toBeGreaterThan(title!.x);
  expect(Math.abs(cancel!.y - confirm!.y)).toBeLessThanOrEqual(1);
  await assertAxe(page);
  await assertTargets(page);
  await assertNoOverflow(page);

  // Cancel changes nothing.
  await dialog.getByRole("button", { name: "Fri 30 Oct 2026" }).click();
  await expect(dialog.getByRole("button", { name: "Fri 30 Oct 2026" })).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.locator("[data-edit-picked]")).toHaveText("New deadline · Fri 30 Oct 2026");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(line).toHaveText("Deadline · Fri 23 Oct 2026");

  // Another month, another day, Confirm.
  await line.click();
  await expect(dialog.getByRole("button", { name: "Fri 23 Oct 2026, current deadline" })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Next month" }).click();
  await expect(dialog.getByRole("heading", { name: "November 2026" })).toBeVisible();
  await dialog.getByRole("button", { name: "Mon 2 Nov 2026" }).click();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog).toBeHidden();
  const notice = page.getByRole("alertdialog");
  await expect(notice).toHaveText("Cedar Court, Block A: deadline updated to Mon 2 Nov 2026.OK");
  await assertAxe(page);
  await notice.getByRole("button", { name: "OK" }).click();
  await expect(notice).toBeHidden();
  await expect(line).toBeFocused();
  await expect(line).toHaveText("Deadline · Mon 2 Nov 2026");
  await expect(line.locator("time")).toHaveAttribute("datetime", "2026-11-02");

  // Read from this browser before the sample data, after a reload and on the other tabs.
  await page.reload();
  await expect(cedar(page).locator('[data-deadline="site-a"]')).toHaveText("Deadline · Mon 2 Nov 2026");
  await gotoApp(page, "/calendar");
  await expect(page.locator('[data-date="2026-11-02"] [data-calendar-site="site-a"]')).toBeVisible();
  await expect(page.locator('[data-date="2026-10-23"] [data-calendar-site="site-a"]')).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Project on the calendar" }).locator('[data-deadline="site-a"]')).toHaveText("Deadline · Mon 2 Nov 2026");
});

test("AC 87: the operator opens a list with the current one ticked; only a different person is kept and announced", async ({ page }) => {
  await gotoApp(page, "/sites");
  const row = cedar(page).getByRole("button", { name: "Operator · Mere Tane" });
  await row.click();

  const dialog = page.getByRole("dialog", { name: "Change operator" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Cedar Court, Block A");
  await expect(dialog.getByRole("radio")).toHaveCount(5);
  await expect(dialog.getByRole("radio", { name: /Mere Tane/ })).toBeChecked();
  await assertAxe(page);
  await assertTargets(page);

  // The same person: Confirm only closes.
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  // Cancel keeps the operator.
  await row.click();
  await dialog.getByRole("radio", { name: /Wiremu Ngata/ }).check();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(cedar(page).getByRole("button", { name: "Operator · Mere Tane" })).toBeVisible();

  // Someone else: kept, and said.
  await row.click();
  await expect(dialog.getByRole("radio", { name: /Mere Tane/ })).toBeChecked();
  await dialog.getByRole("radio", { name: /Wiremu Ngata/ }).check();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  const notice = page.getByRole("alertdialog");
  await expect(notice).toContainText("You've updated the operator for Cedar Court, Block A to Wiremu Ngata.");
  await notice.getByRole("button", { name: "OK" }).click();

  // The name, Text, Call and the big signal all go to the new operator.
  const card = cedar(page);
  await expect(card.getByRole("button", { name: "Operator · Wiremu Ngata" })).toBeFocused();
  await expect(card.getByRole("link", { name: "Call operator" })).toHaveAttribute("href", "tel:+447700900158");
  await expect(card.getByRole("link", { name: "Text operator" })).toHaveAttribute("href", /^sms:\+447700900158\?&body=Cedar%20Court%2C%20Block%20A/);
  await expect(card.locator("[data-signal]")).toHaveAttribute("href", "tel:+447700900158");

  // Read first on the Map tab's card too.
  await gotoApp(page, "/map");
  const selected = page.getByRole("region", { name: "Selected project" });
  await expect(selected.getByRole("button", { name: "Operator · Wiremu Ngata" })).toBeVisible();
  await expect(selected.locator("[data-signal]")).toHaveAttribute("href", "tel:+447700900158");
});

async function changeOperator(page: Page, site: string, from: string, to: string) {
  await gotoApp(page, "/sites");
  await page.getByRole("list", { name: "Projects" }).getByRole("listitem").filter({ hasText: site }).getByRole("button", { name: `Operator · ${from}` }).click();
  const dialog = page.getByRole("dialog", { name: "Change operator" });
  await dialog.getByRole("radio", { name: new RegExp(to) }).check();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "OK" }).click();
}

test("AC 88: a site's own page reads the operator chosen on its card first: the row, the signal, Send the crew and who to ask", async ({ page }) => {
  // Before any change: the sample data's operator.
  await gotoApp(page, "/sites/site-b");
  await expect(page.getByRole("main").getByText("Operator · Wiremu Ngata")).toBeVisible();

  // Quayside House (blocked) to Tama Rewi.
  await changeOperator(page, "Quayside House, Levels 3 to 5", "Wiremu Ngata", "Tama Rewi");
  await gotoApp(page, "/sites/site-b");
  const main = page.getByRole("main");
  await expect(main.getByText("Operator · Tama Rewi")).toBeVisible();
  await expect(main.getByRole("link", { name: "Call operator" })).toHaveAttribute("href", "tel:+447700900159");
  await expect(main.getByRole("link", { name: "Text operator" })).toHaveAttribute("href", /^sms:\+447700900159\?&body=Quayside%20House/);
  await expect(main.locator("[data-signal]")).toHaveAttribute("href", "tel:+447700900159");
  const panel = page.getByRole("region", { name: "Needs your decision" });
  await expect(panel.getByRole("link", { name: "Call Tama Rewi, operator" })).toHaveAttribute("href", "tel:+447700900159");
  await expect(panel.getByText("Wiremu Ngata")).toHaveCount(0);
  await assertAxe(page);

  // Cedar Court (clear, picks match) to Wiremu Ngata: Send the crew texts him.
  await changeOperator(page, "Cedar Court, Block A", "Mere Tane", "Wiremu Ngata");
  await gotoApp(page, "/sites/site-a");
  await expect(page.getByRole("main").getByText("Operator · Wiremu Ngata")).toBeVisible();
  await expect(page.getByRole("region", { name: "Picks" }).getByRole("link", { name: "Send the crew" })).toHaveAttribute("href", /^sms:\+447700900158\?&body=/);
});
