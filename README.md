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

Node 22+.

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

CI runs these on every pull request, then deploys `main` to Vercel. Setup:
[`docs/api.md`](docs/api.md) (Configuration), [`.env.example`](.env.example).

## Documentation

1. [Specification](docs/slice-specification.md)
2. [Technical design](docs/technical-design.md)
3. [UI design](docs/ui-design.md)
4. [Test strategy](docs/test-strategy.md)
5. [Agent-assisted approach](docs/agentic-approach.md)
