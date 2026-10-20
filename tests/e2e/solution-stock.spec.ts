import { expect, test } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Read-only on the main server: the stock rows are server data, and the evidence draft lives in this browser only.

const PAGE = "/sites/site-b/penetrations/pen-b-01";

test("AC 90: every material table ends with Inventory captured and Status, and a substitute in stock can be proposed", async ({ page }) => {
  await gotoApp(page, PAGE);
  const tables = page.locator("table");
  // The nominated solution's table and the open substitute's.
  await expect(tables).toHaveCount(2);
  for (const table of await tables.all()) {
    const captured = table.locator("[data-inventory-captured]");
    await expect(captured.getByRole("rowheader")).toHaveText("Inventory captured");
    await expect(captured.locator("time")).toHaveText("20 Oct 2026, 9:00 am NZDT");
    await expect(captured.locator("time")).toHaveAttribute("datetime", "2026-10-19T20:00:00Z");
    const status = table.locator("[data-inventory-status]");
    await expect(status.getByRole("rowheader")).toHaveText("Status");
    await expect(status).toHaveAttribute("data-inventory-status", "READY");
    await expect(status).toContainText("READY");
    await expect(status).toContainText("Quantity available");
  }
  const substitutes = page.getByRole("region", { name: "Substitutes" });
  await expect(substitutes.locator("[data-plan-notice]")).toHaveText("Selecting a Solution changes the material plan. It does not reserve stock.");
  await expect(substitutes.getByRole("button", { name: /^Propose this/ })).toBeEnabled();
  await assertAxe(page);
  await assertTargets(page);
  await assertNoOverflow(page);
});

test("AC 91: portable evidence sits before Propose this, and its ticks and note come back for the same site", async ({ page }) => {
  await gotoApp(page, PAGE);
  const evidence = page.locator("[data-evidence]");
  await expect(evidence).toContainText("Portable evidence");
  await expect(evidence.getByRole("heading", { name: "Prepare shortage summary" })).toBeVisible();
  // Before the Propose button, in the page's order.
  const order = await page.evaluate(() => {
    const panel = document.querySelector("[data-evidence]");
    const propose = [...document.querySelectorAll("button")].find((button) => button.textContent?.startsWith("Propose this"));
    return panel && propose ? panel.compareDocumentPosition(propose) & Node.DOCUMENT_POSITION_FOLLOWING : 0;
  });
  expect(order).toBeTruthy();

  // Nothing ticked: the preview refuses.
  await evidence.getByRole("button", { name: "Preview summary" }).click();
  await expect(evidence.getByRole("alert")).toHaveText("Select at least one blocking requirement and keep the note within 500 characters.");

  const boxes = evidence.getByRole("checkbox");
  expect(await boxes.count()).toBeGreaterThan(0);
  await boxes.first().check();
  await evidence.getByLabel("Optional note").fill("Purchasing called at 9");
  await evidence.getByRole("button", { name: "Preview summary" }).click();
  const preview = evidence.getByLabel("Summary preview");
  await expect(preview).toHaveValue(/^MATERIAL SHORTAGE SUMMARY\nSite: Quayside House, Levels 3 to 5 \(Job ref QH-345\)/);
  await expect(preview).toHaveValue(/Substitute considered: 0451 \(catalogue match, not verified; stock READY\)/);
  await expect(preview).toHaveValue(/\nNote: Purchasing called at 9$/);
  await assertAxe(page);
  await assertTargets(page);

  // Kept by site id: a reload fills it back in.
  await page.reload();
  const again = page.locator("[data-evidence]");
  await expect(again.getByRole("checkbox").first()).toBeChecked();
  await expect(again.getByLabel("Optional note")).toHaveValue("Purchasing called at 9");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("team-leader:evidence") ?? "{}"));
  expect(Object.keys(stored)).toEqual(["site-b"]);
});
