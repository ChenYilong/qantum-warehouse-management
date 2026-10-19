import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AUTH_SCRIPT } from "@/ui/auth";
import { HEAD_SCRIPT } from "@/ui/head-script";
import { THEME_KEY, THEME_SCRIPT } from "@/ui/theme";

function fakeRoot(): { dataset: Record<string, string | undefined> } {
  return { dataset: {} };
}

function fakeStorage(fail = false) {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => {
      if (fail) throw new Error("blocked");
      return items.get(key) ?? null;
    },
  };
}

describe("AC 37, AC 47: what the head script stamps before the page paints", () => {
  it("is the theme and the demo sign-in only: there is no side menu to remember", () => {
    expect(HEAD_SCRIPT).toBe(`${THEME_SCRIPT}${AUTH_SCRIPT}`);
    expect(HEAD_SCRIPT).not.toContain("sidebar");
  });

  it("stamps a remembered theme before first paint, and survives blocked storage", () => {
    const run = (storage: ReturnType<typeof fakeStorage>) => {
      const root = fakeRoot();
      new Function("document", "localStorage", HEAD_SCRIPT)({ documentElement: root }, storage);
      return root.dataset;
    };
    const saved = fakeStorage();
    saved.items.set(THEME_KEY, "dark");
    saved.items.set("team-leader:sidebar", "collapsed");
    const stamped = run(saved);
    expect(stamped.theme).toBe("dark");
    expect(stamped.sidebar).toBeUndefined();
    expect(run(fakeStorage(true)).theme).toBeUndefined();
  });

  it("keeps the sticky header's offset at every width, since the header no longer hides on wide screens", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).not.toMatch(/--app-bar-height:\s*0;/);
    // The page keeps room for the tab bar at every width, not only below 1024px.
    expect(css).toMatch(/:root:has\(\[data-tab-bar\]\)\s*\{[^}]*--tab-bar-space:/s);
    expect(css).not.toMatch(/@media \(max-width: 1023\.98px\)\s*\{\s*:root:has\(\[data-tab-bar\]\)/);
  });
});
