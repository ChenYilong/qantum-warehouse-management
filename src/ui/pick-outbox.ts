import { pickReportUrl, pickReviewUrl } from "./decisions/api-client";

/**
 * Pick-error reports and reviews on site waiting on this phone (AC 66, 71). One written offline is kept here with its
 * idempotency key and sent once the phone is back online; a resend after a lost answer carries the same key, so the
 * server records it once. Kept in this browser only.
 */
export const OUTBOX_KEY = "team-leader:pick-report-outbox";
export const OUTBOX_CHANGED = "team-leader:outbox-change";

export interface OutboxEntry {
  readonly key: string;
  readonly siteId: string;
  readonly body: Record<string, unknown>;
  /** When it was saved, ms since the epoch. */
  readonly savedAt: number;
  /** A review on site (AC 71). A report has no type, as reports saved before reviews existed. */
  readonly type?: "review";
}

interface OutboxStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = /^[A-Za-z0-9._-]{1,128}$/;
const SITE = /^[A-Za-z0-9._-]{1,64}$/;

/** Entries that look like ones this app wrote; anything else in storage is dropped, never sent. */
export function parseOutbox(raw: string | null): OutboxEntry[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item: unknown) => {
      if (typeof item !== "object" || item === null) return [];
      const { key, siteId, body, savedAt, type } = item as Record<string, unknown>;
      if (typeof key !== "string" || !KEY.test(key) || typeof siteId !== "string" || !SITE.test(siteId)) return [];
      if (typeof body !== "object" || body === null || Array.isArray(body)) return [];
      if (typeof savedAt !== "number" || !Number.isFinite(savedAt)) return [];
      // Only types this app knows: anything else is dropped, never sent somewhere it was not meant for.
      if (type !== undefined && type !== "review" && type !== "report") return [];
      const entry: OutboxEntry = { key, siteId, body: body as Record<string, unknown>, savedAt };
      return [type === "review" ? { ...entry, type } : entry];
    });
  } catch {
    return [];
  }
}

export function readOutbox(storage: OutboxStorage): OutboxEntry[] {
  try {
    return parseOutbox(storage.getItem(OUTBOX_KEY));
  } catch {
    return [];
  }
}

function write(storage: OutboxStorage, entries: readonly OutboxEntry[]): boolean {
  try {
    storage.setItem(OUTBOX_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

/** Adds a report, replacing one with the same key. False when storage is blocked, so the caller can say so. */
export function addToOutbox(storage: OutboxStorage, entry: OutboxEntry): boolean {
  return write(storage, [...readOutbox(storage).filter((existing) => existing.key !== entry.key), entry]);
}

export function removeFromOutbox(storage: OutboxStorage, key: string): void {
  write(
    storage,
    readOutbox(storage).filter((entry) => entry.key !== key),
  );
}

export function waitingFor(entries: readonly OutboxEntry[], siteId: string): number {
  return entries.filter((entry) => entry.siteId === siteId).length;
}

/** What waits for a site, reports and reviews apart (AC 71). */
export function waitingCounts(entries: readonly OutboxEntry[], siteId: string): { readonly reports: number; readonly reviews: number } {
  const mine = entries.filter((entry) => entry.siteId === siteId);
  const reviews = mine.filter((entry) => entry.type === "review").length;
  return { reports: mine.length - reviews, reviews };
}

/** Where an entry is sent: a review to the reviews, anything else to the reports. */
export function outboxUrl(entry: OutboxEntry): string {
  return entry.type === "review" ? pickReviewUrl(entry.siteId) : pickReportUrl(entry.siteId);
}

/** Codes the server answers only for a report it will never accept: the report leaves the outbox. */
const FINAL = new Set(["validation_failed", "pick_line_not_found", "site_not_found", "idempotency_key_reused", "payload_too_large", "invalid_json"]);

/**
 * What to do with a report after a send. Sent (201) or already recorded (200 replay) leaves the outbox; a refusal
 * that will never change leaves it too; anything else (no answer, a server or upstream failure) keeps it to retry.
 */
export function afterSend(result: { readonly ok: true } | { readonly ok: false; readonly code: string }): "sent" | "drop" | "keep" {
  if (result.ok) return "sent";
  return FINAL.has(result.code) ? "drop" : "keep";
}
