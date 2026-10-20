import { telHref, type ContactView } from "./contacts";
import { deadlineOf, type Deadline } from "./deadline";

/**
 * A team leader's own changes to a project's schedule (AC 86, 87): a new deadline, or another operator. The sample
 * data under `data/sample` is read-only once deployed, so a change is kept in this browser's localStorage, keyed by
 * project id, and a card reads it before the sample's value. Pure, so every rule and word is tested here; the hook
 * that subscribes to it lives in `SiteEdits.tsx`.
 */

export const SITE_EDITS_KEY = "team-leader:site-edits";
/** Fired on this page after a save, so every card showing the project follows at once. */
export const SITE_EDITS_CHANGED = "team-leader:site-edits-changed";

export interface SiteEdit {
  /** YYYY-MM-DD, a real date. */
  readonly date?: string;
  readonly operator?: ContactView;
}

export type SiteEdits = Readonly<Record<string, SiteEdit>>;

export type EditStorage = Pick<Storage, "getItem" | "setItem">;

const ID = /^[A-Za-z0-9._-]{1,64}$/;
const PHONE = /^\+[0-9][0-9 ]{5,19}$/;

export const SITE_EDITS = {
  deadlineTitle: "Change deadline",
  operatorTitle: "Change operator",
  cancel: "Cancel",
  confirm: "Confirm",
  done: "OK",
  hint: "Tap another date to move the deadline.",
  newDeadline: "New deadline",
  currentDeadline: "current deadline",
  candidates: "Operators",
  savedHere: "Saved on this device only.",
  notSaved: "This device couldn't save the change. Nothing was changed.",
  deadlineUpdated: (site: string, date: string) => `${site}: deadline updated to ${date}.`,
  operatorUpdated: (site: string, name: string) => `You've updated the operator for ${site} to ${name}.`,
} as const;

function contactOf(value: unknown): ContactView | null {
  if (typeof value !== "object" || value === null) return null;
  const { name, phone } = value as { name?: unknown; phone?: unknown };
  if (typeof name !== "string" || typeof phone !== "string") return null;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 80 || !PHONE.test(phone)) return null;
  return { name: trimmed, phone };
}

/** What is stored, keeping only well-formed entries: junk, a bad id, an impossible date or a bad number reads as no change. */
export function parseSiteEdits(raw: string | null): SiteEdits {
  if (!raw) return {};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const edits: Record<string, SiteEdit> = {};
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!ID.test(id) || typeof entry !== "object" || entry === null) continue;
    const { date, operator } = entry as { date?: unknown; operator?: unknown };
    const kept: { date?: string; operator?: ContactView } = {};
    if (deadlineOf(date)) kept.date = date as string;
    const contact = contactOf(operator);
    if (contact) kept.operator = contact;
    if (kept.date || kept.operator) edits[id] = kept;
  }
  return edits;
}

export function readSiteEdits(storage: EditStorage | null): SiteEdits {
  if (!storage) return {};
  try {
    return parseSiteEdits(storage.getItem(SITE_EDITS_KEY));
  } catch {
    return {};
  }
}

/** Stores the edits; false when the browser refuses (private mode, full, blocked), so the leader is told. */
export function writeSiteEdits(storage: EditStorage | null, edits: SiteEdits): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SITE_EDITS_KEY, JSON.stringify(edits));
    return true;
  } catch {
    return false;
  }
}

export function withDeadline(edits: SiteEdits, siteId: string, date: string): SiteEdits {
  return { ...edits, [siteId]: { ...edits[siteId], date } };
}

export function withOperator(edits: SiteEdits, siteId: string, operator: ContactView): SiteEdits {
  return { ...edits, [siteId]: { ...edits[siteId], operator: { name: operator.name, phone: operator.phone } } };
}

/** The deadline a card shows: this browser's change first, then the sample data's. */
export function effectiveDate(edits: SiteEdits, siteId: string, upstream: string | undefined): string | undefined {
  return edits[siteId]?.date ?? upstream;
}

export function effectiveOperator(edits: SiteEdits, siteId: string, upstream: ContactView | undefined): ContactView | undefined {
  return edits[siteId]?.operator ?? upstream;
}

/** One person: the same name and the same number, however the number is spaced. */
export function sameContact(a: ContactView | undefined, b: ContactView | undefined): boolean {
  if (!a || !b) return a === b;
  return a.name === b.name && telHref(a.phone) === telHref(b.phone);
}

/**
 * Who a project can be given to: every operator and picker in the sample data, once each, in the order they first
 * appear. The current operator is always offered, even when no other project names them.
 */
export function operatorCandidates(
  sites: readonly { readonly operator?: ContactView; readonly picker?: ContactView }[],
  current?: ContactView,
): ContactView[] {
  const people: ContactView[] = [];
  const add = (person: ContactView | undefined) => {
    if (person && !people.some((known) => sameContact(known, person))) people.push({ name: person.name, phone: person.phone });
  };
  add(current);
  for (const site of sites) {
    add(site.operator);
    add(site.picker);
  }
  return people;
}

/** The calendar's projects with this device's deadlines in place of the sample data's (AC 86). */
export function withEditedDeadlines<T extends { readonly id: string; readonly deadline: Deadline | null }>(projects: readonly T[], edits: SiteEdits): T[] {
  return projects.map((project) => {
    const date = edits[project.id]?.date;
    return date ? { ...project, deadline: deadlineOf(date) } : project;
  });
}
