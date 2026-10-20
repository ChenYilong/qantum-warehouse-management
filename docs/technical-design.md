# Technical design

Architecture of iteration 1, the team-leader slice. Inputs: `slice-decisions.md` (scope, endpoints), `business-path-data.md` (workflow, data gaps), `catalogue-data-model.md` (the CSV). Anything this document introduces beyond those is collected in section 11.

## 1. Purpose and platform

The leader opens a site, compares the planned penetrations' material demand with stock, and stores one decision against each shortage, choosing between **wait**, **escalate** and **a substitute proposal**. The outcome is binary: the crew can go, or it is blocked.

It is built as a compact web application on QAntum's current stack, with no new technology.

| Concern | Choice | Rationale |
| --- | --- | --- |
| UI and API | TypeScript, React, Next.js App Router | Single deployable; route handlers implement the `slice-decisions.md` endpoints; fits the web team's skill set. |
| Hosting | Vercel | In use already; a preview deployment per PR. |
| Persistence | Postgres: a dedicated `qantum_slice` database on the Supabase server QAntum already runs, accessed with `pg` via the Sydney transaction pooler | Server already in use (another app has its own database there). Stores decisions only. Neither Supabase Auth nor the Data API is involved |
| Mobile (Flutter) | Untouched | Installation, pins and photos remain there. |
| Offline | Out of scope | Leaders check before departure, typically with coverage; section 8. |

Flagged departure: the leader app ships as a separate Next.js deployment, not inside the web application. Two honest reasons: the web app's codebase is not available for this exercise, and a standalone app can be built, tested and released independently. Reading upstream through APIs would not on its own justify a second deployable. Cost: one more deployable. Benefit: no dependency on the spec system during development. A later merge is inexpensive: nothing in the domain core depends on a framework.

## 2. Components

```text
Browser (React, server components + small client islands)
   |
Next.js route handlers  ── thin: parse, auth stub, call use cases, map errors
   |
Application layer (use cases)
   |  getSiteReadiness(siteId)
   |  recordWait / recordEscalation / proposeSubstitution
   |  listActions(siteId)
   |  listSubstitutionCandidates(siteId, penetrationId)
   |  listMaterialStock() / describeMaterialStock(materialId)   (pages only)
   |
Domain core (pure functions, no I/O)
   |  computeRequirements, computeShortages, applyActions,
   |  siteReadiness, findCandidates, siteMaterialNeeds
   |
Ports (interfaces)
   |  SitesPort · NominationsPort · StockPort · SolutionMaterialsPort
   |  ActionsRepository
   |
Adapters
      Stub JSON (sample)      CSV catalogue      Postgres actions repo (pg)
      (swap for real HTTP      (loaded once per   (the only real DB)
       clients later)          server process,
                               no port)
```

Constraints:

- Domain code has zero imports from Next.js, `pg` or `fs`; unit tests aim at this layer.
- One port per upstream source. Swapping a stub for a production API changes exactly one adapter; use cases stay untouched. Exception: the catalogue, which is the supplied CSV parsed by `loadCatalogueFromCsv` into a typed map passed straight to use cases. A live catalogue would introduce a `CataloguePort`.
- Route handlers hold no business rules.

## 3. Who owns which data

| Data | System of record | Treatment here |
| --- | --- | --- |
| Solution catalogue | QAntum catalogue | Read-only; parsed from CSV into a map keyed by `internal_code`. |
| Sites (including coordinates), penetrations, nominations | Current spec system | Read through stubs of `GET /sites` and `GET /sites/{id}/nominations`. A leader's own deadline or operator change stays in their browser (AC 86, 87) and never reaches upstream. |
| Stock balances | Inventory upstream | Read through a stub of `GET /stock`. |
| Solution stock (install kits per Internal Code) | Inventory upstream (assumed) | Read through `SolutionStockPort`, stubbed from the invented `solution-stock.json` (AC 90). |
| Per-solution material quantities | Sample (missing from the CSV) | Read from an explicitly labelled fixture, shaped like a future catalogue extension. |
| Warehouse pick lists: quantities planned and picked, spec, parts required | Warehouse pick system | Read via a `PicksPort` stub of `GET /sites/{id}/picks`. The app runs its own pick check and ignores the list's "Picked" flag (AC 61). |
| Waits, escalations, substitute proposals, pick-error reports, on-site reviews | This app | Persisted in Postgres (`qantum_slice`). Reports: `pick_report` (migration `0002_pick_reports.sql`; `0003_site_review.sql` adds site-side kinds plus `affected_qty` and `request`). Reviews: `pick_review` (`0003`). Every table is append-only with idempotency on `(created_by, idempotency_key)`. |

