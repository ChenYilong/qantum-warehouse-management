# Agent workflow

Who wrote what, how each agent was steered, how its output was checked, and where it got corrected. Raw artefacts (briefs, reviews, worker logs, spend) sit in `docs/agent-work/`; corrections are also logged in `docs/submission-checklist.md`.

## Tooling

| Role | Tool | Responsibility |
| --- | --- | --- |
| Orchestrator | Claude Code (models: Sonnet 5.5, then Opus 5.5) | Requirements, specs, briefs, triage, all gate runs, documentation, git, deploy configuration |
| Worker | Grok Build CLI, `grok-4.7-build` (fast variant on three runs, when I asked) | Implementation; separate review sessions |
| Design reviewer | Claude Opus subagent | One pass over the technical design, before coding started |
| Builder, from 18 Oct | Opus 5.5 inside Claude Code, writing code directly; `gh` plus the GitHub MCP server; screenshots through Playwright and chrome-devtools MCP; SonarCloud gate in CI | Phone-feedback iterations covering the connectivity toggle, per-site signal, picking review, maps, daily panel, deadline calendar, tab bar, Guide and colour theme. Each began with new ACs and failing tests and cleared the usual gates |
| Helpers, from 6 Oct | Subagents `validator` and `reviewer` (Sonnet), `Explore`, `bulk-worker` (Haiku) | Running gates, single-angle reviews, searching, mechanical edits. Kept orchestrator context free for decisions; the pre-submission readiness check used them |
| Guidance | `AGENTS.md`, tool-agnostic; 11 skills from [Skill Forge](https://github.com/more-than-code/skill-forge) in `.agents/skills/`: frontend, delegation, Supabase Postgres, Vercel, migrations of data, security, testing, general coding discipline | Loaded by every agent |

I owned product and scope calls: choice of slice, pooled vs reserved stock, wording around substitutes, UI defaults, the choice of database and of Vercel project, plus approval of each commit, push and merge.

## Planning

1. **Spec before implementation.** Glossary, business path, iteration plan, specification, design and test strategy existed and were reviewed before code. Requirement count: 16, then 17 (side menu, materials). AC count: 32 → 34 (walkthrough after first delivery) → 36 (solution fit) → 42 (materials) → 44 (log moved into menu) → 45 (penetration tabs) → 46 (material tabs) → 47 (responsive menu) → 85, with 34 FRs, after the 18–20 Oct phone rounds. Spec wins conflicts: fix it, then the code.
2. **Tiering by blast radius.** Storage and contract changes (HTTP API, Postgres migration) were Tier 3: I had to sign off in writing on a spec that contained the contract diff and rollback steps.
3. **Brief-driven delegation.** Claude wrote one self-contained brief per task, committed to the repo: role, known facts, decisions that are closed, the writable file list, test-first steps, verification commands, honesty rules ("do not claim a command passed unless you ran it"). Grok implemented. Cheap briefs, less rework; the pricier model spent tokens on judgement and verification.
4. **Small increments.** Domain → API → UI → navigation → usability → storage and delivery. No round started until the previous one was accepted and committed.

## Verification ladder

Applied to each worker run, cheapest step first:

1. Run metadata: why it stopped, turns, spend, actual model, failed tool calls.
2. Scope: `git status`/checksum diff versus the allowed file list. Extra files = finding.
3. Worker's own notes: where it deviated, and anything it left unchecked.
4. Gates re-run by the orchestrator itself, never trusted from the worker: typecheck, lint, coverage, AC gate, build, Playwright + axe, DB contract tests, audit, secret scan.
5. Mutation probes: deliberately break a rule and confirm a test fails (granting `update, delete` to the app role must break the contract suite).
6. Independent review: per large round, three new sessions without write access, one each for spec compliance, tests, and code (security and a11y included). No session reviewed code it wrote.
7. Hands-on product check: phone-width UI, light and dark; production after each deploy, including one write that must survive a redeploy.

## Corrections and rejections

- **Fail-open arithmetic.** Domain code let a negative or NaN quantity cancel demand elsewhere, which could mark a crew clear incorrectly. Caught in review. Fix: `invalid_quantity` blocker; malformed stock treated as unknown.
- **Idempotency order.** Business-rule validation ran before key lookup: retrying once the shortage had cleared returned 404, and reusing a key could silently lose a decision. Now: key lookup first; 409 if the same key arrives for another target.
- **Unexecuted tests.** The UI worker reported full coverage while its Playwright suite had never launched (no Chromium in its sandbox). Once run, the suite exposed separate in-memory stores for pages vs API routes, so escalations disappeared.
- **Our spec was wrong.** It said 24 solutions have substitutes. Recomputed with the design rules: 20. Fixed pre-dispatch.
- **Reverted layout change.** A worker introduced an inner scrolling container for the page body, saying the sticky footer required one. Measured in a browser: not needed, and it broke scroll restore on back. Reverted.
- **Usability issues invisible to tests.** All gates and reviews green, yet a walkthrough against the brief's question ("can a team leader understand the information and act?") found penetration rows that looked identical, substitution two screens down, an unexplained "Rating 60/30", and stale stock (2 days) without a warning. One round dedicated to fixing these.
- **Spec gap after delivery.** Live check: substitute `0451` read "Materials in stock" despite needing sealant, the very material short on that site. The requirement only asked whether materials are in stock; the code compared a single install against raw stock. AC 33 was clarified, then the implementation.
- **Orchestrator mistakes.** Edited docs in a live worker's worktree (they were rolled back by the worker as unexplained edits); pushed to a PR that had merged minutes earlier. Both now rules in `tasks/lessons.md`.
- **Bad expected value.** Haversine test asserted 1784 m from a mental estimate; independent computation says 1759 m. Test fixed; expected values are now derived outside the code under test.
- **CI-only failure.** Calendar spec green locally, red in CI (UTC runner). Spec now pins `Pacific/Auckland`.
- **Vendor constraints.** 48px target check flagged the Mapbox logo, which Mapbox requires; the check now ignores Mapbox-owned controls. SonarCloud blocked twice: S6505 (`npx vercel` may execute install scripts) → global install with `--ignore-scripts`; S1082 (mouse-only handler on the map) → an anchor element layered over it.
- **Unrequested lockfile churn.** Adding a single dependency made npm rewrite 120 `libc` entries. Reverted to only the new package; confirmed via `npm ci`.
- **Declined, with reasons.** Resolving the CSV relative to the module (fails after bundling). `server-only` (extra dependency; noted for production). A common form wrapper for dialogs and refetching when the tab regains focus (reasonable, out of scope).

## My overrides

Agents suggested, I chose. Reasons are recorded per case in `docs/submission-checklist.md` §3. Typical shape: a reasonable generic default from the AI, changed once I used the app on a phone as a leader would.

- **Navigation.** Original design: demo bar on top, full-width Back, site code without a label. After phone testing: demo label at the bottom, title in the header, chevron back row underneath, code labelled.
- **Reviews.** Rather than the proposed swarm of reviewer subagents, I wrote up my own findings; quicker and more specific.
- **Model choice.** One worker run defaulted to the fast model; I halted it. Rule since then: standard model unless I ask for fast.
- **What screens show.** Site reference dropped from cards (site screen only, as "Job ref"). Permanent demo bar replaced by an explanatory landing page. The AI pointed out deep links skip that page, so a small Demo tag stayed in headers for a time; removed later as clutter.
- **Material page vs pooled stock.** I questioned Wait/Escalate on the material page (work is per penetration) and the missing site name (stock is pooled). The AI was right about the buttons: shortages are keyed by site + material, one escalation covers every affected penetration, so the buttons remained with an explicit scope; the site name was added to the heading and to the demand line. I vetoed linking each place to its penetration (circular navigation); places remain grouped plain text, linking once to the site list.
- **Decision log.** Taken out of the header (ambiguous context) into the side menu, with a latest-decision popover per acted row. Next: icons per entity, the site heading pinned while scrolling, and back controls leading to the log instead of the page's parent. Then: chips reduced to icons, popover removed, a penetration's decisions moved to its own Actions log tab, the same tabs added to the material page, state labels removed for one consistent design, row counts include proposals, and "Acted" includes proposals too.
- **Responsive menu.** Off-canvas drawer at all widths → drawer on phones, expanded collapsible side menu on wider screens. About page moved off `/` to `/about-this-demo` (root redirects) and linked to this repo. The skills point at [Skill Forge](https://github.com/more-than-code/skill-forge), a skill registry I maintain.
- **18–20 Oct phone rounds.** Requested by me: a connectivity toggle that never scrolls away; one large per-site signal that dials the operator; an on-site check of every picked item; per-project map with directions and drive time from a fallback origin (shown only as "Auckland city warehouse", keeping the street private) until the device shares location; daily verdict with tabs, plus a deadline calendar; tabs ordered Map, Calendar, Projects, Guide; a back control that goes to wherever the user came from; the Guide as a plain-English brochure; panels in company black/yellow. Where scope was unclear the agent asked first. Example: Map and Calendar were stripped down to a single panel each, and I picked keeping the header, the picker line and the bottom navigation.

## Spend

≈ $39 of worker usage across 13 implementation runs and 9 reviews; breakdown per run in `docs/agent-work/README.md`.

## Lessons

Run browser suites in my own shell starting with UI round one; never accept "written, not run". Do the user-question walkthrough of the screens ahead of code review, not after it; that walkthrough yielded the best fixes.
