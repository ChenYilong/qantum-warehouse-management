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

/** What can be wrong with a line. `bad_data` is numbers or a spec the check cannot trust. */
export type PickIssueKind = "wrong_spec" | "part_picked" | "missing_parts" | "bad_data";

export interface CheckedPickLine {
  readonly line: PickLine;
  /** Every problem on the line; empty when it matches the plan. */
  readonly issues: readonly PickIssueKind[];
  /** The issue that names the line, or null when it matches. */
  readonly kind: PickIssueKind | null;
  /** Required parts picked short of their need. */
  readonly shortParts: readonly RequiredPart[];
}

export type PickStatus = "ready" | "not_ready" | "unknown";

export interface PickCheck {
  readonly status: PickStatus;
  readonly lines: readonly CheckedPickLine[];
  readonly issueCount: number;
}

/** The issue that names a line, most serious first: untrusted data, then a wrong spec, a short pick, missing parts. */
const ORDER: readonly PickIssueKind[] = ["bad_data", "wrong_spec", "part_picked", "missing_parts"];

function sameSpec(planned: string, picked: string): boolean {
  return planned.trim().replace(/\s+/g, " ").toLowerCase() === picked.trim().replace(/\s+/g, " ").toLowerCase();
}

export function checkPickLine(line: PickLine): CheckedPickLine {
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
  const ordered = ORDER.filter((kind) => issues.has(kind));
  return { line, issues: ordered, kind: ordered[0] ?? null, shortParts };
}

/** Ready only when there is a pick list, it has lines, and every line matches the plan. */
export function checkPicks(list: PickList | null): PickCheck {
  if (list === null || list.lines.length === 0) {
    return { status: "unknown", lines: [], issueCount: 0 };
  }
  const lines = list.lines.map(checkPickLine);
  const issueCount = lines.filter((checked) => checked.kind !== null).length;
  return { status: issueCount === 0 ? "ready" : "not_ready", lines, issueCount };
}

/** What a team leader can report to the warehouse (AC 65). */
export type PickReportKind = "wrong_spec" | "missing_parts" | "part_picked" | "other";

export const PICK_REPORT_KINDS: readonly PickReportKind[] = ["wrong_spec", "missing_parts", "part_picked", "other"];

/** A pick-error report as recorded. The app never changes the pick list; the report goes to the warehouse. */
export interface PickReport {
  readonly id: string;
  readonly siteId: string;
  readonly lineId: string;
  readonly kind: PickReportKind;
  readonly plannedQty: number | null;
  readonly pickedQty: number | null;
  readonly missingPart: string | null;
  readonly note: string | null;
  readonly sendToPicker: boolean;
  readonly sendToPurchasing: boolean;
  readonly photoAttached: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
}
