# Test strategy

Verification plan for the slice. ACs are numbered in `slice-specification.md` §4. Every AC has one or more automated tests, and each test name contains its AC number, so coverage can be found with a text search.

## 1. Principles

- **Concentrate where failure hurts.** The two dangerous outputs are a false "Crew can go" and a bad substitute suggestion. Both are produced by pure domain code, which therefore holds most of the tests: quick, repeatable, I/O-free.
- **Fail-closed behaviour is asserted.** Each missing-data and upstream-error path has a test proving the crew never reads clear.
- **Pyramid shape.** Many unit tests; a smaller number at API and DB level; a small set of browser tests around the demo script.
- **Use the real thing when it is cheap.** Real catalogue CSV; real Postgres in CI. Upstreams are stubbed, a limitation stated in §8.
- **Specs drive tests, not the implementation.** No agent ships unreviewed acceptance tests for code it wrote itself; every test is reviewed against the criteria ahead of the code it exercises.

## 2. Layers

| Layer | Tooling | Scope | When |
| --- | --- | --- | --- |
| Domain unit | Vitest | Demand, shortages, crew status, decision ageing, matching, normalisation | Each push |
| Catalogue/data | Vitest | Row counts after CSV load, raw strings preserved, fixture references | Each push |
| Contract | Vitest + Zod | Every upstream stub against its schema | Each push |
| API | Vitest invoking route handlers in-process | HTTP statuses, input validation, idempotent replay, response headers | Each push |
| Database | Vitest on real Postgres 17 (`npm run test:db`) | Constraints, idempotency uniqueness, ordering, app role denied update/delete/truncate/DDL | Each push |
| E2E | Playwright | Demo script plus failure states, run in Chromium | Each push, plus post-deploy against production |
| Accessibility | axe-core in Playwright; manual keyboard pass | Contrast, labelling, focus order, state not by colour only | Each push (automated); at release (manual) |
| Static | strict TypeScript, ESLint | Typing, risky constructs, module boundaries | Each push |
| Supply chain | secret scan, dependency audit | Credentials in the repo, known CVEs | Each push |

ESLint enforces the boundary: no Next.js, React, `pg` or file-system import inside the domain core, and no `pg` or server module inside client code.

## 3. AC → test mapping

One row per acceptance criterion: the behaviour in a few words, then every test file that references the AC. The exact assertions are the `it(...)` and `test(...)` titles inside those files, each prefixed with its AC number; this table points to them rather than repeating them. Paths are relative to `tests/`.

