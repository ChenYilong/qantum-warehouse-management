import type { PickReport, PickReview, ShortageAction, SubstitutionProposal } from "@/domain";
import type { ActionsRepository, NewPickReport, NewPickReview, NewShortageAction, NewSubstitutionProposal } from "@/ports";

export interface MemoryActionsOptions {
  readonly now?: () => Date;
  readonly newId?: () => string;
}

interface StoredAction {
  readonly record: ShortageAction;
  readonly createdBy: string;
  readonly idempotencyKey: string;
  readonly sequence: number;
}

interface StoredProposal {
  readonly record: SubstitutionProposal;
  readonly createdBy: string;
  readonly idempotencyKey: string;
  readonly sequence: number;
}

interface StoredReport {
  readonly record: PickReport;
  readonly createdBy: string;
  readonly idempotencyKey: string;
  readonly sequence: number;
}

interface StoredReview {
  readonly record: PickReview;
  readonly createdBy: string;
  readonly idempotencyKey: string;
  readonly sequence: number;
}

function byNewest(left: { record: { createdAt: string }; sequence: number }, right: { record: { createdAt: string }; sequence: number }): number {
  const leftMs = Date.parse(left.record.createdAt);
  const rightMs = Date.parse(right.record.createdAt);
  if (!Number.isNaN(leftMs) && !Number.isNaN(rightMs) && leftMs !== rightMs) return leftMs > rightMs ? -1 : 1;
  return right.sequence - left.sequence;
}

export function createMemoryActionsRepository(options: MemoryActionsOptions = {}): ActionsRepository {
  const now = options.now ?? (() => new Date());
  const newId = options.newId ?? (() => crypto.randomUUID());
  const actions: StoredAction[] = [];
  const proposals: StoredProposal[] = [];
  const reports: StoredReport[] = [];
  const reviews: StoredReview[] = [];
  let sequence = 0;

  return {
    async appendShortageAction(input: NewShortageAction) {
      const existing = actions.find((item) => item.createdBy === input.createdBy && item.idempotencyKey === input.idempotencyKey);
      if (existing) return { record: { ...existing.record }, created: false };
      const record: ShortageAction = {
        id: newId(),
        siteId: input.siteId,
        shortageId: input.shortageId,
        kind: input.kind,
        escalateTo: input.escalateTo,
        note: input.note,
        shortfallQtyAtTime: input.shortfallQtyAtTime,
        createdBy: input.createdBy,
        createdAt: now().toISOString(),
      };
      actions.push({ record, createdBy: input.createdBy, idempotencyKey: input.idempotencyKey, sequence: sequence });
      sequence += 1;
      return { record: { ...record }, created: true };
    },

    async appendSubstitutionProposal(input: NewSubstitutionProposal) {
      const existing = proposals.find((item) => item.createdBy === input.createdBy && item.idempotencyKey === input.idempotencyKey);
      if (existing) return { record: { ...existing.record }, created: false };
      const record: SubstitutionProposal = {
        id: newId(),
        siteId: input.siteId,
        penetrationId: input.penetrationId,
        fromInternalCode: input.fromInternalCode,
        toInternalCode: input.toInternalCode,
        reason: input.reason,
        status: "proposed",
        createdBy: input.createdBy,
        createdAt: now().toISOString(),
      };
      proposals.push({ record, createdBy: input.createdBy, idempotencyKey: input.idempotencyKey, sequence: sequence });
      sequence += 1;
      return { record: { ...record }, created: true };
    },

    async findShortageActionByKey(createdBy: string, idempotencyKey: string) {
      const existing = actions.find((item) => item.createdBy === createdBy && item.idempotencyKey === idempotencyKey);
      return existing ? { ...existing.record } : null;
    },

    async findSubstitutionProposalByKey(createdBy: string, idempotencyKey: string) {
      const existing = proposals.find((item) => item.createdBy === createdBy && item.idempotencyKey === idempotencyKey);
      return existing ? { ...existing.record } : null;
    },

    async listShortageActions(siteId: string) {
      return actions
        .filter((item) => item.record.siteId === siteId)
        .sort(byNewest)
        .map((item) => ({ ...item.record }));
    },

    async listSubstitutionProposals(siteId: string) {
      return proposals
        .filter((item) => item.record.siteId === siteId)
        .sort(byNewest)
        .map((item) => ({ ...item.record }));
    },

    async appendPickReport(input: NewPickReport) {
      const existing = reports.find((item) => item.createdBy === input.createdBy && item.idempotencyKey === input.idempotencyKey);
      if (existing) return { record: { ...existing.record }, created: false };
      const record: PickReport = {
        id: newId(),
        siteId: input.siteId,
        lineId: input.lineId,
        kind: input.kind,
        plannedQty: input.plannedQty,
        pickedQty: input.pickedQty,
        affectedQty: input.affectedQty,
        request: input.request,
        missingPart: input.missingPart,
        note: input.note,
        sendToPicker: input.sendToPicker,
        sendToPurchasing: input.sendToPurchasing,
        photoAttached: input.photoAttached,
        createdBy: input.createdBy,
        createdAt: now().toISOString(),
      };
      reports.push({ record, createdBy: input.createdBy, idempotencyKey: input.idempotencyKey, sequence: sequence });
      sequence += 1;
      return { record: { ...record }, created: true };
    },

    async findPickReportByKey(createdBy: string, idempotencyKey: string) {
      const existing = reports.find((item) => item.createdBy === createdBy && item.idempotencyKey === idempotencyKey);
      return existing ? { ...existing.record } : null;
    },

    async listPickReports(siteId: string) {
      return reports
        .filter((item) => item.record.siteId === siteId)
        .sort(byNewest)
        .map((item) => ({ ...item.record }));
    },

    async appendPickReview(input: NewPickReview) {
      const existing = reviews.find((item) => item.createdBy === input.createdBy && item.idempotencyKey === input.idempotencyKey);
      if (existing) return { record: { ...existing.record }, created: false };
      const record: PickReview = {
        id: newId(),
        siteId: input.siteId,
        lineId: input.lineId,
        createdBy: input.createdBy,
        createdAt: now().toISOString(),
      };
      reviews.push({ record, createdBy: input.createdBy, idempotencyKey: input.idempotencyKey, sequence: sequence });
      sequence += 1;
      return { record: { ...record }, created: true };
    },

    async findPickReviewByKey(createdBy: string, idempotencyKey: string) {
      const existing = reviews.find((item) => item.createdBy === createdBy && item.idempotencyKey === idempotencyKey);
      return existing ? { ...existing.record } : null;
    },

    async listPickReviews(siteId: string) {
      return reviews
        .filter((item) => item.record.siteId === siteId)
        .sort(byNewest)
        .map((item) => ({ ...item.record }));
    },
  };
}
