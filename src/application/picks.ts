import { checkPicks, type PickCheck, type PickReport, type PickReportKind, type PickRequest, type PickReview } from "@/domain";
import { IdempotencyKeyReusedError, PickLineNotFoundError, SiteNotFoundError, ValidationFailedError, type Contact } from "@/ports";
import type { Dependencies } from "./types";

/** A site's pick check (AC 61, 62): the warehouse's list against the plan, and who to call about it. */
export interface SitePickCheck {
  readonly siteId: string;
  readonly siteName: string;
  /** The site's picker, with phone and maybe email. Null when the site names none. */
  readonly picker: Contact | null;
  readonly lastAction: string | null;
  readonly lastActionAt: string | null;
  readonly check: PickCheck;
}

/**
 * The check also reads what the site has reported and reviewed (AC 70), so a report from site holds a line that the
 * pick list says matches. If those can't be read, the whole check can't be made: never ready on half the facts.
 */
export async function getPickCheck(deps: Dependencies, siteId: string): Promise<SitePickCheck> {
  const site = await deps.sites.getSite(siteId);
  if (!site) throw new SiteNotFoundError();
  const [list, reports, reviews] = await Promise.all([
    deps.picks.getPicks(siteId),
    deps.actions.listPickReports(siteId),
    deps.actions.listPickReviews(siteId),
  ]);
  return {
    siteId,
    siteName: site.name,
    picker: site.picker ?? null,
    lastAction: list?.lastAction ?? null,
    lastActionAt: list?.lastActionAt ?? null,
    check: checkPicks(list, { reports, reviews }),
  };
}

export interface RecordPickReportInput {
  readonly siteId: string;
  readonly lineId: string;
  readonly kind: PickReportKind;
  readonly plannedQty: number | null;
  readonly pickedQty: number | null;
  readonly affectedQty: number | null;
  readonly request: PickRequest;
  readonly missingPart: string | null;
  readonly note: string | null;
  readonly sendToPicker: boolean;
  readonly sendToPurchasing: boolean;
  readonly photoAttached: boolean;
  readonly createdBy: string;
  readonly idempotencyKey: string;
}

function textOrNull(value: string | null, max: number, field: string): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ValidationFailedError([field]);
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Records a pick-error report (AC 65). A repeat with the same key returns the original, so a phone resending its
 * outbox after a lost answer never records it twice (AC 66). The key looked up first, before any upstream read,
 * like the other writes.
 */
export async function recordPickReport(deps: Dependencies, input: RecordPickReportInput): Promise<{ record: PickReport; created: boolean }> {
  const note = textOrNull(input.note, 500, "note");
  const missingPart = textOrNull(input.missingPart, 120, "missingPart");
  if (!input.sendToPicker && !input.sendToPurchasing) throw new ValidationFailedError(["sendToPicker", "sendToPurchasing"]);

  const existing = await deps.actions.findPickReportByKey(input.createdBy, input.idempotencyKey);
  if (existing) {
    if (existing.siteId === input.siteId && existing.lineId === input.lineId && existing.kind === input.kind) {
      return { record: existing, created: false };
    }
    throw new IdempotencyKeyReusedError();
  }

  const site = await deps.sites.getSite(input.siteId);
  if (!site) throw new SiteNotFoundError();
  const list = await deps.picks.getPicks(input.siteId);
  if (!list || !list.lines.some((line) => line.id === input.lineId)) throw new PickLineNotFoundError();

  return deps.actions.appendPickReport({
    siteId: input.siteId,
    lineId: input.lineId,
    kind: input.kind,
    plannedQty: input.plannedQty,
    pickedQty: input.pickedQty,
    affectedQty: input.affectedQty,
    request: input.request,
    missingPart,
    note,
    sendToPicker: input.sendToPicker,
    sendToPurchasing: input.sendToPurchasing,
    photoAttached: input.photoAttached,
    createdBy: input.createdBy,
    idempotencyKey: input.idempotencyKey,
  });
}

export interface RecordPickReviewInput {
  readonly siteId: string;
  readonly lineId: string;
  readonly createdBy: string;
  readonly idempotencyKey: string;
}

/**
 * Records a review on site that says a line is right (AC 68). Idempotent like a report, so a phone resending its
 * outbox records it once (AC 71). It needs a line on this site's pick list, and it never changes the list.
 */
export async function recordPickReview(deps: Dependencies, input: RecordPickReviewInput): Promise<{ record: PickReview; created: boolean }> {
  const existing = await deps.actions.findPickReviewByKey(input.createdBy, input.idempotencyKey);
  if (existing) {
    if (existing.siteId === input.siteId && existing.lineId === input.lineId) return { record: existing, created: false };
    throw new IdempotencyKeyReusedError();
  }

  const site = await deps.sites.getSite(input.siteId);
  if (!site) throw new SiteNotFoundError();
  const list = await deps.picks.getPicks(input.siteId);
  if (!list || !list.lines.some((line) => line.id === input.lineId)) throw new PickLineNotFoundError();

  return deps.actions.appendPickReview({
    siteId: input.siteId,
    lineId: input.lineId,
    createdBy: input.createdBy,
    idempotencyKey: input.idempotencyKey,
  });
}
