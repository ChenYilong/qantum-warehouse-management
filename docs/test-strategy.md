# Test strategy

How the slice is verified. Acceptance criteria (AC) are numbered in `slice-specification.md` section 4. Each AC maps to at least one automated test, and tests use the AC number in their name so coverage can be checked by search.

## 1. Approach

- **Test where the risk is.** The risk is a wrong "Crew can go" and a wrong substitute suggestion. Both live in the pure domain core, so most tests sit there: fast, deterministic, no I/O.
- **Fail closed is a tested property.** Every missing-data and upstream-failure path has a test asserting the crew is never reported clear.
- **Test pyramid.** Many unit tests, fewer API and database tests, a handful of end-to-end tests on the demonstration scenario.
- **Real parts where cheap.** The real catalogue CSV and a real Postgres in CI. Upstream systems are stubs, and that limit is stated in section 8.
- **Tests are written from the spec, not from the code.** An agent that writes code does not write its own acceptance tests unreviewed. Tests are reviewed against the AC list before the implementation they cover.

## 2. Layers and tools

| Layer | Tool | What it covers | Runs |
| --- | --- | --- | --- |
| Unit (domain) | Vitest | Requirements, shortages, status, lifecycle, matching, normalisation | Every push |
| Catalogue and data checks | Vitest | CSV load counts, raw text preserved, sample data references | Every push |
| Contract | Vitest and Zod | Each upstream stub validates against its schema | Every push |
| API | Vitest, calling route handlers directly | Status codes, validation, idempotency, headers | Every push |
| Database | Vitest against a real Postgres 17 (`npm run test:db`) | Constraints, idempotent uniqueness, ordering, and the app role's refused update, delete, truncate and DDL | Every push |
| End to end | Playwright | The demonstration scenario and failure states in a browser | Every push, and after deploy against the public URL |
| Accessibility | axe-core inside Playwright, plus a manual keyboard pass | Contrast, labels, focus order, status without colour | Every push (automated), release (manual) |
| Static checks | TypeScript strict, ESLint | Types, unsafe patterns, import boundaries | Every push |
| Secrets and dependencies | Secret scan, dependency audit | No credentials in repo, known vulnerabilities | Every push |

Boundary rule enforced by lint: the domain core may not import Next.js, React, the database driver (`pg`) or file system modules, and client code may not import `pg` or server modules.

## 3. Acceptance criteria to tests

