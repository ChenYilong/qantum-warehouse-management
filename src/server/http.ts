import { z } from "zod";
import {
  AppError,
  IdempotencyKeyRequiredError,
  InternalError,
  InvalidJsonError,
  PayloadTooLargeError,
  PenetrationNotFoundError,
  ShortageNotFoundError,
  SiteNotFoundError,
  UpstreamError,
  ValidationFailedError,
} from "@/ports";
import { log } from "@/application/log";

const MAX_BODY_BYTES = 10_000;
const PATH_ID = /^[A-Za-z0-9._-]{1,64}$/;
const SHORTAGE_ID = /^[A-Za-z0-9._-]{1,64}:[A-Za-z0-9._-]{1,80}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._-]{1,128}$/;
const SAFE_FIELD = /^[A-Za-z0-9._]{1,80}$/;

export const WaitBodySchema = z.strictObject({
  note: z.string().trim().max(500).optional(),
});

export const EscalateBodySchema = z.strictObject({
  escalateTo: z.enum(["purchasing", "warehouse"]),
  note: z.string().trim().max(500).optional(),
});

export const SubstitutionBodySchema = z.strictObject({
  fromInternalCode: z.string().min(1).max(64),
  toInternalCode: z.string().min(1).max(64),
  reason: z.string().trim().min(1).max(500),
});

/** A pick-error report (AC 65). Amounts are whole, non-negative and finite; text is trimmed and capped. */
const PickLineIdSchema = z.string().regex(/^[A-Za-z0-9._-]{1,64}$/);

export const PickReportBodySchema = z.strictObject({
  kind: z.enum(["wrong_spec", "missing_parts", "part_picked", "unsuitable", "wrong_item", "damaged", "other"]),
  lineId: PickLineIdSchema,
  plannedQty: z.number().int().min(0).max(100_000).nullable().optional(),
  pickedQty: z.number().int().min(0).max(100_000).nullable().optional(),
  /** How many the site found wrong, unfit or damaged (AC 69). */
  affectedQty: z.number().int().min(0).max(100_000).nullable().optional(),
  /** What the site needs: a re-pick for the next delivery (the default) or a same-day delivery (AC 69). */
  request: z.enum(["repick", "same_day"]).optional(),
  missingPart: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  sendToPicker: z.boolean(),
  sendToPurchasing: z.boolean(),
  photoAttached: z.boolean().optional(),
});

/** A review on site that says a line is right (AC 68): the line, and nothing else. */
export const PickReviewBodySchema = z.strictObject({
  lineId: PickLineIdSchema,
});

export function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function handle(work: () => Promise<Response> | Response): Promise<Response> {
  try {
    return await work();
  } catch (error) {
    return errorResponse(error);
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof UpstreamError) {
    log("upstream_failed", { code: error.code, system: error.system, status: error.status });
    return json({ code: error.code, message: error.message }, error.status);
  }
  if (error instanceof AppError) {
    log("request_failed", {
      code: error.code,
      status: error.status,
      ...(error instanceof InternalError && error.reason !== undefined ? { reason: error.reason } : {}),
    });
    return json({ code: error.code, message: error.message }, error.status);
  }
  log("internal_error", { code: "internal_error", status: 500 });
  return json({ code: "internal_error", message: "Something went wrong." }, 500);
}

function decodeSegment(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function requireSiteId(value: string | undefined): string {
  if (value === undefined) throw new SiteNotFoundError();
  const decoded = decodeSegment(value);
  if (decoded === null || !PATH_ID.test(decoded)) throw new SiteNotFoundError();
  return decoded;
}

export function requirePenetrationId(value: string | undefined): string {
  if (value === undefined) throw new PenetrationNotFoundError();
  const decoded = decodeSegment(value);
  if (decoded === null || !PATH_ID.test(decoded)) throw new PenetrationNotFoundError();
  return decoded;
}

export function requireShortageId(siteId: string, value: string | undefined): string {
  if (value === undefined) throw new ShortageNotFoundError();
  const decoded = decodeSegment(value);
  if (decoded === null || !SHORTAGE_ID.test(decoded) || !decoded.startsWith(`${siteId}:`)) throw new ShortageNotFoundError();
  return decoded;
}

export function requireIdempotencyKey(request: Request): string {
  const key = request.headers.get("idempotency-key");
  if (key === null || !IDEMPOTENCY_KEY.test(key)) throw new IdempotencyKeyRequiredError();
  return key;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const declared = request.headers.get("content-length");
  if (declared !== null && /^\d+$/.test(declared) && Number(declared) > MAX_BODY_BYTES) throw new PayloadTooLargeError();
  const body = request.body;
  if (body === null) throw new InvalidJsonError();

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      received += next.value.byteLength;
      if (received > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new PayloadTooLargeError();
      }
      chunks.push(next.value);
    }
  } catch (error) {
    if (error instanceof PayloadTooLargeError) throw error;
    throw new InvalidJsonError();
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new InvalidJsonError();
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new InvalidJsonError();
  }
}

function fieldPaths(issues: readonly { path?: PropertyKey[]; keys?: PropertyKey[] }[]): string[] {
  const paths: string[] = [];
  for (const issue of issues) {
    const path = (issue.path ?? []).map(String).join(".");
    if (path.length === 0 && issue.keys) {
      for (const key of issue.keys) addField(paths, String(key));
      continue;
    }
    addField(paths, path);
  }
  return paths;
}

function addField(paths: string[], path: string): void {
  if (!SAFE_FIELD.test(path) || paths.includes(path)) return;
  paths.push(path);
}

export function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ValidationFailedError(fieldPaths(parsed.error.issues));
  return parsed.data;
}

export async function readPost<T>(request: Request, schema: z.ZodType<T>): Promise<{ idempotencyKey: string; body: T }> {
  const idempotencyKey = requireIdempotencyKey(request);
  const body = parseBody(schema, await readJsonBody(request));
  return { idempotencyKey, body };
}
