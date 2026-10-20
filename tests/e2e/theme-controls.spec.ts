import { expect, test, type Page } from "@playwright/test";
import { gotoApp } from "./support";

// Read-only, on the main server: every control on the main and inner pages takes the theme's colours, in both themes
// (AC 89). Only the signal (the big switch, the calendar ovals, the map pins) keeps go green and stop red.

const PAGES = [
  "/map",
  "/calendar",
  "/sites",
  "/about-this-demo",
  "/actions",
  "/materials",
  "/materials/MAT-SEALANT",
  "/sites/site-a",
  "/sites/site-b",
  "/sites/site-c",
  "/sites/site-c?show=data-problems",
  "/sites/site-b?show=acted",
  "/sites/site-b/penetrations/pen-b-01",
  "/sites/site-b/penetrations/pen-b-01?tab=log",
  "/sites/site-a/picks",
  "/sites/site-b/picks/review?line=b-sealant",
] as const;

/** Colours of every visible control and what it holds that are none of the theme's tokens, as "prop=colour on name". */
async function offTheme(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const tokens = ["--text", "--text-secondary", "--bg", "--surface", "--border", "--input-border", "--focus", "--link", "--button-bg", "--button-text", "--brand-black", "--brand-yellow", "--chrome-bg", "--chrome-text", "--chrome-text-secondary", "--chrome-surface", "--chrome-border", "--neutral-bg", "--neutral-text", "--info-bg", "--info-text", "--escalation-bg", "--escalation-text"];
    const probe = document.createElement("i");
    document.body.appendChild(probe);
    // Tokens are read where they apply too: the header and the panels swap them for the black chrome.
    const allowed = new Set(["rgba(0, 0, 0, 0)"]);
    for (const element of [document.documentElement, ...document.querySelectorAll<HTMLElement>("header, nav, section, [data-connection], [data-today]")]) {
      const style = getComputedStyle(element);
      for (const token of tokens) {
        const value = style.getPropertyValue(token).trim();
        if (!value) continue;
        probe.style.color = value;
        allowed.add(getComputedStyle(probe).color);
      }
    }
    probe.remove();
    const found = new Set<string>();
    for (const control of document.querySelectorAll<HTMLElement>("a, button, input, select, textarea, summary, label, [role=tab], [role=switch], [data-connection]")) {
      if (control.getClientRects().length === 0) continue;
      if (control.closest("[data-signal], [data-calendar-site], [data-projects-map], .mapboxgl-map")) continue;
      for (const element of [control, ...control.querySelectorAll<HTMLElement>("*")]) {
        if (element.getClientRects().length === 0 || (element.closest("svg") && element.tagName !== "svg")) continue;
        const style = getComputedStyle(element);
        const colours: [string, string][] = [
          ["color", style.color],
          ["background", style.backgroundColor],
          ["border", style.borderTopWidth === "0px" ? "" : style.borderTopColor],
          ["border-left", style.borderLeftWidth === "0px" ? "" : style.borderLeftColor],
        ];
        for (const [prop, colour] of colours) {
          if (!colour || allowed.has(colour) || /, 0\)$/.test(colour)) continue;
          const name = (control.innerText || control.getAttribute("aria-label") || control.tagName).replace(/\s+/g, " ").trim().slice(0, 40);
          found.add(`${prop}=${colour} on "${name}"`);
        }
      }
    }
    return [...found];
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`AC 89: every control takes the theme's colours, main and inner pages, ${theme} theme`, async ({ page }) => {
    test.setTimeout(600_000);
    await page.addInitScript((choice) => localStorage.setItem("team-leader:theme", choice), theme);
    for (const path of PAGES) {
      await gotoApp(page, path);
      expect(await offTheme(page), `${theme} ${path}`).toEqual([]);
    }
  });
}
