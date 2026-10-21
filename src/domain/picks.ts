import { isNonNegativeFinite } from "./quantities";

/**
 * The pick check (AC 61): what the warehouse picked for a site against what was asked for. The app decides from
 * planned against picked; the warehouse marking a line "Picked" is shown as who did what, never trusted as ready.
 * Missing or bad numbers fail closed: they block, they never cover a shortfall.
 */

/** A part that must go with the main item, such as a collar's fixing kit or a sealant's nozzle. */
export interface RequiredPart {
  readonly id: string;
  readonly name: string;
  readonly plannedQty: number;
  readonly pickedQty: number;
}

export interface PickLine {
  readonly id: string;
  readonly materialName: string;
  readonly unit: string;
  /** Where it is used, as text ("L3, Riser 2 · 4 openings"). */
  readonly usedAt: string | null;
  readonly plannedQty: number;
  readonly pickedQty: number;
  /**
   * Of `pickedQty`, how many came from other sites (AC 92). The sample's pick lists all say 0; a move made on this
   * device is kept in its browser (`src/ui/pickups.ts`). Shown only, never read by the check.
   */
  readonly pickedUpQty?: number;
  /** The rating or grade asked for ("FRR −/120/120"). Null when the plan names none. */
  readonly plannedSpec: string | null;
  readonly pickedSpec: string | null;
  readonly requiredParts: readonly RequiredPart[];
  /** What the warehouse says. Never read by the check. */
  readonly warehouseStatus: string;
}

export interface PickList {
  readonly siteId: string;
  readonly picker: string | null;
  /** When the picker last changed the list, ISO. */
  readonly lastActionAt: string | null;
  readonly lastAction: string | null;
  readonly lines: readonly PickLine[];
}

/**
 * What can be wrong with a line. `bad_data` is numbers or a spec the check cannot trust. `reported` is a problem the
 * site found and reported that no later review on site has cleared (AC 70).
 */
export type PickIssueKind = "wrong_spec" | "part_picked" | "missing_parts" | "bad_data" | "reported";

export interface CheckedPickLine {
  readonly line: PickLine;
  /** Every problem on the line; empty when it matches the plan. */
  readonly issues: readonly PickIssueKind[];
  /** The issue that names the line, or null when it matches. */
  readonly kind: PickIssueKind | null;
  /** Required parts picked short of their need. */
  readonly shortParts: readonly RequiredPart[];
  /** The latest site report on this line that no later review has cleared (AC 70). */
  readonly openReport: PickReport | null;
  /** When a review on site last said this line is right, if that came after its latest report (AC 68). */
  readonly checkedAt: string | null;
}

export type PickStatus = "ready" | "not_ready" | "unknown";

export interface PickCheck {
  readonly status: PickStatus;
  readonly lines: readonly CheckedPickLine[];
  readonly issueCount: number;
}

/**
 * The issue that names a line, most serious first: untrusted data, then a wrong spec, a short pick, missing parts.
 * A site report names a line only when the pick list itself has nothing against it.
 */
const ORDER: readonly PickIssueKind[] = ["bad_data", "wrong_spec", "part_picked", "missing_parts", "reported"];

/** What the site has said about its pick lines: reports to the warehouse, and reviews that say a line is right. */
export interface SiteFindings {
  readonly reports: readonly PickReport[];
  readonly reviews: readonly PickReview[];
}

const NO_FINDINGS: SiteFindings = { reports: [], reviews: [] };

/**
 * A line's latest open report and when it was last checked right (AC 68, 70). A report stays open until a review that
 * is later than it. Fails closed on time: a report whose time can't be read counts as the latest, so it stays open; a
 * review whose time can't be read clears nothing.
 */
function siteState(lineId: string, findings: SiteFindings): { readonly openReport: PickReport | null; readonly checkedAt: string | null } {
  let latest: PickReport | null = null;
  let latestMs = -Infinity;
  for (const report of findings.reports) {
    if (report.lineId !== lineId) continue;
    const parsed = Date.parse(report.createdAt);
    const ms = Number.isNaN(parsed) ? Infinity : parsed;
    if (latest === null || ms >= latestMs) {
      latest = report;
      latestMs = ms;
    }
  }
  let reviewedAt: string | null = null;
  let reviewedMs = -Infinity;
  for (const review of findings.reviews) {
    if (review.lineId !== lineId) continue;
    const ms = Date.parse(review.createdAt);
    if (!Number.isNaN(ms) && ms > reviewedMs) {
      reviewedAt = review.createdAt;
      reviewedMs = ms;
    }
  }
  const cleared = reviewedAt !== null && reviewedMs > latestMs;
  return { openReport: latest !== null && !cleared ? latest : null, checkedAt: cleared ? reviewedAt : null };
}

