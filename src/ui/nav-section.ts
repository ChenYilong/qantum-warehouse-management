import type { EntityKind } from "./KindIcon";
import { ACTIONS_PATH, MATERIALS_PATH } from "./format";
import { NAV } from "./messages";

export type NavSection = "sites" | "materials" | "actions" | "about";

/** The work sections, in menu order. About this demo follows them, apart. */
export const NAV_ITEMS: readonly { section: NavSection; href: string; label: string; kind: EntityKind }[] = [
  { section: "sites", href: "/sites", label: NAV.sites, kind: "site" },
  { section: "materials", href: MATERIALS_PATH, label: NAV.materials, kind: "material" },
  { section: "actions", href: ACTIONS_PATH, label: NAV.actions, kind: "decision" },
];
