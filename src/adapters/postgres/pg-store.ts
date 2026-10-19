import type { Pool, QueryResultRow } from "pg";
import type { ActionsStore, PickReportInsert, PickReviewInsert, ShortageActionInsert, StoreResult, SubstitutionProposalInsert } from "./repository";

type SqlValue = string | number | boolean | null;

const INSERT_SHORTAGE = `insert into public.shortage_action (
  site_id, shortage_id, kind, escalate_to, note, shortfall_qty_at_time, created_by, idempotency_key
) values ($1, $2, $3, $4, $5, $6, $7, $8)
returning *`;

const SELECT_SHORTAGE = "select * from public.shortage_action where created_by = $1 and idempotency_key = $2";

const LIST_SHORTAGE = "select * from public.shortage_action where site_id = $1 order by created_at desc, id desc";

const INSERT_PROPOSAL = `insert into public.substitution_proposal (
  site_id, penetration_id, from_internal_code, to_internal_code, reason, status, created_by, idempotency_key
) values ($1, $2, $3, $4, $5, $6, $7, $8)
returning *`;

const SELECT_PROPOSAL = "select * from public.substitution_proposal where created_by = $1 and idempotency_key = $2";

const LIST_PROPOSAL = "select * from public.substitution_proposal where site_id = $1 order by created_at desc, id desc";

const INSERT_REPORT = `insert into public.pick_report (
  site_id, line_id, kind, planned_qty, picked_qty, affected_qty, request, missing_part, note, send_to_picker, send_to_purchasing, photo_attached, created_by, idempotency_key
) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
returning *`;

const SELECT_REPORT = "select * from public.pick_report where created_by = $1 and idempotency_key = $2";

const LIST_REPORT = "select * from public.pick_report where site_id = $1 order by created_at desc, id desc";

const INSERT_REVIEW = `insert into public.pick_review (site_id, line_id, created_by, idempotency_key) values ($1, $2, $3, $4)
returning *`;

const SELECT_REVIEW = "select * from public.pick_review where created_by = $1 and idempotency_key = $2";

const LIST_REVIEW = "select * from public.pick_review where site_id = $1 order by created_at desc, id desc";

export function createPgActionsStore(pool: Pool): ActionsStore {
  return {
    insertShortageAction(row) {
      return one(pool, INSERT_SHORTAGE, shortageValues(row));
    },
    selectShortageActionByKey(createdBy, idempotencyKey) {
      return maybeOne(pool, SELECT_SHORTAGE, [createdBy, idempotencyKey]);
    },
    listShortageActions(siteId) {
      return many(pool, LIST_SHORTAGE, [siteId]);
    },
    insertSubstitutionProposal(row) {
      return one(pool, INSERT_PROPOSAL, proposalValues(row));
    },
    selectSubstitutionProposalByKey(createdBy, idempotencyKey) {
      return maybeOne(pool, SELECT_PROPOSAL, [createdBy, idempotencyKey]);
    },
    listSubstitutionProposals(siteId) {
      return many(pool, LIST_PROPOSAL, [siteId]);
    },
    insertPickReport(row) {
      return one(pool, INSERT_REPORT, reportValues(row));
    },
    selectPickReportByKey(createdBy, idempotencyKey) {
      return maybeOne(pool, SELECT_REPORT, [createdBy, idempotencyKey]);
    },
    listPickReports(siteId) {
      return many(pool, LIST_REPORT, [siteId]);
    },
    insertPickReview(row) {
      return one(pool, INSERT_REVIEW, reviewValues(row));
    },
    selectPickReviewByKey(createdBy, idempotencyKey) {
      return maybeOne(pool, SELECT_REVIEW, [createdBy, idempotencyKey]);
    },
    listPickReviews(siteId) {
      return many(pool, LIST_REVIEW, [siteId]);
    },
  };
}

function shortageValues(row: ShortageActionInsert): SqlValue[] {
  return [row.site_id, row.shortage_id, row.kind, row.escalate_to, row.note, row.shortfall_qty_at_time, row.created_by, row.idempotency_key];
}

function proposalValues(row: SubstitutionProposalInsert): SqlValue[] {
  return [
    row.site_id,
    row.penetration_id,
    row.from_internal_code,
    row.to_internal_code,
    row.reason,
    row.status,
    row.created_by,
    row.idempotency_key,
  ];
}

function reportValues(row: PickReportInsert): SqlValue[] {
  return [
    row.site_id,
    row.line_id,
    row.kind,
    row.planned_qty,
    row.picked_qty,
    row.affected_qty,
    row.request,
    row.missing_part,
    row.note,
    row.send_to_picker,
    row.send_to_purchasing,
    row.photo_attached,
    row.created_by,
    row.idempotency_key,
  ];
}

async function one(pool: Pool, text: string, values: SqlValue[]): Promise<StoreResult> {
  const result = await run(pool, text, values);
  if (result.error) return result.result;
  const row = result.rows[0];
  if (result.rows.length !== 1 || row === undefined) return { data: null, error: {} };
  return { data: row, error: null };
}

async function maybeOne(pool: Pool, text: string, values: SqlValue[]): Promise<StoreResult> {
  const result = await run(pool, text, values);
  if (result.error) return result.result;
  if (result.rows.length === 0) return { data: null, error: null };
  const row = result.rows[0];
  if (result.rows.length !== 1 || row === undefined) return { data: null, error: {} };
  return { data: row, error: null };
}

async function many(pool: Pool, text: string, values: SqlValue[]): Promise<StoreResult> {
  const result = await run(pool, text, values);
  if (result.error) return result.result;
  return { data: result.rows, error: null };
}

async function run(pool: Pool, text: string, values: SqlValue[]): Promise<{ error: false; rows: Record<string, unknown>[] } | { error: true; result: StoreResult }> {
  try {
    const query = await pool.query(text, values);
    return { error: false, rows: query.rows.map((row) => normalize(row)) };
  } catch (error) {
    return { error: true, result: failed(error) };
  }
}

function normalize(row: QueryResultRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    const value: unknown = row[key];
    out[key] = value instanceof Date ? value.toISOString() : value;
  }
  return out;
}

function failed(error: unknown): StoreResult {
  const code = codeOf(error);
  if (code === "23505") return { data: null, error: { code: "23505" } };
  if (code === undefined) return { data: null, error: {} };
  return { data: null, error: { code } };
}

function codeOf(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function reviewValues(row: PickReviewInsert): SqlValue[] {
  return [row.site_id, row.line_id, row.created_by, row.idempotency_key];
}
