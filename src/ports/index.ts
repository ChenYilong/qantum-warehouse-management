import type { ActionKind, EscalateTo, Penetration, PickList, PickReport, PickReportKind, PickRequest, PickReview, ShortageAction, SubstitutionProposal } from "@/domain";
import type { SolutionMaterialRecord, StockBalanceRecord } from "./schemas";

export type { InternalReason, UpstreamCode } from "./errors";
export {
  AppError,
  IdempotencyKeyRequiredError,
  IdempotencyKeyReusedError,
  InternalError,
  InvalidJsonError,
  NotACandidateError,
  PayloadTooLargeError,
  PenetrationNotFoundError,
  PickLineNotFoundError,
  MaterialNotFoundError,
  ShortageNotFoundError,
  SiteNotFoundError,
  StaleNominationError,
  UpstreamError,
  ValidationFailedError,
  WaitNotAllowedError,
} from "./errors";

export {
  ContactSchema,
  IdSchema,
  MaterialSchema,
  NominatedPenetrationSchema,
  NominationsFileSchema,
  NominationsResponseSchema,
  PickLineSchema,
  PickListRecordSchema,
  PicksFileSchema,
  RequiredPartSchema,
  SiteSchema,
  SitesFileSchema,
  SolutionMaterialSchema,
  SolutionMaterialsFileSchema,
  StockBalanceSchema,
  StockFileSchema,
} from "./schemas";

/** Domain penetration plus the display fields the screen needs. */
export interface NominatedPenetration extends Penetration {
  readonly floor: string;
  readonly location: string;
}

export interface Contact {
  readonly name: string;
  readonly phone: string;
  readonly email?: string;
}

export interface Site {
  readonly id: string;
  readonly name: string;
  readonly reference: string;
  readonly address?: string;
  /** Who installs at this site today. */
  readonly operator?: Contact;
  /** Who picks this site's materials in the warehouse. May be the operator too. */
  readonly picker?: Contact;
  /** Where the site is (AC 74): latitude and longitude in degrees. */
  readonly location?: { readonly lat: number; readonly lng: number };
}

export interface Material {
  readonly id: string;
  readonly name: string;
  readonly unit: string;
}

export interface SitesPort {
  listSites(): Promise<Site[]>;
  getSite(siteId: string): Promise<Site | null>;
}

export interface NominationsPort {
  /** Null means the site is not in the upstream data. */
  getNominations(siteId: string): Promise<NominatedPenetration[] | null>;
}

export interface StockPort {
  getStock(materialIds: readonly string[]): Promise<{ asOf: string; balances: StockBalanceRecord[] }>;
}

/** The warehouse pick system (AC 61). Null means no pick list for the site yet: can't check, never ready. */
export interface PicksPort {
  getPicks(siteId: string): Promise<PickList | null>;
}

export interface SolutionMaterialsPort {
  getSolutionMaterials(codes: readonly string[]): Promise<{ materials: Material[]; items: SolutionMaterialRecord[] }>;
}

export interface NewShortageAction {
  readonly siteId: string;
  readonly shortageId: string;
  readonly kind: ActionKind;
  readonly escalateTo: EscalateTo | null;
  readonly note: string | null;
  readonly shortfallQtyAtTime: number | null;
  readonly createdBy: string;
  readonly idempotencyKey: string;
}

export interface NewSubstitutionProposal {
  readonly siteId: string;
  readonly penetrationId: string;
  readonly fromInternalCode: string;
  readonly toInternalCode: string;
  readonly reason: string;
  readonly createdBy: string;
  readonly idempotencyKey: string;
}

export interface NewPickReport {
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

/** A review on site that says a pick line is right (AC 68). */
export interface NewPickReview {
  readonly siteId: string;
  readonly lineId: string;
  readonly createdBy: string;
  readonly idempotencyKey: string;
}

export interface ActionsRepository {
  appendShortageAction(input: NewShortageAction): Promise<{ record: ShortageAction; created: boolean }>;
  appendSubstitutionProposal(input: NewSubstitutionProposal): Promise<{ record: SubstitutionProposal; created: boolean }>;
  findShortageActionByKey(createdBy: string, idempotencyKey: string): Promise<ShortageAction | null>;
  findSubstitutionProposalByKey(createdBy: string, idempotencyKey: string): Promise<SubstitutionProposal | null>;
  listShortageActions(siteId: string): Promise<ShortageAction[]>;
  listSubstitutionProposals(siteId: string): Promise<SubstitutionProposal[]>;
  /** Pick-error reports (AC 65): idempotent by (createdBy, idempotencyKey), like every other write. */
  appendPickReport(input: NewPickReport): Promise<{ record: PickReport; created: boolean }>;
  findPickReportByKey(createdBy: string, idempotencyKey: string): Promise<PickReport | null>;
  listPickReports(siteId: string): Promise<PickReport[]>;
  /** Reviews on site (AC 68): idempotent the same way, append-only, newest first. */
  appendPickReview(input: NewPickReview): Promise<{ record: PickReview; created: boolean }>;
  findPickReviewByKey(createdBy: string, idempotencyKey: string): Promise<PickReview | null>;
  listPickReviews(siteId: string): Promise<PickReview[]>;
}

export type { SubstitutionProposal };
