import { expect, test, type Page, type Request } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Writes reports and reviews on site-a, so it runs in the write project. Each test leaves site-a's picks matching
// the plan again: a later "Yes, it's right" closes what it reported.

const OUTBOX = "team-leader:pick-report-outbox";

function picks(page: Page) {
  return page.getByRole("region", { name: "Picks" });
}

function row(page: Page, name: string) {
  return picks(page).getByRole("listitem").filter({ hasText: name });
}

test("AC 68 to 70: a line that matched, reported damaged from site, is Not ready until a later review says it's right", async ({ page }) => {
  await gotoApp(page, "/sites/site-a");
  await expect(picks(page).getByText("Picks match the plan")).toBeVisible();
  await row(page, "Pipe collar for 25 mm pipe").getByRole("link", { name: "Review", exact: true }).click();
  await page.getByRole("link", { name: /^No, something's wrong/ }).click();

  // The report from a review: what the site found comes first, and nothing is chosen for the leader.
  await expect(page).toHaveURL(/\/sites\/site-a\/picks\/report\?line=a-collar&from=review$/);
  await expect(page.getByRole("heading", { level: 1, name: "Report to warehouse" })).toBeVisible();
  await expect(page).toHaveTitle(/^Report to warehouse/);
  await expect(page.getByRole("link", { name: "Back to Review on site" })).toHaveAttribute("href", "/sites/site-a/picks/review?line=a-collar");
  const kinds = page.getByRole("group", { name: "What did the site find?" }).getByRole("radio");
  await expect(kinds).toHaveCount(7);
  await expect(kinds.nth(0)).toHaveAccessibleName("Doesn't fit on site");
  await expect(kinds.nth(1)).toHaveAccessibleName("Wrong item");
  await expect(kinds.nth(2)).toHaveAccessibleName("Damaged, on the way or during the work");
  for (let index = 0; index < 7; index++) await expect(kinds.nth(index)).not.toBeChecked();
  await expect(page.getByLabel("Material")).toHaveValue("a-collar");
  await expect(page.getByRole("radio", { name: "Re-pick for the next delivery" })).toBeChecked();
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Choose what's wrong.")).toBeVisible();
  await page.getByLabel("How many are affected?").fill("2.5");
  await page.getByRole("radio", { name: "Damaged, on the way or during the work" }).check();
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Enter a whole number, 0 or more.")).toBeVisible();

  await page.getByLabel("How many are affected?").fill("2");
  await page.getByRole("radio", { name: "Same-day delivery" }).check();
  await page.getByLabel("Note").fill("Two collars cracked in the van.");
  const sent = page.waitForRequest((request) => request.url().endsWith("/api/sites/site-a/pick-reports") && request.method() === "POST");
  await page.getByRole("button", { name: "Send report" }).click();
  const request = await sent;
  expect(request.headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(request.postDataJSON()).toMatchObject({ kind: "damaged", lineId: "a-collar", affectedQty: 2, request: "same_day", note: "Two collars cracked in the van." });
  await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Report sent to the warehouse." })).toBeVisible();

  // On the site screen the line is an issue, saying what was found, how many and what was asked; the crew is held.
  await gotoApp(page, "/sites/site-a");
  const collar = row(page, "Pipe collar for 25 mm pipe");
  await expect(collar.getByText("Reported on site", { exact: true })).toBeVisible();
  await expect(collar.getByText(/^Reported .+ · Damaged · 2 affected · same-day delivery asked$/)).toBeVisible();
  await expect(picks(page).getByText("Not ready · 1 pick issue")).toBeVisible();
  await expect(picks(page).getByText("the pick list or the site found problems", { exact: false })).toBeVisible();
  await expect(picks(page).getByRole("button", { name: "Send the crew" })).toBeDisabled();
  await assertNoOverflow(page);
  await assertAxe(page);

  // The Pick check card names it and offers the review.
  await gotoApp(page, "/sites/site-a/picks");
  const card = page.getByRole("article", { name: "Pipe collar for 25 mm pipe" });
  await expect(card.getByText("1 · Reported on site")).toBeVisible();
  await expect(card.getByText("Damaged · 2 affected · same-day delivery asked", { exact: false })).toBeVisible();
  await expect(page.getByText("a reported line stays an issue until a review on site says it's right", { exact: false })).toBeVisible();
  await card.getByRole("link", { name: "Review", exact: true }).click();

  // A later review closes it: the picks match the plan again and the line reads checked on site.
  await expect(page.getByRole("region", { name: "Pipe collar for 25 mm pipe" }).getByText("Reported on site", { exact: true })).toBeVisible();
  const reviewed = page.waitForRequest((request) => request.url().endsWith("/api/sites/site-a/pick-reviews") && request.method() === "POST");
  await page.getByRole("button", { name: /^Yes, it's right/ }).click();
  const review = await reviewed;
  expect(review.headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(review.postDataJSON()).toEqual({ lineId: "a-collar" });
  await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Checked on site." })).toBeVisible();
  await page.getByRole("link", { name: "Back to the site" }).click();
  await expect(page).toHaveURL(/\/sites\/site-a$/);
  await expect(picks(page).getByText("Picks match the plan")).toBeVisible();
  await expect(row(page, "Pipe collar for 25 mm pipe").getByText(/^Checked on site /)).toBeVisible();
  await expect(row(page, "Pipe collar for 25 mm pipe").getByText("Matches plan")).toBeVisible();
  await expect(picks(page).getByRole("link", { name: "Send the crew" })).toBeVisible();
});

test("AC 71: offline, Yes, it's right waits on the phone and sends itself once online, only once", async ({ page }) => {
  const posts: Request[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/pick-reviews") && request.method() === "POST") posts.push(request);
  });
  await gotoApp(page, "/sites/site-a/picks/review?line=a-sealant");
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "offline");
  await expect(page.getByText("You can still review it.", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: /^Yes, it's right/ }).click();
  await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Saved on this phone. It sends by itself when you're back online." })).toBeVisible();
  expect(posts).toHaveLength(0);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]") as { key: string; siteId: string; type?: string; body: unknown }[], OUTBOX);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ siteId: "site-a", type: "review", body: { lineId: "a-sealant" } });

  // The site screen counts it apart from reports while it waits.
  await gotoApp(page, "/sites/site-a");
  await expect(picks(page).getByText("1 review waiting to send")).toBeVisible();

  // Back online it sends itself to the review address with the key it was saved with.
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(picks(page).getByText("1 review waiting to send")).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), OUTBOX)).toBe("[]");
  expect(posts).toHaveLength(1);
  expect(posts[0]!.headers()["idempotency-key"]).toBe(saved[0]!.key);

  // A resend with the same key is the same review, not a second one.
  const resend = await page.evaluate(async (key) => {
    const response = await fetch("/api/sites/site-a/pick-reviews", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify({ lineId: "a-sealant" }),
    });
    return { status: response.status, created: ((await response.json()) as { created: boolean }).created };
  }, saved[0]!.key);
  expect(resend).toEqual({ status: 200, created: false });

  await gotoApp(page, "/sites/site-a");
  await expect(row(page, "Intumescent sealant, 310 ml cartridge").getByText(/^Checked on site /)).toBeVisible();
  await expect(picks(page).getByText("Picks match the plan")).toBeVisible();
});
