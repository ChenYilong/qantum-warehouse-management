# UI design

Proposed defaults for the screens and the actions log. Status: **approved 2026-10-04**. Requirements are in `slice-specification.md` (FR1 to FR17, AC 30 to 47), the API in `api.md`, terms in `glossary.md`. The screens were drawn for review in the conversation that produced this file.

## 1. Who and where

A team leader checks a site before the crew leaves, usually on a phone in a van or on site: one hand, bright light, maybe gloves. So: large targets, high contrast, plain words, one decision per screen.

## 2. Defaults

| Topic | Proposed default | Why |
| --- | --- | --- |
| Visual direction | Plain and utilitarian, neutral surfaces, no brand identity | We have no QAntum brand assets. A tool for the field should not compete with the information |
| Theme | System by default: light, or dark when the device prefers it (`prefers-color-scheme`). The Guide's last section, "On this device", holds the Theme choice (System, Light, Dark) on one slim row: the label on the left and a compact segmented radio group on the right, each radio's tap area 48px tall around a 32px pill; Light or Dark pins `data-theme` on `<html>` and is remembered in this browser only (`team-leader:theme`; with the connection's `team-leader:last-synced`, `team-leader:work-offline` in session storage, the demo sign-in's `team-leader:user`, `role`, `signed-in` and `accounts`, and the pick-report outbox, the app's only browser storage), stamped by a head script before first paint so a dark page never flashes light | Both must pass contrast |
| Status | Icon plus text plus colour, never colour alone. Clear (green, check), Blocked (red, stop sign: an octagon with a bar), Nothing planned (grey, dashed circle), Unavailable (amber, warning) | AC 30, and glare |
| Typography | System font stack, 18px body text (16px until the field use round, section 10), nothing under 12px | No font download, works offline of the network; read at arm's length in glare |
| Layout | Single column. Max width 720px, centred. Fits 375px with no horizontal scroll | AC 32 |
| Targets | At least 48px high and wide for anything tappable (44px until the field use round) | AC 31, gloves |
| Motion | None needed. Respect `prefers-reduced-motion` | |
| Demo honesty | A landing page at `/about-this-demo` (`/` redirects there) ("Ready to send the crew?") explains the demo once: sample data, no login, shared decisions, nothing sent, a link to the GitHub repository (source, specs and the agent work), and a five-step walkthrough. No screen carries a Demo tag (removed at the user's request, 2026-10-06) | One explanation in one place; the working screens stay uncluttered |
| Navigation | A slim nav header, one row, that sticks to the top of every screen while the page scrolls: the back control (a chevron and the name of the screen it returns to, "‹ Projects", "‹ Quayside House, Levels 3 to 5", cut with an ellipsis when long, at least 44 high, accessible name "Back to <name>") on the left and the Online switch on the right (section 9, "Header round"). The landing page and the three top-level pages, Projects, Inventory and Decisions, have no back control (never both): their header holds "Team leader" (or "Hi, <username>") and the Online switch, and a tab bar fixed to the foot of the screen (the navigation named Main) holds Projects, Inventory, Decisions and Guide, each an icon over its label, the open page marked in the link colour; each tab at least 48 high, above the device's safe area; the page is padded by the bar's height so the last row and the offline banner sit above it. Inner screens have no tab bar. Wide screens look as a phone does: the header spans the window, the tab bar's entries sit in the page's 45rem column, and there is no side menu (removed in the header round). The page title is the page's one `h1`, first in `main`, shown in full and wrapping (on the projects list it is visually hidden while today's panel leads, section 15). When the screen the back control names is the one underneath, the control pops that history entry, so the page returns at once instead of loading again; opened directly, or from another screen, it follows the link. No other transition animation | A slim bar leaves room for the work while scrolling, and a site name is never cut, so two similar sites cannot look alike |
| Styling tech | CSS Modules and CSS custom properties. **No new dependencies** (no Tailwind, no component library) | Small app, nothing to justify a dependency. Tokens give one place for colours |
| Rendering | Next.js server components for pages, small client islands only for dialogs, forms and the back control | Less client code, no loading flicker, nothing secret in the browser |
| Data in pages | Server components call the application use cases through the composition root directly, not over HTTP | No self-request, faster, one fewer failure mode. Writes from the browser go through the real `/api` routes, so the API is still exercised end to end |

## 3. Routes and screens

| Route | Screen | Content |
| --- | --- | --- |
| `/about-this-demo` (`/` redirects) | Guide | Header with "Team leader" and the Online switch; the tab bar marks Guide. Sign out at the top, then what the app is for, what is invented, a link to the GitHub repository, "Finding your way" (the tab bar and its pages, the back control, the Online switch, filter chips and decision chips), the two-minute walkthrough, and last "On this device" with the Theme choice. The pages it names are inline links (Projects, Inventory, Decisions, Quayside House, L3, Riser 2, Northgate Depot filtered to data problems). No Demo tag (this is the page the menu links to) |
| `/sites` | Sites | Header with "Team leader" and the Online switch. At the top, today's panel (section 15): the verdict with its bar and tabs, the chosen tab's map of pins and the drawer. Then "All projects": the filter and one card per site, each ending with its deadline ("Deadline · Fri 23 Oct 2026", section 16) with its name (a link to the site), the big signal (a green, red, amber or grey I/O switch; a tap calls the operator, AC 52 to 54), what a blocked site is short of, the operator row (Text operator and Call operator, AC 55) and, on a blocked site, Sort out shortages (or Check data problems). A site that can't be checked has the amber signal, which checks again when tapped (AC 49, section 11) |
| `/materials` | Materials | Header with the menu control. "On hand, shared, not reserved", the stock age, a warning when any site could not be checked, then one row per material any site plans to use, by name, marked with the material kind icon: the on-hand amount and every site's need added up ("On hand 2 · planned across sites 6"; with stock unknown only the need, and a "Stock unknown · needed at N sites" chip), then "Short at N sites" (danger chip), or "N sites couldn't be checked" (warning), or "Sites together need more than on hand" (warning, when no site is short alone but the shared stock does not cover them all), or "Not short at any site" as plain text. Each row opens the material page. The total is left out when a site could not be checked; the banner then says "1 site couldn't be checked. Its needs are not counted.", and an empty list says "No materials planned at the sites that could be checked." With no stock read (nothing planned), the stock notice and age are not shown. If the stock cannot be read: "Can't check stock right now. Don't assume any material is in stock. Try again." |
| `/materials/[materialId]` | Material (title: its name) | Two tabs under the title, as on the penetration page: Stock (default) and Decisions (`?tab=log`, keeping `from` and `fromLog`). Decisions: every site's waits and escalations on this material, newest first, each with "At {site}" and no link; a count only when every site was read; an unreadable site is named in a warning; none readable: "We can't load this material's actions right now. Try again shortly."; empty: "Nothing recorded for this material yet." Stock tab: header with the back control: "‹ L3, Riser 2" when opened from that penetration's shortage line (`?from=<penetration>`, checked against the sites that plan the material), otherwise "‹ Materials". "On hand, shared, not reserved", the on-hand amount against the across-sites need, the stock age and stale warning, then one section per site that plans the material (`#site-<id>`), in site order: the site name, with the site icon, as a link up to the site (`?fromMaterial=` so that site's back control returns here), then "Needs 4, short 2" (danger), "Needs 1, stock unknown" (warning) or "Needs 2, not short for this site alone" (text), the places as text with the penetration icon and identical ones grouped ("L3, Riser 2 · PEX Pipe Ø25mm ×4"), and, only where the site is short, "For all N penetrations at this site", the "Earlier decision, shortfall has grown" warning when it applies, Wait and Escalate (no Waiting or Escalated label; the decisions are on the Decisions tab) (accessible names name the material and the site). A site that could not be checked comes last and says so. A material no site plans is not found |
| `/sites/[id]` | Site | Header with back link (to Sites, or to the material page when opened with `?fromMaterial=`) Job ref and the planned work as text ("Job ref QH-345" then "12 penetrations, 5 solutions"). The big signal comes next and replaces the banner: "Crew can go" in green, "Blocked · 2 shortages" in red, "Nothing planned for this site" in grey (AC 52, section 11), then the operator row (AC 55). A site that can't be checked has no signal; it keeps its warning banner and Try again. A blocked site has no summary banner; after the signal it opens with the Needs your decision panel (AC 50, section 10). Then the stock notice and stock age (hidden when nothing is planned), then a "Penetrations" heading with the total number of planned penetrations, then filter chips (Shortages, Data problems, Acted), which stick directly under the header while the list scrolls. The heading counts the whole list; the chips count subsets. Acted is a wait, an escalation or a proposed substitute. `?show=escalated` and `?show=waited` still select it. Each chip counts penetrations and toggles `?show=` (more than one is a union; none shows the whole list). The list is every planned penetration, one row each in place order. A row starts with the penetration icon and links to its substitutes and shows icon marks, inside the link, for the kind of each problem (Unknown solution, Doesn't fit, No materials, Invalid quantity, Short material, Stock unknown) and then the decisions in its Decisions (Escalated, Waiting, Proposed substitute with a swap icon in neutral), in their tone colours. A problem shows its count when it repeats; a decision always shows its count, and the three add up to the penetration's Decisions tab. If the log cannot be read, rows show problems only, under "Can't check decisions right now. Rows don't show them." Each mark's full wording ("Short material × 2", "Escalated") is its hidden label and its hover title; the marks are not controls; the penetration page carries the reason, the figures and the links to material pages. No ready marks. `?material=` narrows to one shortage and can be combined with the chips. An empty chip result says "No penetrations match these filters." |
| `/sites/[id]/data-problems` | Redirect | To `/sites/[id]?show=data-problems` |
| `/sites/[id]/penetrations` | Redirect | To the site page, keeping `?material=` |
| `/sites/[id]/penetrations/[pid]` | Penetration (title: the place) | Same header. Under the title, two tabs as links: Solution (default) and Decisions with a count (`?tab=log`; they keep `fromLog`). The tab bar splits the width in two over one rule; the current tab is underlined in the link colour, with its count tinted, and the panel below has no second rule. Decisions: this penetration's decisions and proposals, newest first, as in `/actions`; a material decision whose shortage is current adds "Applies to all N penetrations at this site" and opens the material page with `?from=` (back returns to the tab); data-problem decisions and proposals have no link; empty: "Nothing recorded for this penetration yet."; unreadable: no count and "We can't load this penetration's actions right now. Try again shortly." Solution tab: nominated solution: its data-problem and shortage status lines (a shortage reads "Short material: <name> · this site short 2 of 4", or "Stock unknown: <name> · this site needs 1", and links to the material page at this site's section with `?from=` this penetration; a substitute's line links the same way only when the site is already short of that material), then the penetration and the solution side by side with any field that does not fit marked (AC 36). Substitutes: the "Catalogue match, not verified" notice, then one candidate at a time (short-material lines, comparison table) and "Propose this". When more than one candidate exists, a "Select candidate" menu (a styled native select; the closed control shows the solution shield and "Solution 0451") is the title and switches candidate. A single candidate keeps the "Solution {code}" heading with the shield. Or the reason there are none. A data problem offers Escalate here, including when candidates exist. A material shortage is decided on its stock page |
| `/sites/[id]/materials/[materialId]` | Redirect | To `/materials/[materialId]#site-<id>` (AC 41) |
| `/actions` | Decisions | Header with the menu control. One section per site in site order (`#site-<id>`), headed by the site icon and name as a link to the site, which sticks under the header while that site's entries scroll; inside, "Recorded actions" then "Proposed substitutes", newest first, or "Nothing recorded for this site yet." A site whose log cannot be read says "We can't check this site's actions right now."; with none readable the page says "We can't load the actions log right now. Try again shortly." A material decision opens the material page at that site's section, a data-problem decision or proposal opens its penetration, a resolved decision has no link. Every link out carries `?fromLog=<site>`, so the opened page's back control reads "‹ Decisions" and returns to `/actions#site-<id>`, popping the log when it is the page underneath; the site page's filter chips keep it |
| `/sites/[id]/actions` | Redirect | To `/actions#site-<id>` |

There is also a not-found page and one error page with a retry link. All data pages are dynamic (never cached on the server). Moving from one screen to another keeps the page you are on until the next one is ready; there is no full-page Loading screen in between. A short-material link prefetches its material page. The landing page has no data and is static.

### Site readiness banner

| Crew status | Banner text | Icon |
| --- | --- | --- |
| clear | Crew can go. Since the signal round it is the label of the green signal, not a banner (AC 52) | circle with a tick, knob right |
| blocked | No banner on the site screen. The row lines are the status. The red signal and the sites list say "Blocked" and name the shortage and data-problem counts. | stop sign, on the signal, the sites list and each row |
| nothing_planned | Nothing planned for this site, the label of the grey signal | dashed ring |
| API 502 | Can't check this site right now. Don't assume it's clear. Try again. | warning |

### Shortage (a site's section on the material page)

The site name, `Needs X, short Z unit` (or `Needs X, stock unknown`), the places that use it with identical ones grouped, "For all N penetrations at this site", the warning "Earlier decision, shortfall has grown" when an action is not current (no Waiting or Escalated label: the decisions are on the Actions log tab), and two buttons: Wait and Escalate. On the penetration page the same shortage is one line, "Short material: <name> · this site short Z of X", linking here.

### Data problem (on the penetration page)

Plain reason: "Solution code 9999 isn't in the catalogue", "No materials recorded for solution 0393", "A material quantity is invalid for solution NNNN", "Solution NNNN doesn't fit this penetration: <fields>". Only an Escalate button (a wait makes no sense here). Its decisions are on the penetration's Actions log tab.

### Decisions

- **Wait:** a small dialog with an optional note and the line "This does not release the crew."
- **Escalate:** a dialog with Purchasing or Warehouse (required, no default pre-chosen would cost taps, so Purchasing is preselected), an optional note with a character count out of 500, and the same line about the crew.
- **Propose a substitute:** a dialog with a required reason (1 to 500 characters after trimming) and the notice that a manager has to verify the match.
- Dialogs use the native `<dialog>` element, so focus is trapped and Escape closes.
- While submitting, the primary button shows "Sending…" and is disabled. The idempotency key is generated when the dialog opens, so a double tap or a retry reuses it.
- On success the dialog closes, the page refreshes, and a polite live region says "Escalation recorded" (or the equivalent). On a replay (200) it says "Already recorded".

### Empty and error states

| Situation | Message |
| --- | --- |
| No candidates (`ok`, empty) | With a data problem on the penetration: "No catalogue match for this penetration. Escalate instead." and an Escalate action. Otherwise (including a shortage, which is decided on its material page): "No catalogue match for this penetration." only, because there is nothing the API could escalate |
| `substrate_incomplete` | The catalogue entry for this substrate is incomplete, so we can't suggest substitutes. With a related data problem (pen-c-01), an Escalate action too. |
| `nominated_code_unknown` | The nominated solution isn't in the catalogue, so we can't suggest substitutes. |
| Candidate availability `no_material_mapping` | We can't tell if its materials are in stock. |
| Candidate availability `unknown` | No stock record for one of its materials. |
| Candidate availability `short` | Uses a material this site is short of. |
| Candidate availability `invalid_quantity` | Its material quantities look invalid. |
| Sites list empty | No sites to show. |
| Site `unavailable` in the list | Can't check |
| No actions yet | Nothing recorded for this site yet. |

### API error to message

| Code | Message shown |
| --- | --- |
| `validation_failed` | Check the highlighted fields. |
| `payload_too_large` | That's too long. Shorten it. |
| `shortage_not_found` | That shortage no longer exists. Refresh to see the latest. |
| `stale_nomination` | This penetration's nomination has changed. Refresh and try again. |
| `not_a_candidate` | That solution is no longer a candidate. Refresh and try again. |
| `idempotency_key_reused` | Something went wrong sending that. Close this and try again. |
| `upstream_unavailable`, `upstream_invalid` | A system we depend on isn't available. Nothing was recorded. Try again. |
| anything else | Something went wrong. Nothing was recorded. |

No raw error text from the server is ever shown.

## 4. Copy rules

Plain words, sentence case, no exclamation marks, no "please", no "successfully". Verb-first buttons: Wait, Escalate, Propose this, Send escalation, Cancel. The only fixed wordings from the API are kept exactly: "Catalogue match, not verified" and "On hand, shared, not reserved". The UI never says "compatible" or "approved".

## 5. Accessibility (WCAG 2.2 AA)

- One `h1` per page (first in `main`, not in the header), ordered headings, landmarks: one `banner` (the header, holding the back control, on inner screens) and one `main`.
- Status chips and banners carry text and an icon with `aria-hidden`, so colour is never the only signal.
- Visible focus ring on every control, logical tab order, dialogs return focus to the control that opened them.
- Form fields have visible labels, errors are announced next to the field, character counts are text.
- Contrast checked in light and dark for text, chips, banners and focus rings.
- Results are announced through a polite live region.
- `lang="en"`. Zoom to 200% without loss of function.

## 6. Structure and testing

Components live under `src/ui/` and views under `src/app/`. A small pure module maps domain status to label, icon name and tone, and a second maps API error codes to messages. Both are plain TypeScript with unit tests (no DOM library needed).

Browser tests use Playwright (already configured) with `@axe-core/playwright`:

- the demonstration scenario on a 375px viewport: open Quayside House, escalate sealant, see it escalated and the crew still blocked, see substitutes for `0438`, propose `0451`, see it in the actions log from the menu, then open Northgate Depot and see the data problems
- keyboard-only completion of the escalate flow
- axe has no serious or critical violations on each screen in light and dark
- no horizontal scroll at 375px on each screen
- a forced failure: the stock stub down produces the "can't check" banner and never "Crew can go"

## 7. Decisions recorded on approval (2026-10-04)

1. The defaults above are approved as drawn.
2. Playwright Chromium is installed (`npx playwright install chromium`, about 363 MB on disk with the headless shell). It launches at a 375px viewport. The worker sandbox cannot install browsers, so this was done outside it.
3. `frontend-engineering` and `ui-portability-baseline` are added to the project profile.
4. The failure demo was not answered, so no fault switch is built. The "can't check this site" banner is verified in tests only. A preview-only switch remains an option.
5. Grok delegation uses the default model, without the fast flag.

## 8. Out of scope for this slice

Login, offline data and queued writes (the field use round adds the connection state only), push notifications, editing or cancelling a recorded action, site search, and a map or floor plan view.

## 9. As built: changes after review (2026-10-04)

Three independent reviews of the built UI led to these changes to the design above. The wording is in `src/ui/messages.ts`.

| Topic | As built |
| --- | --- |
| Empty substitutes | The "Escalate instead" sentence and button appear only when the penetration has a data problem (see the table in section 3) |
| Sites list failure | Whole list fails: "Can't check the sites right now. Don't assume any site is clear. Try again." One site fails: chip "Can't check" |
| Data-problem only site | No banner; the Data problems chip count shows why, and the sites list chip names the counts. |
| Unreachable server | "Couldn't reach the server. The decision may not have been recorded. Send again to retry; it won't be recorded twice." The retry reuses the dialog's idempotency key |
| Dialog while sending | Escape and Cancel cannot close it while a request is in flight. The response always refreshes the page and announces |
| Live region | In memory only. It starts empty on every full page load |
| Substitute cards | Material name and quantity per install only. On-hand counts are not shown there, because that screen has no shared-stock label |
| Unknown values | An unknown crew status shows the can't-check banner. An unknown shortage state or action status shows "Unknown", never "Escalated", "Resolved" or "Crew can go" |
| Character count | Counts the trimmed text, as the limit does |
| Inputs | A darker input border (at least 3:1 on both backgrounds) and a visible invalid state |
| Links | Data-problem cards link the penetration to its penetration page. Every unavailable screen keeps its back link |
| Error screens | `error.tsx` and `global-error.tsx` show fixed copy and a retry button, never the message or digest |

Navigation shell (same day, after a phone review): the demo bar moved to a sticky footer; a sticky header carries the title and, on inner screens, a chevron back row sits just below it, named after the parent screen, replacing the full-width Back button (the chevron first sat inside the header; moved below it after review); the site reference reads "Job ref CC-A2" and appears on the site screen only, under the title, where an escalation would quote it (removed from the list cards after review, 2026-10-06). The page scrolls as a whole (not an inner scroller), so the browser restores scroll position when going back. (Superseded: no demo bar or Demo tag; the title is in the page body.)

Usability round (2026-10-05, from a review against the exercise brief's UX question):

| Topic | As built |
| --- | --- |
| Sites list | A blocked chip says why: "Blocked · 2 shortages", "Blocked · 1 shortage, 4 data problems" |
| Stock age | "Stock figures from 3 Oct 2026, 08:00 UTC (2 days old)". Older than a day adds "These stock figures are more than a day old. Check with the warehouse before relying on them." Warning only; crew status is unchanged. Hidden on a nothing-planned site |
| Shortage state | Only "Earlier decision, shortfall has grown" is shown as a label. Waiting and Escalated appear as row marks and Decisions entries (see "Material tabs and decision counts") |
| Units | `each` is omitted ("short 2"); other units pluralise ("2 cartridges", "2.5 metres") |
| Penetrations | The site page lists them, grouped under "Solution 0438 · 4". Each row is "{floor}, {location} · {service} {size}" with "Substitutes ›". `?material=` shows "Using {material} · n of total" and a Show all link |
| Ratings | "Fire rating: 60 min integrity, 30 min insulation" (a missing part says "no insulation rating"). Candidates add "Supplier ref …" and "Meets the required rating" or "Below the required rating" against the penetration |
| Catalogue notice | "Catalogue match, not verified" only when at least one candidate is listed |
| Decisions | Wait and Escalate dialogs add "This records your decision here. Nobody is notified automatically yet." |
| Decisions | "Still applies" (neutral), "Shortfall has grown since" (warning), "Shortage resolved"; the repeated site name is gone |
| Failure | Every can't-check screen has a "Try again" button that reloads the page |

Limits recorded rather than built: an open tab keeps the banner it loaded until the next navigation; the three dialogs repeat their form code; no end-to-end test shows the "Earlier decision" badge (the sample stock cannot change during a run), which is covered at the API. From the usability review, not built: a separate escalation target for data problems (they are not a purchasing matter), a "substitute proposed" marker on shortage cards, a "what was checked" summary on a clear site, and a planned work date per site. Penetrations at the same place with the same service read the same (four in the sample); real data would add the floor-plan pin reference.

Landing page (2026-10-06, user decision): the bottom demo bar was replaced by a landing page at `/` and a Demo tag in every header. The sites list moved from `/` to `/sites`; every `/sites/...` URL is unchanged, and back links named "Sites" go to `/sites`. (Superseded: the Demo tag was later removed.)

Nav header (2026-10-06, user decision): the back control moved from a row below the header back into the sticky header, as the first of two rows. Site tabs (same day, user idea): `/sites/[id]` (Shortages), `/sites/[id]/data-problems` and `/sites/[id]/actions` share a frame with the job ref, the readiness banner and a tab bar with counts; the banner sits above the tabs on every tab. (Superseded: see "Site list and actions panel" and "Drawer and materials".)

Title and banner (2026-10-06, user decisions): the title moved from the header into the page body as the `h1`, shown in full, and the header became one slim row (back control and Demo tag). With tab counts in place, the site screen's banner became "Blocked: hold the crew."; AC 34 rewritten to match. (Superseded: the Demo tag was later removed; the header holds only the back control.)

Sticky tabs (2026-10-06, user decision): the site tab bar sticks directly below the nav header while scrolling, so the counts stay in view. The header has a fixed height (`--app-bar-height`) for that. (Superseded: see "Site list and actions panel" and "Drawer and materials".)

Kind icons (2026-10-06, user decision): small outline icons in the secondary text colour say what a thing is, never its state. They are decorative (`aria-hidden`) and use none of the status shapes (tick, stop sign, triangle, circle) or status colours.

| Kind | Icon | Where |
| --- | --- | --- |
| Site | building | sites list cards |
| Material | box | materials list rows |
| Solution | shield | "Nominated solution", a single substitute's heading, and the Select candidate control when that menu is the title |
| Decision | clipboard | the Decisions item in the menu (log entries carry their decision's mark instead: ↑ escalated, clock waiting, swap proposed, the same marks the list rows count) |
| Penetration | an opening with a service through it | penetration list rows |
| About | an "i" in a rounded square | the tab bar's "Guide" |

Not on the filter chips (width at 375px), or on banners and status chips (those are status).

Stop icon (2026-10-06, user decision): blocked and short use a stop sign (octagon with a bar) instead of a cross, which read as "dismiss".

Planned work (2026-10-06, user decision): every site tab shows how much work the check covered next to the job ref, counted from the site's planned penetrations and their distinct nominated solutions. No line when nothing is planned. No per-penetration ready marks: stock is shared across the site, so no single penetration can honestly be called ready. A full Penetrations tab was considered and skipped for now. (Superseded: see "Site list and actions panel" and "Drawer and materials".)

Penetration list (2026-10-06, user decision): the planned-work counts on the site screen are a link ("12 penetrations, 5 solutions ›", a 44px target) that pushes in `/sites/[id]/penetrations`. Its rows reuse the shortage card's penetration rows (`PenetrationGroups`). (Superseded: see "Site list and actions panel" and "Drawer and materials".)

Shortage card links and Substitutes page (2026-10-06, user decisions): a shortage card no longer expands an inline penetration list; its affected count opens the Penetrations page filtered to that material (only a material that is a shortage on the site can filter; anything else shows the full list with a note, never an empty list). Data problem cards keep their direct link to the one penetration. The Substitutes page no longer has an Actions log button: the log is a tab on the site screen. (Superseded: see "Site list and actions panel" and "Drawer and materials".)

Penetration page (2026-10-06, user decisions): titled by the place, with three sections. Penetration: grey labels and values (Service, Required rating). Nominated solution: that solution's problems at this site as colour-coded status lines, each with an icon (data problem: red with a warning icon; uses a short material: red with a stop sign; stock unknown: amber). A "Short material" line is a link to `/sites/[id]/materials/[materialId]`. Stock unknown stays text. Substitutes: the not-verified notice and candidates, or the reason there are none as a status line, then Escalate as a full-width primary button. The Penetrations list uses the same status lines on its rows, and the short-material line is its own link beside the row (the row is already the link to the penetration). (Superseded: the Penetration section was folded into the side-by-side comparison under Nominated solution; see "Demo tag removed and solution fit" below.)

Material stock page (2026-10-06, user decision): the red short-material line opens one material's stock at this site. It shows the amount (`Need X, have Y, short Z`, or `Need X, stock unknown`), the shared-stock notice and the stock age, then how many planned penetrations use it and those places, written as text so the page does not link back to the penetration that opened it. A material that is not a shortage here shows "That material is not a shortage on this site." and no amounts, so a resolved shortage never reads as zero. Wait, Escalate and the decision state live on this page (added when the shortage cards left the site screen). Scoped (2026-10-06, user decisions): a shortage is per site and material, so one wait or escalate covers every penetration that needs it, and the page says so ("For all 4 penetrations at this site"). The need line and the places heading name the site, because the stock on hand is shared with other sites. The places stay text (row links would be circular) with identical ones grouped, and one link goes up to the site list filtered to the material. (Superseded: the page is now across sites; see "Drawer and materials" below.)

Site list and actions panel (2026-10-06, user decision): the site screen is the penetration list. Shortages, data problems and acted are filter chips (toggle links, union, counts are penetrations, including zero; no number when readiness is unknown). The chip row sticks under the header. Acted matches a penetration when a shortage that lists it, or its data problem, is waiting or escalated (from current decisions only), or when a substitute has been proposed for it, and it counts once. An earlier decision (shortfall grown) or a resolved one still shows as a row mark and in the Actions log, so a row can carry a mark without counting as Acted. A blocked site has no summary banner, because each row already shows its shortage or data problem. Row chips name only the kind of problem ("Unknown solution", "Doesn't fit", "No materials", "Invalid quantity", "Short material", "Stock unknown", with "× N" when a row has several); the penetration page carries the full reason and the links to stock pages. A clear site still says "Crew can go." Unknown stock is a row line, never a clear status. The planned-work line is text. `/penetrations` redirects here and keeps `?material=`; `/data-problems` redirects to `?show=data-problems`; `/actions` redirects to `?log=open`. The actions log is a header button on the site and penetration pages. It opens a right-hand panel (full width at 375px) with the same recorded actions and proposals. A shortage's Wait and Escalate are on its stock page. A data problem's Escalate stays on the penetration page, including when substitutes are listed.

Actions log links (2026-10-06, user decision): an entry's title links to the work it is about. A proposal and a data problem decision open their penetration's page; a material shortage decision opens the site screen filtered to that material (`?material=`), and has no link once the shortage is resolved. Proposals name their place: "Proposed substitute for L3, Riser 2: 0438 to 0451".

Decision colours (2026-10-06, user decision): Waiting and Escalated were both amber with a warning triangle. A decision is neither "can go" nor an alarm, so each now has its own colour and icon, outside the crew-status colours:

| State | Colour | Icon |
| --- | --- | --- |
| No decision yet (no longer shown) | grey | dashed circle |
| Waiting | blue (`--info-*`) | clock |
| Escalated | purple (`--escalation-*`) | up arrow |
| Earlier decision, shortfall has grown | amber | warning |

The Wait and Escalate buttons carry the same icons but stay neutral (Escalate is primary only where it is a page's main action). Logged waits and escalations show the decision's icon in its colour; proposals keep the decision kind icon. Both new colour pairs are at least 4.5:1 against their chip background, the page and the card surface, in light and dark (a unit test checks it).

Demo tag removed and solution fit (2026-10-06, user decisions): the Demo tag is gone from every header; top-level screens have no header. On the penetration page, the Nominated solution section shows the penetration and the solution side by side (orientation, substrate, service, size, integrity, insulation, supplier ref); a field that does not fit reads "…, doesn't fit" with a stop sign. A nominated solution that does not fit is also a data problem (AC 35, 36).

Cut-off substrates (2026-10-06, user decision, option A): a substrate cut off after the family name never fits, on either side. The comparison shows why rather than two identical texts: "FR plasterboard, (cut off)" against "FR plasterboard, (cut off in the catalogue), doesn't fit".

Drawer and materials (2026-10-06, user decisions): a drawer side menu, after the user's other apps, gives the two top-level views, Sites and Materials. Stock is shared, so the material view is across sites: `/materials` lists each planned material against the one stock with the across-sites total, and `/materials/[id]` has one section per site, where that site's shortage is waited on or escalated (a shortage is a site's need for a material, so one decision covers all its penetrations). The site-scoped material page became a redirect. The penetration page briefs each shortage inline and links to the material page; the back control there returns to the penetration (`?from=`), because after a sideways jump a parent-named back control would land on the wrong page. (This supersedes the material stock page notes above.)

Back pop (2026-10-06, user decision): the back control was a fresh visit, so the root Loading screen replaced the page until the dynamic screen rendered. It is still a link to the named screen. When that screen is the history entry underneath, the control pops it and the page returns at once. No extra transition animation.

Opening a material page (2026-10-06, user decision): the short-material link was a new visit to a dynamic page, so that same Loading screen replaced the penetration until the material page rendered. The Loading screen is removed. The penetration stays in place until the material page is ready, and the link prefetches that page.

Substitute title (2026-10-06, user decision): when the Select candidate menu is shown, the "Solution {code}" heading under it is removed. The solution shield sits on the closed control, beside the selected name. The open native list stays text, because an option cannot hold the icon. One candidate still has the heading and the shield. The comparison table's "Solution {code}" column header stays. The menu label is "Select candidate".

Penetration list title (2026-10-06, user decision): the site screen has a "Penetrations" heading above the filter chips, with the total number of planned penetrations. The chips still count subsets and stick under the header; the heading scrolls away with the page. Each row starts with the penetration icon.

Material page sites (2026-10-06, user decision): each site heading has the site icon and each place has the penetration icon. The site link opens that site, and the site's back control returns to this material page. When the material page is the screen underneath, the control pops it. A direct visit to the site URL still follows the link. A missing, repeated or unknown `fromMaterial` leaves the back control on Sites. Filter chips keep `fromMaterial`. Places stay text.

Side menu (2026-10-06, user decision): the drawer's Close label is a dismiss icon. Its accessible name stays "Close menu". Sites, Materials, Actions log and About this demo each start with an icon.

Landing page menu (2026-10-06, user decision): the landing page uses the same menu header as Sites and Materials. About this demo is the current item. The sticky "Open sites" bar is gone; Sites in the drawer is the way onto the list.
Actions log in the menu and decision popovers (2026-10-06, user decision): the header Actions log button and its panel are gone, because a header control did not say which work it belonged to and its links went sideways. The log is a top-level page in the side menu, one section per site. A decision shows where it applies: a list row's Escalated or Waiting chip is a button beside the row's link (never inside it) that opens the latest decision in a native popover. `?log=open` no longer does anything. (This supersedes the actions panel parts of "Site list and actions panel" and "Actions log links".)

Actions log follow-ups (2026-10-07, user decision): each site heading on the log has the site icon and sticks under the header while its entries scroll. A page opened from the log returns to it: links carry `?fromLog=<site>`, honoured only when it names that page's own site (or, on a material page, one of its sites), and the back control then reads "‹ Actions log" and pops the log when it is underneath, like the material page's back control on a site. A material page opened from a penetration still returns to the penetration first.

Row marks and penetration tabs (2026-10-07, user decision): the row chips were too heavy, so each problem and decision is an icon mark with its count, inside the row link, with the full wording as its hidden label and hover title. The decision popover is gone. A penetration's decisions are on its own page, in an Actions log tab beside the Solution tab. (This supersedes the decision chip and popover in "Actions log in the menu and decision popovers".)

Material tabs and decision counts (2026-10-07, user decisions): decisions are made on materials and solutions, so the material page has Stock and Actions log tabs like the penetration page. The Waiting and Escalated labels on its site sections are gone, for one design across pages: a page's decisions are in its Actions log tab. The "Earlier decision, shortfall has grown" warning stays, because it asks for a new decision. Row decision marks show their numbers, including proposals, and Acted includes a proposed substitute.

Responsive side menu (2026-10-07, user decision): on a phone the drawer stays; from 1024px the menu is a side column beside every page, collapsible to an icon rail that is remembered and applied before paint. With the top-level header hidden, `--app-bar-height` is 0 on those pages so sticky headings still sit at the top; inner pages keep the back bar and its offset. The About page moved from `/` to `/about-this-demo`, and `/` redirects there with a temporary (307) redirect, so the root can become a real page later without browsers caching the old answer. Built by Grok (docs/agent-work/28-responsive-nav-brief.md). The drawer and the side menu each hold a Theme choice, so each radio group takes its own `useId` name; with one shared name the browser made all six radios a single group and a choice in one unchecked the other (caught by the first e2e run, since the worker's sandbox could not run a browser).


Bottom tab bar (2026-10-17, user decision): below 1024px the top-level pages' hamburger menu and left drawer became a tab bar fixed to the foot of the screen, with the same entries (Sites, Materials, Actions log, About this demo). It belongs to the top-level pages only, so it is gone on inner screens, which keep their back control. The Theme choice, which sat at the drawer's foot, moved into the top-level header. The side menu from 1024px is unchanged.

UI refresh (2026-10-19, user decision): to move further from a competitor's interface without changing any behaviour. The sites list is a waterfall (two columns from 672px, where the signal keeps its 280px; one column on a phone, which the user chose over a two-column phone layout that would shrink the signal). The menu entries are renamed: Sites to Projects, Materials to Inventory, Actions log to Decisions (the per-page log tabs too), About this demo to Guide; URLs are unchanged. The Guide's text is rewritten with the same facts and links. Every button takes the site cards' style: a bold label on the same shape. The invented sample sites are renamed (Cedar Court, Quayside House, Northgate Depot, Foundry Lane Annex) with matching job refs.

Company colours (2026-10-19, user decision): the blue, light grey and light pink theme gives way to the company's black (#000000) and yellow (#fed105), taken from the company site's screenshot (the site itself refused automated requests). The chrome (connection bar, headers, tab bar, side menu) is black in both themes, with yellow for the current entry, the chosen theme, the Online switch and focus. Buttons and the chosen theme are yellow with black text; cards and decision chips are pale yellow; links are black on light and yellow on dark; the dark theme's page is black. Can't check takes the brand yellow; go green and stop red are unchanged, because they carry the crew decision (AC 52, 53), and every contrast rule in the token tests still holds. The browser toolbar colour is black.

Connection colour and demo sign-in (2026-10-19, user decision): the connection bar's row is green with dark text while online and red with white text while offline (the signal's go and stop tokens), black while it checks; the words stay. A demo sign-in covers every page on a first visit: username, password (show/hide), a role (Team leader or Operator), Forgot password (says nothing is sent) and Create account (username, optional email, role, password twice). Any username and password are accepted; the header and side menu then read "Hi, <username>", and Sign out sits at the Guide's top right. Username, role, accounts (no passwords) and the signed-in state live in localStorage; `data-auth="in"` is stamped before paint like the theme, so a returning user never sees the cover flash. The page behind is inert while the cover shows. The role is recorded but changes nothing yet.

Pick check and pick-error reports (2026-10-19, user design: the canvas "Team Leader Stock Readiness UI", artboards 1 to 4): the second-level screens only; the home page and the top-level pages are unchanged. The site screen gains a Picks section (AC 62, 63) under its signal and panel: the check's result card, reports waiting to send, the picker card (name marked "(sample)", role, last action, phone, email, Call and Email), the materials planned against picked with a label each, and a locked button with its reason. A new Pick check page (`/sites/<id>/picks`, AC 64) has one card per issue and Report to warehouse; the report page (`/sites/<id>/picks/report`, AC 65) is the design's form. Offline, everything reads as last known in amber and the report waits on the phone (AC 66). Departures from the artboards: the button reads "Send the crew", not "Crew can go", because a locked button must never read as the go state and AC 9 keeps that text off unchecked sites; enabled, it texts the operator. The colours are the app's black, yellow and status tones, not the artboards' blue, after the company-colour change. A site with no pick list shows no picker card, so a nothing-planned site still offers no call (AC 57). "Wait for re-pick" records nothing. The photo stays on the phone.

Header round (2026-10-19, user decision): whether the phone is online matters more than the theme, so the Online switch takes the Theme choice's place at the right of the header, and the header now sticks to the top of every screen while the page scrolls, inner screens and the error screen included, so the switch is always in view. The switch is a pill coloured as the connection row was: green with dark text while online, red with white text and "Updated 08:02" while offline, the header's black while it checks; the words stay. The picker's last action is the first line under the header, no longer in a row above it. The Theme choice (System, Light, Dark) moved to the end of the Guide, under "On this device": it is set once per phone. Wide screens now use the phone's layout: the header across the top and the tab bar at the foot, its entries in the page's 45rem column. The side menu, its collapse control and the remembered `data-sidebar` are gone, so the head script stamps only the theme and the demo sign-in, and sticky headings keep the header's offset at every width. Requirements FR17, FR18 and FR24; AC 37, 47, 48 and 58.

Map placement (2026-10-19, user decision): each project's map moved from the card's foot to under the project's name and above its signal, and it is now exactly as wide as the signal (at the foot it took the width of the row under it, not the card's). The trip line and Directions stay at the card's foot. AC 74.

Default origin (2026-10-19, user decision): a demo needs a fallback, so distances and drive times no longer wait for the phone's location. Until the phone shares where it is (before any tap, while it looks, and when the location is refused or can't be found), every trip starts from 5 Arawa Street, Grafton, Auckland 1023 (-36.8643, 174.7661, the building's point in OpenStreetMap), and each card's line names it. The phone's location replaces it only once its answer is in. "Show distance and time" became "Use my location", with a line above the list that says where distances are from. AC 75.

## 10. Field use round (2026-10-18)

From the UI change list in the author's notes (QAntum UI改进清单), built on plan A. Requirements are FR18 to FR21 and AC 48 to 51; the wording is in `src/ui/messages.ts`, `src/ui/contacts.ts` and `src/ui/action-needed.ts`.

| Topic | As built |
| --- | --- |
| Connection bar | A slim light-grey row above every screen's own header, not sticky, so the sticky header and chips keep their offsets. Left: "Picker last action · 3 Oct, 21:00", from the stock feed's time in the phone's own time zone ("unknown" when the feed is down). Right: the state in words ("Online", "Offline" with "Updated 08:02" in amber under it, or "Checking") and a switch: a dark capsule with the knob right when on, grey with the knob left when off, a 76 by 48 target. The switch is real (`role="switch"`, name "Online", its state described for screen readers, for example "Network offline, last updated 08:02"): off means work offline. (Since the header round, section 9, the switch is a pill at the right of every screen's sticky header, and the picker's last action is the first line under the header.) |
| Online | The browser's network flag, an answer from `GET /api/health` and the switch on. Checked every 30 seconds, when the network returns and when the tab is shown again; not while working offline. Before the first answer it says Checking; switching back on shows Online only after the server answers. Changes are announced in the polite live region ("You're offline", "Back online"), never the first answer |
| Offline | A warning-coloured banner sticks to the foot of the screen: "You're offline. You're seeing data from 08:02. Don't treat it as current." Its Offline details button opens a native dialog: last online, when this screen and the stock figures are from, what is waiting to send ("Nothing": decisions are never queued), Sync now (primary) and "Last synced 14:32". Decision dialogs refuse to send while offline and say why |
| Sync now | Asks the server, then ends working offline, refreshes the screen, stamps the sync time on this device and announces "Synced"; unreachable, it says "Still offline. Nothing was sent." |
| Site cards | Large stacked cards (no carousel, no masonry: a leader has one or two sites a day, so all of them fit on one screen). The name is a 48px link with a chevron; the chip is unchanged; then one main action. Clear: "Operator · Mere Tane", Text operator (an `sms:` link with a prepared message that names the site and job ref and keeps "shared, not reserved") and Call operator (`tel:`). The operator is told first and passes word to the picker, so the leader does not phone around. Blocked: Sort out shortages, to the panel, or Check data problems. Unavailable: Try again. (Reworked in the signal round: the chip became the big signal and blocked and unchecked sites also tell their operator, section 11) |
| Needs your decision | On a blocked site, in place of a banner: "Can't go yet: 2 shortages", then Short (each material, its figure and unit in bold, "4 penetrations affected" as a link to them, Wait and Escalate), Data problems (a link to the filter), What each option does (Wait, Escalate, Propose a substitute, one line each), Covered for this site alone (with "Stock is shared and not reserved, so another site can still use it first."; the fixed wording "On hand, shared, not reserved" stays once per screen), and Ask before you decide (picker and operator with Call; one row "Picker and operator" when one person does both). A red rule on the left; the content stays on the page surface for contrast |
| Sizes | Body text 18px, headings scaled to match, every target 48 by 48 (the e2e target check now asserts 48) |

Kept from earlier rounds: status icons. The list asked for shapes over colour (● can go, ▲ needs attention, ■ can't go); the check, warning triangle and stop sign already do that, so they stay.

Not built, with reasons:

| From the list | Why not now |
| --- | --- |
| Open the site directly when there is only one | The site's back control names Sites, so Sites would bounce straight back into the site. One card already shows its status and main action without a tap |
| App notification to the operator | There is no app or push service. Text operator opens the leader's own messages app, which also works on a weak signal |
| Decision deadline and a safe default at the deadline | Sites carry no planned departure time yet, and nothing should act on its own without one |
| Stale stock as "Can't confirm" instead of "Crew can go" | It changes the approved stale-stock rule (warning only), and every sample site would read "Can't confirm", because the sample stock is dated 3 Oct 2026. Needs a decision and a fresh-stock demo mode first |
| Report a problem, photos, AI autofill, stocking errors, demo login, partial dispatch, packing slip, preferences | Each needs storage or rules this slice does not have. They are the next iteration |

## 11. Signal round (2026-10-18)

From the author's follow-up to section 10: show a clear site's operator contact, tell the operator when parts are missing so nobody makes a wasted trip, and redraw the status as a big I/O switch that works with gloves, in colour and shape together. Requirements are FR19, FR22 and FR23 and AC 49, 52 to 57. Pure rules are in `src/ui/signal.ts` and `src/ui/contacts.ts`, the drawing is in `src/ui/SiteSignal.tsx` and `src/ui/OperatorRow.tsx`, and the colours are the `--signal-*` tokens in `globals.css`.

| Topic | As built |
| --- | --- |
| The switch | A capsule at least 88px tall and full width: a 72px knob at one end, the status label in 24px bold with a one-line hint under it, and a mark at the other end like the On/Off labels of an iOS switch (an "I" bar when on, an "O" ring when off). Right is on and left is off, as on the switch it imitates |
| Colour and shape together | Four states, each told by colour, lightness, knob shape, knob side and end mark, so none depends on colour. Go: bright green with dark ink, a dark circle with a tick, knob right, "I". Blocked: deep red with white ink, a white stop sign with a bar (the icon already used on chips and rows; a cross reads as "dismiss"), knob left, "O". Can't check: amber with dark ink and a black edge, a warning triangle, knob left. Nothing planned: a quiet light grey, a dashed ring, knob left. Green is the light switch and red the dark one on purpose: the first palette used a dark green and a dark red of the same lightness and the greyscale screenshot showed two near-identical capsules, which a leader who cannot tell red from green, or in glare, would read by shape alone |
| Colour values | Go `#3ddc6c` on `#04130a`, blocked `#b3001b` on white, in both themes, with the edge `#006618` and `#7a0012` in light and `#3ddc6c` and `#ff6b5e` in dark. Can't check `#ffc107` (dark `#ffca3a`) on dark ink. Nothing planned `#e3e5e8` on `#1a1a1a` in light, `#3a3f46` on `#ececec` in dark. Every label and knob is at least 7:1 against its fill, every edge at least 3:1 against the page and the card, and go is at least 3:1 lighter than blocked, all pinned by a test that reads the tokens from the stylesheet. Fills are solid, so the automated contrast check can measure them |
| One tap | The signal of a clear or blocked site with an operator is a `tel:` link: the same effect as Call operator, because calling is the commonest action. The phone asks before it dials, so a gloved mis-tap does not ring anyone. Call operator and Text operator stay as separate buttons, 56px tall. The signal never starts a text. A site that can't be checked has an amber button that reloads, and never calls. Nothing planned, or no operator, is a plain box; with no operator the hint says "No operator assigned" |
| The hint | "Tap to call". It does not name the person, so the label has room on a 375px screen; the operator row under the signal names them, and the signal is described by it for screen readers. The signal's name is its label and hint only, so it never repeats the site name or the names of the buttons |
| Tell the operator | A site with an operator shows "Operator · Name", Text operator and Call operator whenever it has work planned. The text is prepared, the leader presses send, and its wording follows the state (AC 55). Clear: "...materials for the planned work are on hand (shared, not reserved). You can go." Blocked: "...parts are NOT complete. Don't go yet. Short: A; B; C and 2 more. Also 4 data problems to check. I'll message you when it's sorted." (names are split with semicolons because material names hold commas; unknown stock reads "(stock unknown)"; with data problems only it says it can't confirm the materials). Can't check: "...I can't check the materials right now. Don't go until I confirm." None says the crew can go unless the site is clear |
| On the sites list | Per card: name, signal, "Short:" and up to three short materials then "and N more" (blocked only), the operator row, then Sort out shortages. `GET /api/sites` carries the short materials (AC 56) so the list needs no second call |
| On the site screen | Under the job ref: the signal, the operator row, then the Needs your decision panel. The panel keeps its own "Ask before you decide" contacts: that block is for asking the picker or operator, the row above it is for telling the operator |

Not built, with reasons:

| Idea | Why not now |
| --- | --- |
| A real toggle that dispatches or holds the crew | Nothing here releases the crew (AC 50); a switch that looked settable would invite that. The signal reports the state and the knob never moves |
| Sending the text from the app | There is no messaging service. The leader's own messages app opens with the text ready, which also works on a weak signal |
| A longer message with quantities | A text of two or three lines is read; the figures are one tap away on the Needs your decision panel |

## 12. Review on site (2026-10-19)

From the author: the warehouse can mark a line Picked, and the pick list can even match the plan, yet the site finds it wrong: an item that doesn't fit, the wrong item altogether, or damage on the way or during the work. The picker then has to pick again, sometimes as a same-day delivery. So every material gets a double check on site, the lines that match the plan too. Requirements are FR28 and AC 67 to 71; the report form is the canvas's "Report to warehouse" (artboard 4), extended.

| Topic | As built |
| --- | --- |
| A Review on every line | Each row of "Materials · planned vs picked" keeps its name link (to its Pick check card) and gains a second line: the label (Matches plan, Part-picked, Missing parts, Wrong spec, Reported on site) and a Review button beside it. Review is 56px tall with a 2px dark edge, named "Review" and described by the material, so a screen reader hears which line. It is there online and offline, on every line whatever its label, and on each Pick check card |
| What a row says | Under the amounts: an open report from site in the danger tone with the stop mark and a bar on the left ("Reported 14:32 · Damaged · 2 affected · same-day delivery asked"), or, after a review, "Checked on site 14:32" with a tick. A reported line that also fails the pick check keeps its own label and adds the line |
| The review page | `/sites/<id>/picks/review?line=<line>`: the line's card (amounts, where it is used, its label, any open report, the picker), "Is it right on site?", then two answers as big as the site signal: "Yes, it's right" in the signal's go green with dark ink and a tick, "No, something's wrong" in its stop red with white ink and the stop mark, each at least 88px tall and full width. The card's top edge is green for a line that matches the plan and red for an issue |
| Yes, it's right | Records the review at once with a new idempotency key ("Checked on site."). Offline, or when the send gets no answer, it waits on the phone with that key like a report; the site screen counts "1 review waiting to send", apart from reports, and it sends by itself once online |
| No, something's wrong | Opens the report form on that line, titled "Report to warehouse", with no kind chosen: the leader must say what the site found ("Choose what's wrong."). The site's kinds come first (Doesn't fit on site, Wrong item, Damaged, on the way or during the work), then the pick check's. New fields: "How many are affected?" (optional, a whole number) and "What's needed?" (Re-pick for the next delivery, the default, or Same-day delivery). Back returns to the review |
| After a report | The line is an issue, "Reported on site", so the Picks section reads "Not ready", says the pick list or the site found problems, and Send the crew stays locked. A later "Yes, it's right" closes it. Offline the label reads "Was reported on site" in amber |

Not built, with reasons:

| Idea | Why not now |
| --- | --- |
| The warehouse closing the report | The warehouse's systems are read-only here, and only the site can see that the new delivery is right |
| The big site signal turning red on a report | The signal reads stock (AC 52 to 57) on the list and the site screen alike; the pick gate is Send the crew. Folding picks into the signal needs a pick read per site on the sites list: a next step |
| A photo sent with the report | There is no upload service; as in AC 65, the photo stays on the phone |

## 13. Projects filter (2026-10-19)

From the author: learn the readiness filter of qantum-stock's work-package list ("Search Work Packages", "Readiness" with All statuses, Ready, Shortage and Unknown, Apply, Reset) and put it at the top of the projects list. Requirements are FR29 and AC 72 and 73.

| Topic | As built |
| --- | --- |
| The form | Under the "Projects" heading, in a card on the page surface: "Search projects" (placeholder "Name, job ref or address", at most 100 characters), "Readiness" (All statuses, Ready, Shortage, Unknown, qantum-stock's labels), then Apply (the primary button) and Reset. Stacked on a phone; from 672px the search and Readiness sit side by side with the buttons on the right under them. Every control is 48px |
| What each choice shows | Ready: the projects whose crew can go (green signal). Shortage: the blocked ones (red). Unknown: nothing planned (grey) and can't check (amber). All statuses: every project. A project that can't be checked is never under Ready or Shortage, and a status the app doesn't know counts as Unknown |
| URL | A GET form: `/sites?q=quay&status=shortage`, so it works without JavaScript, the browser's back button undoes a filter, and a filtered list can be sent to someone. A missing, unknown or repeated status is All statuses. Reset goes to `/sites` |
| Result | With a filter on, a line under the form says "2 of 4 projects"; when nothing matches it says "No projects match these filters." in place of the list. The list itself is named "Projects" for screen readers |

Not built, with reasons:

| Idea | Why not now |
| --- | --- |
| Search by solution code or service, as qantum-stock does | The projects list does not read nominations; adding their codes to `GET /api/sites` would widen that call for a list of four. The site screen already filters its penetrations |
| Applying on change, without the Apply button | qantum-stock's pattern is Apply and Reset, and an explicit button avoids reloading the list on every turn of a gloved finger |

## 14. Project maps (2026-10-19)

From the author: give each project on the projects list a map of where it is, open navigation there from the phone's current location when the map is tapped, and say how far it is and how long it takes. Mapbox GL JS, after its getting-started guide (npm). Requirements are FR30 and AC 74 to 76.

| Topic | As built |
| --- | --- |
| The map | Under the project's name and above its signal, a 160px strip as wide as the signal (moved from the card's foot the same day: section 9, "Map placement"), Mapbox's streets style centred on the project, zoom 14, with a pin in the project's signal colour (green, red, amber or grey). It does not pan or zoom: a crew scrolls the list with gloves, and a map that grabbed the finger would get in the way. It loads only when its card comes within 200px of the screen, so a list of four starts one or two maps |
| Tap | A tap anywhere on the map but Mapbox's credits opens Google Maps directions from wherever the phone is to the project, by car, in a new tab (on a phone, the maps app). Directions, at the card's foot, does the same for everyone, keyboard and screen reader included: the map is a shortcut for touch, not the control |
| Distance and time | Each card always says how far the project is and how long the drive takes. Until the phone shares where it is, the trip starts from the demo's default address, 5 Arawa Street, Grafton, Auckland 1023, and the line names it: "2.3 km · 7 min drive from 5 Arawa Street" (section 9, "Default origin"). "Use my location" sits above the list with a line that says where distances are from: "Distances are from 5 Arawa Street, Grafton, Auckland 1023 until you use this phone's location. Only Mapbox sees it, to work out the drive."; while it looks, "Finding where you are… Until then, distances are from 5 Arawa Street, Grafton, Auckland 1023."; refused, "Location is off, so distances are from 5 Arawa Street, Grafton, Auckland 1023."; no fix, "Can't find where you are right now, so distances are from 5 Arawa Street, Grafton, Auckland 1023." Once the phone's position is in (after the tap, or by itself when the phone already allows it), its drive replaces the default's when its answer arrives ("12.3 km · 18 min drive") and the button reads "Update my location". Before the first answer: "Working out the drive…". No route (no token, working offline, Mapbox failing or no road): "9.8 km in a straight line · no drive time", or from the default "9.8 km in a straight line from 5 Arawa Street · no drive time" |
| Without a token | No map; Directions and the straight-line distance still work. The same if the phone has no WebGL or Mapbox fails: the strip hides itself |
| Target sizes | Directions and the button are 48px like every control. Mapbox's wordmark and credits, which Mapbox requires on every map, keep Mapbox's size; they are the only targets under 48px, and nothing in the app needs them |

Not built, with reasons:

| Idea | Why not now |
| --- | --- |
| Turn-by-turn inside the app | The phone's maps app already does it, with traffic and voice, and works when the app is closed |
| A map on the site screen or one map with every project | Asked for on the projects list, one per project; a shared map is the next step once there are more projects than fit on a screen |
| Apple Maps on iPhones | Google Maps' directions link opens the app on both platforms, or the browser; choosing per platform can come with the Flutter app |

## 15. Today panel (2026-10-20)

From the author's design "I · Verdict + tabs + map (B+D+E)" (a design-tool export, not committed), added at the top of the projects list. Where the design and the project differ, the project wins: its words, its data and its colours. Requirements are FR31 and AC 77 to 79; the words and numbers are in `src/ui/today.ts`, the panel in `src/ui/TodayPanel.tsx`.

| Topic | As built |
| --- | --- |
| Verdict | "Today", the totals ("3 shortages · 4 data problems") and, in 36px heavy type, "2 of 3 crews can't go yet". A crew is a project with work planned; one that is blocked or can't be checked can't go. Stop red with white text while any crew can't go, go green with dark text when every crew can, the page's surface with no crew. With any crew unchecked the totals read "Stock can't be checked", never a count. Worked out from every project, whatever the list's filter |
| Bar | One 10px segment per crew, those that can go first: green, light red (blocked) and yellow (can't be checked); dark on the go green. The chosen tab's segments at full strength, the rest at 35%. Described in words: "1 can go, 2 blocked" |
| Tabs | "All 4", "Blocked 2", "Crew can go 1", "Other 1" in a dark track inside the panel, right under the bar; the chosen one white with the panel's colour. All shows every project, with no filter; Blocked holds every crew that can't go, unchecked ones too; Crew can go the crews that can go; Other the projects with nothing planned. A tablist: one tab in the tab order; the arrows, Home and End move and choose. Four share a phone's width, so a long label takes two even lines. Opens on Crew can go, as the author asked (the crews to send first); on Blocked, then Other, when it is empty |
| Map | 288px tall, full bleed on a phone. Only the chosen tab's projects (every project under All), as pins: a dot in the signal colour (18px, 26px when chosen) and the name before its first comma on a white label, inside a 48px button named, for example, "Cedar Court, Block A, Crew can go" and pressed when chosen. With a public token, a Mapbox streets map fitted to the pins that does not pan or zoom; without a token, or when it hasn't loaded in 8 seconds, a plain panel with the pins in their relative places (north up, one scale on both axes) |
| Card | Right under the map, the chosen project's card: the list's own card (the same `SiteCard`, rendered by the same code with the same data), so it looks and reads exactly as in the list below, with its name, map, signal, what is short, operator, actions, trip and Directions. Only its width differs: as wide as the map, where the list's cards take the waterfall's. Its ids carry their own prefix, so none repeats on the page, and it shares the list's trip provider, so its distance line matches. Choosing a tab opens its first project; a pin opens its own. An empty tab says "No projects in this group." |
| Page | The h1 "Projects" stays first in main but is visually hidden while the panel leads; the tab bar marks the page. "All projects" heads the filter and the cards under the panel. The panel keeps its own stacking, so the sticky header and the tab bar stay over the pins and the card |

Changed from the design, with reasons:

| Design | Built | Why |
| --- | --- | --- |
| Deep red #7F1D1D; Archivo and IBM Plex Sans | The signal tokens and the system fonts | The project's colours, and no font download, so it works offline |
| Three tabs: Blocked, Can go, Idle | Four: All, Blocked, Crew can go, Other | The author's follow-up: All shows every project; the labels as asked, in the project's sentence case |
| Opens on Blocked | Opens on Crew can go | The author's instruction |
| A drawer sheet with its own wording | The list's own card, as wide as the map | The author's follow-up: the same look as the list, by reusing its code |
| 44px tabs and pins | 48px | AC 31 |
| No place for a project whose stock can't be checked | Under Blocked, in yellow | Fail closed: never counted as can go |
| The verdict as the page's h1 | An h2, under the visually hidden h1 "Projects" | One h1 per page, first in main |

## 16. Deadline (2026-10-20)

From the author: give each project a date in the sample data and show it on every project's card as an English date, "Deadline". Requirements are FR32 and AC 80; the words are in `src/ui/deadline.ts`.

| Topic | As built |
| --- | --- |
| Data | Each site in `data/sample/sites.json` has a `date`, its deadline, written `YYYY-MM-DD` (invented: Cedar Court 2026-10-23, Quayside House 2026-10-27, Northgate Depot 2026-11-03, Foundry Lane Annex 2026-11-13). `GET /api/sites` carries it |
| On the card | The card's last line, after the trip and Directions: a calendar icon, "Deadline · " and the date in bold, "Fri 23 Oct 2026" (weekday, day, short month, year), in a `time` element with the date as written. The card under today's map shows it too, since it is the same card |
| No date | A missing or impossible date (`2026-02-30`, `23/10/2026`) shows no line: never a made-up date. The date is read as written, in UTC, so no time zone moves it a day |
