import { checkPickLine, isNonNegativeFinite, type CheckedPickLine, type PickCheck, type PickLine, type SiteFindings } from "@/domain";
import type { ShortageFact } from "./signal";
import { sitePath } from "./format";

/**
 * Pick up from other sites (AC 92 to 96): a blocked site takes a material another site was picked, and the site it
 * came from is blocked in turn. The pick lists under `data/sample` are read-only once deployed, so the move is kept in
 * this browser's localStorage, keyed by site id: each site the move touched is stored whole, its status and every
 * pick line's quantities. The site screens and the project cards read this store first and fall back to the sample
 * data only for a site or a line it does not hold. Pure, so every rule and word is tested here; the hook that
 * subscribes to it lives in `PickupStore.tsx`.
 *
 * Fail closed: the store can only ever block a site, never clear one, and a stored line that can't be read becomes
 * bad data on that line (it blocks), never the sample's number.
 */

export const PICKUPS_KEY = "team-leader:site-pickups";
/** Fired on this page after a save, so every card and screen showing a site follows at once. */
export const PICKUPS_CHANGED = "team-leader:site-pickups-changed";

/** One pick line as this browser holds it: the sample's fields, with the quantities after the move. */
export interface StoredLine {
  readonly materialName: string;
  readonly unit: string;
  readonly plannedQty: number;
  /** What the site holds now: picked, plus what came from other sites, less what went to them. */
  readonly pickedQty: number;
  /** Of `pickedQty`, how many came from other sites. */
  readonly pickedUpQty: number;
  /** How many this site gave to other sites. */
  readonly lentQty: number;
}

export interface SitePickup {
  /**
   * The site's status as the move left it: "blocked" for a site that gave, "clear" for a site whose pick-up covered
   * every shortage. A stored "clear" is never trusted on its own: `heldSite` clears a site only when the server's own
   * shortages are all covered by what this device picked up (AC 97).
   */
  readonly status: "blocked" | "clear";
  readonly updatedAt: string;
  /** Every pick line of the site, by line id. `null` is a line that was stored but can't be read. */
  readonly lines: Readonly<Record<string, StoredLine | null>>;
}

export type Pickups = Readonly<Record<string, SitePickup>>;

export type PickupStorage = Pick<Storage, "getItem" | "setItem">;

const ID = /^[A-Za-z0-9._-]{1,64}$/;
const MAX_QTY = 100_000;

export const PICKUP = {
  button: "Pick up from other sites",
  title: "Pick up from other sites",
  cancel: "Cancel",
  confirm: "Confirm",
  doneLink: "Done",
  done: "OK",
  lineLabel: "The line to pick up for",
  amount: (site: string, planned: number, picked: number) => `${site} · need ${qtyText(planned)} · has ${qtyText(picked)}`,
  intro: "Tick the sites to take it from. A site you take it from is Blocked: its crew can't go without it.",
  need: (need: number, unit: string, name: string) => `Needs ${need} more: ${need} ${unitText(need, unit)} of ${name}.`,
  nothingNeeded: "This line already has the planned amount, so there is nothing to pick up for it.",
  noLine: "That line is not on this site's pick list.",
  noPicks: "The pick list can't be read right now, so nothing can be picked up.",
  has: (qty: number, unit: string) => `Has ${qty} ${unitText(qty, unit)}`,
  takes: (qty: number) => `takes ${qty}`,
  hasNone: "Has none of this material",
  cantRead: "Its pick list can't be read",
  enough: "Not needed: the sites ticked already cover it",
  choose: (name: string) => `Pick up from ${name}`,
  noneChosen: "No site ticked yet.",
  willTake: (qty: number, need: number, unit: string) =>
    qty === need ? `Takes the ${need} ${unitText(need, unit)} needed.` : `Takes ${qty} of the ${need} ${unitText(need, unit)} needed.`,
  stillShort: (short: number, unit: string) => `${short} ${unitText(short, unit)} still short.`,
  notSaved: "This device couldn't save the change. Nothing was changed.",
  changed: (target: string, qty: number, unit: string, names: readonly string[]) =>
    `${target} picked up ${qty} ${unitText(qty, unit)} from ${listText(names)}. Because ${names.length === 1 ? "its" : "their"} status changed to Blocked, change the deadline and the operator of ${names.length === 1 ? "that site" : "each of those sites"}.`,
  changedBanner: "Status changed. Change the deadline and the operator of each site that gave, on its card below.",
  fromOthers: (qty: number) => `${qty} picked up from other sites · on this phone`,
  lent: (qty: number) => `${qty} given to another site · on this phone`,
  backToSite: (name: string) => `Back to ${name}`,
  list: "Sites to pick up from",
} as const;

