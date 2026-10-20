# Agent rules for this repository (any tool)

Scope: the team-leader slice of the QAntum take-home. Specs are authoritative; read these before touching code:

- `docs/slice-specification.md`: functional requirements and the numbered acceptance criteria
- `docs/technical-design.md`: architecture, domain rules, schema
- `docs/test-strategy.md`: test layers, AC-to-test mapping, CI gates
- `docs/glossary.md` for domain vocabulary; `docs/catalogue-data-model.md` for the CSV and its oddities

When the code contradicts the spec, halt. Correct the spec, then change the code to match.

## Skills

Skills are pulled from [Skill Forge](https://github.com/more-than-code/skill-forge): `skill-forge.json` lists them, `skf sync` vendors them into `.agents/skills`, and `.claude/skills` only points there. Do not edit vendored skills by hand; edit the profile, sync again, and use `skf sync --check` to detect drift.

## Architecture constraints

- `src/domain/` stays framework-free: no imports from Next.js, React, a DB driver, the file system or any adapter. ESLint blocks violations.
- Each upstream source (site list, nominations, solution materials, stock) is reached through a port in `src/ports/`, implemented in `src/adapters/`. The catalogue CSV has no port: one adapter parses it into a typed map.
- Handlers under `src/app/` do three things only: Zod validation, one use-case call, and mapping failures to `{ code, message }`.
- Persistence is limited to wait, escalate and substitute-proposal records, pick-error reports and on-site reviews. The app treats the catalogue, pick lists, stock, nominations and sites as read-only.

## Safety invariants (never relax)

- Absent or unreachable data is not zero and not "clear"; fail closed. Negative, `NaN` and infinite values count as bad data: the crew is blocked or the stock becomes unknown, and must never offset a requirement or fill a shortfall.
- A substitute is never called compatible or approved. The wording is "catalogue match, not verified", and the status stays `proposed`.
- Compare raw normalised fields when matching substitutes; `substrate_option` and `service_type_option` are off limits.
- Keep trailing commas in substrate values. A truncated substrate produces zero candidates.
- `data/solutions-excerpt.csv` is immutable; its hash is pinned by a test.
- Sample data goes in `data/sample/` only, marked as invented.
- Secrets stay out of code, tests, logs and output, and server credentials out of the browser bundle. Never put a secret behind `NEXT_PUBLIC_`. Only one value ships to the browser on purpose: the Mapbox public token (`MAPBOX_PUBLIC_TOKEN`, `pk.` prefix); an `sk.` token breaks the build (AC 76).

## Workflow

- Derive tests from acceptance criteria and put the AC number in the test name, e.g. `AC 15`. Red first, then green.
- Keep diffs to what the task requires, in the style of the code around them.
- No commits or pushes without a request; `main` needs explicit approval.
- When behaviour changes, update the owning doc in that same change; record significant agent corrections in `docs/submission-checklist.md`.

## Commands

```bash
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run check:ac
npm run build
npm run test:e2e
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
