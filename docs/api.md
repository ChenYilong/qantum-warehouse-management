# HTTP API

Reference for the routes this app serves, as implemented. Behaviour is specified in `slice-specification.md` and designed in `technical-design.md`. All routes live under `/api` and return JSON; every response, errors included, carries `Cache-Control: no-store`.

## Rules common to all routes

- **Caller identity.** A fixed server-side demo user, `DEMO_USER_ID` (defaults to `demo-leader`), authors every record. The client cannot set it: a `createdBy` property in a request body causes rejection.
- **Idempotency.** POST requests must send `Idempotency-Key`: 1–128 characters from `A-Z a-z 0-9 . _ -`. Missing → 400 `idempotency_key_required`. Uniqueness is scoped per user.
  - Replay against the **same target**: 200, `created: false`, original record returned. This holds when the note or reason changed, when the shortage no longer exists, and when the nomination has moved on.
  - Replay against **another target**: 409 `idempotency_key_reused`, nothing written. Target for shortage actions = site + shortage id + kind, so a wait followed by an escalate counts as two targets. Target for proposals = site + penetration.
  - Requests failing validation or a domain rule write nothing; the key remains usable for a later valid request.
  - Rejecting replays that carry a changed note or reason is left for production.
- **Size and length limits.** Bodies are capped at 10,000 bytes, checked during streaming regardless of `Content-Length` (413). `note`: trimmed, ≤ 500 characters, stored as null when blank. `reason`: trimmed, 1–500 characters.
- **POST validation sequence.** Path ids → `Idempotency-Key` → body size → JSON parse → schema → use case. An unknown site yields 404 even without a key.
- **Identifier formats.** Site and penetration ids: `[A-Za-z0-9._-]{1,64}`. Shortage id: `siteId:materialId`, accepted URL-encoded (`site-b%3AMAT-SEALANT`) or raw. Blocker id: `siteId:blocker.penetrationId`. Malformed ids, ids from another site and broken percent-encoding all give 404, never 500.
- **Upstream errors** map to 502 with `upstream_unavailable` or `upstream_invalid` plus the name of the failing source. A crew is never reported clear because of one.

## Routes

| Method and path | Returns | Status |
| --- | --- | --- |
| `GET /api/sites` | Every site and its crew status | 200 |
| `GET /api/sites/{id}/readiness` | One site's shortages, blockers, crew status | 200 |
| `POST /api/sites/{id}/shortages/{shortageId}/wait` | Stores a wait | 201; 200 when replayed |
| `POST /api/sites/{id}/shortages/{shortageId}/escalate` | Stores an escalation | 201; 200 when replayed |
| `GET /api/sites/{id}/penetrations/{pid}/substitution-candidates` | Substitute candidates by catalogue similarity | 200 |
| `POST /api/sites/{id}/penetrations/{pid}/substitutions` | Stores a substitute proposal | 201; 200 when replayed |
| `GET /api/sites/{id}/actions` | Stored actions and proposals | 200 |
| `GET /api/health` | Connectivity probe behind the header's Online switch, including the stock feed timestamp | 200 |

### `GET /api/sites`

```ts
{ sites: Array<{ id, name, reference, address?,
  operator?: { name, phone }, picker?: { name, phone },
  location?: { lat: number, lng: number },              // degrees, for the project map (AC 74)
  date?: string,                                         // the deadline, YYYY-MM-DD (AC 80)
  crewStatus: "clear" | "blocked" | "nothing_planned" | "unavailable",
  shortageCount: number, dataProblemCount: number,
  shortages: Array<{ materialId, name, unit, kind: "short" | "unknown",
    requiredQty: number, shortfallQty: number | null }> }> }
```

`location` is upstream data as well (AC 74): latitude/longitude in degrees; the sample uses fabricated Auckland coordinates. The usual upstream policy applies: shape is validated strictly (a wrong type fails the whole response), values leniently. A point outside valid ranges, or at 0,0, is ignored by the projects list, which then omits that project's map, Directions link and distance. Routing never happens in the API. The browser requests drive times from Mapbox directly, starting at the demo's fallback origin and switching to the device position once the user taps or the browser already grants permission (AC 75).

`date`, also upstream (AC 80), is the project deadline as a `YYYY-MM-DD` calendar date, fabricated in the sample. Strict on shape (non-strings fail the response), lenient on value: impossible dates such as `2026-02-30` or other formats such as `23/10/2026` simply render no deadline.

`operator` and `picker` are upstream too (AC 49). `phone` uses international format: `+`, then digits and spaces. Each can be absent, and both can name one person.

`shortageCount` and `dataProblemCount` are always returned and stay 0 unless `crewStatus` is `blocked`; the list uses them to explain a block.

`shortages` (AC 56) lists a blocked site's short materials in readiness-response order, so the list and the operator's prepared text can name what is missing without another request. Always present; empty unless `crewStatus` is `blocked`; length equals `shortageCount`. If upstream has no material name, `name` falls back to the id. When stock is unknown (`kind` = `unknown`), `shortfallQty` is null rather than a number. Adding the field broke no existing client.

