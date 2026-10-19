import { expect, test, type Locator, type Page } from "@playwright/test";
import { assertAxe, assertNoOverflow, assertTargets, gotoApp } from "./support";

// Read-only: the sign-in lives in the browser, and the connection switch records nothing.

async function colours(locator: Locator): Promise<{ background: string; color: string }> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  });
}

test("AC 58: the header's Online control is green with dark text online and red with white text offline", async ({ page }) => {
  await gotoApp(page, "/about-this-demo");
  const bar = page.locator("[data-connection]");
  await expect(bar).toHaveAttribute("data-connection", "online");
  expect(await colours(bar)).toEqual({ background: "rgb(61, 220, 108)", color: "rgb(4, 19, 10)" });
  await expect(bar.getByText("Online", { exact: true })).toBeVisible();
  await assertAxe(page);

  await page.getByRole("switch", { name: "Online" }).click();
  await expect(bar).toHaveAttribute("data-connection", "offline");
  expect(await colours(bar)).toEqual({ background: "rgb(179, 0, 27)", color: "rgb(255, 255, 255)" });
  await expect(bar.getByText("Offline", { exact: true })).toBeVisible();
  await assertAxe(page);

  await page.getByRole("switch", { name: "Online" }).click();
  await expect(bar).toHaveAttribute("data-connection", "online");
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  function gate(page: Page) {
    return page.locator("[data-login-gate]");
  }

  test("AC 59: a first visit is covered by the sign-in; any username and password get in, and it is remembered", async ({ page }) => {
    await gotoApp(page, "/");
    const dialog = page.getByRole("dialog", { name: "Sign in" });
    await expect(dialog).toBeVisible();
    await expect(page.locator("[data-app-shell]")).toHaveAttribute("inert", "");
    const box = await gate(page).boundingBox();
    expect(box).toEqual({ x: 0, y: 0, width: 375, height: 812 });
    await expect(dialog.getByRole("radio", { name: "Team leader" })).toBeChecked();
    await expect(dialog.getByRole("button", { name: "Forgot password?" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Create an account" })).toBeVisible();
    await assertAxe(page);
    await assertTargets(page);
    await assertNoOverflow(page);

    // Both are needed, and the cover stays until they are there.
    await dialog.getByRole("button", { name: "Sign in" }).click();
    await expect(dialog.getByText("Enter your username.")).toBeVisible();
    await expect(dialog.getByText("Enter your password.")).toBeVisible();
    await dialog.getByLabel("Username").fill("Alex");
    await dialog.getByRole("button", { name: "Sign in" }).click();
    await expect(dialog.getByText("Enter your password.")).toBeVisible();
    await expect(dialog).toBeVisible();

    // Any password will do.
    await dialog.getByLabel("Password", { exact: true }).fill("not checked");
    await dialog.getByRole("radio", { name: "Operator" }).check();
    await dialog.getByRole("button", { name: "Sign in" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("[data-app-shell]")).not.toHaveAttribute("inert", "");
    await expect(page.getByRole("banner").getByText("Hi, Alex")).toBeVisible();
    const stored = await page.evaluate(() => ({ ...localStorage }));
    expect(stored).toMatchObject({ "team-leader:user": "Alex", "team-leader:role": "operator", "team-leader:signed-in": "1" });
    expect(JSON.stringify(stored)).not.toContain("not checked");

    // A reload keeps the user signed in, stamped before paint so the cover never shows.
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-auth", "in");
    await expect(gate(page)).toBeHidden();
    await expect(page.getByRole("banner").getByText("Hi, Alex")).toBeVisible();
  });

  test("AC 60: Sign out at the Guide's top right, create account and forgot password", async ({ page }) => {
    await gotoApp(page, "/about-this-demo");
    const dialog = page.getByRole("dialog", { name: "Sign in" });
    await dialog.getByLabel("Username").fill("Alex");
    await dialog.getByLabel("Password", { exact: true }).fill("x");
    await dialog.getByRole("button", { name: "Sign in" }).click();
    await expect(dialog).toBeHidden();

    // Top right of the Guide: right-aligned, above the heading.
    const signOut = page.getByRole("button", { name: "Sign out" });
    const button = await signOut.boundingBox();
    const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
    if (!button || !heading) throw new Error("no layout");
    expect(button.x + button.width).toBeGreaterThan(375 - 24);
    expect(button.y).toBeLessThan(heading.y);
    await assertTargets(page);

    // Signing out brings the cover back with the username kept and the password to fill.
    await signOut.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Username")).toHaveValue("Alex");
    await expect(dialog.getByLabel("Password", { exact: true })).toBeFocused();
    await expect(page.locator("html")).not.toHaveAttribute("data-auth", /.+/);

    // Create account: the passwords must match, then it signs in.
    await dialog.getByRole("button", { name: "Create an account" }).click();
    const create = page.getByRole("dialog", { name: "Create an account" });
    await create.getByLabel("Username").fill("Sam");
    await create.getByLabel("Email (optional)").fill("sam@example.com");
    await create.getByRole("radio", { name: "Operator" }).check();
    await create.getByLabel("Password", { exact: true }).fill("one");
    await create.getByLabel("Confirm password").fill("two");
    await create.getByRole("button", { name: "Create account" }).click();
    await expect(create.getByText("The passwords don't match.")).toBeVisible();
    await create.getByLabel("Confirm password").fill("one");
    await create.getByRole("button", { name: "Create account" }).click();
    await expect(create).toBeHidden();
    await expect(page.getByRole("banner").getByText("Hi, Sam")).toBeVisible();
    const accounts = await page.evaluate(() => localStorage.getItem("team-leader:accounts"));
    expect(JSON.parse(accounts ?? "[]")).toEqual([{ username: "Sam", email: "sam@example.com", role: "operator" }]);

    // Forgot password: asks for a username or email, then says nothing was sent.
    await page.getByRole("button", { name: "Sign out" }).click();
    await dialog.getByRole("button", { name: "Forgot password?" }).click();
    const reset = page.getByRole("dialog", { name: "Reset your password" });
    await reset.getByRole("button", { name: "Send reset link" }).click();
    await expect(reset.getByText("Enter your username or email.")).toBeVisible();
    await reset.getByLabel("Username or email").fill("sam@example.com");
    await reset.getByRole("button", { name: "Send reset link" }).click();
    await expect(reset.getByRole("status")).toContainText("no email was sent");
    await reset.getByRole("button", { name: "Back to sign in" }).click();
    await expect(page.getByRole("dialog", { name: "Sign in" })).toBeVisible();
    await assertAxe(page);
  });
});