| AC | Focus | Tests |
| --- | --- | --- |
| 1 | Demand summed per material | `unit/readiness.test.ts` |
| 2 | Site whose stock suffices | `unit/readiness.test.ts` |
| 3 | Balances added across warehouse and van | `unit/readiness.test.ts` |
| 4 | Fractional demand rounds up | `unit/readiness.test.ts` |
| 5 | Unknown-stock shortage: null figures; wait and escalate allowed | `api/routes.test.ts`, `unit/readiness.test.ts` |
| 6 | Blocker reasons | `api/routes.test.ts`, `unit/readiness.test.ts` |
| 7 | Wait on a blocker rejected (422); escalate allowed | `unit/readiness.test.ts` |
| 8 | No penetrations means nothing planned | `unit/readiness.test.ts` |
| 9 | Stock stub failing: 502 and an unavailable screen, never clear | `api/routes.test.ts`, `api/stubs.test.ts`, `api/upstream.test.ts`, `e2e/stock-down.spec.ts`, `e2e/stock-malformed.spec.ts`, `unit/ui-load.test.ts`, `unit/ui-messages.test.ts`, `unit/ui-status.test.ts` |
| 10 | Pooled stock makes two sites clear at once; label on screen | `api/routes.test.ts`, `e2e/scenario.spec.ts`, `unit/readiness.test.ts` |
| 11 | Wait stored, state becomes waiting (201) | `api/routes.test.ts` |
| 12 | Invalid target refused (422) | `api/routes.test.ts` |
| 13 | Absent shortage refused (404) | `api/routes.test.ts` |
| 14 | Escalation outranks a later wait | `unit/lifecycle.test.ts`, `unit/readiness.test.ts` |
| 15 | Growing shortfall demotes the stored action | `unit/lifecycle.test.ts`, `unit/readiness.test.ts`, `unit/ui-status.test.ts` |
| 16 | Replays store a single row; no key → 400; DB uniqueness per user | `api/actions-repository.test.ts`, `api/idempotency.test.ts`, `api/routes.test.ts`, `db/contract.test.ts`, `unit/pg-store.test.ts` |
| 17 | Overlong note refused (422) | `api/body-limit.test.ts`, `api/routes.test.ts`, `db/contract.test.ts` |
| 18 | Candidates for 0438 (domain and UI) | `e2e/scenario.spec.ts`, `unit/candidates.test.ts` |
| 19 | Candidates for 0789 | `unit/candidates.test.ts` |
| 20 | Empty result and unknown nominated code | `api/routes.test.ts`, `unit/candidates.test.ts` |
| 21 | Incomplete-substrate status | `api/routes.test.ts`, `e2e/penetration-page.spec.ts`, `unit/candidates.test.ts` |
| 22 | Candidates for 0434; null insulation never offered | `unit/candidates.test.ts` |
| 23 | Non-candidate target 422; outdated source 409 | `api/routes.test.ts` |
| 24 | Proposals stored as proposed only; nothing else changes | `api/routes.test.ts`, `db/contract.test.ts` |
| 25 | Exactly 20 of 148 solutions have a candidate | `unit/candidates.test.ts` |
| 26 | CSV loads 148 rows unchanged; six incomplete substrates flagged | `data/catalogue-file.test.ts`, `unit/catalogue.test.ts` |
| 27 | Fixture codes all exist apart from the planted 9999 | `api/contract.test.ts` |
| 28 | Client bundle free of DB credentials and service keys | `api/security.test.ts` |
| 29 | no-store on readiness and actions | `api/security.test.ts` |
| 30 | Penetration row content | `e2e/ac30-status-text.spec.ts`, `unit/ui-status.test.ts` |
| 31 | Keyboard-only escalation; target sizes | `e2e/ac31-keyboard.spec.ts` |
| 32 | 375px layout with no horizontal scroll | `e2e/ac32-viewport.spec.ts` |
| 33 | Candidate stock reflects the site's own shortages and unknowns | `api/routes.test.ts`, `unit/availability.test.ts` |
| 34 | Blocked site without banner; chips filter and count; clear site says Crew can go | `e2e/site-tabs.spec.ts`, `unit/penetration-filters.test.ts`, `unit/ui-messages.test.ts`, `unit/ui-penetrations.test.ts`, `unit/ui-screens.test.ts` |
| 35 | Fit rules, normalisation, fail-closed requirements, blocker order | `api/routes.test.ts`, `e2e/penetration-page.spec.ts`, `e2e/site-tabs.spec.ts`, `e2e/substitutes-empty.spec.ts`, `unit/fit.test.ts`, `unit/readiness.test.ts`, `unit/ui-penetrations.test.ts`, `unit/ui-status.test.ts` |
| 36 | Side-by-side penetration vs nominated solution; misfits flagged | `e2e/penetration-page.spec.ts`, `unit/penetration-detail.test.ts`, `unit/ui-fit.test.ts`, `unit/ui-status.test.ts` |
| 37 | Theme switching and persistence; tab bar on the Guide | `e2e/navigation-tabs.spec.ts`, `unit/ui-head-script.test.ts`, `unit/ui-nav-section.test.ts`, `unit/ui-screens.test.ts`, `unit/ui-theme.test.ts` |
| 38 | Materials list: pooled stock, cross-site totals, unchecked sites | `e2e/navigation-tabs.spec.ts`, `e2e/stock-down.spec.ts`, `e2e/stock-malformed.spec.ts`, `unit/material-needs.test.ts`, `unit/material-stock.test.ts`, `unit/ui-materials.test.ts` |
| 39 | Material page: per-site sections and actions where short | `e2e/ac30-status-text.spec.ts`, `e2e/penetration-page.spec.ts`, `e2e/stock-down.spec.ts`, `e2e/stock-malformed.spec.ts`, `unit/material-needs.test.ts`, `unit/material-stock.test.ts` |
| 40 | Shortage lines link into material pages | `e2e/penetration-page.spec.ts`, `unit/ui-format.test.ts`, `unit/ui-penetrations.test.ts` |
| 41 | Old site-material URL redirects to the material section | `e2e/penetration-page.spec.ts` |
| 42 | Back from a material page to the originating penetration | `e2e/penetration-page.spec.ts`, `unit/material-stock.test.ts`, `unit/nav-history.test.ts`, `unit/ui-materials.test.ts` |
| 43 | Decisions log across sites; returns to the log | `e2e/ac31-keyboard.spec.ts`, `e2e/actions-log.spec.ts`, `unit/actions-log.test.ts`, `unit/penetration-filters.test.ts`, `unit/ui-actions-log.test.ts`, `unit/ui-format.test.ts` |
| 44 | Row marks counting problems and decisions | `e2e/ac31-keyboard.spec.ts`, `unit/ui-penetrations.test.ts`, `unit/ui-status.test.ts` |
| 45 | Penetration Decisions tab | `e2e/penetration-page.spec.ts`, `unit/penetration-log.test.ts`, `unit/penetration-tabs.test.ts` |
| 46 | Material Decisions tab | `e2e/penetration-page.spec.ts`, `unit/material-log.test.ts`, `unit/material-tabs.test.ts` |
| 47 | Wide screens keep the phone layout | `e2e/wide-screen.spec.ts`, `unit/ui-head-script.test.ts`, `unit/ui-nav-section.test.ts`, `unit/ui-screens.test.ts` |
| 48 | Online switch, connection states, health endpoint | `api/health.test.ts`, `e2e/field-ui.spec.ts`, `e2e/navigation-tabs.spec.ts`, `unit/connection.test.ts`, `unit/ui-screens.test.ts` |
| 49 | Operator and picker contact actions | `api/health.test.ts`, `e2e/field-ui.spec.ts`, `unit/contacts.test.ts` |
| 50 | Needs-your-decision panel | `e2e/field-ui.spec.ts`, `unit/action-needed.test.ts`, `unit/contacts.test.ts` |
| 51 | 18px text, 48px targets, no overflow | `e2e/field-ui.spec.ts` |
| 52 | Signal states by colour and shape | `e2e/field-ui.spec.ts`, `e2e/stock-down.spec.ts`, `e2e/stock-malformed.spec.ts`, `unit/signal.test.ts` |
| 53 | Signal colour tokens and contrast ratios | `e2e/field-ui.spec.ts`, `unit/signal-tokens.test.ts` |
| 54 | Signal tap calls the operator | `e2e/field-ui.spec.ts`, `e2e/stock-down.spec.ts`, `e2e/stock-malformed.spec.ts`, `unit/contacts.test.ts` |
| 55 | Prepared operator messages | `e2e/field-ui.spec.ts`, `e2e/stock-down.spec.ts`, `unit/contacts.test.ts`, `unit/signal.test.ts` |
| 56 | Sites API lists shortages of blocked sites | `api/routes.test.ts` |
| 57 | Signal size and screen order | `e2e/field-ui.spec.ts`, `e2e/stock-down.spec.ts`, `unit/signal.test.ts`, `unit/ui-screens.test.ts` |
| 58 | Online control colours | `e2e/sign-in.spec.ts` |
| 59 | Demo sign-in cover | `e2e/sign-in.spec.ts`, `unit/ui-auth.test.ts` |
| 60 | Create account, sign out, forgot password | `e2e/sign-in.spec.ts`, `unit/ui-auth.test.ts` |
| 61 | Pick check ignores the warehouse's own status | `api/contract.test.ts`, `api/pick-reports.test.ts`, `api/stubs.test.ts`, `e2e/pick-check.spec.ts`, `unit/picks.test.ts`, `unit/ui-picks.test.ts` |
| 62 | Pick summary and the crew gate | `api/pick-reports.test.ts`, `e2e/pick-check.spec.ts`, `unit/ui-picks.test.ts` |
| 63 | Crew gate locked offline | `e2e/pick-check.spec.ts`, `unit/ui-picks.test.ts` |
| 64 | Pick check page | `e2e/pick-check.spec.ts`, `unit/ui-picks.test.ts` |
| 65 | Pick-error report API and form | `api/actions-repository.test.ts`, `api/pick-reports.test.ts`, `db/contract.test.ts`, `e2e/pick-report.spec.ts`, `unit/ui-picks.test.ts` |
| 66 | Pick reports queued offline, sent once | `api/actions-repository.test.ts`, `api/pick-reports.test.ts`, `db/contract.test.ts`, `e2e/pick-report.spec.ts`, `unit/ui-picks.test.ts` |
| 67 | Review control on every pick line | `api/pick-reviews.test.ts`, `e2e/pick-check.spec.ts`, `unit/ui-picks.test.ts` |
| 68 | Review that a line is right | `api/actions-repository.test.ts`, `api/pick-reviews.test.ts`, `db/contract.test.ts`, `e2e/pick-review.spec.ts`, `unit/picks.test.ts` |
| 69 | Site-side report kinds, amounts and requests | `api/actions-repository.test.ts`, `api/pick-reviews.test.ts`, `db/contract.test.ts`, `e2e/pick-review.spec.ts`, `unit/ui-picks.test.ts` |
| 70 | Reports stay open until a later review | `api/pick-reviews.test.ts`, `e2e/pick-review.spec.ts`, `unit/picks.test.ts`, `unit/ui-picks.test.ts` |
| 71 | Reviews queued offline | `api/actions-repository.test.ts`, `api/pick-reviews.test.ts`, `db/contract.test.ts`, `e2e/pick-check.spec.ts`, `e2e/pick-review.spec.ts`, `unit/ui-picks.test.ts` |
| 72 | Readiness filter | `e2e/sites-filter.spec.ts`, `e2e/stock-down.spec.ts`, `unit/site-filters.test.ts` |
| 73 | Search by name, job ref, address | `e2e/sites-filter.spec.ts`, `unit/site-filters.test.ts` |
| 74 | Project maps and directions | `api/sites-location.test.ts`, `e2e/field-ui.spec.ts`, `e2e/site-maps-token.spec.ts`, `e2e/site-maps.spec.ts`, `unit/travel.test.ts` |
| 75 | Drive and distance from fallback origin or device | `e2e/navigation-tabs.spec.ts`, `e2e/site-maps-token.spec.ts`, `e2e/site-maps.spec.ts`, `unit/travel.test.ts` |
| 76 | Mapbox token must be public | `e2e/site-maps-token.spec.ts`, `unit/mapbox-token.test.ts`, `unit/travel.test.ts` |
| 77 | Daily verdict panel | `e2e/not-found.spec.ts`, `e2e/stock-down.spec.ts`, `e2e/stock-malformed.spec.ts`, `e2e/today.spec.ts`, `unit/today.test.ts`, `unit/ui-screens.test.ts` |
| 78 | Verdict tabs and lit segments | `e2e/stock-down.spec.ts`, `e2e/today.spec.ts`, `unit/today.test.ts` |
| 79 | Map pins; the selected card below | `e2e/field-ui.spec.ts`, `e2e/site-maps-token.spec.ts`, `e2e/site-maps.spec.ts`, `e2e/stock-down.spec.ts`, `e2e/stock-malformed.spec.ts`, `e2e/today.spec.ts`, `unit/today.test.ts` |
| 80 | Deadline on each card | `api/sites-date.test.ts`, `e2e/deadline.spec.ts`, `unit/deadline.test.ts` |
| 81 | Deadline calendar | `e2e/calendar.spec.ts`, `e2e/site-maps-token.spec.ts`, `e2e/today.spec.ts`, `unit/calendar.test.ts` |
| 82 | Calendar date range | `e2e/calendar.spec.ts`, `unit/calendar.test.ts` |
| 83 | Map and Calendar tabs | `e2e/actions-log.spec.ts`, `e2e/calendar.spec.ts`, `e2e/home-status.spec.ts`, `e2e/navigation-tabs.spec.ts`, `e2e/scenario.spec.ts`, `e2e/today.spec.ts`, `e2e/wide-screen.spec.ts`, `unit/ui-nav-section.test.ts` |
| 84 | First tab on entry | `e2e/entry.spec.ts`, `unit/entry.test.ts` |
| 85 | Back returns to the originating page | `e2e/back-navigation.spec.ts`, `unit/nav-back.test.ts` |
| 86 | Move a deadline on the card, kept on the device | `e2e/schedule-edits.spec.ts`, `e2e/field-ui.spec.ts`, `unit/site-edits.test.ts` |
| 87 | Change the operator on the card, kept on the device | `e2e/schedule-edits.spec.ts`, `unit/site-edits.test.ts` |
| 88 | Inner pages read the stored operator first | `e2e/schedule-edits.spec.ts`, `unit/ui-screens.test.ts` |
| 89 | Controls use theme colours only | `e2e/theme-controls.spec.ts`, `e2e/sign-in.spec.ts` |

