import { expect, test } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Read-only, on the main server: every project's card ends with its deadline in English (AC 80).

const DEADLINES = [
  ["Cedar Court, Block A", "site-a", "Fri 23 Oct 2026", "2026-10-23"],
  ["Quayside House, Levels 3 to 5", "site-b", "Tue 27 Oct 2026", "2026-10-27"],
  ["Northgate Depot, Phase 2", "site-c", "Tue 3 Nov 2026", "2026-11-03"],
  ["Foundry Lane Annex", "site-d", "Fri 13 Nov 2026", "2026-11-13"],
] as const;

test("AC 80: every project's card ends with its deadline in English, the card under today's map too", async ({ page }) => {
  await gotoApp(page, "/sites");
  const list = page.getByRole("list", { name: "Projects" });
  for (const [name, id, text, iso] of DEADLINES) {
    const card = list.getByRole("listitem").filter({ hasText: name });
    const line = card.locator(`[data-deadline="${id}"]`);
    await expect(line, name).toHaveText(`Deadline · ${text}`);
    await expect(line.locator("time"), name).toHaveAttribute("datetime", iso);
    // Appended: the last line of the card.
    await expect(card.locator(":scope > div > :last-child"), name).toHaveAttribute("data-deadline", id);
  }
  // The card under today's map is the same card, so it ends with the same line (Crew can go opens on Cedar Court).
  await expect(page.getByRole("region", { name: "Selected project" }).locator('[data-deadline="site-a"]')).toHaveText("Deadline · Fri 23 Oct 2026");
  await assertAxe(page);
  await assertTargets(page);
  await assertNoOverflow(page);
});