Fixtures are under `data/sample/`, whose README marks them invented. Every penetration must point to a genuine CSV `internal_code`; a test checks it.

## 4. Domain model

Computed per request, not persisted:

```text
Requirement  { materialId, requiredQty, penetrationIds[] }
Shortage     { id, siteId, materialId, kind: short | unknown,
               requiredQty, onHandQty | null, shortfallQty | null,
               penetrationIds[], state, decision | null }
SiteReadiness{ siteId, crewStatus: clear | blocked | nothing_planned,
               shortages[], blockers[], asOf }
```

- `requiredQty`: per material, add up `quantityPerInstall` across the site's penetrations, snap to 6 decimal places, then round up to a whole unit. A non-finite total raises `RangeError` rather than producing output.
- `onHandQty`: snapped to six decimal places as well before the comparison, without rounding up, so floating-point residue cannot fabricate a shortage. A negative or non-finite stock row, or a non-finite total, turns the material `unknown`.
- **Pooled, unreserved stock (a decision).** `onHandQty` adds the material's balances over every location reachable by the leader (warehouse plus van) and is identical for all sites. Two sites can each appear covered while jointly short. Each figure on the readiness screen carries "On hand, shared, not reserved"; cross-site over-commitment is a documented limitation, with allocation planned for a later iteration.
- A `short` shortage exists when `requiredQty > onHandQty`; `shortfallQty` holds the difference.
- **Shortage ids are derived deterministically** as `${siteId}:${materialId}`. Without a stable key on a computed record, yesterday's decision could not be found today.
- **Decisions age.** The same id can return after a shortage clears and recurs. So an old decision does not silently cover a new problem:
  - A decision counts as *current* only while today's shortfall is ≤ `shortfall_qty_at_time`. Otherwise the UI labels it "Earlier decision, shortfall has grown" and the shortage is `open`.
  - Each decision is displayed with author and date, so the leader notices a recurrence of equal size.
- `state` ∈ {`open`, `waiting`, `escalated`}, derived from current decisions. Any current escalation makes the state `escalated`, even with a newer wait; both are listed. `resolved` never appears on a shortage; only `GET /actions` uses it, for decisions whose shortage has disappeared.
- **Any shortage or blocker blocks the crew**, regardless of decision state. Wait and escalate express intent and release nothing. Unblocking takes either a stock change or an approved substitute that rewrites the nomination upstream. This implements "crew stays blocked until stock changes".
- **Missing data is its own state, never zero**, neither as stock nor as demand.
  - No stock row → shortage with `kind: unknown`, quantities null. It is **actionable**: wait or escalate, which is how a leader naturally asks the warehouse whether the item exists.
  - Nominated code with no material mapping, absent from the catalogue, or mapped to a negative/non-finite quantity → **blocker** with a reason (`no_material_mapping`, `unknown_solution_code`, `invalid_quantity`). A blocked penetration contributes no demand, so a bad value cannot cancel someone else's need. Waiting is impossible (nothing to wait for); escalating as a data problem is the only action.
  - A nominated solution unsuited to its penetration → blocker `solution_mismatch` (`fit.ts`). Misfit means any of: orientation differs; or after normalisation the substrate, the service type or the size differs (the same rules substitute matching uses; a substrate cut off right after its family name, whichever side it is on, names no build-up and so never fits; empty strings are never equal); or an unmet integrity or insulation requirement (an absent insulation claim never satisfies one; any requirement other than a finite number ≥ 0 fails closed). Failing fields go into `mismatches`. Evaluation order: unknown code → mismatch → no mapping → invalid quantity. As with every blocker, no demand is added and escalation is the only action.
  - A site without nominations is `nothing_planned`, which is never shown as clear.