CI runs a script that enumerates AC numbers and fails if any lacks a referencing test.

## 4. Principal unit test groups

**Numbers that must fail closed** (introduced after independent review)
- Mapped quantities that are negative, `NaN` or `Infinity` → `invalid_quantity`, never `clear`; no bad value can offset another penetration's demand.
- Stock that is negative, `NaN`, `Infinity` or overflowing → material `unknown`.
- Demand overflow throws. Floating-point residue: 10 × 0.1 in stock covers a demand of 1; demand 5 with 4.2 available leaves 0.8 missing.
- Requirements or offered ratings that are not finite never yield a candidate.

**Shortage arithmetic**
- Sums across penetrations and materials. Equal demand and stock is no shortage; one unit less is.
- Rounding up of fractions; zero; very large values.
- Stock added up over locations; an absent location is not zero.

**Crew status**
- Clear means: zero shortages, zero blockers, one or more penetrations.
- Neither wait nor escalate alters status.

**Decision ageing**
- Current while the shortfall stays at or below the recorded figure; earlier once it rises.
- Escalate → wait; wait → escalate; several actions in sequence.

**Normalisation** (one real catalogue row per case)
- Two spaces inside a service type (`0375`).
- Space directly inside brackets (`0452`, `0479`).
- Space ahead of a unit (`0734`).
- Letter case.
- Trailing comma kept; the six incomplete rows flagged (`0943`).
- Distinct size formats stay unequal; `0534` and `0535` stay separate.

