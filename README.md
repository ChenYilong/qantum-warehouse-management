# qantum-warehouse-management

Pre-departure stock check for passive-fire crews. For every planned job the app
compares required material against warehouse stock; on a shortage the team
leader records wait, escalate, or a substitute proposal that a manager must
verify.

[Live demo](https://qantum-warehouse-management.vercel.app) ·
[CI runs](https://github.com/ChenYilong/qantum-warehouse-management/actions)

## Demo walkthrough

Credentials: `qantum` / `sdfkjh&_24`. Data is fictional, and every visitor
writes to one shared decision log.

1. **Map** gives the verdict for each crew today.
2. **Calendar** places every project on its due date.
3. **Projects** lists everything; open **Quayside House** for its shortages.
4. Raise the sealant shortfall with purchasing, or nominate an alternative.
5. Turn **Online** off to see offline behaviour.

Guarantees: no substitute is ever marked approved, and a crew is never shown
as clear while any material is short or its stock is unknown.

## Local setup

Requires Node 22 or newer. Git does not track the Ryanfire catalogue: place
the supplied file at `data/solutions-excerpt.csv` before starting.

```bash
npm ci
ACTIONS_STORE=memory npm run dev
```

Then browse to `http://localhost:3000`. The memory store needs no database.
For maps, add `MAPBOX_PUBLIC_TOKEN=pk.…` to `.env.local`.

## Checks

```bash
npm run typecheck && npm run lint
npm run test:coverage
npm run check:ac
npm run test:e2e
```

Pull requests run this exact set in CI.

## Delivery

Merges to `main` go to Vercel once all CI jobs are green. The pipeline builds,
applies pending migrations, deploys, and smoke-tests production with
`scripts/smoke.mjs`. Environment variables: [`.env.example`](.env.example);
reference in [`docs/api.md`](docs/api.md), section Configuration.

## Data

`data/sample/` holds fictional sites, plans, per-install quantities and stock. The
catalogue is the supplied file, byte for byte; CI decodes it out of a
repository secret and verifies its SHA-256. Mapping notes:
[`docs/sample-data-and-stubs.md`](docs/sample-data-and-stubs.md).

## Limitations

- Sign-in is a browser-side demo; the API authenticates nobody.
- Sites, nominations and stock come from stubs; stock is pooled, never reserved.
- A substitute stays a proposal: no approval step, no outbound message.
- Offline mode queues pick reports only; decisions and pages are not cached.

Planned follow-up work: [`docs/iteration-plan.md`](docs/iteration-plan.md).

## Docs

1. [Iteration plan](docs/iteration-plan.md)
2. [Specification](docs/slice-specification.md)
3. [Technical design](docs/technical-design.md), [UI design](docs/ui-design.md)
4. [Test strategy](docs/test-strategy.md)
5. [Agent workflow](docs/agentic-approach.md), [`AGENTS.md`](AGENTS.md)