Persisted in Postgres, append-only:

```text
shortage_action
  id uuid pk, site_id text, shortage_id text,
  kind  'wait' | 'escalate',
  escalate_to 'purchasing' | 'warehouse' null,
  note text null check (length <= 500),
  shortfall_qty_at_time numeric null check (>= 0),      -- null for unknown-stock
  created_by text, created_at timestamptz,
  idempotency_key text,
  check ((kind = 'escalate') = (escalate_to is not null)),
  unique (created_by, idempotency_key)

substitution_proposal
  id uuid pk, site_id text, penetration_id text,
  from_internal_code text, to_internal_code text,
  reason text not null check (length between 1 and 500),
  status 'proposed' check (status = 'proposed'),
  created_by text, created_at timestamptz,
  idempotency_key text,
  check (from_internal_code <> to_internal_code),
  unique (created_by, idempotency_key)
```

The authoritative DDL is `db/migrations/0001_actions.sql`, which additionally creates a `site_id` index per table, revokes all privileges from `public`, and grants the app role `select, insert` only.

Rationale:

- **Append-only; newest wins.** Wait followed by escalate keeps both rows; nothing is overwritten.
- `shortfall_qty_at_time` records the figure the leader acted on, for later readers.
- Sites, penetrations and the catalogue have other owners, so the schema declares no foreign keys to them. Referential checks happen on write, against the ports and the catalogue.
- The `status` check allows only `proposed`; the app is physically unable to store an approval.

## 5. Interfaces

The `slice-decisions.md` endpoints with exact behaviour:

| Endpoint | Behaviour |
| --- | --- |
| `GET /sites` | App-side proxy over the upstream `GET /sites` described in `slice-decisions.md`. |
| `GET /sites/{id}/readiness` | New. Returns `SiteReadiness`, the main screen's data. |
| `POST /sites/{id}/shortages/{shortageId}/wait` | 404 unless the shortage exists right now. Rejected on blockers. Optional note in the body. |
| `POST /sites/{id}/shortages/{shortageId}/escalate` | Body carries `escalateTo` and `note`. 404 when no live shortage; 422 for an invalid `escalateTo`. |
| `GET /sites/{id}/penetrations/{pid}/substitution-candidates` | New. Read-only suggestions; section 6. |
| `POST /sites/{id}/penetrations/{pid}/substitutions` | Body: `fromInternalCode`, `toInternalCode`, `reason`. 409 if `from` differs from the live nomination; 422 if `to` is not a live candidate. |
| `GET /sites/{id}/actions` | The site's waits, escalations and proposals, newest first. |

Cross-cutting behaviour:

- **Boundary validation** with Zod; unknown properties and overlong notes are refused.
- **Idempotency.** Each POST needs an `Idempotency-Key`, unique per user (`unique (created_by, key)`). Lookup by key happens before any domain check, so a retry receives the original record even after the shortage has resolved. Presenting a key with another target (site + shortage + kind, or site + penetration) returns 409. Refusing replays with a changed note or reason is deferred to production. Complete contract: `api.md`.
- **Nothing cached.** Readiness and actions responses use `Cache-Control: no-store`, and screens display an "as of" timestamp. Serving a stale "Crew can go" after stock dropped is the single failure this design is most concerned with.
- **One error shape**, `{ code, message }`; internals and stacks never leave the server.
- **Upstream outage** → 502 with a specific code; the UI says stock is unavailable and withholds "clear". Failing safe here means missing data can never yield a clear crew.

## 6. Substitute suggestions, which are not approvals

`findCandidates` lists catalogue solutions resembling the nominated one. It saves the leader search time; it does not judge compliance.