**Matching** (property-style, over the whole real catalogue)
- Every candidate meets or beats the required integrity and insulation.
- Null insulation never meets a stated requirement.
- No candidate equals the nominated code.
- Post-normalisation, the four text fields (orientation, substrate, service type, size) always agree.
- Exactly 20 solutions have candidates.

## 4a. Verifying the API layer (introduced after independent review)

Vitest's coverage floor applies only to `src/domain`, which is why mutation testing judges the API layer. Following the initial review, the suite still passed with 24 rules deliberately broken. The fix round added a test per rule; re-running them as mutants in the orchestrator's shell caught 13 of 15; the two survivors are equivalent mutants (the early numeric `Content-Length` rejection only optimises ahead of the streaming cap, and note length is checked by both schema and use case). The contract suite targets the in-memory repository, plus real Postgres 17 whenever `TEST_DB_ADMIN_URL` is set. In CI, `REQUIRE_DB_CONTRACT=1` and `REQUIRE_BUNDLE_SCAN=1` turn a skip into a failure. Granting the app role `update, delete` as a mutation makes the database suite fail.

## 5. Risks and their tests

| Risk | Impact | Covered by |
| --- | --- | --- |
| Absent data treated as zero | Wrong clear or invented shortage | AC 5–9 and unit cases for a missing stock record |
| Outdated nomination or candidates | Bad substitute stored | AC 23 |
| Matching too loosely | Unsafe suggestion | AC 18–22, 25, property checks |
| Coarse catalogue columns used by accident | A socket treated as a pipe | Unit cases where options agree but raw values do not |
| Old decision covering a new shortage | Leader assumes it is handled | AC 14, 15 |
| Repeat taps on weak signal | Duplicated escalation | AC 16 |
| Stale cached "clear" after stock drops | Crew leaves without materials | AC 29 |
| Leaked DB credentials | Data exposure | AC 28, secret scan |
| DB reachable without login | Anyone can read or write | DB test: anon role cannot select or insert |
| Silent behaviour change from a catalogue update | Wrong suggestions | AC 25 and 26 break visibly |
| Upstream schema drift | Wrong figures | Contract tests |
| Controls unusable without a mouse or sight | Leader cannot act | axe, manual keyboard pass |

