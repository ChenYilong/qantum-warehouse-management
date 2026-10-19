import { recordPickReport } from "@/application";
import { getDependencies } from "@/server/deps";
import { getCurrentUser } from "@/server/identity";
import { PickReportBodySchema, handle, json, readPost, requireSiteId } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const params = await context.params;
    const siteId = requireSiteId(params.id);
    const { idempotencyKey, body } = await readPost(request, PickReportBodySchema);
    const result = await recordPickReport(getDependencies(), {
      siteId,
      lineId: body.lineId,
      kind: body.kind,
      plannedQty: body.plannedQty ?? null,
      pickedQty: body.pickedQty ?? null,
      missingPart: body.missingPart ?? null,
      note: body.note ?? null,
      sendToPicker: body.sendToPicker,
      sendToPurchasing: body.sendToPurchasing,
      photoAttached: body.photoAttached ?? false,
      createdBy: getCurrentUser().id,
      idempotencyKey,
    });
    return json(result, result.created ? 201 : 200);
  });
}