function qtyText(qty: number): string {
  return isNonNegativeFinite(qty) ? String(qty) : "unknown";
}

function unitText(qty: number, unit: string): string {
  if (unit === "" || unit === "each") return qty === 1 ? "item" : "items";
  return qty === 1 ? unit : `${unit}s`;
}

function listText(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The pick-up page for one of a site's pick lines (AC 93). */
export function pickupPath(siteId: string, lineId: string): string {
  return `${sitePath(siteId)}/picks/pickup?line=${encodeURIComponent(lineId)}`;
}

function quantity(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_QTY ? value : null;
}

function storedLine(value: unknown): StoredLine | null {
  if (typeof value !== "object" || value === null) return null;
  const entry = value as Record<string, unknown>;
  const { materialName, unit } = entry;
  const plannedQty = quantity(entry.plannedQty);
  const pickedQty = quantity(entry.pickedQty);
  const pickedUpQty = quantity(entry.pickedUpQty);
  const lentQty = quantity(entry.lentQty);
  if (typeof materialName !== "string" || materialName.trim() === "" || materialName.length > 120) return null;
  if (typeof unit !== "string" || unit.length > 40) return null;
  if (plannedQty === null || pickedQty === null || pickedUpQty === null || lentQty === null || pickedUpQty > pickedQty) return null;
  return { materialName, unit, plannedQty, pickedQty, pickedUpQty, lentQty };
}

/**
 * What is stored. A site with a bad id or a status other than "blocked" is dropped (the store never clears a site);
 * a line that can't be read is kept as `null`, so it reads as bad data and blocks instead of falling back.
 */
export function parsePickups(raw: string | null): Pickups {
  if (!raw) return {};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const pickups: Record<string, SitePickup> = {};
  for (const [siteId, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!ID.test(siteId) || typeof entry !== "object" || entry === null) continue;
    const { status, updatedAt, lines } = entry as { status?: unknown; updatedAt?: unknown; lines?: unknown };
    if ((status !== "blocked" && status !== "clear") || typeof lines !== "object" || lines === null || Array.isArray(lines)) continue;
    const kept: Record<string, StoredLine | null> = {};
    for (const [lineId, line] of Object.entries(lines as Record<string, unknown>)) {
      if (ID.test(lineId)) kept[lineId] = storedLine(line);
    }
    pickups[siteId] = { status, updatedAt: typeof updatedAt === "string" ? updatedAt : "", lines: kept };
  }
  return pickups;
}

export function readPickups(storage: PickupStorage | null): Pickups {
  if (!storage) return {};
  try {
    return parsePickups(storage.getItem(PICKUPS_KEY));
  } catch {
    return {};
  }
}

/** Stores the moves; false when the browser refuses (private mode, full, blocked), so the leader is told. */
export function writePickups(storage: PickupStorage | null, pickups: Pickups): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PICKUPS_KEY, JSON.stringify(pickups));
    return true;
  } catch {
    return false;
  }
}

/** The same material on two pick lists: the same name, whatever the case and spacing. */
export function sameMaterial(a: string, b: string): boolean {
  const norm = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();
  return norm(a) === norm(b);
}