Each endpoint is tested with: a malformed body, an extra property, a mistyped value, no key, a site that does not exist, a failing upstream. Each answers with the one `{code, message}` shape and leaks no stack trace, file path or SQL; a dedicated test asserts that shape and that such strings never appear.

## 6. Test data

- **Catalogue:** the supplied CSV, unmodified.
- **Upstream fixtures:** `data/sample/`, marked invented; the demo set described in `slice-specification.md` §7.
- **Unit fixtures:** small objects built inline, independent of the sample files.
- **Failing stubs:** every upstream stub can be told to fail, return nothing, or return malformed data.
- **Database:** each run migrates a clean schema; tests remove their own rows.
- No genuine personal data or production credential appears in any test.

## 7. CI/CD gates

Each push and pull request runs, in sequence:

1. Install strictly from the lockfile.
2. Typecheck and lint, import-boundary rule included.
3. Coverage run over the unit, catalogue, contract and API suites.
4. Postgres 17 service: apply `db/setup.sql` and the migrations, then the DB contract suite under `REQUIRE_DB_CONTRACT=1`.
5. Production build, followed by the client-bundle credential scan.
6. Secret scan; dependency audit.
7. Playwright E2E with axe against dev servers. Five projects: read-only, writing, two stock-failure servers (`STUB_STOCK_MODE=down` and `malformed`); and a maps server given a dummy `pk.` token, whose spec answers all Mapbox traffic on its own. Each server has its own build directory; every server but the maps one gets a blank token, so Mapbox is never contacted.
8. AC coverage script.
9. `main` only, once everything above is green: Vercel deploy (`vercel pull`, `build --prod`, `npm run db:migrate` against production, which aborts without `SUPABASE_DB_PASSWORD`, then `deploy --prebuilt --prod`), followed by `scripts/smoke.mjs` on the production URL: `/api/sites` 200 with `no-store` and four sites; `/` redirecting to `/about-this-demo` and rendering "Know which crews can roll out today"; `/sites` rendering "Projects"; Cedar Court's pick check showing either ready or not-ready status, never "Can't check picks", which is the symptom of a missing migration.

