import { capturedText } from "./inventory";

/**
 * Portable evidence on a substitute (AC 91), after the stock app's "Prepare shortage summary": the leader ticks the
 * blocking requirements to include, may add a note, previews a plain-text summary and copies it. Copying creates no
 * record and sends nothing. What was ticked and typed is kept in this browser, keyed by site id, and filled back in
 * on the next visit. Pure, so the rules and the summary's words are tested here.
 */

export const EVIDENCE_KEY = "team-leader:evidence";
export const NOTE_LIMIT = 500;

export const EVIDENCE = {
  eyebrow: "Portable evidence",
  title: "Prepare shortage summary",
  intro: "Choose the blocking requirements to include. Copying creates no record and does not send the summary.",
  legend: "Blocking requirements",
  note: "Optional note",
  preview: "Preview summary",
  previewLabel: "Summary preview",
  copy: "Copy summary",
  copied: "Copied",
  copyFailed: "Clipboard access failed. Select and copy the summary manually.",
  invalid: `Select at least one blocking requirement and keep the note within ${NOTE_LIMIT} characters.`,
  saved: "Your choices and note are kept on this device for this site.",
} as const;

/** One material this penetration is waiting on, with the site's figures. */
export interface EvidenceRequirement {
  /** The shortage id, `siteId:materialId`. */
  readonly id: string;
  readonly status: "SHORTAGE" | "UNKNOWN";
  readonly name: string;
  readonly unit: string;
  readonly required: number;
  readonly available: number | null;
  readonly missing: number | null;
  readonly capturedAt: string | null;
}

export interface EvidenceContext {
  readonly siteName: string;
  readonly reference: string;
  readonly penetration: string;
  readonly nominatedCode: string;
  readonly substituteCode: string;
  /** READY or SHORTAGE, the substitute's own stock (AC 90). */
  readonly substituteStatus: string;
}

export interface EvidenceDraft {
  readonly selected: readonly string[];
  readonly note: string;
}

export type EvidenceDrafts = Readonly<Record<string, EvidenceDraft>>;
export type DraftStorage = Pick<Storage, "getItem" | "setItem">;

const SITE_ID = /^[A-Za-z0-9._-]{1,64}$/;
const SHORTAGE_ID = /^[A-Za-z0-9._-]{1,64}:[A-Za-z0-9._-]{1,64}$/;

/** What is stored, keeping only well-formed drafts; junk reads as none. */
export function parseDrafts(raw: string | null): EvidenceDrafts {
  if (!raw) return {};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const drafts: Record<string, EvidenceDraft> = {};
  for (const [siteId, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!SITE_ID.test(siteId) || typeof entry !== "object" || entry === null) continue;
    const { selected, note } = entry as { selected?: unknown; note?: unknown };
    const ids = Array.isArray(selected) ? selected.filter((id): id is string => typeof id === "string" && SHORTAGE_ID.test(id)) : [];
    drafts[siteId] = { selected: [...new Set(ids)], note: typeof note === "string" ? note.slice(0, NOTE_LIMIT) : "" };
  }
  return drafts;
}

export function readDraft(storage: DraftStorage | null, siteId: string): EvidenceDraft {
  try {
    return parseDrafts(storage?.getItem(EVIDENCE_KEY) ?? null)[siteId] ?? { selected: [], note: "" };
  } catch {
    return { selected: [], note: "" };
  }
}

/** Keeps one site's draft beside the others; false when the browser refuses. */
export function writeDraft(storage: DraftStorage | null, siteId: string, draft: EvidenceDraft): boolean {
  if (!storage) return false;
  try {
    const all = parseDrafts(storage.getItem(EVIDENCE_KEY));
    storage.setItem(EVIDENCE_KEY, JSON.stringify({ ...all, [siteId]: { selected: [...draft.selected], note: draft.note.slice(0, NOTE_LIMIT) } }));
    return true;
  } catch {
    return false;
  }
}

/** The ticked ids that are still blocking requirements here, in the page's order. */
export function selectedHere(draft: EvidenceDraft, requirements: readonly EvidenceRequirement[]): string[] {
  return requirements.filter((requirement) => draft.selected.includes(requirement.id)).map((requirement) => requirement.id);
}

function amount(value: number | null, unit: string): string {
  return value === null || !Number.isFinite(value) ? "Unknown" : `${value} ${unit}`;
}

/** The summary to copy, or null when nothing here is ticked or the note is too long. */
export function buildEvidenceSummary(context: EvidenceContext, requirements: readonly EvidenceRequirement[], draft: EvidenceDraft): string | null {
  const chosen = requirements.filter((requirement) => draft.selected.includes(requirement.id));
  const note = draft.note.trim();
  if (chosen.length === 0 || note.length > NOTE_LIMIT) return null;
  const lines = [
    "MATERIAL SHORTAGE SUMMARY",
    `Site: ${context.siteName} (${context.reference})`,
    `Penetration: ${context.penetration}`,
    `Nominated solution: ${context.nominatedCode}`,
    `Substitute considered: ${context.substituteCode} (catalogue match, not verified; stock ${context.substituteStatus})`,
    "Blocking requirements:",
    ...chosen.flatMap((requirement) => [
      `- [${requirement.status}] ${requirement.name}`,
      `  Required: ${amount(requirement.required, requirement.unit)}`,
      `  Available: ${amount(requirement.available, requirement.unit)}`,
      `  Missing: ${amount(requirement.missing, requirement.unit)}`,
      `  Inventory captured: ${capturedText(requirement.capturedAt)}`,
      `  Reason: ${requirement.status === "SHORTAGE" ? "Insufficient quantity" : "Inventory snapshot missing"}`,
    ]),
  ];
  if (note.length > 0) lines.push("", `Note: ${note}`);
  return lines.join("\n");
}