**Matching reads the penetration's attributes, not those of the nominated solution.** Each penetration record holds orientation, substrate, service type and size, plus the integrity and insulation it requires (`business-path-data.md` §1). Comparing against those keeps a wrong nomination from propagating into suggestions. Consequently the nominations stub must provide both requirements; a null one accepts any offered value.

All of these must hold for a candidate:

- same `orientation`
- same normalised `substrate_detail` (`substrate_option` is never used: it lumps distinct build-ups together)
- same normalised `service_type` (`service_type_option` is never used: it lumps sockets with pipes and blank openings with "other")
- same normalised `service_size`
- `integrity_minutes` ≥ the required integrity
- `insulation_minutes` ≥ the required insulation; null (no claim) never meets a stated requirement
- a code different from the current nomination

Matching, unlike the fit check, lacks a blank-text guard: an empty penetration field would equal an empty catalogue field. No catalogue row leaves any of those four fields empty, so the supplied data cannot trigger it; the guard should still be added before a production nominations feed is wired in.

**Normalisation, precisely.** These steps run on the three text fields (substrate, service type, size) before they are compared:

1. Trim; collapse every whitespace run to a single space.
2. Drop whitespace directly inside parentheses: `( 1 layer 13mm)` → `(1 layer 13mm)`.
3. Remove any space separating a value from its unit: `51 mm` → `51mm`.
4. Ignore case.
5. Keep trailing commas. A substrate consisting of only a family name and a comma (`FR plasterboard,`, `Unlined Timber,`) is **incomplete**: zero candidates, and the UI shows "Catalogue substrate incomplete". Stripping that comma would make unrelated tested assemblies look identical.

Size strings come in several formats (`Ø50mm`, `80mm`, `1100x10mm`, `900mm x 50mm`). After steps 1–4 differently formatted sizes remain unequal; that miss is intentional and safe.

**Server-side re-validation.** Storing a proposal repeats matching on the server: `to` must be a live candidate and `from` the live nomination. Client state is never trusted. A penetration may collect several proposals; they are shown latest first.

**No candidates.** The UI shows "No catalogue match for this penetration."; for a penetration with a data problem it appends "Escalate instead." plus the escalate action (material shortages are decided on the material page). An uncatalogued nominated code is reported as such, with the same action. Among the 148 supplied solutions, only 20 have a candidate at all (section 9); empty is the usual outcome, not an edge case.

Each candidate also reports stock for its own materials, because a substitute that needs some other missing material solves nothing. If the site is short of some material already, any candidate consuming it reads `short`; one whose site stock is unknown marks it `unknown`, regardless of single-install demand. The calculation does not credit material that dropping the nominated solution would free up; that amounts to reservation, which is out of scope, and a bias towards `short` can never signal that a crew may leave. Candidate material mappings are seeded only for the demo codes; all others display "No material mapping".

Suitability and approval:

- Every candidate carries the label **"catalogue match, not verified"**. The words "compatible" and "approved" never appear in the UI.
- Equal fields are a necessary condition, not a sufficient one. The CSV lacks product lists, installation limits and the scope of the test report; a manager checks these against the supplier's assessment.
- Persisting writes `status = proposed` and a mandatory reason in free text. The leader picks a catalogue code; typing one in is impossible.
- Approval presumably takes place in the web application, which afterwards rewrites the nomination. The brief gives no evidence of such a queue, so it is an unbuilt downstream dependency. Until approval, the penetration keeps its solution and the shortage stays.

## 7. UX outline

Designed for phones, since leaders are on site, as an ordinary responsive web page. Screens (full detail in `ui-design.md`):