/** A pick line as the site holds it now: this browser's copy first, then the sample data's. */
export interface HeldLine {
  readonly id: string;
  readonly materialName: string;
  readonly unit: string;
  readonly plannedQty: number;
  readonly pickedQty: number;
  readonly pickedUpQty: number;
  readonly lentQty: number;
}

/** The upstream fields a held line starts from. `pickedUpQty` is the sample's own field, 0 when absent. */
export type UpstreamLine = Pick<PickLine, "id" | "materialName" | "unit" | "plannedQty" | "pickedQty" | "pickedUpQty">;

export function heldLines(siteId: string, upstream: readonly UpstreamLine[], pickups: Pickups): HeldLine[] {
  const record = pickups[siteId];
  return upstream.map((line) => {
    if (record && line.id in record.lines) {
      const stored = record.lines[line.id];
      // A stored line that can't be read is bad data: it holds nothing, so it can't be given away, and it blocks.
      if (!stored) return { id: line.id, materialName: line.materialName, unit: line.unit, plannedQty: NaN, pickedQty: NaN, pickedUpQty: 0, lentQty: 0 };
      return { id: line.id, ...stored };
    }
    return {
      id: line.id,
      materialName: line.materialName,
      unit: line.unit,
      plannedQty: line.plannedQty,
      pickedQty: line.pickedQty,
      pickedUpQty: isNonNegativeFinite(line.pickedUpQty ?? 0) ? (line.pickedUpQty ?? 0) : 0,
      lentQty: 0,
    };
  });
}

/** How many more the line needs to reach its plan; 0 when it has enough or its numbers can't be trusted. */
export function lineNeed(line: Pick<HeldLine, "plannedQty" | "pickedQty">): number {
  if (!isNonNegativeFinite(line.plannedQty) || !isNonNegativeFinite(line.pickedQty)) return 0;
  return Math.max(0, line.plannedQty - line.pickedQty);
}

/** What a site holds of a material, over all its lines; a line with untrusted numbers gives nothing. */
export function available(lines: readonly HeldLine[], materialName: string): number {
  return lines
    .filter((line) => sameMaterial(line.materialName, materialName))
    .reduce((sum, line) => sum + (isNonNegativeFinite(line.pickedQty) ? line.pickedQty : 0), 0);
}

/** A site the material can come from: its pick list, or null when it can't be read. */
export interface Lender {
  readonly siteId: string;
  readonly name: string;
  readonly lines: readonly HeldLine[] | null;
}

export interface PickupMove {
  readonly siteId: string;
  readonly lineId: string;
  readonly qty: number;
}

export interface PickupPlan {
  readonly need: number;
  /** What each ticked site gives, in the order ticked; a site that gives nothing is not here. */
  readonly moves: readonly PickupMove[];
  readonly total: number;
  readonly short: number;
  /** The ticked sites that give something, in the order ticked. */
  readonly siteIds: readonly string[];
}

/** Takes what the line needs from the ticked sites in the order they were ticked, each up to what it holds. */
export function planPickup(target: HeldLine, lenders: readonly Lender[], chosen: readonly string[]): PickupPlan {
  const need = lineNeed(target);
  const moves: PickupMove[] = [];
  let left = need;
  for (const siteId of chosen) {
    const lender = lenders.find((item) => item.siteId === siteId);
    if (!lender?.lines || left === 0) continue;
    for (const line of lender.lines) {
      if (left === 0) break;
      if (!sameMaterial(line.materialName, target.materialName) || !isNonNegativeFinite(line.pickedQty) || line.pickedQty === 0) continue;
      const qty = Math.min(left, line.pickedQty);
      moves.push({ siteId, lineId: line.id, qty });
      left -= qty;
    }
  }
  const siteIds = chosen.filter((siteId) => moves.some((move) => move.siteId === siteId));
  return { need, moves, total: need - left, short: left, siteIds };
}

function stored(line: HeldLine): StoredLine {
  return {
    materialName: line.materialName,
    unit: line.unit,
    plannedQty: line.plannedQty,
    pickedQty: line.pickedQty,
    pickedUpQty: line.pickedUpQty,
    lentQty: line.lentQty,
  };
}

