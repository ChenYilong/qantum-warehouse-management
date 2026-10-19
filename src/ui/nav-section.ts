import type { EntityKind } from "./KindIcon";
import { CALENDAR_PATH, MAP_PATH } from "./format";
import { NAV } from "./messages";

/** Inventory and Decisions are top-level pages too, reached from the Guide and from links; they have no tab (AC 83). */
export type NavSection = "sites" | "map" | "calendar" | "materials" | "actions" | "about";

/** The work sections, in menu order. About this demo follows them, apart. */
export const NAV_ITEMS: readonly { section: NavSection; href: string; label: string; kind: EntityKind }[] = [
  { section: "sites", href: "/sites", label: NAV.sites, kind: "site" },
  { section: "map", href: MAP_PATH, label: NAV.map, kind: "map" },
  { section: "calendar", href: CALENDAR_PATH, label: NAV.calendar, kind: "calendar" },
];