1. Bottom tabs **Map**, **Calendar**, **Projects**, **Guide**: the four destinations of the bottom tab bar, present at all widths (see items 20–21). **Inventory** (Materials) plus **Decisions**, two further top-level pages, keep that tab bar but no tab, and the Guide no longer links them. Projects gives every site a status chip; Materials shows pooled stock per material against all sites' demand; Decisions lists decisions and proposals across sites.
2. **Site.** The site's planned penetrations, filterable by chip (shortages, data problems, decisions taken); row icons flag problems and decisions. A clear site reads "Crew can go"; missing data never renders as zero or clear.
3. **Penetration.** Tabs: Solution and Decisions. Solution: a field-by-field comparison of penetration and nominated solution; one line per shortage carrying this site's figures, linked to its material page; substitutes, each tagged not verified and offering Propose; an Escalate action when the issue is a data problem. Decisions: decisions and proposals that concern this penetration, selected from the site log using the materials of the nominated solution plus any data problem recorded against the penetration.
4. **Material.** Tabs: Stock and Decisions. Stock: pooled stock shown once, then a section for each site planning the material, where that site's shortage gets a wait or an escalation (purchasing or warehouse, optional note). Decisions: what each site decided about the material, via `listAllActions`. Confirmations state the consequence plainly ("This does not release the crew").

Baseline: operable by keyboard and screen reader, no state conveyed by colour only, targets ≥ 44px, an explicit error state for every request.

## 8. Non-functional choices

| Area | Exercise | Production change |
| --- | --- | --- |
| Auth | Fixed demo identity on the server. The demo sign-in (user name, password, role) lives solely in the browser; the server verifies nobody. `created_by` is always assigned server-side, never read from the request. | Supabase Auth, or else the web application's session, which a separate origin can only reuse via SSO or a common cookie domain. Writes require the leader role. |
| DB access | A separate `qantum_slice` database on a server shared with another app. The app authenticates as role `qantum_slice`, limited to `SELECT, INSERT` on both tables, making append-only a database guarantee; the migration admin owns the tables. The Data API and the anon key are unused. Credentials sit in Vercel environment variables, server-side; a lint rule plus a test stop `pg` and server modules entering client bundles. TLS mode `require` (encrypted, server identity unchecked) because Node does not trust the pooler's chain; `verify-full` works when given a CA. | Per-user JWTs and RLS by site membership, so access control lives in the database. |
| Public write abuse | Note and reason length capped. Accepted risk: anyone who has the URL can create demo actions. | Authenticated writers only, a dedicated DB role, rate limits, alerting. |
| Secrets | Environment variables; nothing committed. `.env.example` lists names without values. | Same, plus a secret manager. |
| Third-party map | Mapbox GL JS (npm `mapbox-gl`, under Mapbox terms) renders each project map client-side, lazily as the card approaches the viewport; drive times come from Mapbox's driving matrix, which the browser queries once the user taps. The device position is sent nowhere else and never stored. The one value deliberately sent to the browser is a public `pk.` token locked to the app's own URLs; an `sk.` token stops the build. The Directions link goes to Google Maps. Without a token, without WebGL, or with Mapbox down, cards still offer Directions and a straight-line distance. | A paid Mapbox tier with alerts on usage, regular token rotation, and the location prompt handled by the Flutter app. |
| Schema changes | Append-only migration files under `db/migrations/`, tracked in `schema_migrations`. For each `main` deploy CI applies outstanding files once the build is done and ahead of `vercel deploy`, using the admin login via the session pooler; missing password means no deploy. Hence migrations are additive only (new tables, defaulted columns, looser checks), and the running version keeps working until replaced. | A dedicated migration role in place of the admin; expand-then-contract releases for column removal. |
| Offline | Unsupported; readiness and action responses always send `no-store`. | Queue writes under their idempotency keys and replay; the Flutter sync design is the model. |
| Performance | The 148-row catalogue is held in memory. Goal: readiness under one second when a site has 200 penetrations. | Catalogue served by a caching service. |
| Audit | Append-only tables recording actor and time. | Feed the golden thread's audit records. |
| Observability | Structured logs excluding notes and PII. | Distributed tracing over upstream calls; alerts on upstream error rate. |

## 9. Trade-offs

