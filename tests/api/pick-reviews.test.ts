import { afterEach, describe, expect, it } from "vitest";
import { createMemoryActionsRepository } from "@/adapters/memory/actions-repository";
import { makeStubs } from "@/adapters/stub";
import { getPickCheck, type Dependencies } from "@/application";
import { POST as postPickReport } from "@/app/api/sites/[id]/pick-reports/route";
import { POST as postPickReview } from "@/app/api/sites/[id]/pick-reviews/route";
import { buildCatalogue } from "@/domain";
import { setDependenciesForTests } from "@/server/deps";

// The site review (AC 67 to 71): a review that says a line is right, and what the site reports. A clock that moves,
// so a review can come after a report.
function deps(): Dependencies & { tick: (minutes: number) => void } {
  let count = 0;
  let at = Date.parse("2026-10-19T01:00:00.000Z");
  const now = (): Date => new Date(at);
  return {
    ...makeStubs(),
    catalogue: buildCatalogue([]),
    actions: createMemoryActionsRepository({ now, newId: () => `id-${++count}` }),
    now,
    tick: (minutes: number) => {
      at += minutes * 60_000;
    },
  };
}

function request(url: string, body: unknown, key?: string): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (key !== undefined) headers.set("Idempotency-Key", key);
  return new Request(url, { method: "POST", headers, body: JSON.stringify(body) });
}

function review(siteId: string, body: unknown, key?: string): Promise<Response> {
  return postPickReview(request(`http://local/api/sites/${siteId}/pick-reviews`, body, key), { params: Promise.resolve({ id: siteId }) });
}

function report(siteId: string, body: unknown, key?: string): Promise<Response> {
  return postPickReport(request(`http://local/api/sites/${siteId}/pick-reports`, body, key), { params: Promise.resolve({ id: siteId }) });
}

async function read(response: Response): Promise<{ status: number; body: Record<string, unknown>; cache: string | null }> {
  return { status: response.status, body: (await response.json()) as Record<string, unknown>, cache: response.headers.get("cache-control") };
}

const damaged = {
  kind: "damaged",
  lineId: "a-collar",
  plannedQty: 4,
  pickedQty: 4,
  affectedQty: 2,
  request: "same_day",
  note: "Two collars cracked in the van.",
  sendToPicker: true,
  sendToPurchasing: false,
  photoAttached: true,
};

afterEach(() => setDependenciesForTests(null));

describe("AC 68: Yes, it's right records a review on site", () => {
  it("records a review (201), and a resend with the same key returns it (200) without a second one", async () => {
    const d = deps();
    setDependenciesForTests(d);
    const first = await read(await review("site-a", { lineId: "a-collar" }, "review-1"));
    expect(first.status).toBe(201);
    expect(first.cache).toBe("no-store");
    expect(first.body).toEqual({
      created: true,
      record: { id: "id-1", siteId: "site-a", lineId: "a-collar", createdBy: "demo-leader", createdAt: "2026-10-19T01:00:00.000Z" },
    });
    const again = await read(await review("site-a", { lineId: "a-collar" }, "review-1"));
    expect(again).toMatchObject({ status: 200, body: { ...first.body, created: false } });
    expect(await d.actions.listPickReviews("site-a")).toHaveLength(1);
    // The line now reads checked on site, and a matching site stays ready.
    const view = await getPickCheck(d, "site-a");
    expect(view.check.status).toBe("ready");
    expect(view.check.lines.find((line) => line.line.id === "a-collar")?.checkedAt).toBe("2026-10-19T01:00:00.000Z");
  });

  it("needs a key and a line on this site's pick list; a key reused for another line is 409; anything else is 422", async () => {
    setDependenciesForTests(deps());
    expect(await read(await review("site-a", { lineId: "a-collar" }))).toMatchObject({ status: 400, body: { code: "idempotency_key_required" } });
    expect(await read(await review("site-a", { lineId: "b-collar" }, "k-other-site"))).toMatchObject({ status: 404, body: { code: "pick_line_not_found" } });
    expect(await read(await review("site-d", { lineId: "a-collar" }, "k-no-list"))).toMatchObject({ status: 404, body: { code: "pick_line_not_found" } });
    expect(await read(await review("nope", { lineId: "a-collar" }, "k-site"))).toMatchObject({ status: 404, body: { code: "site_not_found" } });
    for (const bad of [{}, { lineId: "a collar" }, { lineId: "a-collar", right: true }, { lineId: 7 }]) {
      expect((await read(await review("site-a", bad, `k-${Math.random().toString(36).slice(2)}`))).status, JSON.stringify(bad)).toBe(422);
    }
    expect((await read(await review("site-a", { lineId: "a-collar" }, "k-reuse"))).status).toBe(201);
    expect(await read(await review("site-a", { lineId: "a-sealant" }, "k-reuse"))).toMatchObject({ status: 409, body: { code: "idempotency_key_reused" } });
  });

  it("never turns a line that doesn't match the plan into a match", async () => {
    const d = deps();
    setDependenciesForTests(d);
    expect((await read(await review("site-b", { lineId: "b-sealant" }, "k-short"))).status).toBe(201);
    const view = await getPickCheck(d, "site-b");
    expect(view.check.status).toBe("not_ready");
    expect(view.check.lines.find((line) => line.line.id === "b-sealant")).toMatchObject({ kind: "part_picked", checkedAt: "2026-10-19T01:00:00.000Z" });
  });
});

