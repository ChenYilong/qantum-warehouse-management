import type { CheckedPickLine, PickCheck, PickIssueKind, PickReport, PickReportKind, PickStatus } from "@/domain";
import { sitePath } from "./format";
import { PICKS } from "./messages";
import type { StatusView } from "./status";

/** What the second-level screens show of a site's pick check: the UI's own shape of the use case's answer. */
export interface PickView {
  readonly picker: { readonly name: string; readonly phone: string; readonly email?: string } | null;
  readonly lastAction: string | null;
  readonly lastActionAt: string | null;
  readonly check: PickCheck;
}

/** The Pick check page for a site (AC 64). */
export function picksPath(siteId: string): string {
  return `${sitePath(siteId)}/picks`;
}

/** The report form, opened on one pick line when given (AC 65); from a review it asks what the site found (AC 69). */
export function pickReportPath(siteId: string, lineId?: string, fromReview = false): string {
  const base = `${picksPath(siteId)}/report`;
  if (!lineId) return base;
  return `${base}?line=${encodeURIComponent(lineId)}${fromReview ? "&from=review" : ""}`;
}

/** The review on site of one pick line (AC 67). */
export function pickReviewPath(siteId: string, lineId: string): string {
  return `${picksPath(siteId)}/review?line=${encodeURIComponent(lineId)}`;
}

/** An anchor for a line's card on the Pick check page. */
export function pickLineAnchor(lineId: string): string {
  return `pick-${lineId}`;
}

const LABELS: Record<PickIssueKind, { readonly live: string; readonly saved: string }> = {
  wrong_spec: { live: "Wrong spec", saved: "Was wrong spec" },
  part_picked: { live: "Part-picked", saved: "Was part-picked" },
  missing_parts: { live: "Missing parts", saved: "Was missing parts" },
  bad_data: { live: "Can't read", saved: "Was unreadable" },
  reported: { live: "Reported on site", saved: "Was reported on site" },
};

/**
 * A line's label (AC 62, 63). Live: red for an issue, green for a match. From saved data (offline) every label
 * reads "Was …" in amber, because the warehouse may have re-picked since: never a live green.
 */
export function pickLineLabel(kind: PickIssueKind | null, saved: boolean): StatusView {
  if (kind === null) {
    return saved ? { label: "Was matching", tone: "warning", icon: "warning" } : { label: "Matches plan", tone: "success", icon: "check" };
  }
  return saved ? { label: LABELS[kind].saved, tone: "warning", icon: "warning" } : { label: LABELS[kind].live, tone: "danger", icon: "stop" };
}

function amount(value: number): string {
  return Number.isFinite(value) && value >= 0 ? String(value) : "unknown";
}

/** "Need 10 · picked 6 · Applicator gun nozzle missing", or the specs side by side for a wrong spec. */
export function pickAmountLine(checked: CheckedPickLine): string {
  const { line } = checked;
  // A wrong spec is only found with both specs present (a missing one is bad data), so both are here.
  if (checked.issues.includes("wrong_spec")) return `Plan ${line.plannedSpec!} · picked ${line.pickedSpec!}`;
  const parts = checked.shortParts.map((part) =>
    part.pickedQty === 0 ? `${part.name} missing` : `${part.name} ${amount(part.pickedQty)} of ${amount(part.plannedQty)}`,
  );
  return [`Need ${amount(line.plannedQty)} · picked ${amount(line.pickedQty)}`, ...parts].join(" · ");
}

/** The heading of a line's card on the Pick check page (AC 64). */
export function pickCardTitle(checked: CheckedPickLine): string {
  switch (checked.kind) {
    case "wrong_spec":
      return "Wrong spec";
    case "part_picked":
      return checked.shortParts.length > 0 ? "Partly picked, accessory missing" : "Partly picked";
    case "missing_parts":
      return "Marked picked, parts missing";
    case "bad_data":
      return "Can't read this line";
    case "reported":
      return "Reported on site";
    default:
      return "Matches plan";
  }
}

/**
 * What the site found, how many and what it asked for (AC 70): "Damaged · 2 affected · same-day delivery asked". An
 * amount that is not a whole number is left out, never shown as a figure.
 */
export function reportFinding(report: Pick<PickReport, "kind" | "affectedQty" | "request">): string {
  const parts: string[] = [PICKS.foundKinds[report.kind]];
  if (report.affectedQty !== null && Number.isInteger(report.affectedQty) && report.affectedQty >= 0) parts.push(PICKS.affected(report.affectedQty));
  parts.push(PICKS.requestAsked[report.request]);
  return parts.join(" · ");
}

/**
 * The kinds as the report form lists them (AC 65, 69): from the Pick check, what the check finds first; from a review
 * on site, what the site finds first. "Something else" is last either way.
 */
export function reportKinds(fromReview: boolean): readonly PickReportKind[] {
  return fromReview
    ? ["unsuitable", "wrong_item", "damaged", "wrong_spec", "missing_parts", "part_picked", "other"]
    : ["wrong_spec", "missing_parts", "part_picked", "unsuitable", "wrong_item", "damaged", "other"];
}

/** The report kind a line's issue suggests. Untrusted data has no kind of its own, so it is "something else". */
export function reportKindFor(kind: PickIssueKind | null): PickReportKind {
  return kind === "wrong_spec" || kind === "part_picked" || kind === "missing_parts" ? kind : "other";
}

/** "Applicator gun nozzle × 1": what is short of each required part, for the report form. */
export function missingPartText(checked: CheckedPickLine): string {
  return checked.shortParts.map((part) => `${part.name} × ${amount(part.plannedQty - part.pickedQty)}`).join(", ");
}

export type ConnectionPhase = "online" | "offline" | "checking";

/**
 * Crew can go (AC 62, 63): open only with picks matching the plan, the site clear and a live connection. From
 * saved data it is never decided, whatever the saved data says.
 */
export function crewGate(picks: PickStatus | "unavailable", siteClear: boolean, phase: ConnectionPhase): { readonly enabled: boolean; readonly reason: string } {
  if (phase !== "online") return { enabled: false, reason: PICKS.crewOffline };
  if (picks !== "ready") return { enabled: false, reason: PICKS.crewLocked };
  if (!siteClear) return { enabled: false, reason: PICKS.crewNotClear };
  return { enabled: true, reason: PICKS.crewTell };
}

/** `mailto:` with a subject naming the site; the body is the team leader's to write. */
export function pickEmailHref(email: string, siteName: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(`${siteName} pick issues`)}`;
}

/** "SL" for Sam Lee: the avatar on the picker card. */
export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word[0]!.toUpperCase());
  return letters.length <= 2 ? letters.join("") : `${letters[0]}${letters[letters.length - 1]}`;
}

/** A typed amount for the report (AC 65): empty is none, a whole number from 0 to 100000 is kept, anything else is bad. */
export function parseAmount(value: string): number | null | "bad" {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (!/^\d{1,6}$/.test(trimmed)) return "bad";
  const amount = Number(trimmed);
  return amount <= 100_000 ? amount : "bad";
}
