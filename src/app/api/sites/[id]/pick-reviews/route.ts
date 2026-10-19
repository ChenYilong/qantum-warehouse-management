import { recordPickReview } from "@/application";
import { getDependencies } from "@/server/deps";
import { getCurrentUser } from "@/server/identity";
import { PickReviewBodySchema, handle, json, readPost, requireSiteId } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A review on site that says a pick line is right (AC 68). 201, or 200 for a repeat of the same key. */
export function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const params = await context.params;
    const siteId = requireSiteId(params.id);
    const { idempotencyKey, body } = await readPost(request, PickReviewBodySchema);
    const result = await recordPickReview(getDependencies(), {
      siteId,
      lineId: body.lineId,
      createdBy: getCurrentUser().id,
      idempotencyKey,
    });
    return json(result, result.created ? 201 : 200);
  });
}
