import { afterEach, describe, expect, it } from "vitest";
import { createMemoryActionsRepository } from "@/adapters/memory/actions-repository";
import { makeStubs, type StubOptions } from "@/adapters/stub";
import { getPickCheck, type Dependencies } from "@/application";
import { POST as postPickReport } from "@/app/api/sites/[id]/pick-reports/route";
import { buildCatalogue } from "@/domain";
import { setDependenciesForTests } from "@/server/deps";

// The pick check and reports need no catalogue, so these run without the supplied CSV.
function deps(options: StubOptions = {}): Dependencies {
  let count = 0;
  const now = (): Date => new Date("2026-10-03T12:00:00.000Z");
  return {
    ...makeStubs(options),
    catalogue: buildCatalogue([]),
    actions: createMemoryActionsRepository({ now, newId: () => `id-${++count}` }),
    now,
  };
}

function post(siteId: string, body: unknown, key?: string): Promise<Response> {
  const headers = new Headers({ "content-type": "application/json" });
  if (key !== undefined) headers.set("Idempotency-Key", key);
  const request = new Request(`http://local/api/sites/${siteId}/pick-reports`, { method: "POST", headers, body: JSON.stringify(body) });
  return postPickReport(request, { params: Promise.resolve({ id: siteId }) });
}

async function read(response: Response): Promise<{ status: number; body: Record<string, unknown>; cache: string | null }> {
  return { status: response.status, body: (await response.json()) as Record<string, unknown>, cache: response.headers.get("cache-control") };
}

const report = {
  kind: "part_picked",
  lineId: "b-sealant",
  plannedQty: 10,
  pickedQty: 6,
  missingPart: "Applicator gun nozzle × 1",
  note: "  Crew goes Thursday 7am.  ",
  sendToPicker: true,
  sendToPurchasing: false,
  photoAttached: true,
};

afterEach(() => setDependenciesForTests(null));

describe("AC 61, AC 62: a site's pick check", () => {
  it("finds the three pick issues at Quayside House, with its picker to call or email", async () => {
    const view = await getPickCheck(deps(), "site-b");
    expect(view.check.status).toBe("not_ready");
    expect(view.check.issueCount).toBe(3);
    expect(view.check.lines.map((line) => [line.line.id, line.kind])).toEqual([
      ["b-sealant", "part_picked"],
      ["b-collar", "missing_parts"],
      ["b-batt", "wrong_spec"],
      ["b-wrap", null],
    ]);
    expect(view.picker).toEqual({ name: "Sam Lee", phone: "+44 7700 900157", email: "sam.lee@example.com" });
    expect(view).toMatchObject({ siteName: "Quayside House, Levels 3 to 5", lastAction: "Marked picked", lastActionAt: "2026-10-03T07:40:00Z" });
  });

  it("is ready where every line matches, can't check a site with no list, and refuses an unknown site", async () => {
    expect((await getPickCheck(deps(), "site-a")).check.status).toBe("ready");
    expect((await getPickCheck(deps(), "site-d")).check.status).toBe("unknown");
    await expect(getPickCheck(deps(), "nope")).rejects.toMatchObject({ code: "site_not_found" });
    await expect(getPickCheck(deps({ picks: "down" }), "site-b")).rejects.toMatchObject({ code: "upstream_unavailable", system: "picks" });
  });
});

describe("AC 65, AC 66: reporting a pick error", () => {
  it("records a report (201), trims the note, and a resend with the same key returns it (200) without a second row", async () => {
    const d = deps();
    setDependenciesForTests(d);
    const first = await read(await post("site-b", report, "outbox-1"));
    expect(first.status).toBe(201);
    expect(first.cache).toBe("no-store");
    expect(first.body).toMatchObject({ created: true, record: { siteId: "site-b", lineId: "b-sealant", kind: "part_picked", note: "Crew goes Thursday 7am.", photoAttached: true } });
    const resend = await read(await post("site-b", { ...report, note: "resent from the outbox" }, "outbox-1"));
    expect(resend.status).toBe(200);
    expect(resend.body).toEqual({ ...first.body, created: false });
    expect(await d.actions.listPickReports("site-b")).toHaveLength(1);
  });

  it("needs an idempotency key, a known line and at least one recipient", async () => {
    setDependenciesForTests(deps());
    expect((await read(await post("site-b", report))).body).toMatchObject({ code: "idempotency_key_required" });
    expect(await read(await post("site-b", { ...report, lineId: "a-sealant" }, "k-line"))).toMatchObject({ status: 404, body: { code: "pick_line_not_found" } });
    expect(await read(await post("site-d", report, "k-nolist"))).toMatchObject({ status: 404, body: { code: "pick_line_not_found" } });
    expect(await read(await post("nope", report, "k-site"))).toMatchObject({ status: 404, body: { code: "site_not_found" } });
    expect(await read(await post("site-b", { ...report, sendToPicker: false }, "k-none"))).toMatchObject({ status: 422, body: { code: "validation_failed" } });
  });

  it("rejects bad amounts, long text, unknown kinds and unknown fields (422), and a key reused for another line (409)", async () => {
    setDependenciesForTests(deps());
    for (const bad of [
      { ...report, pickedQty: -1 },
      { ...report, plannedQty: 2.5 },
      { ...report, note: "n".repeat(501) },
      { ...report, missingPart: "p".repeat(121) },
      { ...report, kind: "approved" },
      { ...report, extra: true },
    ]) {
      expect((await read(await post("site-b", bad, `k-${Math.random().toString(36).slice(2)}`))).status).toBe(422);
    }
    expect((await read(await post("site-b", report, "k-reuse"))).status).toBe(201);
    expect(await read(await post("site-b", { ...report, lineId: "b-collar" }, "k-reuse"))).toMatchObject({ status: 409, body: { code: "idempotency_key_reused" } });
  });

  it("an empty note and missing part are stored as none, and an optional photo flag defaults to false", async () => {
    const d = deps();
    setDependenciesForTests(d);
    const withoutPhoto: Record<string, unknown> = { ...report, note: "   ", missingPart: "" };
    delete withoutPhoto.photoAttached;
    const saved = await read(await post("site-b", withoutPhoto, "k-empty"));
    expect(saved.body).toMatchObject({ record: { note: null, missingPart: null, photoAttached: false } });
  });
});