Any failure blocks merging to the default branch. Only a green default branch can reach Vercel, and the smoke run against the public URL after deployment proves the release works.

**Thresholds.** Domain core ≥ 95% lines and branches; overall coverage may not drop below its current value. Coverage is only a floor; the AC mapping and the property checks are what demonstrate the tests are meaningful.

**Flaky tests.** Unit, API and DB tests never retry. Playwright gets one retry, and any pass-on-retry is reported for fixing.

**Running locally.** Identical commands; Podman substitutes for Docker where needed. The README lists the commands.

## 8. Outside what these tests prove

- How production upstreams behave (response times, authentication, quality of data). Stubs establish logic and contract shape, nothing more.
- Whether real leaders understand the screens; automated a11y and a keyboard pass are no substitute for sessions with users.
- Compliance of any suggested substitute. Tests show the rules were implemented faithfully, not that they suffice; that call belongs to a qualified person.
- Load beyond the target in §8 of the design, and behaviour over long periods.
- Offline operation (not in scope).

## 9. Reviewing tests written by agents

- Authored from acceptance criteria up front, which prevents fitting them to the implementation.
- Each new test is first shown failing against absent or wrong behaviour, then passing.
- Tests that merely restate the implementation, or only assert on a mock, are rejected.
- Corrections to agent output go into `submission-checklist.md` as review evidence.
- Mutation spot checks on matching and shortage code: break a rule on purpose, confirm a test catches it.