describe("AC 69: what the site found, reported to the warehouse", () => {
  it("takes the kinds found on site, how many are affected and a same-day delivery", async () => {
    const d = deps();
    setDependenciesForTests(d);
    for (const [kind, key] of [
      ["damaged", "k-damaged"],
      ["wrong_item", "k-wrong-item"],
      ["unsuitable", "k-unsuitable"],
    ] as const) {
      const saved = await read(await report("site-a", { ...damaged, kind }, key));
      expect(saved.status, kind).toBe(201);
      expect(saved.body).toMatchObject({ record: { kind, affectedQty: 2, request: "same_day" } });
    }
  });

  it("a report without a request is a re-pick, and without affected none is said", async () => {
    setDependenciesForTests(deps());
    const plain: Record<string, unknown> = { ...damaged };
    delete plain.request;
    delete plain.affectedQty;
    expect((await read(await report("site-a", plain, "k-plain"))).body).toMatchObject({ record: { request: "repick", affectedQty: null } });
  });

  it("refuses an unknown request and an affected amount that is not a whole number from 0 to 100000 (422)", async () => {
    setDependenciesForTests(deps());
    for (const bad of [
      { ...damaged, request: "tomorrow" },
      { ...damaged, affectedQty: -1 },
      { ...damaged, affectedQty: 1.5 },
      { ...damaged, affectedQty: 100_001 },
      { ...damaged, kind: "broken" },
    ]) {
      expect((await read(await report("site-a", bad, `k-${Math.random().toString(36).slice(2)}`))).status, JSON.stringify(bad)).toBe(422);
    }
  });
});

describe("AC 70: a line reported from site is not ready until a later review says it is right", () => {
  it("a damaged report on a line that matched makes the site's picks not ready, and a later review closes it", async () => {
    const d = deps();
    setDependenciesForTests(d);
    expect((await getPickCheck(d, "site-a")).check.status).toBe("ready");

    expect((await read(await report("site-a", damaged, "k-report"))).status).toBe(201);
    const reported = await getPickCheck(d, "site-a");
    expect(reported.check).toMatchObject({ status: "not_ready", issueCount: 1 });
    const collar = reported.check.lines.find((line) => line.line.id === "a-collar");
    expect(collar).toMatchObject({ kind: "reported", issues: ["reported"], checkedAt: null });
    expect(collar?.openReport).toMatchObject({ kind: "damaged", affectedQty: 2, request: "same_day" });

    // A review in the same minute as the report does not clear it; a later one does.
    expect((await read(await review("site-a", { lineId: "a-collar" }, "k-same-time"))).status).toBe(201);
    expect((await getPickCheck(d, "site-a")).check.status).toBe("not_ready");
    d.tick(30);
    expect((await read(await review("site-a", { lineId: "a-collar" }, "k-later"))).status).toBe(201);
    const cleared = await getPickCheck(d, "site-a");
    expect(cleared.check.status).toBe("ready");
    expect(cleared.check.lines.find((line) => line.line.id === "a-collar")).toMatchObject({ kind: null, openReport: null, checkedAt: "2026-10-19T01:30:00.000Z" });
  });

  it("can't check picks when the site's reports can't be read: never ready", async () => {
    const d = deps();
    const broken: Dependencies = {
      ...d,
      actions: {
        ...d.actions,
        listPickReports: async () => {
          throw Object.assign(new Error("down"), { code: "upstream_unavailable" });
        },
      },
    };
    await expect(getPickCheck(broken, "site-a")).rejects.toThrow();
  });
});
