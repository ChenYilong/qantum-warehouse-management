import type { EntityKind } from "./KindIcon";
import { ABOUT_PATH, ACTIONS_PATH, MATERIALS_PATH } from "./format";
import { NAV } from "./messages";

export type NavSection = "sites" | "materials" | "actions" | "about";

/** The work sections, in menu order. About this demo follows them, apart. */
export const NAV_ITEMS: readonly { section: NavSection; href: string; label: string; kind: EntityKind }[] = [
  { section: "sites", href: "/sites", label: NAV.sites, kind: "site" },
  { section: "materials", href: MATERIALS_PATH, label: NAV.materials, kind: "material" },
  { section: "actions", href: ACTIONS_PATH, label: NAV.actions, kind: "decision" },
];

/** Which menu entry is the current page. Anything outside the four sections is none. */
export function navSectionForPath(pathname: string): NavSection | "none" {
  if (pathname === ABOUT_PATH) return "about";
  if (pathname === "/sites" || pathname.startsWith("/sites/")) return "sites";
  if (pathname === "/materials" || pathname.startsWith("/materials/")) return "materials";
  if (pathname === "/actions") return "actions";
  return "none";
}