function lines(held: readonly HeldLine[], change: (line: HeldLine) => HeldLine): Record<string, StoredLine> {
  return Object.fromEntries(held.map((line) => [line.id, stored(change(line))]));
}

/**
 * The store after a move: the site that picked up and every site that gave are stored whole, with the quantities
 * moved. A site that gave is Blocked. The site that picked up is stored "clear" when, with the move, its pick-ups
 * cover every shortage the server gave it (`target.site`) and it gave nothing away; otherwise Blocked, as it was.
 */
export function applyPickup(
  pickups: Pickups,
  target: { readonly siteId: string; readonly lineId: string; readonly lines: readonly HeldLine[]; readonly site?: HeldInput },
  lenders: readonly Lender[],
  plan: PickupPlan,
  at: string,
): Pickups {
  if (plan.total === 0) return pickups;
  const next: Record<string, SitePickup> = { ...pickups };
  const gained = lines(target.lines, (line) =>
    line.id === target.lineId ? { ...line, pickedQty: line.pickedQty + plan.total, pickedUpQty: line.pickedUpQty + plan.total } : line,
  );
  const gave = Object.values(gained).some((line) => line.lentQty > 0);
  next[target.siteId] = { status: !gave && target.site && covers(target.site, gained) ? "clear" : "blocked", updatedAt: at, lines: gained };
  for (const siteId of plan.siteIds) {
    const lender = lenders.find((item) => item.siteId === siteId)!;
    next[siteId] = {
      status: "blocked",
      updatedAt: at,
      lines: lines(lender.lines!, (line) => {
        const given = plan.moves.filter((move) => move.siteId === siteId && move.lineId === line.id).reduce((sum, move) => sum + move.qty, 0);
        return given === 0 ? line : { ...line, pickedQty: line.pickedQty - given, lentQty: line.lentQty + given };
      }),
    };
  }
  return next;
}

/** The findings a checked line was judged with, so it can be judged again with new quantities. */
function findingsOf(checked: CheckedPickLine): SiteFindings {
  if (checked.openReport) return { reports: [checked.openReport], reviews: [] };
  if (checked.checkedAt) return { reports: [], reviews: [{ id: "", siteId: "", lineId: checked.line.id, createdBy: "", createdAt: checked.checkedAt }] };
  return { reports: [], reviews: [] };
}

/**
 * The site's pick check with this browser's quantities (AC 95): each stored line is judged again, the same rules as
 * the server's, so a site that gave its material shows the line short and a site that picked it up shows the gain.
 */
export function withPickups(siteId: string, check: PickCheck, pickups: Pickups): PickCheck {
  const record = pickups[siteId];
  if (!record || check.lines.length === 0) return check;
  const held = heldLines(siteId, check.lines.map((checked) => checked.line), pickups);
  const lines = check.lines.map((checked, index) => {
    if (!(checked.line.id in record.lines)) return checked;
    const line = held[index]!;
    return checkPickLine({ ...checked.line, plannedQty: line.plannedQty, pickedQty: line.pickedQty, pickedUpQty: line.pickedUpQty }, findingsOf(checked));
  });
  const issueCount = lines.filter((checked) => checked.kind !== null).length;
  return { status: issueCount === 0 ? "ready" : "not_ready", lines, issueCount };
}

/** What this browser holds against one line, for its row: how many came in and how many went out. */
export function lineMoves(siteId: string, lineId: string, pickups: Pickups): { readonly pickedUp: number; readonly lent: number } {
  const line = pickups[siteId]?.lines[lineId];
  return { pickedUp: line?.pickedUpQty ?? 0, lent: line?.lentQty ?? 0 };
}

/** A short material as the server gave it, with how many are missing when it said. */
export interface HeldShortage extends ShortageFact {
  readonly shortfallQty?: number | null;
}