`unavailable` marks a site whose readiness computation failed. The failure is logged; the site is never presented as clear. If the sites source itself fails, the route returns 502.

### `GET /api/health`

```ts
{ status: "ok", stockAsOf: string | null }
```

Responds whenever the app is reachable and is never cached. `stockAsOf` carries the stock feed timestamp (shown in the header as the picker's latest activity), or null if that feed is down or malformed; a broken feed does not fail the probe (AC 48).

### `GET /api/sites/{id}/readiness`

```ts
{ siteId, crewStatus: "clear" | "blocked" | "nothing_planned",
  asOf, stockAsOf,
  stockNotice: "On hand, shared, not reserved",
  shortages: Shortage[],      // id siteId:materialId, siteId, materialId, kind short | unknown,
                              // requiredQty, onHandQty, shortfallQty, penetrationIds, state, actions
  blockers: Blocker[],        // id, reason, penetrationId, internalCode, mismatches? (solution_mismatch only), state, actions
  materials: Record<id, { name, unit }>,
  penetrations: Record<id, { floor, location, nominatedCode, serviceType, serviceSize }> }
```

`serviceType` and `serviceSize` are the nomination strings untouched, catalogue whitespace included; collapsing double spaces happens only at render time.

Blocker `reason` values: `unknown_solution_code`, `solution_mismatch`, `no_material_mapping`, `invalid_quantity`. For `solution_mismatch` the blocker adds `mismatches`, listing failing fields in this fixed sequence: `orientation`, `substrate`, `serviceType`, `serviceSize`, `integrity`, `insulation`. Shortages of kind `unknown` return null for both `onHandQty` and `shortfallQty`. Entries in `actions` (on shortages and blockers) are stored waits or escalations with `current: boolean`, which turns false once the shortfall exceeds the value stored with that action.

### Wait / escalate

- Bodies: wait `{ note? }`; escalate `{ escalateTo: "purchasing" | "warehouse", note? }`. Extra properties → 422.
- The shortage must exist at request time, otherwise 404 `shortage_not_found`. A wait aimed at a blocker → 422 `wait_not_allowed_for_blocker`. Escalation works on blockers and on every shortage, unknown-stock ones included.
- Returns `{ record, created }`; `record` = `{ id, siteId, shortageId, kind, escalateTo, note, shortfallQtyAtTime, createdBy, createdAt }`. Crew status is unaffected by either.

### `GET .../substitution-candidates`

```ts
{ penetrationId, nominatedCode,
  status: "ok" | "nominated_code_unknown" | "substrate_incomplete",
  notice: "Catalogue match, not verified",
  candidates: Array<{ internalCode, supplierRefCode, orientation, substrateDetail,
    serviceType, serviceSize, integrityMinutes, insulationMinutes: number | null,
    mismatches: FitField[],   // fields that do not fit this penetration, same names and order as a blocker's
    availability: { internalCode,
      overall: "in_stock" | "short" | "unknown" | "no_material_mapping" | "invalid_quantity",
      lines: Array<{ materialId, quantityPerInstall, requiredQty, onHandQty, status }> },
    materials: Record<id, { name, unit }> }>,
  penetration: { id, floor, location, serviceType, serviceSize, nominatedCode,
    requiredIntegrityMinutes: number | null, requiredInsulationMinutes: number | null } }
```

A line reports `short` if a single install needs more than the on-hand amount, or if the site is short of that material already. It reports `unknown` if no stock row exists, or if the site's stock of that material is unknown.

`penetration` is the summary rendered above the substitute list on the penetration page. Its two-column comparison view comes from a use case with no route, `describePenetration`. Likewise the materials pages (`listMaterialStock`, `describeMaterialStock`) and the cross-site Actions log (`listAllActions`) call use cases directly; any wait or escalate issued from those pages still goes through the shortage routes above. Their 404 `material_not_found` never leaves the page layer: no route can return it. `id` and `nominatedCode` duplicate top-level fields. `penetration` omits substrate, orientation and stock; orientation and substrate are given per candidate instead.

Each candidate has one line per material, quantities aggregated by material. `notice` is returned for every status. Responses never contain the words "compatible" or "approved".

### `POST .../substitutions`

Body: `{ fromInternalCode, toInternalCode, reason }`. If `from` is not the current nomination → 409 `stale_nomination`. If `to` is not among current candidates → 422 `not_a_candidate`. Returns `{ record, created }`; `status` is `proposed`, always. No other state changes.

### `POST /api/sites/{id}/pick-reports`

Files a pick error with warehouse staff (AC 65), or records a finding from an on-site review (AC 69). Requires `Idempotency-Key`, as all writes do. Body:

```ts
{ kind: "wrong_spec" | "missing_parts" | "part_picked"           // what the pick check finds
      | "unsuitable" | "wrong_item" | "damaged"                   // what the site finds (AC 69)
      | "other",
  lineId: string,                 // a line of this site's pick list, else 404 pick_line_not_found
  plannedQty?: number | null,     // whole, 0 to 100000
  pickedQty?: number | null,
  affectedQty?: number | null,    // how many the site found affected: whole, 0 to 100000; absent is none said
  request?: "repick" | "same_day", // what the site needs; absent is a re-pick for the next delivery
  missingPart?: string,           // trimmed, at most 120 characters; empty is none
  note?: string,                  // trimmed, at most 500 characters; empty is none
  sendToPicker: boolean,
  sendToPurchasing: boolean,      // at least one of the two, else 422
  photoAttached?: boolean }       // the photo itself stays on the phone in the demo
```

Returns `{ record, created }`. First call: 201. Replaying the key: 200 with the stored record, ignoring any body changes, so a phone that resends its queue after losing the response still produces a single record (AC 66). Same key reused with a different site, line or kind: 409 `idempotency_key_reused`. The pick check (AC 61–64) has no route; site screens obtain it from the use case `getPickCheck`.

A report keeps its line open until that line is reviewed again (AC 70). Until then the line counts as a `reported` pick issue even if pick and plan agree, which keeps the site's picking in a not-ready state and Send the crew disabled.

### `POST /api/sites/{id}/pick-reviews`

Records an on-site confirmation that a line is correct (AC 68). Requires `Idempotency-Key`. Body is exactly `{ lineId: string }`; anything more → 422. A line missing from the site's pick list → 404 `pick_line_not_found`; unknown site → 404 `site_not_found`.

```ts
{ record: { id, siteId, lineId, createdBy, createdAt }, created: boolean }
```

First call 201; replay 200 with the stored record; key reused with a different site or line 409 `idempotency_key_reused`. A review closes every earlier report on that line (strictly before it by `createdAt`), after which the line shows "Checked on site". It cannot make a mismatched line match, and it leaves the pick list untouched; this app never writes pick lists.

### `GET .../actions`

```ts
{ actions: Array<ShortageAction & { status: "current" | "earlier" | "resolved" }>, // newest first
  proposals: SubstitutionProposal[],                                               // newest first
  materials: Record<id, { name, unit }>,                                           // every material mapped to a nominated solution on the site
  penetrations: Record<id, { floor, location, nominatedCode, serviceType, serviceSize }> } // every penetration on the site
```

`materials` and `penetrations` give the log the names it needs. They are returned even with empty `actions` and `proposals`, and they are broader than the readiness response's maps, which only hold active shortages and blockers.

## Errors

Error bodies are exactly `{ code, message }`. No stack traces, paths, SQL, notes or reasons ever appear.

| Code | Status |
| --- | --- |
| `site_not_found`, `penetration_not_found`, `shortage_not_found` | 404 |
| `idempotency_key_required`, `invalid_json` | 400 |
| `validation_failed` (lists only the invalid fields) | 422 |
| `wait_not_allowed_for_blocker`, `not_a_candidate` | 422 |
| `stale_nomination`, `idempotency_key_reused` | 409 |
| `payload_too_large` | 413 |
| `upstream_unavailable`, `upstream_invalid` | 502 |
| `internal_error` | 500 |

## Configuration

| Variable | Effect |
| --- | --- |
| `ACTIONS_STORE` | `memory` or `postgres`. Non-production default: `memory`. Production default: `postgres`; an incomplete Postgres setup there yields 500 instead of silently using memory |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Server-only Postgres connection. In the deployment: Supabase transaction pooler on 6543, user `qantum_slice`, database `qantum_slice`. `DB_PORT` falls back to 5432 |
| `DB_SSL`, `DB_SSL_CA` | `require` (default; traffic encrypted but the server unauthenticated, an accepted and documented trade-off since Node does not trust the pooler's chain), `verify-full` plus a PEM CA, or `disable` (rejected in production) |
| `DB_POOL_MAX` | Per-process connection cap, 1–10, default 1; real sessions are held by the pooler |
| `DEMO_USER_ID` | The fixed demo identity; default `demo-leader` |
| `STUB_STOCK_MODE` | Tests only. Stock stub behaviour: `normal` (default), `down`, `empty`, `malformed`. Honoured only outside production; drives the e2e stock-failure projects |
| `MAPBOX_PUBLIC_TOKEN` | Public Mapbox token (`pk.` only), injected at build time for maps and drive times; an `sk.` token aborts the build (AC 76). Empty means no maps |

On a configuration error the response is a generic 500, and the log gets a single fixed token (`config_invalid`, `store_forbidden`, `db_unconfigured`, `db_tls_insecure`), never a value. A healthy start logs `db_config`: database, host, port, user and TLS mode, plus whether a password was supplied; the password itself is never logged.

## Limits

- Postgres storage is covered by a contract suite run against Postgres 17 on developer machines and in CI. It covers append-only writes, replay by key, sort order, constraints, and confirms the app role has no update, delete, truncate or table-creation rights. `REQUIRE_DB_CONTRACT=1` turns a skipped run into a failure.
- No authentication on the server. Sign-in exists only in the browser, so anybody holding the URL can write demo actions.
- `src/server/*` lacks the `server-only` marker (that needs another dependency). No client module imports it, and a test enforces this.
