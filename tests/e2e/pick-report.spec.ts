import { expect, test, type Request } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Writes pick reports, so it runs in the write project.

const OUTBOX = "team-leader:pick-report-outbox";

test("AC 65: report a pick error from the Pick check: prefilled from the line, checked, and sent with a key", async ({ page }) => {
  await gotoApp(page, "/sites/site-b/picks");
  await page.getByRole("link", { name: "Report to warehouse" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Report pick error" })).toBeVisible();
  await expect(page.getByText("Quayside House, Levels 3 to 5 · to Sam Lee, warehouse")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Pick check" })).toHaveAttribute("href", "/sites/site-b/picks");

  // Opened on the first issue, the sealant: partly picked, 10 planned, 6 picked, the nozzle missing.
  await expect(page.getByRole("radio", { name: "Partly picked, accessory missing" })).toBeChecked();
  await expect(page.getByLabel("Material")).toHaveValue("b-sealant");
  await expect(page.getByLabel("Plan needs")).toHaveValue("10");
  await expect(page.getByLabel("Actually picked")).toHaveValue("6");
  await expect(page.getByLabel("Missing accessory or part")).toHaveValue("Applicator gun nozzle × 1");
  await expect(page.getByRole("checkbox", { name: "Sam Lee · warehouse picker" })).toBeChecked();
  await expect(page.getByText("It won't be sent twice.", { exact: false })).toBeVisible();
  await assertTargets(page);
  await assertNoOverflow(page);
  await assertAxe(page);

  // Choosing another line fills the form from it.
  await page.getByLabel("Material").selectOption("b-collar");
  await expect(page.getByRole("radio", { name: "Marked picked, parts missing" })).toBeChecked();
  await expect(page.getByLabel("Plan needs")).toHaveValue("6");
  await expect(page.getByLabel("Missing accessory or part")).toHaveValue("Fixing kit (anchors and screws) × 6");

  // Someone must get it, and amounts are whole numbers.
  await page.getByRole("checkbox", { name: "Sam Lee · warehouse picker" }).uncheck();
  await page.getByLabel("Actually picked").fill("six");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Choose who gets the report.")).toBeVisible();
  await expect(page.getByText("Enter a whole number, 0 or more.")).toBeVisible();

  await page.getByRole("checkbox", { name: "Purchasing (if we need to order)" }).check();
  await page.getByLabel("Actually picked").fill("6");
  await page.getByLabel("Note").fill("Crew goes Thursday 7am.");
  const sent = page.waitForRequest((request) => request.url().endsWith("/api/sites/site-b/pick-reports") && request.method() === "POST");
  await page.getByRole("button", { name: "Send report" }).click();
  const request = await sent;
  expect(request.headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(request.postDataJSON()).toMatchObject({
    kind: "missing_parts",
    lineId: "b-collar",
    plannedQty: 6,
    pickedQty: 6,
    note: "Crew goes Thursday 7am.",
    sendToPicker: false,
    sendToPurchasing: true,
  });
  await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Report sent to the warehouse." })).toBeVisible();
  await page.getByRole("link", { name: "Back to the pick check" }).click();
  await expect(page).toHaveURL(/\/sites\/site-b\/picks$/);
});

test("AC 66: offline, the report waits on the phone, then sends itself once online, and only once", async ({ page }) => {
  const posts: Request[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/pick-reports") && request.method() === "POST") posts.push(request);
  });
  await gotoApp(page, "/sites/site-b/picks/report?line=b-batt");
  await expect(page.getByRole("radio", { name: "Wrong spec or rating" })).toBeChecked();
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.locator("[data-connection]")).toHaveAttribute("data-connection", "offline");
  await expect(page.getByText("You can still write the report.", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Saved on this phone. It sends by itself when you're back online." })).toBeVisible();
  expect(posts).toHaveLength(0);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]") as { key: string; siteId: string }[], OUTBOX);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ siteId: "site-b" });

  // The site screen counts it while it waits.
  await gotoApp(page, "/sites/site-b");
  await expect(page.getByRole("region", { name: "Picks" }).getByText("1 report waiting to send")).toBeVisible();

  // Back online it sends itself with the key it was saved with.
  await page.getByRole("switch", { name: "Online" }).click();
  await expect(page.getByRole("region", { name: "Picks" }).getByText("1 report waiting to send")).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), OUTBOX)).toBe("[]");
  expect(posts).toHaveLength(1);
  expect(posts[0]!.headers()["idempotency-key"]).toBe(saved[0]!.key);

  // A resend with the same key (an answer lost on a bad line) is the same record, not a second one.
  const resend = await page.evaluate(
    async ({ key, body }) => {
      const response = await fetch("/api/sites/site-b/pick-reports", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify(body),
      });
      return { status: response.status, created: ((await response.json()) as { created: boolean }).created };
    },
    { key: saved[0]!.key, body: posts[0]!.postDataJSON() as unknown },
  );
  expect(resend).toEqual({ status: 200, created: false });
});
