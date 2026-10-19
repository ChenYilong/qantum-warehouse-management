import { checkPicks, type PickCheck, type PickReport, type PickReportKind } from "@/domain";
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

export async function getPickCheck(deps: Dependencies, siteId: string): Promise<SitePickCheck> {
  const site = await deps.sites.getSite(siteId);
  if (!site) throw new SiteNotFoundError();
  const list = await deps.picks.getPicks(siteId);
  return {
    siteId,
    siteName: site.name,
    picker: site.picker ?? null,
    lastAction: list?.lastAction ?? null,
    lastActionAt: list?.lastActionAt ?? null,
    check: checkPicks(list),
  };
}

export interface RecordPickReportInput {
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
    missingPart,
    note,
    sendToPicker: input.sendToPicker,
    sendToPurchasing: input.sendToPurchasing,
    photoAttached: input.photoAttached,
    createdBy: input.createdBy,
    idempotencyKey: input.idempotencyKey,
  });
}
