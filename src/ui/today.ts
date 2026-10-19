import { siteAction, type OperatorActions, type SiteActionInput } from "./contacts";
import { sitePath } from "./format";
import { siteChip, type StatusView } from "./status";
import { markerColour, validLocation, type LatLng } from "./travel";

/**
 * Today's panel on the projects list (AC 77 to 79), after the author's design "I · Verdict + tabs + map (B+D+E)":
 * the verdict, the tabs inside it, and the map and drawer of the chosen tab. Pure, so every word and number the
 * panel shows is tested here. Where the design and the project differ, the project's words and rules win: a crew
 * that can't be checked can't go (fail closed), and the drawer says what the project's cards say.
 */

/** A tab: the crews that can't go yet, the crews that can go, and the projects with nothing planned. */
export type TodayGroup = "blocked" | "go" | "idle";

/** One crew's segment of the bar. */
export type SegmentKind = "go" | "blocked" | "unchecked";

export interface TodayInput extends SiteActionInput {
  readonly location?: unknown;
}

export interface TodayProject {
  readonly id: string;
  readonly name: string;
  /** The name before its first comma, beside the pin. */
  readonly shortName: string;
  readonly href: string;
  readonly group: TodayGroup;
  readonly status: StatusView;
  /** The pin's colour: the project's signal colour, as on its card's map. */
  readonly colour: string;
  readonly location: LatLng | null;
  /** What the drawer says under the name. */
  readonly details: readonly string[];
  readonly operator: OperatorActions | null;
  readonly decide: { readonly label: string; readonly href: string } | null;
}

export interface TodayTab {
  readonly group: TodayGroup;
  readonly label: string;
  readonly count: number;
}

export interface Today {
  /** The panel's colour: stop when any crew can't go, go when every crew can, none with no crew. */
  readonly tone: "stop" | "go" | "none";
  readonly headline: string;
  readonly totals: string;
  /** One per crew, those that can go first. */
  readonly segments: readonly SegmentKind[];
  readonly barLabel: string;
  readonly tabs: readonly TodayTab[];
  /** In list order. */
  readonly projects: readonly TodayProject[];
  readonly initialGroup: TodayGroup;
}

export const TODAY = {
  today: "Today",
  tabsLabel: "Projects by status",
  mapLabel: "Map of projects",
  drawerLabel: "Selected project",
  empty: "No projects in this group.",
  allProjects: "All projects",
  tabs: { blocked: "Blocked", go: "Can go", idle: "Idle" },
} as const;

/** The tabs in the design's order. */
export const TODAY_GROUPS: readonly TodayGroup[] = ["blocked", "go", "idle"];

const SEGMENT_ORDER: readonly SegmentKind[] = ["go", "blocked", "unchecked"];

/** Can go only when clear; Idle only when nothing is planned; anything else, unknown included, can't go yet. */
export function todayGroup(crewStatus: string): TodayGroup {
  if (crewStatus === "clear") return "go";
  if (crewStatus === "nothing_planned") return "idle";
  return "blocked";
}

function segmentKind(crewStatus: string): SegmentKind | null {
  if (crewStatus === "nothing_planned") return null;
  if (crewStatus === "clear") return "go";
  if (crewStatus === "blocked") return "blocked";
  return "unchecked";
}

/** The tab whose segments a segment lights. */
export function segmentGroup(kind: SegmentKind): TodayGroup {
  return kind === "go" ? "go" : "blocked";
}

function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "2 of 3 crews can't go yet", "3 of 3 crews can go", or "No crews have work planned". */
export function headline(cantGo: number, crews: number): string {
  if (crews === 0) return "No crews have work planned";
  const noun = crews === 1 ? "crew" : "crews";
  return cantGo > 0 ? `${cantGo} of ${crews} ${noun} can't go yet` : `${crews} of ${crews} ${noun} can go`;
}

/** "3 shortages · 4 data problems"; never a count when any crew's stock can't be checked. */
export function totalsLine(shortages: number, problems: number, unchecked: boolean): string {
  if (unchecked) return "Stock can't be checked";
  const short = shortages === 0 ? "No shortages" : counted(shortages, "shortage", "shortages");
  const data = problems === 0 ? "no data problems" : counted(problems, "data problem", "data problems");
  return `${short} · ${data}`;
}

/** The bar in words: "1 can go, 2 blocked". */
function barText(segments: readonly SegmentKind[]): string {
  const words: Readonly<Record<SegmentKind, string>> = { go: "can go", blocked: "blocked", unchecked: "can't be checked" };
  return SEGMENT_ORDER.flatMap((kind) => {
    const count = segments.filter((segment) => segment === kind).length;
    return count > 0 ? [`${count} ${words[kind]}`] : [];
  }).join(", ");
}

/** Can go first, so a leader sees the crews to send; then Blocked, then Idle; Can go if every tab is empty. */
export function initialGroup(tabs: readonly TodayTab[]): TodayGroup {
  for (const group of ["go", "blocked", "idle"] as const) {
    if ((tabs.find((tab) => tab.group === group)?.count ?? 0) > 0) return group;
  }
  return "go";
}