/** What `heldSite` reads of a site: the server's status and its shortages. */
export interface HeldInput {
  readonly id: string;
  readonly crewStatus: string;
  readonly shortageCount: number;
  readonly dataProblemCount: number;
  readonly shortages?: readonly HeldShortage[];
}

/**
 * True when what this device picked up covers every shortage the server gave the site (AC 97). Fail closed: the site
 * must be blocked by shortages alone (no data problems, no stock it can't read, every shortage listed with how many
 * are missing), every stored line must be readable, and each short material must have been picked up, by name,
 * at least as many as are missing.
 */
export function covers(site: HeldInput, stored: Readonly<Record<string, StoredLine | null>>): boolean {
  const shortages = site.shortages ?? [];
  if (site.crewStatus !== "blocked" || site.dataProblemCount !== 0 || shortages.length === 0 || shortages.length !== site.shortageCount) return false;
  const held = Object.values(stored);
  if (held.some((line) => line === null)) return false;
  return shortages.every((shortage) => {
    const missing = shortage.shortfallQty;
    if (shortage.kind !== "short" || typeof missing !== "number" || !Number.isFinite(missing) || missing <= 0) return false;
    const picked = held.filter((line) => sameMaterial(line!.materialName, shortage.name)).reduce((sum, line) => sum + line!.pickedUpQty, 0);
    return picked >= missing;
  });
}

/** Blocked here: this browser stored the site as blocked, or it is ticked on the pick-up page right now. */
export function isHeldBlocked(siteId: string, pickups: Pickups, ticked: boolean): boolean {
  return ticked || pickups[siteId]?.status === "blocked";
}

/**
 * A site as this browser has it (AC 94, 95, 97): the stored status first, then the sample's. Blocked here, it is
 * blocked whatever the server said, and each material it gave (or would give, while ticked) is one of its shortages.
 * Stored "clear", it is clear only when its pick-ups still cover every shortage the server gives it now; otherwise
 * the server's status stands.
 */
export function heldSite<T extends HeldInput>(site: T, pickups: Pickups, tickedMaterial: string | null): T {
  const record = pickups[site.id];
  if (!isHeldBlocked(site.id, pickups, tickedMaterial !== null)) {
    if (record?.status === "clear" && covers(site, record.lines)) return { ...site, crewStatus: "clear", shortageCount: 0, dataProblemCount: 0, shortages: [] };
    return site;
  }
  const given = Object.values(record?.lines ?? {})
    .filter((line): line is StoredLine => line !== null && line.lentQty > 0)
    .map((line) => line.materialName);
  const shortages: HeldShortage[] = [...(site.crewStatus === "blocked" ? (site.shortages ?? []) : [])];
  for (const name of tickedMaterial ? [...given, tickedMaterial] : given) {
    if (!shortages.some((item) => sameMaterial(item.name, name))) shortages.push({ name, kind: "short" });
  }
  const before = site.crewStatus === "blocked" ? site.shortageCount : 0;
  const added = shortages.length - (site.crewStatus === "blocked" ? (site.shortages ?? []).length : 0);
  return {
    ...site,
    crewStatus: "blocked",
    shortageCount: before + added,
    dataProblemCount: site.crewStatus === "blocked" ? site.dataProblemCount : 0,
    shortages,
  };
}

/** What the Map and Calendar panels read of a project, with its shortages for this device's pick-ups (AC 97). */
export interface PanelSite extends HeldInput {
  readonly name: string;
  readonly location?: unknown;
  readonly date?: unknown;
  readonly shortages: readonly HeldShortage[];
}

/** Only what the panels read, so the browser isn't sent the whole project twice. */
export function panelSites(sites: readonly PanelSite[]): PanelSite[] {
  return sites.map(({ id, name, crewStatus, shortageCount, dataProblemCount, location, date, shortages }) => ({
    id,
    name,
    crewStatus,
    shortageCount,
    dataProblemCount,
    location,
    date,
    shortages: shortages.map(({ name: material, kind, shortfallQty }) => ({ name: material, kind, shortfallQty })),
  }));
}
