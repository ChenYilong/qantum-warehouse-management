# qantum-warehouse-management


languages
TypeScript
93.9%
CSS
3.4%
JavaScript
1.8%
Shell
0.9%
Before sending a crew to site, a team leader checks whether the materials for the planned penetrations are in stock. For each shortage they record a decision: **wait**, **escalate** to purchasing or the warehouse, or **propose a substitute** solution from the catalogue for a manager to verify. The app never approves a substitute and never says the crew can go while anything is short or unknown.

- **Live:** https://qantum-warehouse-management.vercel.app (best on a phone-width window)
- **Pipeline:** [GitHub Actions](https://github.com/ChenYilong/qantum-warehouse-management/actions), e.g. [the latest green run on main](https://github.com/ChenYilong/qantum-warehouse-management/actions/runs/38689725716)

## Try it (about two minutes)

The live demo uses invented sample data and a demo sign-in (below), checked against no server. Decisions are stored in Postgres and shared by everyone who visits, so some may already be recorded. The first page explains this.


**Sign in.** The first visit shows a sign-in. Sign in with username `qantum` and password `sdfkjh&_24`, and choose a role (Team leader or Operator). It is a demo sign-in: nothing is sent to a server, the browser keeps who you are, and Sign out is at the top of the Guide.

1. **Map, Calendar and Projects** (the tab bar, in that order; Projects is `/sites`). Each starts with Use my location under the picker's line. Opening `/sites` starts a visit on Map, the first tab; Projects then shows the list. **Calendar** holds the deadline calendar: the verdict and tabs, From and To dates (today to the end of the year unless you change them), and a month with each project on its deadline as a small copy of its signal; tap one to see its card under the calendar. On **Map**, today's verdict reads "2 of 3 crews can't go yet", with tabs All 4, Blocked 2, Crew can go 1 and Other 1 inside it; the map under it shows the chosen tab's projects (All shows every one), and right under the map is the chosen project's card, the same card as in the list. Tap a pin to change it. Every card ends with its deadline, for example "Deadline · Fri 23 Oct 2026". Quayside House and Northgate Depot are blocked, and the chip says why. Cedar Court can go. Foundry Lane Annex has nothing planned. Under each card's name (and its map, step 11) is a big switch: green "Crew can go", red "Blocked", grey "Nothing planned", amber "Can't check". The colour is never alone: the knob's shape, side and mark say the state as well. Tapping the switch calls the site's operator, and Text operator and Call operator stay as buttons (prepared messages; the sample numbers reach no one). A blocked site's text tells its operator that parts are not complete, and what is short, so nobody travels for nothing; Sort out shortages opens its decisions. At the top, filter the list by Readiness (Ready, Shortage or Unknown) or search it by name, job ref or address; the filter stays in the URL, for example `/sites?status=shortage`.
2. **Quayside House.** It opens with Needs your decision: each short material with its figure and unit, "4 penetrations affected" as a link to them, Wait and Escalate right there, what each option does, what is covered, and the picker and operator to call. The page then lists 12 penetrations across 5 solutions. There is no blocked banner. The Shortages chip counts penetrations (12 here, because every opening uses the short sealant), which is not the same unit as the sites-list chip ("2 shortages"). Each of those openings also says so on its row. Stock figures are labelled "on hand, shared, not reserved", with their age and a warning when they are more than a day old (always, in the demo: the sample stock is dated 3 Oct 2026).
3. **Open the sealant.** Open an `L3, Riser 2` row and tap its line "Short material: Intumescent sealant … · this site short 2 of 10". The sealant's page opens at Quayside House's section. Escalate it to Purchasing with a note. The sealant's Decisions tab shows it. Back returns to the penetration. On the Sites list Quayside House is still Blocked, because a decision records intent, it does not create stock.
4. **On that `L3, Riser 2` penetration** (solution `0438`), candidates `0451` and `0464` are shown with their fire rating, whether they meet the required rating, and stock. Every candidate is "Catalogue match, not verified", and `0451` warns that it uses sealant, which this site is already short of. **Propose `0451`** with a reason anyway: a manager decides.
5. **Back on Quayside House**, open the `L5, Plant room` row (solution `0344`): no catalogue match. The shortage is decided on the sealant's page.
6. **Northgate Depot.** One penetration has no stock record ("stock unknown", at L2, Plant room). The Data problems chip counts 4: a solution code missing from the catalogue, a solution with no materials recorded, and two nominated solutions that do not fit (L1, Stair core: substrate cut off in the catalogue; L1, Riser 1: insulation too low). Open either to see the side-by-side comparison, and escalate a data problem from that penetration.
7. **Decisions**, from the menu on the Sites list: every site's decisions and proposals with time and author, and whether each still applies. On a site's list, rows mark escalated and waiting penetrations; each penetration page has its own Decisions tab.
8. **Offline.** The Online switch sits at the top right of every screen and stays there while you scroll; the line under it shows the picker's last action. Switch it off to work offline: the switch turns red and says Offline with when the phone last heard from the server, a banner at the foot says how old the screen is, decisions are not sent, and Offline details has Sync now with the last sync time.
9. **Materials**, from the menu on the Sites list. Each material against the one shared stock, across sites. The pipe collar shows 2 on hand against 6 planned across sites, short at one site: Cedar Court on its own is not short, but the sites together need more than there is.
10. **Review on site.** On Cedar Court, under Materials · planned vs picked, every line has its own Review beside its label, the lines that match the plan too: the warehouse can mark a line right and the site still find it wrong. Review the pipe collar and tap **No, something's wrong**, then say what the site found (Damaged, 2 affected, Same-day delivery) and send it. Back on the site the line reads Reported on site with what was found, Picks says Not ready and Send the crew is locked. Review it again and tap **Yes, it's right**: the picks match the plan again and the line reads Checked on site. Offline, Yes waits on the phone like a report and sends itself once you are back online.
11. **Maps.** Each project ends with Directions, which opens Google Maps from where your phone is to the project. Each project says how far it is and how long the drive takes from 5 Arawa Street, Grafton, the demo's default start ("2.3 km · 7 min drive from 5 Arawa Street"). Tap "Use my location" and allow it: the distances then start from your phone ("12.3 km · 18 min drive"). Without a route it gives the straight line. With a Mapbox token set, each card also shows a map of the project under its name, as wide as the switch below it; tap it for the same directions.

## Run locally

Needs Node 22 or later.

```bash
npm ci
ACTIONS_STORE=memory npm run dev
```

Open http://localhost:3000. Decisions are kept in memory and reset when the server restarts. No database or credentials are needed. For the project maps, put a public Mapbox token in `.env.local` (`MAPBOX_PUBLIC_TOKEN=pk.…`) and restart; without one there are no maps and everything else works. To see the failure state, restart with `STUB_STOCK_MODE=down`: every site shows "Can't check", never "Crew can go".

## Tests

```bash
npm run typecheck
npm run lint
npm run test:coverage   # unit and API tests; 95% coverage gate on src/domain, pure src/ui modules, the decision client and the Postgres config
npm run check:ac        # every acceptance criterion in the spec is referenced by a test
npm run test:e2e        # Playwright at 375px with axe in light and dark (run `npx playwright install chromium` once)
```

Database contract tests need a Postgres 17 you can create databases on, for example `podman run -d -p 127.0.0.1:55432:5432 -e POSTGRES_PASSWORD=localtest postgres:17`:

```bash
TEST_DB_ADMIN_URL=postgres://postgres:localtest@127.0.0.1:55432/postgres REQUIRE_DB_CONTRACT=1 npm run test:db
```

They check idempotent writes, ordering and constraints against a real database, and that the app's role cannot update, delete or create tables. CI runs all of the above on every pull request. The strategy is in `docs/test-strategy.md`.

## Deploy

CI deploys `main` to Vercel after the checks, database and browser jobs pass: it builds, applies any new migration to the production database, deploys, then runs `scripts/smoke.mjs` against the production URL. The setup, done once:

1. **Database.** A database `qantum_slice` on an existing Supabase Postgres server, reached as plain Postgres through the transaction pooler. Supabase Auth and the Data API are not used. As the Supabase admin, through the session pooler (port 5432):
   ```bash
   psql "postgresql://postgres.<project-ref>@<pooler-host>:5432/postgres?sslmode=require" -v app_password='<new password>' -f db/setup.sql
   DB_HOST=<pooler-host> DB_PORT=5432 DB_USER=postgres.<project-ref> DB_PASSWORD=<admin password> DB_NAME=qantum_slice DB_SSL=require npm run db:migrate
   ```
   Type passwords at prompts or read them from a password manager. Do not leave them in shell history.
2. **Vercel project** (framework Next.js, region `syd1` from `vercel.json`) with `ACTIONS_STORE=postgres`, `DB_HOST`, `DB_PORT=6543`, `DB_USER=qantum_slice.<project-ref>`, `DB_NAME=qantum_slice`, `DB_SSL=require`, `DB_POOL_MAX=1`, and `DB_PASSWORD` as a sensitive variable.
3. **GitHub:** secret `VERCEL_TOKEN`; variables `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `PRODUCTION_URL`; and in the `production` environment the secret `SUPABASE_DB_PASSWORD`, the Supabase database (admin) password, which CI uses only to migrate. Set it with `gh secret set SUPABASE_DB_PASSWORD --env production` and paste it at the prompt. For the project maps, the secret `MAPBOX_PUBLIC_TOKEN`: a **public** Mapbox token (`pk.`) created at account.mapbox.com → Tokens with the default public scopes and URL restrictions for the production URL and `http://localhost:3000`. Set it with `gh secret set MAPBOX_PUBLIC_TOKEN`. CI checks it is public, then bakes it into the build; without it the deploy has no maps, and a secret token (`sk.`) stops the deploy.

Schema changes ship as new files in `db/migrations/`; the latest, `0003_site_review.sql`, adds the reviews on site and the site's report fields. CI applies them on every deploy from `main`, after the build and before `vercel deploy`: `npm run db:migrate` as `postgres.<project-ref>` through the session pooler (port 5432), with the host, project ref and database read from the Vercel production settings it has just pulled (the repository or environment variables `MIGRATION_DB_HOST` and `MIGRATION_DB_USER` override them). It applies only the files not yet recorded in `schema_migrations`, since the app's role cannot change the schema itself. It fails closed: without the secret, or if a migration fails, nothing is deployed. Because the migration runs before the new version goes live, a migration must only add (tables, columns with defaults, wider checks), never drop or rename what the live version uses.

Every runtime variable of the app is listed in `.env.example` and explained in `docs/api.md` (Configuration). The test and CI variables above (`TEST_DB_ADMIN_URL`, `REQUIRE_DB_CONTRACT`, `PRODUCTION_URL`, `VERCEL_*`, `SUPABASE_DB_PASSWORD`, `MIGRATION_DB_*`) are not, and `MAPBOX_PUBLIC_TOKEN` is listed there with how to set it.

## Sample data

Everything in `data/sample/` is invented and labelled so: four sites (with their deadlines), their planned penetrations and nominated solutions, material quantities per solution, and stock balances. It stands in for systems this slice does not own. The catalogue `data/solutions-excerpt.csv` is the supplied Ryanfire excerpt, unmodified (a test pins its hash). The mappings and assumptions are in `docs/sample-data-and-stubs.md` and `docs/catalogue-data-model.md`.

## Known limitations

- **No login.** One demo identity records every decision, and anyone with the URL can add one. Production would use QAntum's existing sign-in and a site-membership check.
- **Upstream systems are stubs.** Sites, nominations, material quantities and stock come from the sample files, behind ports that a real client would replace.
- **Stock is shared and not reserved.** Two sites can both read the same units as available. The screens say so.
- **Substitutes are suggestions only.** A catalogue match is not proof of compliance. Proposals are recorded for a manager; there is no approval workflow, and nothing is sent to anyone automatically.
- **Database TLS encrypts but does not authenticate the server** (`require`), because the Supabase pooler's chain is not in Node's trust store. `verify-full` with a CA bundle is supported.
- **Idempotent repeats are not compared.** A repeat request with the same key and target but a different note or reason returns the original record unchanged.
- **Offline is the connection state only.** The app shows whether it can reach the server and holds its own sends while offline; it does not cache screens or queue decisions for later.
- **Not built:** offline data and queued decisions, crew scheduling and work dates (so no decision deadline yet), rate limiting, editing a recorded decision, a separate escalation route for data problems, field reports with photos, and login.

## How it is built

Next.js 16 server components and route handlers on Vercel, a pure TypeScript domain core, and Postgres for the decisions only. More detail:

| Document | What it covers |
| --- | --- |
| [`docs/iteration-plan.md`](docs/iteration-plan.md) | Why this slice, and the iterations after it |
| [`docs/slice-specification.md`](docs/slice-specification.md) | Requirements, 57 acceptance criteria, assumptions, exclusions |
| [`docs/technical-design.md`](docs/technical-design.md) | Architecture, domain rules, data model, trade-offs |
| [`docs/ui-design.md`](docs/ui-design.md) | Screens, copy, states and accessibility |
| [`docs/api.md`](docs/api.md) | HTTP API, errors, idempotency, configuration |
| [`docs/test-strategy.md`](docs/test-strategy.md) | Test layers, acceptance-criteria mapping, CI gates |
| [`docs/glossary.md`](docs/glossary.md) | Business terms (penetration, integrity, insulation, nominated solution) |
| [`docs/agentic-approach.md`](docs/agentic-approach.md) | How coding agents were used, directed and checked |
| [`AGENTS.md`](AGENTS.md), [`.agents/skills/`](.agents/skills/), [`docs/agent-work/`](docs/agent-work/) | The instructions and skills given to the agents (skills from [Skill Forge](https://github.com/more-than-code/skill-forge)), every brief, review and worker note |
| [`docs/submission-checklist.md`](docs/submission-checklist.md) | Submission items with evidence |