/** The name before its first comma: "Quayside House" for "Quayside House, Levels 3 to 5". */
export function shortName(name: string): string {
  const comma = name.indexOf(",");
  const head = (comma === -1 ? name : name.slice(0, comma)).trim();
  return head.length > 0 ? head : name.trim();
}

function details(site: TodayInput, short: { readonly items: readonly string[]; readonly more: number }): string[] {
  if (site.crewStatus === "blocked") {
    const lines = short.items.map((item) => `Short: ${item}`);
    if (short.more > 0) lines.push(`and ${short.more} more`);
    if (site.dataProblemCount > 0) lines.push(`${counted(site.dataProblemCount, "data problem", "data problems")} to check`);
    return lines;
  }
  if (site.crewStatus === "clear") return ["Materials for the planned work are on hand (shared, not reserved)."];
  if (site.crewStatus === "nothing_planned") return ["No work planned at this project."];
  return ["Stock can't be checked right now, so don't send the crew yet."];
}

function project(site: TodayInput): TodayProject {
  const action = siteAction(site);
  return {
    id: site.id,
    name: site.name,
    shortName: shortName(site.name),
    href: sitePath(site.id),
    group: todayGroup(site.crewStatus),
    status: siteChip(site.crewStatus, site.shortageCount, site.dataProblemCount),
    colour: markerColour(site.crewStatus),
    location: validLocation(site.location),
    details: details(site, action.short),
    operator: action.operator,
    decide: action.decide,
  };
}

/** Everything the panel shows, from every project on the list (the list's filter does not change it). */
export function buildToday(sites: readonly TodayInput[]): Today {
  const projects = sites.map(project);
  const kinds = sites.flatMap((site) => {
    const kind = segmentKind(site.crewStatus);
    return kind ? [kind] : [];
  });
  const segments = SEGMENT_ORDER.flatMap((kind) => kinds.filter((segment) => segment === kind));
  const cantGo = segments.filter((segment) => segment !== "go").length;
  const blocked = sites.filter((site) => site.crewStatus === "blocked");
  const shortages = blocked.reduce((sum, site) => sum + site.shortageCount, 0);
  const problems = blocked.reduce((sum, site) => sum + site.dataProblemCount, 0);
  const tabs = TODAY_GROUPS.map((group) => {
    const count = projects.filter((item) => item.group === group).length;
    return { group, label: `${TODAY.tabs[group]} ${count}`, count };
  });
  return {
    tone: segments.length === 0 ? "none" : cantGo > 0 ? "stop" : "go",
    headline: headline(cantGo, segments.length),
    totals: totalsLine(shortages, problems, segments.includes("unchecked")),
    segments,
    barLabel: barText(segments),
    tabs,
    projects,
    initialGroup: initialGroup(tabs),
  };
}

/** The project the drawer opens on for a tab: its first in list order. */
export function firstProject(projects: readonly TodayProject[], group: TodayGroup): TodayProject | null {
  return projects.find((item) => item.group === group) ?? null;
}

/** The tab a key moves to (Left, Right, Home, End, wrapping round), or null for any other key. */
export function nextTab(groups: readonly TodayGroup[], current: TodayGroup, key: string): TodayGroup | null {
  const index = groups.indexOf(current);
  if (key === "ArrowRight") return groups[(index + 1) % groups.length] ?? null;
  if (key === "ArrowLeft") return groups[(index - 1 + groups.length) % groups.length] ?? null;
  if (key === "Home") return groups[0] ?? null;
  if (key === "End") return groups[groups.length - 1] ?? null;
  return null;
}

/** The room the pins have on the plain panel: its size and how far from each edge a pin may sit. */
export interface PinRoom {
  readonly width: number;
  readonly height: number;
  readonly insetX: number;
  readonly insetTop: number;
  readonly insetBottom: number;
}

/**
 * Where each pin sits on the plain panel, used without a Mapbox map: the projects in their relative places, north
 * up, east right, with one scale on both axes (longitude shrunk by the cosine of the latitude, as on a map), the
 * wider span filling the room and the whole centred in it.
 */
export function schematicPositions(points: readonly LatLng[], room: PinRoom): { x: number; y: number }[] {
  if (points.length === 0) return [];
  const midLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const squeeze = Math.cos((midLat * Math.PI) / 180);
  const xs = points.map((point) => point.lng * squeeze);
  const ys = points.map((point) => -point.lat);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;
  const roomX = room.width - 2 * room.insetX;
  const roomY = room.height - room.insetTop - room.insetBottom;
  const scales = [spanX > 0 ? roomX / spanX : Infinity, spanY > 0 ? roomY / spanY : Infinity];
  const scale = Math.min(...scales);
  const usedX = Number.isFinite(scale) ? spanX * scale : 0;
  const usedY = Number.isFinite(scale) ? spanY * scale : 0;
  const left = room.insetX + (roomX - usedX) / 2;
  const top = room.insetTop + (roomY - usedY) / 2;
  return xs.map((x, index) => ({
    x: Math.round(left + (Number.isFinite(scale) ? (x - minX) * scale : 0)),
    y: Math.round(top + (Number.isFinite(scale) ? (ys[index]! - minY) * scale : 0)),
  }));
}