- **Computing shortages vs persisting them.** Computing them means no stale duplicate of upstream data; in return ids must be derived deterministically and each request recomputes, which costs nothing noticeable here.
- **Stubbed ports vs real APIs today.** No real APIs exist for the exercise. Ports keep stubs honest and swappable; they validate domain logic and contract shape, but say nothing about latency, authentication or data quality.
- **Exact-field candidates vs the coarse option columns.** Exact matching yields fewer candidates and misses some valid ones, which is the safer failure for compliance software; the leader can still consult a manager. Using the supplied CSV and taking each solution's own published rating as the requirement, **20 of 148 solutions (14%) get one or more candidates** under the section 6 rules (incomplete substrates excluded; letting them match one another would wrongly give 24). The remaining 86% hit the empty state with escalation offered. Demo nominations are therefore picked from the matchable set, e.g. `0438` (→ `0451`, `0464`), `0789` (→ `0790`, `0791`) and `0434` (→ `0435`), and the count of 20 is locked by a unit test.
- **Pooled unreserved stock vs allocation.** A single pooled number is easy to reason about and fits balances that upstream owns read-only. It can over-promise between sites, so the UI states this. Allocation requires a reservation model owned by inventory, scheduled for a later iteration.
- **Append-only vs in-place updates.** Finding the latest decision costs a little more querying; in exchange history is complete and no decision is ever lost.
- **Standalone app vs web-app module.** Covered in section 1.

## 10. Test focus (full plan in the test strategy)

- Unit: shortage and demand maths, stable ids, crew status, every missing-data state, candidate matching (null insulation; the coarse-column pitfalls), CSV parsing, normalisation.
- Contract: every upstream stub passes its schema; sample penetrations point to real catalogue codes.
- API: validation errors, 404 for absent shortages, idempotent replays, 502 on upstream failure and never "clear".
- Database: constraints (`status = proposed`, `escalate_to` mandatory for escalations), idempotent replay, and refusal of update/delete/truncate/DDL for the app role, executed on genuine Postgres 17 (podman locally; in CI as a service container).
- E2E: the demo script, from shortage through escalation to a crew that remains blocked.

## 11. Extensions to the earlier documents

Items that go further than `slice-decisions.md` and `business-path-data.md`; each needed confirmation before implementation.

