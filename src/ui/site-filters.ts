/**
 * The projects list's filter (AC 72, 73), after qantum-stock's work-package list: a readiness and a search, kept in
 * the URL (`/sites?status=shortage&q=quay`) so a filtered list can be shared and works without JavaScript.
 */

/** The readiness choices, in the order the form lists them. */
export const READINESS_FILTERS = ["all", "ready", "shortage", "unknown"] as const;

export type ReadinessFilter = (typeof READINESS_FILTERS)[number];

/** The search is cut to this many characters, as the work-package search is. */
export const SEARCH_MAX = 100;

export interface SiteFilters {
  readonly status: ReadinessFilter;
  readonly query: string;
}

/** What the filter reads of a listed project. */
export interface FilterableSite {
  readonly name: string;
  readonly reference: string;
  /** Some projects have none upstream. */
  readonly address?: string;
  readonly crewStatus: string;
}

/** A project as the list's client side gets it: what the filter reads, its id, and what its pick-ups read. */
export interface FeedSite extends FilterableSite {
  readonly id: string;
  readonly shortageCount: number;
  readonly dataProblemCount: number;
  readonly shortages: readonly { readonly name: string; readonly kind: "short" | "unknown"; readonly shortfallQty?: number | null }[];
}

/**
 * Only what the filter and this device's pick-ups read, so the browser isn't sent the whole project twice
 * (AC 93, 95, 97).
 */
export function feedSites(sites: readonly FeedSite[]): FeedSite[] {
  return sites.map(({ id, name, reference, address, crewStatus, shortageCount, dataProblemCount, shortages }) => ({
    id,
    name,
    reference,
    address,
    crewStatus,
    shortageCount,
    dataProblemCount,
    shortages: shortages.map(({ name: material, kind, shortfallQty }) => ({ name: material, kind, shortfallQty })),
  }));
}

type Param = string | string[] | undefined;

/** A known readiness, in any case and trimmed. Missing, unknown, empty or repeated is All statuses. */
export function parseReadiness(value: Param): ReadinessFilter {
  if (typeof value !== "string") return "all";
  const wanted = value.trim().toLowerCase();
  return READINESS_FILTERS.find((filter) => filter === wanted) ?? "all";
}

/** The search, trimmed and at most 100 characters. Missing or repeated is no search. */
export function parseQuery(value: Param): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, SEARCH_MAX).trim();
}

export function parseSiteFilters(params: { readonly status?: Param; readonly q?: Param }): SiteFilters {
  return { status: parseReadiness(params.status), query: parseQuery(params.q) };
}

/**
 * Which readiness a project's crew status falls under. Only a project whose crew can go is Ready, only a blocked one
 * is Shortage. Nothing planned, can't check and any status the app doesn't know are Unknown: fail closed, never Ready.
 */
export function readinessOf(crewStatus: string): Exclude<ReadinessFilter, "all"> {
  if (crewStatus === "clear") return "ready";
  if (crewStatus === "blocked") return "shortage";
  return "unknown";
}

/** The search matches the name, the job ref or the address, in any case. No search matches everything. */
function matchesQuery(site: FilterableSite, query: string): boolean {
  const wanted = query.trim().toLowerCase();
  if (wanted === "") return true;
  return [site.name, site.reference, site.address ?? ""].some((value) => value.toLowerCase().includes(wanted));
}

/** The projects under the chosen readiness that match the search, in list order. */
export function filterSites<T extends FilterableSite>(sites: readonly T[], filters: SiteFilters): readonly T[] {
  return sites.filter((site) => (filters.status === "all" || readinessOf(site.crewStatus) === filters.status) && matchesQuery(site, filters.query));
}

/** True when the list is narrowed: a readiness other than All statuses, or a search. */
export function isFiltered(filters: SiteFilters): boolean {
  return filters.status !== "all" || filters.query !== "";
}
