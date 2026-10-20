# qantum-warehouse-management

A team leader checks that the materials for each planned job are in stock
before sending a crew. For each shortage they wait, escalate, or propose a
substitute for a manager to verify.

[Open the live demo](https://qantum-warehouse-management.vercel.app) ·
[View CI](https://github.com/ChenYilong/qantum-warehouse-management/actions)

## Try it

Sign in as `qantum` / `sdfkjh&_24`. All data is invented; decisions are shared
by every visitor.

1. **Map**: today's verdict, and which crews can go.
2. **Calendar**: each project on its deadline.
3. **Projects**: the full list. Open **Quayside House** to see what is short.
4. Escalate the short sealant, or propose a substitute.
5. Switch **Online** off to see the offline state.

The app never approves a substitute, and never says a crew can go while
anything is short or unknown.

## Run locally

Node 22+. Copy the supplied Ryanfire file to `data/solutions-excerpt.csv`
first; it is not committed.

```bash
npm ci
ACTIONS_STORE=memory npm run dev
```

Open `http://localhost:3000`. No database needed. Optional: set
`MAPBOX_PUBLIC_TOKEN=pk.…` in `.env.local` for maps.

## Verify

```bash
npm run typecheck && npm run lint
npm run test:coverage
npm run check:ac
npm run test:e2e
```

CI runs these on every pull request.

## Deploy

CI deploys `main` to Vercel after every check passes: build, database
migration, deploy, then `scripts/smoke.mjs` on the live URL. Variables:
[`.env.example`](.env.example) and [`docs/api.md`](docs/api.md) (Configuration).

## Sample data

Sites, plans, quantities and stock in `data/sample/` are invented. The
Ryanfire catalogue is used unmodified; CI restores it from a secret and checks
its hash. Details:
[`docs/sample-data-and-stubs.md`](docs/sample-data-and-stubs.md).

## Known limitations

- Demo sign-in only, kept in the browser; the server checks no identity.
- Upstream systems are stubs; stock is shared and not reserved.
- Substitutes are proposals; nothing approves or sends them.
- Offline holds pick reports only, not decisions or screens.

The full list is in [`docs/iteration-plan.md`](docs/iteration-plan.md).

## Documentation

1. [Iteration plan](docs/iteration-plan.md)
2. [Specification](docs/slice-specification.md)
3. [Technical design](docs/technical-design.md) and [UI design](docs/ui-design.md)
4. [Test strategy](docs/test-strategy.md)
5. [Agent-assisted approach](docs/agentic-approach.md) and [`AGENTS.md`](AGENTS.md)