function sameSpec(planned: string, picked: string): boolean {
  return planned.trim().replace(/\s+/g, " ").toLowerCase() === picked.trim().replace(/\s+/g, " ").toLowerCase();
}

export function checkPickLine(line: PickLine, findings: SiteFindings = NO_FINDINGS): CheckedPickLine {
  const issues = new Set<PickIssueKind>();
  const quantities = [line.plannedQty, line.pickedQty, ...line.requiredParts.flatMap((part) => [part.plannedQty, part.pickedQty])];
  if (!quantities.every(isNonNegativeFinite)) issues.add("bad_data");
  if (line.plannedSpec !== null) {
    if (line.pickedSpec === null || line.pickedSpec.trim() === "") issues.add("bad_data");
    else if (!sameSpec(line.plannedSpec, line.pickedSpec)) issues.add("wrong_spec");
  }
  if (isNonNegativeFinite(line.plannedQty) && isNonNegativeFinite(line.pickedQty) && line.pickedQty < line.plannedQty) {
    issues.add("part_picked");
  }
  const shortParts = line.requiredParts.filter(
    (part) => isNonNegativeFinite(part.plannedQty) && isNonNegativeFinite(part.pickedQty) && part.pickedQty < part.plannedQty,
  );
  if (shortParts.length > 0) issues.add("missing_parts");
  // The site's own check: a reported problem holds the line until a review on site says it is right. A review only
  // clears reports; it never covers anything the pick list itself gets wrong.
  const { openReport, checkedAt } = siteState(line.id, findings);
  if (openReport !== null) issues.add("reported");
  const ordered = ORDER.filter((kind) => issues.has(kind));
  return { line, issues: ordered, kind: ordered[0] ?? null, shortParts, openReport, checkedAt };
}

/**
 * Ready only when there is a pick list, it has lines, and every line matches the plan with no report from site still
 * open (AC 61, 70).
 */
export function checkPicks(list: PickList | null, findings: SiteFindings = NO_FINDINGS): PickCheck {
  if (list === null || list.lines.length === 0) {
    return { status: "unknown", lines: [], issueCount: 0 };
  }
  const lines = list.lines.map((line) => checkPickLine(line, findings));
  const issueCount = lines.filter((checked) => checked.kind !== null).length;
  return { status: issueCount === 0 ? "ready" : "not_ready", lines, issueCount };
}

/**
 * What a team leader can report to the warehouse (AC 65, 69): what the pick check found, or what the site found that
 * the warehouse missed: an item that doesn't fit, the wrong item, or damage on the way or during the work.
 */
export type PickReportKind = "wrong_spec" | "missing_parts" | "part_picked" | "unsuitable" | "wrong_item" | "damaged" | "other";

export const PICK_REPORT_KINDS: readonly PickReportKind[] = ["wrong_spec", "missing_parts", "part_picked", "unsuitable", "wrong_item", "damaged", "other"];

/** What the site needs from the warehouse (AC 69): a re-pick for the next delivery, or a same-day delivery. */
export type PickRequest = "repick" | "same_day";

export const PICK_REQUESTS: readonly PickRequest[] = ["repick", "same_day"];

/** A pick-error report as recorded. The app never changes the pick list; the report goes to the warehouse. */
export interface PickReport {
  readonly id: string;
  readonly siteId: string;
  readonly lineId: string;
  readonly kind: PickReportKind;
  readonly plannedQty: number | null;
  readonly pickedQty: number | null;
  /** How many the site found wrong, unfit or damaged. Null when not said. */
  readonly affectedQty: number | null;
  readonly request: PickRequest;
  readonly missingPart: string | null;
  readonly note: string | null;
  readonly sendToPicker: boolean;
  readonly sendToPurchasing: boolean;
  readonly photoAttached: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
}

/** A review on site that says a pick line is right (AC 68). It clears earlier reports, never the pick list's issues. */
export interface PickReview {
  readonly id: string;
  readonly siteId: string;
  readonly lineId: string;
  readonly createdBy: string;
  readonly createdAt: string;
}