| AC | Layer | Test focus |
| --- | --- | --- |
| 1, 2, 3, 4 | Unit | Sum, covered site, two locations summed, fraction rounds up |
| 5 | Unit, API | Unknown shortage has null quantities. API accepts wait and escalate for it |
| 6, 7 | Unit, API | Blocker reasons. 422 for wait on a blocker, escalate accepted |
| 8 | Unit | No penetrations gives nothing planned |
| 9 | API, E2E | Stock stub fails: 502, UI says unavailable, never clear |
| 10 | Unit, E2E | Two sites share stock and both clear. Label visible on screen |
| 11, 12, 13 | API | 201 and state waiting, 422 on bad target, 404 on missing shortage |
| 14, 15 | Unit | Escalate then wait keeps escalated. Grown shortfall marks action earlier |
| 16 | API, Database | Repeat returns original with one row. Missing key is 400. Per-user unique constraint |
| 17 | API | Over-long note is 422 |
| 18 | Unit, E2E | `0438` gives `0451` and `0464`, in the domain and on the penetration screen |
| 19, 22 | Unit | `0789` and `0434` give the stated candidates. Null insulation never offered |
| 20, 21 | Unit, API | Empty and incomplete-substrate states, and an unknown code |
| 23 | API | 422 for non-candidate target, 409 for stale source |
| 24 | API, Database | Proposed status only. Nomination and shortage unchanged |
| 25 | Unit | Exactly 20 of 148 have a candidate |
| 26 | Unit | 148 rows, raw text intact, 6 incomplete flagged |
| 27 | Contract | Every sample penetration code exists, except the deliberate missing one |
| 28 | Build check | Client bundle contains no database credentials or service key |
| 29 | API | `Cache-Control: no-store` on readiness and actions |
| 30, 31, 32 | E2E, accessibility | Row contents, keyboard use, target size, 375px layout without horizontal scroll |
| 33 | Unit, API, E2E | A material the site is short of (or has unknown stock for) makes a candidate short (or unknown). Quayside House's `0451` shows it |
| 34 | Unit, E2E | A blocked site has no summary banner. Chips filter the rows and count penetrations; a proposed substitute counts as Acted. A clear site still says Crew can go |
| 35 | Unit, API | Each fit rule, normalisation, a cut-off substrate on either side never fits (even identical text), blank text never matches, fail-closed requirements, order of blocker checks, no added need; wait 422 and escalate 201 on the new blocker |
| 36 | Unit, E2E | Side-by-side rows for penetration and nominated solution; a field that does not fit marked with an icon and text |
| 37 | Unit, E2E | Theme: `parseTheme`, `applyTheme` (blocked storage still applies), the pre-paint script, chosen-dark tokens identical to system-dark; E2E: Dark pins and survives a reload, arrow keys move the choice, Light overrides a dark device, System hands back, axe in dark. Theme choice on the Guide's "On this device", not in the header (source check; E2E: no Theme group on `/sites`). Tab bar on the landing page, Projects, Inventory and Decisions (source check: `MenuBar` renders `TabBar`); on the landing page Guide is current and Sites is not; the bar lists all four entries, marks the current one, is pinned full width to the foot of the viewport before and after scrolling, the body is padded by its height, it passes axe, targets and overflow, and a tab works from the keyboard; inner screens have no tab bar, no padding, and lead with back |
| 38 | Unit, E2E | `listMaterialStock`: planned materials by name, on hand or unknown, across-sites total, short sites, one stock read per page; an unavailable or missing site is unchecked, gives no total and never "not short"; no stock read when nothing is planned; stock down, malformed or a failed page read is unavailable. `materialState`: short, unknown, unchecked and "sites together need more" before "not short". Rows at 375px with targets, icons and no overflow; stock-down and stock-malformed servers show can't-check on both pages |
| 39 | Unit, E2E | `siteMaterialNeeds` (rounded once per site, blockers add no need); `describeMaterialStock` per-site sections, stock-unknown shortage, unchecked site last, not found vs unavailable; Wait and Escalate only where short |
| 40 | Unit, E2E | `shortageBrief` wording; penetration facts link to `/materials/<id>?from=<pid>#site-<id>`; a substitute's line links only when the site is already short of that material |
| 41 | E2E | `/sites/<id>/materials/<mid>` redirects to the material page at that site's section |
| 42 | Unit, E2E | `describeMaterialStock` returns to a penetration of a planning site (including a substitute's) and never for another site, an unknown id, an object key (`constructor`) or an unchecked site; `materialBack` wording. E2E: back to the penetration, and to Materials for foreign, malformed and repeated `from` |
| 43 | Unit, E2E | `listAllActions`: every site in order, a missing or failing site unavailable, all down unavailable, other errors rethrown, no sites; `actionLink` to the material page at the site's section with `fromLog`; `fromLogPath`, `logOrigin` (single, known site only) and `logBack`; filter chips keep `fromLog`. E2E: menu to `/actions` with the item marked, a section per site with the site icon and a sticky heading linking to the site, back to the log from a site (after a filter chip), a penetration and a material page, a foreign origin falls back to the parent, the old URL redirects to the section, axe, targets and no overflow at 375px; stock down shows the page unavailable, never "nothing recorded" |
| 44 | Unit, E2E | `rowMarks`: problem kinds with a count when repeated, then escalations, waits and proposals always counted, from `logCounts(penetrationLog(...))` so they match the tab; no mark at 0; unreadable log shows problems only. `penetrationMaterialIds` on site data. E2E: after an escalation the row link carries the hidden "Escalated" label with count 1; after a proposal, a "Proposed substitute" mark; no button inside |
| 45 | Unit, E2E | `penetrationLog`: shortage decisions for the nominated solution's materials (resolved kept), its own data-problem decisions and its proposals, newest first, others excluded; tab hrefs keep `fromLog`. E2E: both tabs with Solution current, `?tab=log` empty before writes, junk tab falls back, entry opens the material page with `?from=` and back pops to the tab, axe, targets and no overflow at 375px; stock down shows the site-unavailable screen, never 0 or nothing recorded |
| 46 | Unit, E2E | `materialLog`: this material's shortage decisions at every site, newest first, other materials and blockers excluded, unreadable sites named; `materialTabHref` keeps `from` and `fromLog`; site-count wording. E2E: Stock current, `?tab=log` empty with 0 before writes, junk tab falls back, `from` kept with back to the penetration on both tabs, axe, targets and no overflow at 375px; after an escalation the log names the site and the Stock section has no state label (AC 39); stock down never shows 0 or nothing recorded |
| 47 | Unit, E2E | `NAV_ITEMS` order (Projects, Inventory, Decisions); `next.config` redirects `/` to `ABOUT_PATH`, not permanently; the head script is the theme and the demo sign-in only (no `sidebar`), and the sticky header's offset is never zeroed; source checks: no side menu in the layout or the stylesheet, `MenuBar` renders `TabBar`. E2E at 1280px (`wide-screen.spec.ts`): the projects list has one Main navigation, the tab bar at the foot of the viewport with its entries in a column at most 721px wide, the Online switch in the header, no `<aside>`, no collapse control and no `data-sidebar`; the tab bar marks Inventory, Decisions and Guide on their pages; an inner page keeps its back control and the switch, with no tab bar; the `/actions` site heading sticks directly below the header; axe, 48px targets and no overflow at 1280 and 1024px. `/` lands on `/about-this-demo` (home-status) |
| 48 | Unit, API, E2E | `connectionState` (online needs all three; checking before the first answer; a later failure is offline), `clockLabel`, `pickerLine`, `updatedLine`, `connectionDescription`, `offlineBannerText`, `lastSyncedLine`, `parseStoredTime`, `parseHealth`. API: `/api/health` ok with the stock time and `no-store`; stock down or malformed is ok with no time. Source check: every header (`AppBar`, `MenuBar` and the error screen's `StatusBar`) holds the switch and the picker's line, and the layout has no connection row. E2E: one switch named Online, in the header, with the picker's last action below the header; after scrolling more than 500px the switch is still in the top 56px; it is in the header on the projects list, a penetration page, Inventory and the Guide; it is on; off shows Offline, "Updated", the foot banner, axe and 48px targets; a decision dialog sends nothing (no POST) and says why; Offline details then Sync now returns online and announces "Synced" |
| 49 | Unit, API, E2E | `siteAction` (notify, decide, retry, none), `telHref`, `smsHref`, `readyText`, `contactRoles`. API: sites carry operator and picker, Ofcom drama numbers; `SiteSchema` rejects blank names and non-international numbers. E2E: Cedar Court's Text and Call links, Sort out shortages on Quayside House and Northgate, nothing on Foundry Lane, one link per site name, axe, targets, no overflow, and the action lands on the panel |
| 50 | Unit, E2E | `actionNeeded`, `shortageLine`, `affectedLine`, `actionSummary`. E2E: site-b's figures with units, affected links, Wait and Escalate names, covered list with the caveat, picker and operator calls; site-c's unknown stock, data-problem link and one "Picker and operator"; no panel and "Crew can go" on site-a |
| 51 | E2E | Body text is 18px; 48px targets and no overflow on the sites list, a blocked site, a penetration and a material page (and on every screen through AC 31's check) |
| 52 | Unit, E2E | `signalView` (only the literal `clear` is go; blocked, nothing planned; every other status, including unavailable, is amber), no two states share a colour or a shape and only go has its knob on the right. E2E on the sites list: each card's `data-signal`, `data-knob` and knob shape, colours green, red and grey by channel in light and in dark, the labels, axe in both themes. Stock down or malformed: four amber signals, no `go` or `stop` |
| 53 | Unit | The `--signal-*` tokens are read from `globals.css` in all three theme blocks: fill, ink and edge for each state, ink on fill at least 7:1, edge on the page and on the card at least 3:1, green and red and amber by hue, four different fills, and the two dark blocks identical |
| 54 | Unit, E2E | `siteAction` (tap is a call for a clear or blocked site with an operator, the same href as Call operator; none, with "No operator assigned", without one; retry for an unchecked site; none for nothing planned), the hint never contains a button name. E2E: each card's signal link is `tel:` and equals Call operator's, its name never repeats the site name; nothing planned has no link or button; stock down has no link at all |
| 55 | Unit, E2E | `readyText`, `blockedText` (NOT complete, up to three names and a count, unknown stock, data problems, no reason named), `holdText`: each names the site and job ref, and only the clear text says the crew can go. E2E: the exact blocked text for Quayside House from the card and from the top of the site, Northgate's unknown stock and data problems, Cedar Court's ready text, the hold text with the stock down |
| 56 | API | `GET /api/sites` lists each blocked site's shortages in readiness order with unit, kind, required and shortfall (null when unknown), none for other sites, and none when stock is down; length equals `shortageCount` |
| 57 | E2E, unit | The signal is at least 88px tall and 280px wide at 375px, with 48px targets, no overflow and axe on the sites list and on the site screens; on the site screen the signal comes before the operator row, which comes before the panel; a clear site's signal replaces its banner; nothing planned has a grey signal and no operator row. Unit: the site frame source has no banner and keeps that order |
| 58 | E2E | The header's Online control's computed colours: green with dark text online, red with white text offline; axe in both (`sign-in.spec.ts`) |
| 59 | Unit, E2E | `auth.ts`: any username and password sign in, either missing stays out, no password is stored, blocked storage still signs in for the visit, the pre-paint script; E2E: the cover fills the screen on a first visit with the page behind inert, says what is missing, any password gets in, the role is kept, "Hi, <username>" in the header, a reload stays signed in with no cover; axe and targets on the cover. Every other spec starts signed in through Playwright `storageState` |
| 60 | Unit, E2E | `auth.ts`: create account replaces a same-named one and signs in, bad accounts storage is ignored, sign out keeps the username and role; E2E: Sign out at the Guide's top right brings the cover back with the username kept and the password focused, create account checks the passwords match, forgot password asks for a username or email and says nothing was sent |
| 61 | Unit, API | `checkPicks` (`tests/unit/picks.test.ts`): wrong spec, marked picked with the fixing kit missing, partly picked with an accessory missing are each NOT_READY although the warehouse says picked; the warehouse status is never read; bad or missing numbers and a missing spec block; no list or an empty one is unknown, never ready. Stub modes for the pick system fail closed; the contract test checks `picks.json` |
| 62 | Unit, E2E | `picks.ts` labels, amount lines and `crewGate`; E2E: Quayside House shows Not ready · 3 pick issues, the picker with Call and Email, four rows with their labels, Send the crew locked and no "Crew can go" text; Cedar Court's Send the crew texts the operator; Foundry Lane says Can't check with no link; the home page has no Picks section; axe, targets, overflow |
| 63 | Unit, E2E | `crewGate` is locked offline and while checking whatever the picks say; E2E: offline, every label reads Was …, Send the crew is locked with "Never decided from saved data" even where every line matched, Call still works |
| 64 | E2E | The Pick check page: three cards (partly picked with a 6 of 10 bar and the nozzle 0 of 1, parts missing with the kit 0 of 6, wrong spec with both ratings), the picker's Call, Report to warehouse on the first issue, Wait for re-pick back to the site, a row on the site screen landing on its card, the offline note; axe, targets, overflow |
| 65 | API, DB, E2E | API: 201 then 200 for the same key with one row, 404 for an unknown line or no list, 422 for no recipient, bad amounts, long text, unknown kinds or fields, 409 for a key reused on another line, empty text stored as none; repository contract and row mapping; DB: the table's checks and grants. E2E: the form prefilled from the line, refilled on another material, the recipient and amount checks, the request's key and body, the sent status |
| 66 | Unit, API, E2E | `pick-outbox.ts`: keep by key, replace a resave, drop junk, survive blocked storage, sent and final refusals leave, the rest stay to retry; E2E: offline, the report waits on the phone with nothing sent, the site screen counts it, back online it is sent once with the saved key, and a resend with that key is 200 created false |
| 67 | Unit, E2E | `pickReviewPath`, `pickReportPath(…, true)`, the review labels and wording (`tests/unit/ui-picks.test.ts`); E2E: on Quayside House each of the four rows (Part-picked, Missing parts, Wrong spec, Matches plan) has its own Review, described by its material and at least 48px, still there offline; each Pick check card has one; the review page of a line that matches the plan shows its card, Yes and No at least 88px tall, No opening the report from the review, and an unknown line has nothing to review; axe, targets, overflow |
| 68 | Unit, API, DB, E2E | Domain: a review gives `checkedAt` and never turns a mismatch into a match; API (`tests/api/pick-reviews.test.ts`): 201 then 200 for the same key with one row, 400 without a key, 404 for a line not on the list, no list or an unknown site, 409 for a key reused on another line, 422 for any other body; repository contract and row mapping; DB: `pick_review` is append-only (42501 on update or delete) and idempotent by user and key. E2E: Yes sends `{ lineId }` with a key and the row reads Checked on site |
| 69 | Unit, API, DB, E2E | API: the site's kinds, `affectedQty` and `same_day` stored; no request is a re-pick and no amount is none; an unknown request, a fractional, negative or too large amount, or an unknown kind is 422; DB: an old-style row reads as a re-pick, the kind, request and amount checks (23514). `reportKinds` order; E2E: the report from a review opens with no kind chosen, the site's kinds first, refuses no kind and 2.5 affected, then sends damaged, 2, same-day |
| 70 | Unit, API, E2E | Domain (`tests/unit/picks.test.ts`): the latest report is open until a strictly later review; a same-instant review or one with an unreadable time closes nothing, and an unreadable report time is never closed; a reported line that also fails the check keeps its label and adds `reported`; reports on another line count for nothing. API: a damaged report makes a matching site not ready, a later review makes it ready; a failed report read rejects (never ready). E2E: the row reads Reported on site with what, how many and what was asked, Picks Not ready, Send the crew locked, the card names it, Yes closes it and Send the crew unlocks |
| 71 | Unit, E2E | `pick-outbox.ts`: a review keeps its type, counts apart from reports, goes to its own address, and an entry of an unknown type is dropped; the waiting and sent wording; E2E: offline Yes waits on the phone with nothing sent, the site screen counts "1 review waiting to send", back online it is sent once with the saved key and a resend is 200 created false |
| 72 | Unit, E2E | `site-filters.ts` (`tests/unit/site-filters.test.ts`): the four choices in order, the status read in any case with a missing, unknown, empty or repeated value as All statuses, clear under Ready, blocked under Shortage, nothing planned, can't check and any unknown status under Unknown (never Ready); E2E: on the projects list Ready shows Cedar Court with a green signal, Shortage the two blocked projects with red ones, Unknown Foundry Lane, All statuses all four, each in the URL with "N of 4 projects"; with stock down Ready and Shortage match nothing and Unknown shows all four; axe, targets, overflow |
| 73 | Unit, E2E | Search trimmed and cut to 100 characters, by name, job ref or address in any case, a project without an address, search and readiness together, the count and no-match wording; E2E: the search's placeholder and limit, by name, job ref and address, nothing matching says so, Reset returns every project with an empty form, an unknown status in the URL is All statuses; axe, targets, overflow |
| 74 | Unit, API, E2E | `travel.ts` (`tests/unit/travel.test.ts`): valid locations (finite, in range, never 0,0), the Google Maps directions URL, the pin colours and the streets style; API: every sample site has a valid `location`, a wrong shape rejects the response, an out-of-range point passes the schema and gets no map. E2E without a token: no map, each card's Directions with its exact URL, a new tab, described by its project, and the nothing-planned card with Directions but no call; with a fake token (maps server): four maps load with a canvas and a pin, a tap on a map opens the directions, and at 375 and 1280px each map sits between its project's name and its signal, with the signal's left edge and width; Mapbox's wordmark is the only target under 48px; axe, targets, overflow |
| 75 | Unit, E2E | The haversine line, distances (metres, one decimal, whole km) and times (at least a minute, hours), every trip line from the phone and from the default address, the default address itself (a valid point, its name and address), the start (the phone only with a fix), the line above the list for every location state, the shown answer kept until the new start's answer arrives, matrix batches of nine and the exact request, and a matrix answer read per project with anything untrustworthy as no route; E2E: before any tap every card is measured from 5 Arawa Street (straight line, no token), and a refused location keeps it and says why; an allowed one gives the phone's straight line with no drive time when there is no token (no request to Mapbox); on the maps server, without the location one matrix request from the default gives each project its drive "from 5 Arawa Street", and a shared location then replaces it with one request from the phone; with the location already allowed, exactly one request from the phone (one from the default may go out first), offline gives the straight line with no new request, and back online the drive again |
| 76 | Unit, build | `publicMapboxToken` keeps only `pk.` tokens; `mapboxTokenForBuild` throws on `sk.`; `next.config.ts` passes the token through that check under a name that is not `NEXT_PUBLIC_`; the page reads it on the server; AC 28's public-name check still passes. Build checks (manual): an `sk.` token fails `next build`; with a `pk.` token the token is in no file of `.next/static` and in the server output only. CI refuses a GitHub secret that is not `pk.` before the build |

A script lists every AC number and fails CI if one has no test referencing it.

## 4. Key unit test groups

**Fail-closed numbers** (added after independent review)
- Negative, `NaN` and `Infinity` mapped quantities give `invalid_quantity` and never `clear`. A bad value cannot cancel another penetration's need.
- Negative, `NaN`, `Infinity` and overflowing stock make the material `unknown`.
- Required overflow throws. Decimal dust: ten balances of 0.1 cover 1, and 4.2 against 5 is short by 0.8.
- Non-finite requirements or offered ratings never produce a candidate.

**Shortage maths**
- Sum across penetrations and materials. Exact match is not a shortage. One unit short is.
- Fractions round up. Zero and very large quantities.
- Multi-location stock summed. A missing location is not zero.

**Status**
- Clear only when no shortage, no blocker, and at least one penetration.
- Wait and escalate never change status.

**Lifecycle**
- Action current while shortfall is no larger than recorded. Earlier when it grows.
- Escalate then wait. Wait then escalate. Several actions in order.

**Normalisation** (one case from a real row each)
- Double space in service type (`0375`).
- Space inside brackets (`0452`, `0479`).
- Space before unit (`0734`).
- Case differences.
- Trailing comma is not stripped. The six incomplete rows are flagged (`0943`).
- Different size formats do not match each other. `0534` and `0535` are not merged.

**Matching** (property-style checks over the real catalogue)
- No candidate ever has a lower integrity or insulation than required.
- A null insulation never satisfies a stated requirement.
- A candidate never shares the nominated code.
- Orientation, substrate, service type and size always equal after normalisation.
- Count of solutions with candidates is exactly 20.

## 4a. API layer verification (added after independent review)

The vitest coverage floor measures only `src/domain`, so the API layer is judged by mutation checks. After the first review, 24 deliberately broken rules survived the suite. The fix round added tests for each, and the orchestrator re-ran the rules as mutants: 13 of 15 were killed, and the 2 survivors were equivalent (the numeric `Content-Length` early reject is an optimisation behind the streaming limit, and the note length is enforced by both the schema and the use case). Contract tests run against the in-memory repository, and against a real Postgres 17 when `TEST_DB_ADMIN_URL` is set. `REQUIRE_DB_CONTRACT=1` and `REQUIRE_BUNDLE_SCAN=1` make a skipped run fail, for CI. A mutation that grants the app role `update, delete` fails the database suite.

## 5. Failure and risk coverage

| Risk | Consequence | Tests |
| --- | --- | --- |
| Missing data read as zero | False clear or false shortage | AC 5, 6, 7, 8, 9 and stock-record-missing unit cases |
| Stale nomination or stale candidates | Wrong substitute saved | AC 23 |
| Over-eager matching | Unsafe substitute suggested | AC 18 to 22, 25 and the property checks |
| Coarse catalogue fields used by mistake | Socket matched as pipe | Unit cases where options match but raw values differ |
| Old action applied to a new shortage | Leader thinks someone is dealing with it | AC 14, 15 |
| Double submit on poor signal | Duplicate escalation | AC 16 |
| Cached "clear" after stock falls | Crew sent without materials | AC 29 |
| Database credentials exposed | Data exposure | AC 28 and secret scan |
| Direct database access without login | Anyone reads or writes | Database test: with the anon role, select and insert both fail |
| Catalogue update changes behaviour silently | Wrong suggestions | AC 25 and 26 fail loudly |
| Upstream shape changes | Wrong numbers | Contract tests |
| Inaccessible controls | Leader cannot act | Axe checks and manual keyboard pass |

Failure paths for every endpoint: invalid body, unknown field, wrong type, missing key, unknown site, upstream error. Each returns the single error shape `{code, message}` and none leaks a stack trace, path or SQL. A test checks the shape and the absence of those strings.

## 6. Test data

- **Catalogue:** the real CSV, unchanged.
- **Sample upstream data:** `data/sample/`, labelled invented. The demo set from `slice-specification.md` section 7.
- **Fixtures for unit tests:** small hand-built objects, so tests do not depend on the sample files.
- **Failure stubs:** each upstream stub can be switched to fail, return empty, or return malformed data for tests.
- **Database:** each test run starts from migrations on a clean schema, and tests clean up their rows.
- No real personal data and no production credentials anywhere in tests.

## 7. CI/CD gates

On every push and pull request, in order:

1. Install with a locked lockfile.
2. Typecheck and lint, including the import-boundary rule.
3. Unit, contract, catalogue and API tests, with coverage.
4. Start a Postgres 17 service, run `db/setup.sql` and the migrations, run the database contract suite with `REQUIRE_DB_CONTRACT=1`.
5. Build, then the client bundle check for credentials.
6. Secret scan and dependency audit.
7. Playwright end-to-end and axe on a dev server (five projects: reads, writes, two stock-failure servers started with `STUB_STOCK_MODE=down` and `malformed`, and a maps server started with a fake public Mapbox token whose spec answers every Mapbox request itself, each with its own build directory; the other servers get an empty token, so no test reaches Mapbox).
8. AC coverage script.
9. On `main` only, after all of the above: deploy to Vercel (`vercel pull`, `build --prod`, then `npm run db:migrate` on the production database, failing closed without `SUPABASE_DB_PASSWORD`, then `deploy --prebuilt --prod`), then `scripts/smoke.mjs` against the production URL (`/api/sites` is 200, `no-store`, four sites; `/` redirects to `/about-this-demo` and renders "Is the crew good to go?", `/sites` renders "Projects"; Cedar Court's pick check reads ready or not ready, never "Can't check picks", which is how a missing migration shows).

Merge to the default branch is blocked on any failure. Deployment to Vercel runs only from a green default branch. After deploy, a smoke run of the end-to-end scenario against the public URL is the evidence of a working deployment.

**Thresholds.** Domain core: at least 95% line and branch coverage. Overall: no fall below the current level. Coverage is a floor, and the AC mapping and property checks are what show the tests mean something.

**Flakiness policy.** No retries on unit, API or database tests. Playwright may retry once, and a retried pass is reported so it can be fixed.

**Local runs.** The same commands run locally. For containers use Podman where Docker is absent. The README documents the commands.

## 8. What this strategy does not prove

- Real upstream behaviour: latency, auth, data quality. Stubs prove the contract shape and the logic only.
- Real user comprehension. Accessibility checks and a keyboard pass do not replace trying it with leaders.
- Compliance of a suggested substitute. Tests show that rules are applied as written, not that the rules are sufficient. That judgement stays with a qualified person.
- Load beyond the stated target, and long-running behaviour.
- Offline use, which is out of scope.

## 9. Reviewing agent-written tests

- Tests are derived from the AC list before implementation, so they cannot be shaped around the code.
- Every new test is checked to fail first against missing or wrong behaviour, then pass.
- A test that only restates the implementation, or asserts a mock, is rejected.
- Corrections to agent output are logged in `submission-checklist.md` as evidence of review.
- Mutation-style spot checks on the matching and shortage code: deliberately break a rule and confirm a test fails.
