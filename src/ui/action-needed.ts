import { formatQuantity, formatUnit, sitePath } from "./format";

/**
 * The "Needs your decision" panel at the top of a blocked site (AC 50): what stops the crew, in two lists like a
 * pharmacy's "order action required" notice, what is covered, and the options with what each one does.
 * Pure, so the wording is tested without a browser.
 */

export interface ActionNeededShortage {
  readonly id: string;
  readonly materialId: string;
  readonly kind: "short" | "unknown";
  readonly requiredQty: number;
  readonly shortfallQty: number | null;
  readonly penetrationIds: readonly string[];
}

export interface ActionNeededInput {
  readonly siteId: string;
  readonly siteName: string;
  readonly shortages: readonly ActionNeededShortage[];
  readonly blockers: readonly { readonly penetrationId: string }[];
  /** Names and units for the shortages' materials. */
  readonly materials: Readonly<Record<string, { readonly name: string; readonly unit: string }>>;
  /** Every material the site's planned work uses. Null when unknown: then nothing is listed as covered. */
  readonly referenced: Readonly<Record<string, { readonly name: string; readonly unit: string }>> | null;
}

export interface ShortageItem {
  readonly id: string;
  readonly name: string;
  /** "Short 2 of 10 cartridges", or "Stock unknown · needs 1". */
  readonly line: string;
  /** "3 penetrations affected": the unit is always said, so a count is never read as material. */
  readonly affected: string;
  /** The site list narrowed to this material's penetrations. */
  readonly href: string;
  /** Names the decision for its dialog and buttons, as on the material page. */
  readonly target: string;
  readonly tone: "danger" | "warning";
}

export interface ActionNeededView {
  readonly summary: string;
  readonly shortages: readonly ShortageItem[];
  readonly dataProblems: { readonly line: string; readonly affected: string; readonly href: string } | null;
  /** Materials this site's work uses that are not short here. Empty when unknown or none. */
  readonly covered: readonly string[];
}

export const ACTION_NEEDED = {
  heading: "Needs your decision",
  shortHeading: "Short",
  coveredHeading: "Covered for this site alone",
  coveredNote: "Stock is shared and not reserved, so another site can still use it first.",
  dataHeading: "Data problems",
  optionsHeading: "What each option does",
  options: [
    { name: "Wait", effect: "The crew stays on hold. Decide again when stock arrives." },
    { name: "Escalate", effect: "Purchasing or the warehouse is asked to act. The crew stays on hold." },
    { name: "Propose a substitute", effect: "Pick a catalogue match on a penetration. A manager has to verify it first." },
  ],
  contactsHeading: "Ask before you decide",
  call: "Call",
} as const;

function count(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

/** "12 penetrations affected": the unit is always said, so the number is never read as material. */
export function affectedLine(penetrations: number): string {
  return `${count(penetrations, "penetration", "penetrations")} affected`;
}

function quantityWithUnit(value: number, unit: string): string {
  const word = formatUnit(value, unit);
  return word ? `${formatQuantity(value)} ${word}` : formatQuantity(value);
}

/** "Short 2 of 10 cartridges"; unknown stock is never a number. */
export function shortageLine(shortage: Pick<ActionNeededShortage, "kind" | "requiredQty" | "shortfallQty">, unit: string): string {
  if (shortage.kind === "unknown" || shortage.shortfallQty === null) {
    return `Stock unknown · needs ${quantityWithUnit(shortage.requiredQty, unit)}`;
  }
  return `Short ${formatQuantity(shortage.shortfallQty)} of ${quantityWithUnit(shortage.requiredQty, unit)}`;
}

/** "Can't go yet: 2 shortages · 1 data problem". Only called for a blocked site. */
export function actionSummary(shortages: number, dataProblems: number): string {
  const parts: string[] = [];
  if (shortages > 0) parts.push(count(shortages, "shortage", "shortages"));
  if (dataProblems > 0) parts.push(count(dataProblems, "data problem", "data problems"));
  return parts.length === 0 ? "Can't go yet" : `Can't go yet: ${parts.join(" · ")}`;
}

export function actionNeeded(input: ActionNeededInput): ActionNeededView {
  const base = sitePath(input.siteId);
  const shortages = input.shortages.map((shortage): ShortageItem => {
    const material = input.materials[shortage.materialId] ?? input.referenced?.[shortage.materialId];
    const name = material?.name ?? shortage.materialId;
    return {
      id: shortage.id,
      name,
      line: shortageLine(shortage, material?.unit ?? ""),
      affected: affectedLine(new Set(shortage.penetrationIds).size),
      href: `${base}?material=${encodeURIComponent(shortage.materialId)}#penetrations-heading`,
      target: `${name} at ${input.siteName}`,
      tone: shortage.kind === "short" ? "danger" : "warning",
    };
  });
  const problemPenetrations = new Set(input.blockers.map((blocker) => blocker.penetrationId)).size;
  const dataProblems =
    input.blockers.length === 0
      ? null
      : {
          line: count(input.blockers.length, "data problem", "data problems"),
          affected: affectedLine(problemPenetrations),
          href: `${base}?show=data-problems#penetrations-heading`,
        };
  const short = new Set(input.shortages.map((shortage) => shortage.materialId));
  const covered = input.referenced
    ? Object.entries(input.referenced)
        .filter(([materialId]) => !short.has(materialId))
        .map(([, material]) => material.name)
    : [];
  return { summary: actionSummary(input.shortages.length, input.blockers.length), shortages, dataProblems, covered };
}