1. `GET /sites/{id}/readiness`: the aggregate behind the main screen.
2. `GET .../substitution-candidates`: read-only suggestions.
3. Shortage id derived as `siteId:materialId`; the `shortageId` path segment therefore becomes a computed key instead of an opaque stored id.
4. Wait and escalate leave the crew blocked; release comes only from stock arriving or the nomination changing upstream.
5. A labelled-invented `solution_material` fixture closes the gap recorded in `slice-decisions.md`.
6. Stock is pooled and unreserved (decision), added up across locations, never allocated per site.
7. Crew status is per site and binary: a single shortage blocks the entire site. Dispatching to unaffected penetrations is deferred.
8. `blocked`/`ready` moved off individual penetrations (`business-path-data.md`) to a per-site crew status; the persisted crew schedule is gone, and the slice reports only blocked or clear.
9. Added blocker reasons (`unknown_solution_code`, `solution_mismatch`, `no_material_mapping`, `invalid_quantity`), the `nothing_planned` status, and actionable shortages with `unknown` stock.
10. Decision ageing: a decision stays current only until the shortfall exceeds its recorded value.
11. `Idempotency-Key` required on all POSTs, unique per user.
12. Each penetration in the nominations stub states its required integrity and insulation; matching runs on the penetration's attributes.
13. Cross-site materials (pages only, no route). `listMaterialStock` and `describeMaterialStock` collect inputs for all sites, perform one stock read shared by all, and compute readiness per site from it; the on-hand value on the page therefore matches every site's shortage. A listed site with missing or unreachable data is shown as unchecked, not as 404. Cost per view: roughly four upstream requests for each site and a single stock request; fine for four sample sites; at production volume a batched or aggregated port becomes necessary (the sites list has the same known limit). `siteMaterialNeeds` yields per-site demand for all materials, including ones that are not short, under the readiness rules: a data-problem penetration adds nothing, and rounding up happens once per site. The cross-site total is that sum and is informational; crew status per site does not change, since stock is pooled and unreserved. An unreadable site stays unchecked: it can never count as "not short", and the total is suppressed. If no site can be read the page is unavailable. When no checked site plans the material it is not found (`material_not_found`, 404); if any site is unchecked the page reports unavailable, because the unchecked site might plan it.
14. Cross-site decisions (page only, no route). `listAllActions` invokes `listActions` for each site, so every status (still applies / grown / resolved) is derived from that site's readiness. An unreadable site log renders its section as unavailable rather than empty; if none can be read the page is unavailable. Each request reads every listed site once, which is the limit already noted in item 13. Decision chips on list rows need no extra request: shortages and data problems arrive with their actions attached, latest first, `current` already set.
15. On-site review (AC 67 to 71). Neither a "Picked" flag nor a pick list matching the plan guarantees correctness on site: wrong item, an item that does not fit, damage in transit or during work. Any line can therefore be reviewed. `checkPicks(list, { reports, reviews })` combines the pick list with this app's reports and reviews: a line's latest report remains open until a review of the same line with a strictly later time exists; while open, a report contributes the `reported` issue, sorted last so that a line also failing the pick check keeps the earlier label. Fail closed: an unreadable report timestamp is treated as newest and never closed; an unreadable review timestamp closes nothing; a review timestamped identically to a report leaves it open. Issues raised by the pick check are never cleared by a review, and the pick list is never written. Reviews are stored in a dedicated append-only table, not as one more report kind, so a "right" cannot be misread as a fault.
16. Maps per project (AC 74–76). Upstream may supply a `location` per site. The projects page obtains `MAPBOX_PUBLIC_TOKEN` on the server (inlined via `next.config.ts`, where an `sk.` value aborts the build) and gives it to the map in every card; that map is a client component that imports Mapbox GL JS lazily when needed. `travel.ts` contains everything testable without a browser: validating locations, building Google Maps direction links, haversine distance, constructing and parsing the matrix call (origin plus no more than nine projects; any number it cannot trust becomes "no route"), the fallback origin (Auckland city warehouse), and all copy. `TravelProvider` routes from the fallback until the device shares a position, requests that position only after "Use my location" (or when permission already exists), keeps showing the previous answer until the new origin's answer arrives, and queries the matrix only when online and given a token.
17. Daily verdict panel (AC 77–79). `today.ts` contains the browser-free logic: crew grouping (a crew that cannot be checked cannot go); verdict; totals line; the bar, four tabs with All leading, the opening tab, per-pin label/status/colour via the card rules (`siteChip`, `markerColour`), arrow-key tab movement, and pin coordinates for the map-less fallback. The server assembles this for all listed projects and passes the result into `TodayPanel`. That client component tracks the selected tab and project, places pins through the Mapbox projection (a static map framed on the current tab's pins), else on the fallback panel, and shows the selected project's card immediately under the map. The card is the list's `SiteCard`, server-rendered once per project (passed as `cards`, ids prefixed `today-card`) under the list's `TravelProvider`, which keeps the two consistent. No new endpoint, no new data.
18. Due dates (AC 80). Upstream may supply a `date` per site, holding the project deadline (`YYYY-MM-DD`; type checked strictly, value leniently, as with `location`). `deadline.ts` renders it in English from the date's own components in UTC, so time zones cannot shift it, and returns nothing for an impossible date. The page hands the result to `SiteCard`, which prints it last; the card under the daily map is that same component and shows it too.
19. Calendar of deadlines (AC 81, 82). `CalendarPanel` duplicates `TodayPanel` (left unchanged) and swaps the map for a month grid: verdict, bar and tabs still come from `today.ts`, under ids and names of their own. `calendar.ts` adds each project's deadline (`deadlineOf`) and signal (`signalView`), the displayed date range (the device's today, read with `useSyncExternalStore` so the server render, lacking a today, includes every deadline; through year end), and the month grid in UTC. Each oval is the large signal in miniature, reusing its tone classes and its knob shapes. Below the calendar sits the list's `SiteCard`, server-rendered with id prefix `calendar-card`.
20. Dedicated Map and Calendar pages (AC 83). `/map` and `/calendar` are server-rendered: each loads the listed projects and renders a single panel wrapped in `TravelProvider`. `ProjectCard.tsx` holds the card shared by both panels and the list (`ProjectCard`, `projectCards`, `placesOf`). `NAV_ITEMS` holds Map, Calendar and Projects, in that order, with Guide appended by the tab bar; Inventory and Decisions remain as pages and sections, simply with no tab.
21. Landing on the first tab (AC 84). `EntryTab`, a client island mounted in the root layout, executes once per page load. On a browser tab's initial load it stores `team-leader:entered` in session storage and, if `entryRedirect` says so (bare `/sites`, flag not yet set), swaps the URL for the tab bar's first destination. If storage is unavailable, nothing happens. The server response for `/sites` is unchanged, so the post-deploy smoke test still sees the list.
22. Back to the originating screen (AC 85). The screen stack in `nav-history.ts` is exposed as a store (`subscribeNavHistory`, `previousScreen`), and the pure `backTarget(fallback, previous)` selects the destination: the top-level page beneath, named by its tab, otherwise the page's own target. `BackControl` subscribes through `useSyncExternalStore`; because no snapshot exists on the server, first paint shows the page's declared target, and a tap goes back in history whenever the destination is the screen underneath. Every page still declares its own target; none encodes where the user arrived from.
23. Schedule changes on the card (AC 86, 87). The upstream sites stay read-only, and the deployed file system cannot be written, so a leader's new deadline or operator lives in localStorage under `team-leader:site-edits` (`{ [siteId]: { date?, operator?: { name, phone } } }`). `site-edits.ts` holds the pure rules (parse and drop malformed entries, write, merge, "this device first, then upstream", the candidate list built from every operator and picker in `sites.json`, the words); `SiteEdits.tsx` subscribes through `useSyncExternalStore` (a same-page event plus the `storage` event) and renders `SiteDeadline`, `SiteOperator` and `OperatorCall` as client islands inside the server-rendered `SiteCard`. The server render shows the upstream values and the stored ones replace them as the page starts. `CalendarPanel` applies stored dates with `withEditedDeadlines`. The site page and its inner pages read the stored operator too (AC 88): `StoredOperatorRow` feeds `OperatorRow`, `SiteSignal` gets `OperatorCall`, `ActionNeeded` renders `StoredContacts`, and `PickSummary` builds Send the crew's text from `useOperator`. Nothing is sent to the API: `GET /api/sites` keeps the upstream values until a planning system accepts writes (increment 5).
24. Solution stock (AC 90, 91). A new upstream, `SolutionStockPort.getSolutionStock(codes)`, stubbed from `data/sample/solution-stock.json` (install kits per Internal Code, with `capturedAt`; down, empty and malformed modes like the other stubs). The pure `solutionInventory` in `src/domain/inventory.ts` gives READY only for a finite, non-negative count of at least one kit, otherwise SHORTAGE. `describePenetration` and `listCandidates` attach it to the nominated solution and to every candidate; `proposeSubstitution` refuses a candidate that is not READY with 409 `substitute_not_in_stock`, after the candidate check, so a disabled button is never the only guard. `Dependencies.solutionStock` is optional: without it nothing is READY. Readiness is untouched. Portable evidence is client-only (`ShortageEvidence`, pure `evidence.ts`): localStorage `team-leader:evidence`, `{ [siteId]: { selected: shortageId[], note } }`.

## 12. Open questions

- Should an approved substitute stop the shortage blocking immediately, or only once the upstream nomination changes? Current design: only on the nomination change.
- Who handles escalations in reality? Purchasing and warehouse are assumptions; the exercise only stores them.
- Which locations count towards a leader's "in stock"? The design sums all locations reachable by that leader; needs confirmation.
- When a shortage recurs at an equal or smaller size, is a fresh decision required? The design displays the earlier one, dated, and leaves it to the leader.
- Who closes a site's report in practice: the leader's on-site review (as built), or the warehouse closing it once the replacement (re-pick, or a delivery the same day) has gone out? The design waits for the site review, since only people on site can confirm the replacement.
