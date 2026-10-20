# UI design

Screen and actions-log defaults. Status: **approved 4 Oct 2026**. Requirements: `slice-specification.md` (FR1–FR17, AC 30–47). API: `api.md`. Vocabulary: `glossary.md`. The screens were sketched for review in the session that produced this document.

## 1. Context of use

Usage pattern: just before departure, nearly always on a phone, sitting in a van or standing on site; one free hand, strong light, possibly gloves. Hence big targets, strong contrast, simple words, and a single decision per screen.

## 2. Baseline choices

| Topic | Choice | Reason |
| --- | --- | --- |
| Visual direction | Utilitarian, neutral surfaces, no branding | No QAntum brand assets were available, and a field tool must not distract from its data |
| Theme | Defaults to System: light, or dark if the OS asks for it (`prefers-color-scheme`). The Guide's final section, "On this device", holds Theme (System, Light, Dark) on a single thin row: label left, compact segmented radio group right, each radio a 32px pill inside a 48px-tall tap area. Light or Dark sets `data-theme` on `<html>` and is persisted in this browser only (`team-leader:theme`). The complete inventory of browser storage: this key; `team-leader:last-synced` and `team-leader:work-offline` (session storage); `team-leader:user`, `role`, `signed-in` and `accounts` used by the demo login; and the outbox that queues pick reports. An inline head script sets the theme ahead of the first paint, avoiding any white flash in dark mode | Contrast must pass in both themes |
| Status | Icon + text + colour, colour never alone. Clear: green, tick. Blocked: red, marked by a barred octagon (stop sign). Nothing planned: grey with a dashed circle. Unavailable: amber with a warning sign | AC 30; glare |
| Typography | System fonts; body 18px (16px before the field-use round, §10); nothing below 12px | No font download; independent of the network; readable at arm's length under glare |
| Layout | One column, max 720px, centred; fits a 375px viewport without sideways scrolling | AC 32 |
| Targets | ≥ 48px in both dimensions for anything tappable (44px before the field-use round) | AC 31; gloves |
| Motion | Not required; `prefers-reduced-motion` is honoured | |
| Demo honesty | Landing page `/about-this-demo` (the root redirects to it), titled "Know which crews can roll out today" and in brochure form since 20 Oct 2026 (§19), covers the demo in one place: sample data, no real login, decisions shared by all visitors, nothing sent, a GitHub link (source, specs, agent records), and a five-step tour. Screens carry no Demo tag (dropped at the user's request on 6 Oct 2026) | A single explanation in one place keeps working screens clean |
| Navigation | Every screen has a slim one-row header that stays pinned while scrolling. Left: the back control: chevron + target name ("‹ Projects", "‹ Quayside House, Levels 3 to 5"); long names end in an ellipsis; minimum height 44; accessible name "Back to <name>". Right: the Online switch (§9, header round). The four tab pages and the remaining top-level pages (Inventory, Decisions) carry no back control; their header contains "Team leader" (or "Hi, <username>") and the Online switch, while a bottom-anchored bar (landmark Main) carries the four tabs (§18): icon over label, the active page in link colour, tabs at least 48 tall and outside the device's safe-area inset. Padding the page bottom by the bar's height keeps the last row and offline banner visible. No tab bar on inner screens. Wide screens mirror the phone: header across the full width, tab entries kept inside the 45rem column, and no side menu (dropped during the header round). Each page has exactly one `h1`, the title, placed first in `main` and never clipped (it was visually hidden on the projects list while the daily panel sat on top, §15). Back follows the visit's origin (AC 85, §20): with a top-level page underneath it names that page ("‹ Map") and pops history, so the page reappears instantly; on a direct open, or above a screen it has no name for, it displays and follows the page's declared target. No other transitions | A thin bar leaves room for content while scrolling, and site names are never cut, so similar sites stay distinguishable |
| Styling tech | CSS Modules plus CSS custom properties. **No added dependencies**: neither Tailwind nor a component kit | The app is too small to warrant a dependency; tokens keep colours in one place |
| Rendering | Server components for pages; client code confined to dialogs, forms, and back navigation | Less client JS, no loading flicker, no secrets in the browser |
| Data in pages | Server components call use cases directly through the composition root, never via HTTP | No self-requests, quicker, one failure mode fewer. Writes from the browser still hit the real `/api` routes, giving end-to-end coverage of the API |

## 3. Routes

| Route | Screen | Contents |
| --- | --- | --- |
| `/about-this-demo` (`/` redirects) | Guide | Header: "Team leader" and the Online switch; tab bar marks Guide. Brochure (§19): headline "Know which crews can roll out today", "Use my location", "Sign out", one sentence of promise; next "Your four tabs" (a card per tab, every card with an Open button), "What the colours mean", "Your morning in three taps", "Try it in two minutes" (Quayside House; the L3, Riser 2 penetration; data problems at Northgate Depot; a green pin on Map, then a due date on Calendar), "Good to know" (sample data, sign-in, nothing sent, links to Inventory and Decisions, GitHub link) and finally "Make it yours" with Theme. No Demo tag (the menu points here) |
| `/sites` | Sites | Header: "Team leader" and the Online switch. Filter, then a card per site that ends with its deadline ("Deadline · Fri 23 Oct 2026", §16). Each card: site name (linked); the big I/O-style signal (green / red / amber / grey), which dials the operator on a tap (AC 52–54); for a blocked site, what it lacks; the operator row ("Text operator", "Call operator", AC 55); and for a blocked site "Sort out shortages" (or "Check data problems"). Sites that cannot be checked show the amber signal; tapping it runs the check again (AC 49, §11) |
| `/map` | Map | Header: "Team leader" and the Online switch; tab bar marks Map. Contains only the daily panel (§15): verdict with bar and tabs, the selected tab's pin map, and the selected project's card. The h1 "Map" is visually hidden as the panel leads |
| `/calendar` | Calendar | Header: "Team leader" and the Online switch; tab bar marks Calendar. Contains only the deadline calendar (§17). The h1 "Calendar" is visually hidden as the panel leads |
| `/materials` | Materials | Header carrying the menu control. "On hand, shared, not reserved"; stock age; an alert when some site went unchecked; followed by one alphabetical row for every material any site plans, each prefixed by the icon for material kind. Each row: on-hand amount and the combined need ("On hand 2 · planned across sites 6"; if stock is unknown only the need plus a "Stock unknown · needed at N sites" chip), then one of "Short at N sites" (danger chip), "N sites couldn't be checked" (warning), "Sites together need more than on hand" (warning: no single site short, but pooled stock cannot cover all), or plain "Not short at any site". Rows open the material page. With an unchecked site the total is omitted and the banner reads "1 site couldn't be checked. Its needs are not counted."; an empty list reads "No materials planned at the sites that could be checked." If nothing is planned anywhere, no stock is read and notice and age are omitted. Stock unreadable: "Can't check stock right now. Don't assume any material is in stock. Try again." |
| `/materials/[materialId]` | Material (titled by name) | Tabs below the title, as on penetration pages: Stock (default) and Decisions (`?tab=log`, preserving `from` and `fromLog`). Decisions: all sites' waits and escalations on the material, newest first, each "At {site}" without a link; a count shown only after all sites loaded; an unreadable site named in a warning; nothing readable: "We can't load this material's actions right now. Try again shortly."; empty: "Nothing recorded for this material yet." Stock tab: the header's back control reads "‹ L3, Riser 2" when the page was reached through that penetration's shortage line (`?from=<penetration>`, checked against the planning sites), and "‹ Materials" otherwise. Next: "On hand, shared, not reserved", stock held against total demand, stock age with the staleness warning, and one section for each planning site (`#site-<id>`), sites in order: site icon plus name, linked to the site with `?fromMaterial=` so that its back control comes back here; "Needs 4, short 2" (danger), "Needs 1, stock unknown" (warning) or "Needs 2, not short for this site alone" (text); places in plain text beside the penetration icon, repeated ones merged ("L3, Riser 2 · PEX Pipe Ø25mm ×4"); and, only for short sites, "For all N penetrations at this site", the "Earlier decision, shortfall has grown" warning where relevant, and Wait plus Escalate (no "Waiting"/"Escalated" label; decisions live on the Decisions tab), with accessible names naming material and site. Unchecked sites come last, labelled as such. A material planned nowhere is not found |
| `/sites/[id]` | Site | Header back link: Sites by default, the material page when `?fromMaterial=` is present. Job ref and planned work as text ("Job ref QH-345", then "12 penetrations, 5 solutions"). Next the large signal, standing in for the banner: green "Crew can go" / red "Blocked · 2 shortages" / grey "Nothing planned for this site" (AC 52, §11); the operator row comes next (AC 55). An uncheckable site shows no signal but keeps its warning banner with "Try again". Blocked sites lack a summary banner; following the signal is the "Needs your decision" panel (AC 50, §10). After that: stock notice and age (absent if nothing is planned); a "Penetrations" heading with the overall number; filter chips (shortage, data-problem, acted) that stay pinned below the header. Total on the heading, subset totals on the chips. Acted = wait, escalation or substitute proposal; `?show=escalated` and `?show=waited` still select it. Chips count penetrations and toggle `?show=` (several = union; none = full list). All planned penetrations appear, a row apiece, sorted by place. Each row: penetration icon first, link to substitutes; within the link they display icon marks: problem kinds ("Unknown solution", "Doesn't fit", "No materials", "Invalid quantity", "Short material", "Stock unknown"), then its Decisions entries ("Escalated", "Waiting", "Proposed substitute" with a neutral swap icon), in tone colours. Problems show a count when repeated; decision marks are always numbered, and together they equal the count on the penetration's Decisions tab. With the log unreadable, rows show problems only beneath "Can't check decisions right now. Rows don't show them." Each mark's full wording ("Short material × 2", "Escalated") is used for both its invisible label and its tooltip; marks are not controls; reasons, figures and material links are on the penetration page. There are no ready marks. `?material=` narrows to a single shortage and combines with chips. No matches: "No penetrations match these filters." |
| `/sites/[id]/data-problems` | Redirect | → `/sites/[id]?show=data-problems` |
| `/sites/[id]/penetrations` | Redirect | → the site page, keeping `?material=` |
| `/sites/[id]/penetrations/[pid]` | Penetration (titled by place) | Header as on the site page. Under the title sit two link tabs: Solution (default) and Decisions, the latter with a count (`?tab=log`; both preserve `fromLog`). The tab strip divides the width in two above one rule; the active one carries a link-coloured underline and a tinted count, and no further rule separates the panel. Decisions: the penetration's own decisions and proposals, most recent first, in the `/actions` style; while its shortage persists, a material decision also says "Applies to all N penetrations at this site" and links (`?from=`) to the material page, where back brings the user to this tab; decisions on data problems, and proposals, are plain text; empty: "Nothing recorded for this penetration yet."; unreadable: no count and "We can't load this penetration's actions right now. Try again shortly." Solution: status lines for the nominated solution's data problems and shortages (a shortage reads "Short material: <name> · this site short 2 of 4" or "Stock unknown: <name> · this site needs 1" and links, with `?from=` set to this penetration, to this site's section of the material page; a substitute's line links likewise only if this site already lacks that material), then a two-column comparison of penetration and solution with every misfit flagged (AC 36). Substitutes: the notice "Catalogue match, not verified", then candidates one by one (short-material lines plus comparison table), each with "Propose this". If there is more than one candidate, a "Select candidate" menu (native select element, styled; while closed it displays the shield and "Solution 0451") acts as the heading and switches candidate; a sole candidate retains the shield-marked "Solution {code}" heading. With no candidates, the reason is stated. Data problems can be escalated from here, candidates or not. Material shortages are decided on the stock page |
| `/sites/[id]/materials/[materialId]` | Redirect | → `/materials/[materialId]#site-<id>` (AC 41) |
| `/actions` | Decisions | Header including the menu control. Sections by site, in site order (`#site-<id>`), each titled by icon and site name linked to the site; that title stays pinned beneath the header while entries scroll past. Inside: "Recorded actions", then "Proposed substitutes", newest first, or "Nothing recorded for this site yet." An unreadable site: "We can't check this site's actions right now."; nothing readable: "We can't load the actions log right now. Try again shortly." Material decisions open the material page at the site's section; decisions about data problems and proposals link to their penetration; resolved decisions are not links. Every outgoing link carries `?fromLog=<site>`, so the target's back control reads "‹ Decisions" and returns to `/actions#site-<id>`, popping history when the log is underneath; filter chips on the site page keep the parameter |
| `/sites/[id]/actions` | Redirect | → `/actions#site-<id>` |

Besides these: a not-found page plus a single error page offering a retry link. Data pages are always dynamic (never server-cached). Navigation leaves the current page visible until its successor is ready, without an intermediate full-page Loading view. Material pages are prefetched from short-material links. The landing page loads no data and is rendered statically.

### Site readiness banner

| Crew status | Banner | Icon |
| --- | --- | --- |
| clear | "Crew can go". Since the signal round this is the green signal's label rather than a banner (AC 52) | ticked circle, knob right |
| blocked | The site screen has no banner; row lines carry the status. Red signal and list alike show "Blocked" and give the number of shortages and of data problems. | stop sign (signal, list and every row) |
| nothing_planned | "Nothing planned for this site", as the grey signal's label | dashed ring |
| API 502 | "Can't check this site right now. Don't assume it's clear. Try again." | warning |

### Shortage (a site's section of the material page)

Site name; `Needs X, short Z unit` (or `Needs X, stock unknown`); the places using it, duplicates grouped; "For all N penetrations at this site"; the warning "Earlier decision, shortfall has grown" when an action has lapsed (no "Waiting"/"Escalated" label: decisions sit on the "Actions log" tab); then Wait and Escalate buttons. The penetration page shows that shortage as a single line, "Short material: <name> · this site short Z of X", linking here.

### Data problem (penetration page)

Reason in plain words: "Solution code 9999 isn't in the catalogue", "No materials recorded for solution 0393", "A material quantity is invalid for solution NNNN", "Solution NNNN doesn't fit this penetration: <fields>". Only Escalate is offered (there is nothing to wait for). Its decisions appear on the penetration's "Actions log" tab.

### Decision dialogs

- **Wait:** a small dialog; note optional; states "This does not release the crew."
- **Escalate:** dialog with Purchasing / Warehouse (required; an empty choice would cost an extra tap, hence Purchasing preselected), an optional note counted against 500, and the crew sentence again.
- **Propose a substitute:** needs a reason of 1–500 trimmed characters and warns that a manager must check the match.
- All dialogs are native `<dialog>` elements: focus is trapped, Escape closes.
- During submission the primary button reads "Sending…" and is disabled. Opening the dialog generates the idempotency key; double taps and retries use that same key.
- After success: it closes, reloads the page, and announces "Escalation recorded" (or the matching phrase) via a polite live region; a replay (200) announces "Already recorded".

### Empty and error states

| Case | Message |
| --- | --- |
| No candidates (`ok`, empty list) | For a penetration with a data problem: "No catalogue match for this penetration. Escalate instead." plus Escalate. Otherwise (shortages included, which belong to the material page): "No catalogue match for this penetration." alone, since the API has nothing to escalate |
| `substrate_incomplete` | "The catalogue entry for this substrate is incomplete, so we can't suggest substitutes." Where a related data problem exists (`pen-c-01`), Escalate is offered too. |
| `nominated_code_unknown` | "The nominated solution isn't in the catalogue, so we can't suggest substitutes." |
| Candidate availability `no_material_mapping` | "We can't tell if its materials are in stock." |
| Candidate availability `unknown` | "No stock record for one of its materials." |
| Candidate availability `short` | "Uses a material this site is short of." |
| Candidate availability `invalid_quantity` | "Its material quantities look invalid." |
| Empty sites list | "No sites to show." |
| Site `unavailable` in the list | "Can't check" |
| Log empty | "Nothing recorded for this site yet." |

### API error → message

| Code | Message |
| --- | --- |
| `validation_failed` | "Check the highlighted fields." |
| `payload_too_large` | "That's too long. Shorten it." |
| `shortage_not_found` | "That shortage no longer exists. Refresh to see the latest." |
| `stale_nomination` | "This penetration's nomination has changed. Refresh and try again." |
| `not_a_candidate` | "That solution is no longer a candidate. Refresh and try again." |
| `idempotency_key_reused` | "Something went wrong sending that. Close this and try again." |
| `upstream_unavailable`, `upstream_invalid` | "A system we depend on isn't available. Nothing was recorded. Try again." |
| everything else | "Something went wrong. Nothing was recorded." |

Raw server error text never reaches the screen.

## 4. Copy rules

Write plainly in sentence case. Avoid exclamation marks, "please" and "successfully". Buttons start with a verb: Wait, Escalate, "Propose this", "Send escalation", Cancel. Two API phrases are reproduced verbatim: "Catalogue match, not verified" and "On hand, shared, not reserved". "Compatible" and "approved" never appear.

## 5. Accessibility, WCAG 2.2 level AA

- A single `h1` per page (first inside `main`, never in the header), headings in order, landmarks: exactly one `banner` (the header, which on inner screens contains back) and exactly one `main`.
- Chips and banners combine text with an `aria-hidden` icon, so colour never carries meaning alone.
- Every control has a visible focus ring; tab order is logical; dialogs hand focus back to their opener.
- Each input has a visible label; validation messages are read out beside the relevant field; character counts are plain text.
- Light and dark themes both meet contrast requirements, covering text, chips, banners, focus outlines.
- Outcomes are announced via a polite live region.
- `lang="en"`; 200% zoom without lost functionality.

## 6. Code structure and tests

Components are under `src/ui/`, views under `src/app/`. A small pure module turns domain status into label, icon and tone; a second turns API error codes into messages. Both are framework-free TypeScript with unit tests that need no DOM library.

Browser tests run in Playwright (already set up) with `@axe-core/playwright`:

- the demo script at 375px: open Quayside House, escalate the sealant, confirm the escalation and that the crew remains blocked, open the substitutes for `0438`, propose `0451`, locate it in the log through the menu, and finally inspect Northgate Depot's data problems
- the escalate flow completed with the keyboard alone
- no serious or critical axe violations per screen, light and dark
- every screen free of sideways scrolling at 375px
- forced failure: with the stock stub down, the "can't check" banner shows and "Crew can go" never does

## 7. Decisions taken at approval (4 Oct 2026)

1. Defaults approved as sketched.
2. Playwright Chromium installed (`npx playwright install chromium`, ~363 MB including the headless shell), launching at a 375px viewport. Installation happened outside the worker sandbox, which cannot install browsers.
3. `frontend-engineering` and `ui-portability-baseline` joined the project profile.
4. No answer came on the failure demo, so no fault switch was built; the "can't check this site" banner is covered by tests only, and a preview-only switch stays possible.
5. Grok delegation runs on the default model, not the fast flag.

## 8. Not in this slice

Login; offline data or write queues (the field-use round contributes connectivity state alone); push notifications; changing or withdrawing stored actions; site search; map or floor-plan views.

## 9. Changes after review (from 4 Oct 2026)

Three separate reviews of the initial UI build led to these design changes. Copy lives in `src/ui/messages.ts`.

| Topic | Implemented |
| --- | --- |
| Empty substitutes | "Escalate instead" (sentence and button) appears only for penetrations with a data problem (§3 table) |
| Sites list failure | Entire list: "Can't check the sites right now. Don't assume any site is clear. Try again." One site: chip "Can't check" |
| Site with only data problems | No banner; the count on the Data problems chip gives the reason, and the chip in the list carries the numbers. |
| Server unreachable | "Couldn't reach the server. The decision may not have been recorded. Send again to retry; it won't be recorded twice." A retry sends the same idempotency key the dialog created |
| Dialog in flight | Neither Escape nor Cancel closes it mid-request. Every response refreshes the page and is announced |
| Live region | Held in memory; empty after each full page load |
| Substitute cards | Only material name and per-install quantity. On-hand numbers are left out because that screen lacks the pooled-stock label |
| Unknown values | A crew status the UI does not recognise triggers the can't-check banner. Unknown shortage states and action statuses display "Unknown", never "Escalated", "Resolved" or "Crew can go" |
| Character count | Counts trimmed text, matching the limit |
| Inputs | Field borders darkened to ≥ 3:1 on either background, plus a visible invalid state |
| Links | Data-problem cards link to their penetration page; unavailable screens retain their back link |
| Error screens | `error.tsx` and `global-error.tsx` output fixed text with a retry button; error message and digest are never shown |

**Navigation shell** (that same day, following phone testing). The demo bar went to a sticky footer. The title moved into a sticky header; inner screens got a chevron row, labelled with the parent, directly beneath, which superseded the wide Back button (review moved the chevron from inside the header to that row). The site reference, now "Job ref CC-A2", appears only under the title of the site screen, where an escalation would cite it; it was removed from list cards on 6 Oct. The whole page scrolls, not an inner container, so the browser restores position on back. *Superseded: both demo bar and Demo tag are gone, and the title lives in the page body.*

**Usability round** (5 Oct, reviewing against the brief's UX question):

| Topic | Implemented |
| --- | --- |
| Sites list | Blocked chips give the reason: "Blocked · 2 shortages", "Blocked · 1 shortage, 4 data problems" |
| Stock age | "Stock figures from 3 Oct 2026, 08:00 UTC (2 days old)". Beyond one day it adds "These stock figures are more than a day old. Check with the warehouse before relying on them." It warns only and leaves crew status alone; hidden for nothing-planned sites |
| Shortage state | The sole state label is "Earlier decision, shortfall has grown". "Waiting" and "Escalated" are shown as row marks and in Decisions (see the material tabs entry) |
| Units | `each` is dropped ("short 2"); other units take plurals ("2 cartridges", "2.5 metres") |
| Penetrations | Listed on the site page, grouped as "Solution 0438 · 4". Rows read "{floor}, {location} · {service} {size}" with "Substitutes ›". `?material=` shows "Using {material} · n of total" plus a "Show all" link |
| Ratings | "Fire rating: 60 min integrity, 30 min insulation" ("no insulation rating" if absent). Candidates add "Supplier ref …" and either "Meets the required rating" or "Below the required rating", relative to the penetration |
| Catalogue notice | "Catalogue match, not verified" appears only when the list holds one candidate or more |
| Decisions | Wait and Escalate dialogs gain "This records your decision here. Nobody is notified automatically yet." |
| Decisions | Status words "Still applies" (neutral), "Shortfall has grown since" (warning), "Shortage resolved"; the duplicated site name was dropped |
| Failure | Every can't-check screen gets a "Try again" button that reloads |

Documented as limitations rather than implemented: a tab that stays open shows its original banner until navigating; the three dialogs duplicate form code; no E2E test exercises the "Earlier decision" badge, because sample stock is fixed during a run (the API tests cover it). Raised in the usability review and deferred: routing data problems to someone other than purchasing; a "substitute proposed" badge on shortage cards; a summary of what was checked on clear sites; a work date for each site. Penetrations sharing place and service are indistinguishable (the sample has four such); production data would add the pin reference from the floor plan.

**Landing page** (6 Oct, user decision). Out went the footer demo bar; in came a landing page at `/` and a Demo label on each header. The sites list relocated to `/sites` from `/`; all `/sites/...` URLs kept their form, and "Sites" back links target `/sites`. *Later superseded when the Demo tag went away.*

**Nav header** (6 Oct, user decision). Back moved out of its own row under the header and became the first row of the sticky header. **Tabs on the site screen** (same day, user's idea): the three routes `/sites/[id]` (Shortages), `/sites/[id]/data-problems` and `/sites/[id]/actions` used one frame containing job ref, readiness banner and a counted tab bar, the banner always above the tabs. *Superseded by "Site list and actions panel" and "Drawer and materials".*

**Title and banner** (6 Oct, user decisions). The title left the header for the page body as an unclipped `h1`, leaving a one-row header that held the back control plus the Demo tag. With counts on the tabs, the banner on site screens became "Blocked: hold the crew."; AC 34 was rewritten accordingly. *Superseded: the Demo tag went, leaving only the back control in the header.*

**Sticky tabs** (6 Oct, user decision). The site's tab bar pinned itself under the nav header on scroll to keep counts in sight; this needed a fixed header height (`--app-bar-height`). *Superseded by "Site list and actions panel" and "Drawer and materials".*

**Kind icons** (6 Oct, user decision). Small outline glyphs in secondary text colour tell what kind of object something is, not what state it is in. They are `aria-hidden`; they never borrow a status glyph (circle, triangle, tick, stop sign) or a status colour.

| Kind | Icon | Used on |
| --- | --- | --- |
| Site | building | sites list cards |
| Material | box | materials list rows |
| Solution | shield | "Nominated solution", the heading of a single substitute, and the "Select candidate" control whenever that menu serves as heading |
| Decision | clipboard | the Decisions menu entry (log entries show their decision's mark instead: ↑ for escalated, a clock for waiting, a swap for proposed, which are the marks counted on rows) |
| Penetration | an opening crossed by a service | penetration list rows |
| About | an "i" inside a rounded square | the tab bar's "Guide" |

Not used on filter chips (width limits at 375px), banners or status chips (which show status).

**Stop icon** (6 Oct, decided by the user). Blocked and short now use the barred octagon; the previous cross resembled a "dismiss" control.

**Planned work** (6 Oct, decided by the user). Every site tab printed the size of the checked work beside the job ref, based on planned penetrations and distinct nominated solutions; nothing shown when nothing is planned. Penetrations never get ready marks: with pooled stock none of them can honestly be declared ready. A dedicated Penetrations tab was weighed and postponed. *Superseded by "Site list and actions panel" and "Drawer and materials".*

**Penetration list** (6 Oct, user decision). Turning the planned-work counts into a 44px link ("12 penetrations, 5 solutions ›") that pushed `/sites/[id]/penetrations` made them navigable, whose rows reused the shortage card's `PenetrationGroups`. *Superseded likewise.*

**Links from shortage cards; the Substitutes page** (6 Oct, user decisions). Expanding penetration lists inside shortage cards were dropped; the affected count instead linked to the Penetrations page filtered on the material (filtering worked only for materials short at that site; for other materials the unfiltered list appeared with a note, so it was never empty). Data-problem cards still linked straight to their single penetration. The Substitutes page dropped its "Actions log" button, since the log was a site tab. *Superseded likewise.*

**Penetration page** (6 Oct, user decisions). Titled by place, in three parts. Penetration: grey labels with values (Service, Required rating). "Nominated solution": site-specific problems as coloured, iconised status lines (data problem: red with warning icon; short material in use: red with stop sign; unknown stock: amber). "Short material" lines linked to `/sites/[id]/materials/[materialId]`; unknown stock stayed text. Substitutes: candidates under the not-verified notice, or a status line giving the reason for none, followed by a full-width primary Escalate. Rows on the Penetrations list reused those status lines, the short-material line being its own link next to the row (the row already linked to its penetration). *Superseded: the Penetration block was folded into the comparison table under "Nominated solution"; see "Demo tag removed and solution fit".*

**Material stock page** (6 Oct, decided by the user). Tapping the red line for a short material took the user to a per-site stock view for the material: `Need X, have Y, short Z` (or `Need X, stock unknown`), pooled-stock notice, stock age, and then the number and places of the planned penetrations using it, written as text so nothing linked back to the page that opened it. For a material not short here it said "That material is not a shortage on this site." without numbers, so a resolved shortage could not appear as zero. Once the site screen lost its shortage cards, Wait, Escalate and decision state were moved here. Scope (same day, user decisions): because a shortage is keyed by site and material, a single wait or escalation applies to all penetrations needing it, which the page states ("For all 4 penetrations at this site"). Need line and places heading carry the site name, because on-hand stock is shared across sites. Places stay unlinked (a link would loop back), repeats are merged, and a single upward link opens the material-filtered site list. *Superseded: the page covers all sites now; see "Drawer and materials".*

**Site list; actions panel** (6 Oct, decided by the user). The site screen became the penetration list. The three categories became chips: toggle links combining as a union, counting penetrations, including zero; with unknown readiness no number is displayed; the chip row stays pinned under the header. A penetration counts once as Acted if a shortage containing it, or its own data problem, is currently waiting or escalated, or if someone proposed a substitute for it. Outgrown or resolved decisions keep their row mark and log entry, which means a marked row may still not count as Acted. Blocked sites drop the summary banner, since rows already show their shortages and data problems. Row chips name just the problem kind ("Unknown solution", "Doesn't fit", "No materials", "Invalid quantity", "Short material", "Stock unknown", with "× N" when several), and the penetration page carries reasons and links to stock pages. Clear sites still say "Crew can go." Unknown stock appears as a row line and never as clear. The planned-work line stays unlinked. `/penetrations` redirects here keeping `?material=`; `/data-problems` → `?show=data-problems`; `/actions` → `?log=open`. Back then, site and penetration pages had a header button for the log, which opened a panel on the right (full width at 375px) listing actions and proposals. Wait and Escalate for a shortage sit on its stock page; Escalate for a data problem remains on the penetration page, even alongside substitutes.

**"Actions log" links** (6 Oct, user decision). Entry titles link to the work they concern: proposals and data-problem decisions open their penetration; material-shortage decisions open the site screen filtered by material (`?material=`) and lose the link once resolved. Proposals name the place: "Proposed substitute for L3, Riser 2: 0438 to 0451".

**Decision colours** (6 Oct, user decision). Previously "Waiting" and "Escalated" shared amber plus a warning triangle. Because a decision is neither go nor alarm, each got a colour and icon of its own, separate from crew colours:

| State | Colour | Icon |
| --- | --- | --- |
| No decision so far (not shown any more) | grey | dashed circle |
| "Waiting" | blue (`--info-*`) | clock |
| "Escalated" | purple (`--escalation-*`) | up arrow |
| "Earlier decision, shortfall has grown" | amber | warning |

Wait and Escalate buttons reuse these icons but keep neutral styling; Escalate turns primary only when it is the page's principal action. In the log, waits and escalations carry their coloured icon; proposals keep the generic decision glyph. The two added colour pairs reach ≥ 4.5:1 against chip background, page and card, in both themes, verified by a unit test.

**Demo tag removed; solution fit** (6 Oct, user decisions). No header carries a Demo tag; top-level screens had no header at that point. In the "Nominated solution" section the penetration page lines up penetration and solution field by field (supplier ref; orientation; substrate; service; size; both fire ratings); each misfitting field shows "…, doesn't fit" plus the stop sign. Such a nomination is listed among the data problems too (AC 35, 36).

**Truncated substrates** (6 Oct, user decision, option A). Truncation right after the family name means no fit, on whichever side it occurs. Instead of two identical strings the comparison explains why: "FR plasterboard, (cut off)" versus "FR plasterboard, (cut off in the catalogue), doesn't fit".

**Drawer and materials** (6 Oct, user decisions). A drawer menu, modelled on the user's other apps, exposed two top-level destinations, Sites and Materials. Because stock is pooled, the material view spans sites: `/materials` compares each planned material with the one pooled stock, showing a total over sites; `/materials/[id]` has a section for each site, where its shortage gets a wait or escalation (a single decision applies to every penetration of that site needing the material). The per-site material page turned into a redirect. Penetration pages summarise shortages inline and link to the material page; there, back leads to the penetration (`?from=`), because after a lateral jump a back control named after the parent would go to the wrong place. *Supersedes the earlier material stock page entry.*

**Back pop** (6 Oct, user decision). Back used to trigger a full navigation, during which the root Loading view covered everything until the dynamic page had rendered. It remains a link pointing at the named screen; if that screen is directly below in history, it pops back and the page appears instantly. No added transition.

**Opening a material page** (6 Oct, user decision). Same issue with the short-material link: as a new request to a dynamic route it allowed Loading to hide the penetration until rendering finished. Loading was removed: now the penetration remains visible until the prefetched material page is ready.

**Substitute heading** (6 Oct, user decision). With the "Select candidate" menu shown, the "Solution {code}" heading beneath it is dropped; the shield moves onto the closed control next to the chosen name. The opened native list remains text, as options cannot hold icons. A single candidate keeps heading and shield. In the comparison table, the column header "Solution {code}" remains. The menu is labelled "Select candidate".

**Penetration list heading** (6 Oct, decided by the user). The site screen gets a "Penetrations" heading with the total planned count above the chips. Chips keep counting subsets and remain pinned; the heading itself scrolls out of view. Rows start with the penetration icon.

**Material page sites** (6 Oct, decided by the user). Each site heading carries the site icon, each place the penetration icon. Following the site link opens the site, whose back control returns to the material page, popping history when that page is underneath; direct visits still follow the link. A missing, duplicated or unknown `fromMaterial` leaves back pointing to Sites. Filter chips preserve `fromMaterial`. Places remain text.

**Side menu** (6 Oct, decided by the user). The drawer's Close button became a dismiss icon with accessible name "Close menu". Sites, Materials, "Actions log" and "About this demo" each got a leading icon.

**Landing page menu** (6 Oct, decided by the user). The landing page adopted the menu header of Sites and Materials, with "About this demo" as current. The sticky "Open sites" bar was dropped; the drawer's Sites entry is the route into the list.

**"Actions log" in the menu; decision popovers** (6 Oct, user decision). The header "Actions log" button and its panel were removed: a header button did not indicate what work it related to, and its links jumped sideways. The log turned into a top-level side-menu page, split by site. Decisions indicate their scope: rows carry an "Escalated" or "Waiting" chip, a button next to the link (not nested), which pops up the newest decision natively. `?log=open` has become a no-op. *This replaces the panel parts of "Site list and actions panel" and "Actions log links".*

**"Actions log" follow-ups** (7 Oct, user decision). Site headings in the log show the site icon and remain pinned under the header as entries scroll. Pages opened from the log return to it: links from the log append `?fromLog=<site>`, accepted only when it matches the target page's site (or one of a material page's sites); back then reads "‹ Actions log" and pops history when the log is underneath, mirroring the material page's behaviour for sites. A material page entered from a penetration keeps returning to that penetration first.

**Row marks; penetration tabs** (7 Oct, user decision). Chips cluttered the rows, so problems and decisions were redrawn as counted icon marks inside the row link, full wording kept as hidden label and tooltip. The popover was removed. A penetration's decisions moved to an "Actions log" tab on its own page, next to Solution. *This replaces the chip and popover from "Actions log in the menu".*

**Material tabs; decision counts** (7 Oct, user decisions). Since decisions concern materials and solutions, the material page received Stock and "Actions log" tabs, matching the penetration page. "Waiting"/"Escalated" labels left its site sections in favour of one design everywhere: a page's decisions live in its log tab. The "Earlier decision, shortfall has grown" warning stays because it calls for a fresh decision. Decision marks on rows are numbered (proposals counted), and substitute proposals make a penetration Acted.

**Responsive side menu** (7 Oct, user decision). Phones kept the drawer; at 1024px and above the menu turned into a column beside each page that could collapse into an icon rail, its state stored and applied pre-paint. Because those pages hid the top-level header, `--app-bar-height` was set to 0, letting sticky headings reach the top edge; inner pages kept the back bar and offset. About moved from `/` to `/about-this-demo`, and `/` redirects with a temporary 307 so the root can later serve a real page without browsers caching the redirect. Grok built it (brief: `docs/agent-work/28-responsive-nav-brief.md`). Drawer and side menu both held a Theme control, so each radio group needed its own `useId` name; with a shared name the browser merged all six radios into one group so that selecting in one cleared the other; this surfaced in the first E2E run, because the worker's sandbox lacked a browser.

**Bottom tab bar** (17 Oct, user decision). For widths under 1024px the hamburger and left drawer of top-level pages were replaced by a bottom tab bar with identical entries (Sites, Materials, "Actions log", "About this demo"). It exists only on top-level pages; inner screens keep their back control instead. Theme selection moved from the drawer's footer into the header of top-level pages. The ≥ 1024px side menu remained.

**UI refresh** (19 Oct, user decision). Intended to diverge further from a competitor's look without behavioural change. The sites list became a masonry layout (two columns from 672px, signal kept at 280px; a single column on phones, chosen by the user over two narrow columns that would have shrunk the signal). Menu entries were renamed with URLs unchanged: Sites became Projects, Materials became Inventory, "Actions log" became Decisions (including per-page log tabs), and "About this demo" became Guide. The Guide text was rewritten keeping its facts and links. All buttons adopted the site cards' style: bold label, same shape. The four sample sites were given new names and job refs (see `data/sample/sites.json`).

**Company colours** (19 Oct, user decision). The former palette (blue, pale grey, pale pink) was replaced with the company's #000000 black and #fed105 yellow, colour-picked from a screenshot since the company site rejected scripted requests. Chrome is black in either theme (connection strip, every header, the tab bar, the side menu); yellow is used for the active entry, for whichever theme is selected, for the Online switch, and for focus rings. Buttons and the selected theme are black-on-yellow; a pale yellow fills cards and decision chips; links are black in light mode and yellow in dark; the dark page background is black. "Can't check" adopts the brand yellow. The green and red that encode go and stop were kept as they were, because the crew decision depends on them (AC 52 and 53); the token contrast suite still passes. `theme-color` for the browser toolbar is black.

**Connection colour; demo sign-in** (19 Oct, user decision). In online state the connection row shows dark text on green; offline, red with white text (reusing the signal's go/stop tokens); during checks, black; the text labels remain. On a first visit a demo sign-in sits over every page: username; password (with show/hide); role selection (Team leader / Operator); "Forgot password", which explains that nothing goes out; and "Create account" asking for username, optional email, role and the password twice. Any credentials pass; afterwards header and side menu greet "Hi, <username>"; "Sign out" is in the Guide's top-right corner. localStorage keeps username, role, password-free account records and whether someone is signed in; `data-auth="in"` is applied pre-paint just like the theme, preventing the overlay from flickering for returning users. The page underneath is inert while the overlay is up. The role is stored but has no effect yet.

**"Pick check" and pick-error reports** (19 Oct; user design, canvas "Team Leader Stock Readiness UI", artboards 1–4). Applies to second-level screens; home and top-level pages stay as they were. Below the signal and the panel, the site screen now includes Picks (AC 62, 63): result card of the check; queued reports; the picker's card (name tagged "(sample)", role, latest action, phone, email, Call, Email); materials planned against picked, each labelled; and a disabled button explaining why. A new "Pick check" page (`/sites/<id>/picks`, AC 64) shows one card per issue plus "Report to warehouse"; the report page (`/sites/<id>/picks/report`, AC 65) implements the design's form. When offline, all of it is presented in amber as last known, and reports are held on the device (AC 66). Deviations from the canvas artboards: the button is labelled "Send the crew" rather than "Crew can go": a disabled control must not resemble go, and AC 9 prohibits that wording for unchecked sites; once enabled it sends the operator a text. Since the company palette was adopted, these screens use the product's black, yellow and status colours, not the artboards' blue. Sites without a pick list show no picker card, so nothing-planned sites still offer no call (AC 57). "Wait for re-pick" stores nothing. Photos stay on the device.

**Header round** (19 Oct, user decision). Connectivity is more important than theming, so the Online switch replaced Theme at the right end of the header, which itself became sticky on all screens (inner and error ones included) and keeps the switch permanently visible. The switch is drawn as a pill coloured like the old connection row: online, green with dark text; offline, red with white lettering and "Updated 08:02"; header black while checking; wording kept. The picker's last action moved from a row above the header to the first line beneath it. Theme selection (System, Light, Dark) now closes the Guide in "On this device", since it is configured once per device. Wide screens switched to the phone layout: header on top, tab bar at the bottom with entries inside the 45rem column. Removed: side menu, collapse button, stored `data-sidebar`; the head script is left with theme and demo sign-in only, and sticky headings honour the header offset at all widths. Requirements: FR17, FR18, FR24; AC 37, 47, 48, 58.

**Map placement** (19 Oct, user decision). Each project map moved from the bottom of the card to between the project name and its signal, sized to the signal's exact width (at the bottom it had matched the row beneath, not the card). Trip line and "Directions" stay at the bottom. AC 74.

**Fallback origin** (19 Oct, user decision). Distances and drive times now have a default starting point instead of waiting for the device position, as a demo requires. Until there is a device position (no tap yet, locating, refused, failed), trips originate at Auckland city warehouse (OpenStreetMap places the building at −36.8643, 174.7661), and each card's line says so. The device position takes over only once it has arrived. "Show distance and time" was relabelled "Use my location", and a new line above the list names the origin of distances. AC 75.

## 10. Field-use round (18 Oct 2026)

Source: the author's notes, specifically the UI change list (QAntum UI改进清单), implemented on plan A. Requirements: FR18–FR21, AC 48–51. Copy: `src/ui/messages.ts`, `src/ui/contacts.ts`, `src/ui/action-needed.ts`.

| Topic | Implemented |
| --- | --- |
| Connection bar | A narrow light-grey band sitting over each screen's header; it does not stick, leaving the sticky offsets of header and chips untouched. Left side: "Picker last action · 3 Oct, 21:00": stock-feed time in the device's own time zone, or "unknown" if the feed is unavailable. Right side: the state as text ("Online"; "Offline" with an amber "Updated 08:02" below; or "Checking") and a toggle: on = dark capsule, knob right; off = grey, knob left; hit area 76 × 48. It is a genuine control (`role="switch"`, named "Online", state described for assistive tech, e.g. "Network offline, last updated 08:02"), and off means working offline. *After the header round (§9) the toggle became a pill on the right of each sticky header, with the picker's latest action as the first line under it.* |
| Online | Requires the browser network flag, a reply from `GET /api/health`, and the toggle on. Polled every 30 s, on network recovery and on tab visibility; never while working offline. Shows Checking until the first reply; after re-enabling, Online appears only once the server replies. Transitions are announced politely ("You're offline", "Back online"); the first reply is not |
| Offline | A warning-tinted banner fixed to the bottom: "You're offline. You're seeing data from 08:02. Don't treat it as current." The "Offline details" button inside it opens a native dialog with last online time, the age of this screen and of the stock figures, anything queued ("Nothing": decisions never queue), "Sync now" (primary) and "Last synced 14:32". Decision dialogs refuse to submit offline and explain why |
| "Sync now" | Contacts the server; on success leaves offline mode, refreshes, stores the sync time on the device and announces "Synced"; if unreachable reports "Still offline. Nothing was sent." |
| Site cards | Big stacked cards, no carousel and no masonry: one or two sites per day per leader fit on a single screen. Name: a 48px link with chevron; chip unchanged; then a single main action. Clear: "Operator · Mere Tane", followed by "Text operator" (an `sms:` link prefilled with site name, job ref and the phrase "shared, not reserved") and "Call operator" (`tel:`); the operator hears first and informs the picker, sparing the leader a round of calls. Blocked: "Sort out shortages" (to the panel) or "Check data problems". Unavailable: "Try again". *Revised during the signal round: the big signal took over from the chip, and operator messages were extended to blocked and unchecked sites (§11).* |
| "Needs your decision" | Shown on blocked sites instead of a banner: "Can't go yet: 2 shortages"; next Short: per material, bold figure and unit, a "4 penetrations affected" link, plus Wait and Escalate; next comes Data problems, linking to its filter; "What each option does": a line apiece for Wait, Escalate and Propose a substitute; "Covered for this site alone" (plus "Stock is shared and not reserved, so another site can still use it first."; the fixed phrase "On hand, shared, not reserved" still appears once per screen); and "Ask before you decide": picker and operator, each with Call, combined into a single "Picker and operator" row when the roles coincide. A red rule runs down the left; the body keeps the page background so contrast is preserved |
| Sizes | Body 18px, headings proportional, every target 48 × 48 (E2E target checks were raised to 48) |

Retained from before: status icons. The list wanted shapes rather than colours (● can go, ▲ attention, ■ cannot go); the existing tick, triangle and stop sign meet that already and stay.

Declined for now:

| Item from the list | Reason |
| --- | --- |
| Jump straight into the site when only one exists | The site's back control points at Sites, which would immediately bounce back in. A lone card already presents status and its main action with zero taps |
| Push notification to the operator inside the app | There is neither an app nor a push service. "Text operator" opens the leader's own messaging app, which copes with weak signal |
| Decision cut-off with a safe default | Without a planned departure time per site, nothing should decide on its own |
| Treat stale stock as "Can't confirm" rather than "Crew can go" | It would change the agreed stale-stock rule (warn only), and because the sample stock dates from 3 Oct 2026 every site would show "Can't confirm". Requires a decision plus a demo mode with fresh stock beforehand |
| Problem reports with photos, AI-filled forms, stocking errors, a login for the demo, dispatching part of a site, packing slips, user preferences | Each requires storage or rules beyond this slice; they belong to the next iteration |

## 11. Signal round (18 Oct 2026)

Follow-up from the author after §10: display the operator's contact on clear sites, tell the operator about missing parts to avoid wasted trips, and render status as a large I/O toggle usable with gloves and combining colour with shape. Requirements: FR19, FR22, FR23; AC 49, 52–57. Rules: `src/ui/signal.ts`, `src/ui/contacts.ts`. Rendering: `src/ui/SiteSignal.tsx`, `src/ui/OperatorRow.tsx`. Colours: the `--signal-*` tokens in `globals.css`.

| Topic | Implemented |
| --- | --- |
| The toggle | Full-width capsule ≥ 88px tall: 72px knob on one side, a bold 24px status label above a one-line hint, and on the other side an end glyph modelled on iOS On/Off marks (an "I" bar for on, an "O" ring for off). Knob right = on, knob left = off, like the physical switch it mimics |
| Colour plus shape | States are told apart by colour, lightness, knob form, knob placement and end glyph, so recognition never needs colour vision. Go: bright green, dark ink, a ticked dark circle, knob on the right, "I". Blocked: deep red, white ink, a white barred stop sign (the chip and row icon; a cross would read as dismiss), knob left, "O". Can't check: amber, dark ink, black edge, warning-triangle knob on the left. Nothing planned: muted light grey, dashed-ring knob on the left. On purpose, green is the light capsule and red the dark: the original palette had green and red of equal darkness, and in a greyscale screenshot the two capsules looked almost the same, leaving colour-blind leaders, or anyone in glare, with shape as the only cue |
| Colour values | Go `#3ddc6c` with `#04130a`; blocked `#b3001b` with white; same in both themes. Edges `#006618`/`#7a0012` (light) and `#3ddc6c`/`#ff6b5e` (dark). Can't check `#ffc107` (dark theme `#ffca3a`) with dark ink. Nothing planned `#e3e5e8` with `#1a1a1a` (light), `#3a3f46` with `#ececec` (dark). Label/knob vs fill ≥ 7:1; edge vs page and card ≥ 3:1; go's lightness exceeds blocked's by a 3:1 ratio or more; a unit test parses the stylesheet tokens and enforces all three. Fills are flat colours so automated contrast checks can measure them |
| Single tap | For clear or blocked sites with an operator the signal is a `tel:` link, equivalent to "Call operator", because calling is the most frequent action. The phone confirms before dialling, so a gloved slip rings nobody. "Call operator" and "Text operator" remain separate 56px buttons. The signal never opens a text. An uncheckable site's amber button reloads and never calls. For nothing planned, or with no operator: a static box, with "No operator assigned" as the hint in the latter case |
| Hint text | "Tap to call". It omits the person's name to leave room for the label at 375px; the operator row beneath names them and describes the signal for screen readers. Accessible name = label + hint, avoiding repetition of site or button names |
| Messaging the operator | Any site with planned work and an operator shows "Operator · Name", "Text operator" and "Call operator". The message is prefilled, the leader sends it, and its wording depends on site status (AC 55). Clear: "...materials for the planned work are on hand (shared, not reserved). You can go." Blocked: "...parts are NOT complete. Don't go yet. Short: A; B; C and 2 more. Also 4 data problems to check. I'll message you when it's sorted." (semicolons separate names because material names contain commas; unknown stock reads "(stock unknown)"; with only data problems it says the materials cannot be confirmed). Can't check: "...I can't check the materials right now. Don't go until I confirm." Only the clear message says the crew may go |
| Sites list | Each card: name, signal, "Short:" with at most three materials then "and N more" (blocked only), operator row, "Sort out shortages". the short materials arrive with `GET /api/sites` (AC 56), so one request suffices |
| Site screen | Below the job ref: signal, operator row, then "Needs your decision". The panel retains its own "Ask before you decide" contacts, which serve to ask picker or operator, whereas the row above serves to inform the operator |

Declined for now:

| Idea | Reason |
| --- | --- |
| A functional toggle that releases or holds the crew | The app never releases a crew (AC 50); a toggle that seemed operable would encourage precisely that. The signal reports state and its knob never moves |
| Sending the message from the app | No messaging service exists; the leader's own messaging app opens prefilled and works on weak signal |
| Messages listing quantities | Two or three lines get read; the figures sit one tap away in the decision panel |

## 12. On-site review (19 Oct 2026)

From the author: even with a line marked Picked and a pick list matching the plan, the site can still discover a problem: an item that does not fit, the wrong item entirely, or damage in transit or during the job. The picker must then pick again, sometimes for same-day delivery. Hence an on-site second check for every material, plan-matching lines included. Requirements: FR28, AC 67–71. The report form extends the canvas's "Report to warehouse" (artboard 4).

| Topic | Implemented |
| --- | --- |
| Review per line | Rows of "Materials · planned vs picked" keep the material-name link to the "Pick check" card and add a second line with the label ("Matches plan", "Part-picked", "Missing parts", "Wrong spec", "Reported on site"), with a Review button next to the label. The Review button measures 56px with a dark 2px border; its name is "Review" and its description the material, so assistive tech identifies the line. Present both online and offline, on all lines whatever their label, and on each "Pick check" card |
| Row annotations | Below the amounts: either an open site report, danger-toned with stop mark and a left bar ("Reported 14:32 · Damaged · 2 affected · same-day delivery asked"), or, once reviewed, "Checked on site 14:32" with a tick. Lines that are reported and also fail the pick check keep their label and gain this line |
| Review page | `/sites/<id>/picks/review?line=<line>`: the line card (amounts, where used, label, open report if any, picker), the question "Is it right on site?", and two answers sized like the site signal: "Yes, it's right": go green, dark ink, tick; "No, something's wrong": stop red, white ink, stop mark; both ≥ 88px high and as wide as the screen. A green top border marks the card for a plan-matching line, red for one with an issue |
| Yes, it's right | Stores the review immediately under a fresh idempotency key ("Checked on site."). With no connection or no response, it is held locally under that key the way reports are; on the site screen "1 review waiting to send" appears, separate from report counts, and the review goes out by itself after reconnection |
| No, something's wrong | Opens the "Report to warehouse" form for that line with no kind selected, so the leader has to state the finding ("Choose what's wrong."). Site kinds are listed first ("Doesn't fit" on site; "Wrong item"; Damaged in transit or while working), then the pick-check kinds. Added fields: "How many are affected?" (whole number, optional) and "What's needed?" (preselected "Re-pick for the next delivery", alternative "Same-day delivery"). Back goes to the review |
| After a report | The line becomes a "Reported on site" issue: Picks shows "Not ready", attributing the problem either to picking or to the site, and "Send the crew" remains disabled. Any later "Yes, it's right" closes the report. Offline, the label becomes "Was reported on site" in amber |

Declined for now:

| Idea | Reason |
| --- | --- |
| Warehouse-side closing of reports | Warehouse systems are read-only to this app, and only people on site can verify the replacement |
| Turning the big site signal red on a report | The signal reflects stock (AC 52–57) on both list and site screen; the pick gate is "Send the crew". Including picks in the signal requires reading picks for every site in the list, which is future work |
| Uploading the report photo | No upload service exists; as AC 65 states, the photo remains on the phone |

## 13. Projects filter (19 Oct 2026)

Author's request: reuse the readiness filter from the qantum-stock list of work packages ("Search Work Packages"; "Readiness" with "All statuses", Ready, Shortage, Unknown; Apply; Reset) and add it to the projects list, at the top. Requirements: FR29, AC 72–73.

| Topic | Implemented |
| --- | --- |
| Form | Below the "Projects" heading, grouped in a card: "Search projects" with placeholder "Name, job ref or address" (max 100 characters); "Readiness" ("All statuses", Ready, Shortage, Unknown, labels borrowed from qantum-stock); then Apply (primary) and Reset. On phones the controls stack; at 672px and up, search and Readiness share a row and the buttons align right underneath. Every control is 48px |
| Meaning of each option | Ready: projects with a crew free to go (green signal). Shortage: blocked ones (red). Unknown: projects with nothing planned (grey) and uncheckable ones (amber). "All statuses": everything. Uncheckable projects never appear under Ready or Shortage; unrecognised statuses count as Unknown |
| URL | A GET form (`/sites?q=quay&status=shortage`): no JavaScript required, the browser's back button reverts filters, and filtered lists can be shared as links. Missing, unknown or duplicated status means "All statuses". Reset links to `/sites` |
| Result | While filtering, a line beneath the form says "2 of 4 projects"; with no match "No projects match these filters." replaces the list. The list is labelled "Projects" for screen readers |

Declined for now:

| Idea | Reason |
| --- | --- |
| Searching solution codes or services (as qantum-stock can) | Nominations are not loaded for the projects list, and putting codes into `GET /api/sites` would bloat that response for just four projects; penetration filtering is already available on the site screen |
| Apply-on-change without the button | qantum-stock relies on explicit Apply/Reset, and a button prevents a reload after each stray gloved touch |

## 14. Project maps (19 Oct 2026)

Author's request: one map for each project shown in the list, navigation from the device's position when tapping the map, and both distance and journey time. Implemented with Mapbox GL JS following its npm getting-started guide. Requirements: FR30, AC 74–76.

| Topic | Implemented |
| --- | --- |
| Map | A 160px-tall band between the project name and the signal, matching the signal's width (relocated from the card's bottom on the same day: §9, "Map placement"). It uses the Mapbox streets style, centres the project at zoom 14, and drops a pin whose colour follows the signal (green/red/amber/grey). Panning and zooming are disabled: gloved scrolling through the list would be hindered by a map that grabs the finger. It loads only once its card is within 200px of the viewport, so a four-project list initialises one or two maps |
| Tap | Tapping anywhere except Mapbox's attribution opens Google Maps driving directions from the device's location to the project in a new tab (the maps app on phones). the "Directions" link at the bottom of the card provides the same for all users, including keyboard and screen-reader users; the map is only a touch shortcut, not the control |
| Distance and time | Each card states the project's distance and driving time. Until the device shares a position, the origin is Auckland city warehouse, named in the line: "2.3 km · 7 min drive from Auckland city warehouse" (§9, "Fallback origin"). "Use my location" heads every tab page (§18), with a line explaining the origin: "Distances are from Auckland city warehouse until you use this phone's location. Only Mapbox sees it, to work out the drive."; while locating "Finding where you are… Until then, distances are from Auckland city warehouse."; after refusal "Location is off, so distances are from Auckland city warehouse."; without a fix "Can't find where you are right now, so distances are from Auckland city warehouse." Once the device position is available (after the tap, or automatically where permission already exists), its route replaces the fallback's on arrival ("12.3 km · 18 min drive"), and the button turns into "Update my location". Before any answer: "Working out the drive…". No route (no token, offline mode, Mapbox failure, no road): "9.8 km in a straight line · no drive time", or from the fallback "9.8 km in a straight line from Auckland city warehouse · no drive time" |
| No token | No map; "Directions" and straight-line distance continue to work. The strip also hides itself when WebGL is unavailable or Mapbox fails |
| Target sizes | "Directions" and the location button are 48px like all controls. Mapbox requires its wordmark and attribution on each map, so they keep Mapbox's own sizes; they are the only sub-48px targets, and the app never relies on them |

Declined for now:

| Idea | Reason |
| --- | --- |
| In-app turn-by-turn | The phone's navigation app covers this already (traffic, voice) and keeps running with this app closed |
| Site-screen maps, or one map holding every project | The request was one map per project on the list; a combined map makes sense once projects outnumber one screen |
| Apple Maps on iOS | On both iOS and Android the Google Maps link opens the native app, otherwise the browser; per-platform choice can arrive with the Flutter app |

## 15. Daily panel (20 Oct 2026)

Based on the author's design "I · Verdict + tabs + map (B+D+E)" (exported from a design tool, not committed) and first placed above the projects list. Where design and product disagree, the product's wording, data and colours prevail. Requirements: FR31, AC 77–79. Copy and numbers: `src/ui/today.ts`; component: `src/ui/TodayPanel.tsx`.

| Topic | Implemented |
| --- | --- |
| Verdict | First the active tab's name followed by "today is Tuesday 20 October 2026", the browser's date rendered in English (§21); then totals ("3 shortages · 4 data problems"); then, in heavy 36px type, "2 of 3 crews can't go yet". Crew = project with planned work; blocked or uncheckable crews cannot go. Whatever the verdict, the panel stays black, lettered in white and yellow (§21). If any crew is unchecked the totals read "Stock can't be checked" instead of a number. Computed over all projects, ignoring the list filter |
| Bar | A 10px segment per crew, can-go crews first: green; blocked in stop red with a bright edge; yellow when uncheckable. Segments of the active tab are fully opaque, others at 50%. Text alternative: "1 can go, 2 blocked" |
| Tabs | "All 4", "Blocked 2", "Crew can go 1", "Other 1", on a dark track directly beneath the bar; the active tab is black-on-yellow. All = every project, unfiltered; Blocked = every crew unable to go, uncheckable included; "Crew can go" = crews free to leave; Other = nothing planned. Tablist semantics: a single tab stop, arrows plus Home/End move and select. With four tabs across a phone screen, longer labels break onto two even lines. Initially "Crew can go", as the author requested (the crews to dispatch first); Blocked if that is empty, then Other |
| Map | 288px high, edge to edge on phones, showing only the active tab's projects (all under All) drawn as pins, each a signal-coloured dot (18px, or 26px once selected) beside a white tag with the name up to its first comma, all inside a 48px button whose name reads e.g. "Cedar Court, Block A, Crew can go" and which is pressed while selected. Given a public token: Mapbox streets, non-interactive, bounds fitted to the pins. Without a token, or if it has not loaded within 8 s: a plain panel with pins at their relative positions (north up, equal scale on both axes) |
| Card | Directly beneath the map, the selected project's card, which is the list's `SiteCard` rendered by identical code from identical data, so look and content match the list below: name, map, signal, shortages, operator, actions, trip, "Directions". Only its width differs (map width rather than masonry column). Its ids are prefixed differently so the page holds no duplicates, and it uses the list's trip provider, keeping distance lines consistent. A tab change selects the tab's first project; tapping a pin selects that pin's project. An empty tab reads "No projects in this group." |
| Page | "Projects" stays the first element in main as h1, but is hidden visually while the panel is on top; the current page is indicated in the tab bar. "All projects" heads the filter and cards below the panel. Because the panel isolates its stacking context, the sticky header and tab bar remain above pins and card |

Deviations from the design:

| Design | Implementation | Reason |
| --- | --- | --- |
| Deep red #7F1D1D; fonts Archivo plus IBM Plex Sans | Signal tokens; system fonts | Product colours; nothing to download, so offline still works |
| Three tabs: "Blocked", "Can go", "Idle" | Four: All, Blocked, "Crew can go", Other | Follow-up from the author: All covers everything; labels as requested, in the product's sentence case |
| Initially Blocked | Initially "Crew can go" | The author's instruction |
| A drawer sheet with separate wording | The list's card at map width | The author's follow-up: identical appearance by reusing the list's code |
| 44px tabs and pins | 48px | AC 31 |
| No slot for projects with uncheckable stock | Shown under Blocked, in yellow | Fail closed: uncheckable crews never count as able to go |
| Verdict as the page h1 | An h2 below the visually hidden h1 "Projects" | A single h1 per page, placed first in main |

## 16. Due dates (20 Oct 2026)

From the author: add a date per project to the sample data and print it on every card in English as "Deadline". Requirements: FR32, AC 80. Copy: `src/ui/deadline.ts`.

| Topic | Implemented |
| --- | --- |
| Data | `data/sample/sites.json` gives every site a `date` (`YYYY-MM-DD`, fabricated): Cedar Court 2026-10-23, Quayside House 2026-10-27, Northgate Depot 2026-11-03, Foundry Lane Annex 2026-11-13. `GET /api/sites` returns it |
| On the card | Final line, after trip and "Directions": a calendar icon, "Deadline · ", then the bold date "Fri 23 Oct 2026" (weekday, day, abbreviated month, year), inside `time` with the stored value. The card beneath the daily map shows it as well, being that same component |
| Missing date | No line for an absent or impossible value (`2026-02-30`, `23/10/2026`), and no invented date. Dates are read as-is in UTC; time zones cannot move them a day |

## 17. Deadline calendar (20 Oct 2026)

From the author: duplicate the daily map panel with only the map replaced by a calendar; place it at the top; mark every project with the cards' big oval signal; show the tapped project underneath; and limit deadlines to the span from today until an end date the leader may change (31 December by default). Requirements: FR33, AC 81, AC 82. Date logic and copy: `src/ui/calendar.ts`; component: `src/ui/CalendarPanel.tsx`. `TodayPanel`, its map and `today.ts` were not modified.

| Topic | Implemented |
| --- | --- |
| Clone | Unchanged copies of the daily panel's verdict, totals, segment bar and tabs (All, Blocked, "Crew can go", Other; initially "Crew can go"), but with separate ids and names ("Deadlines by status"), so neither panel can answer for the other. Tab counts and verdict cover every project regardless of dates |
| Date window | From and To inputs above the grid: From defaults to today as read on the device, To to 31 December of the current year; both editable, a blank field leaves that end unbounded. If From is later than To the screen shows "From is after To." and nothing |
| Grid | A single month titled between "Previous month" and "Next month" (48px each), weeks starting Monday, today ringed. Initial month: the selected project's, otherwise the month containing From, otherwise this month; changing tab or dates brings it back to the selected project |
| Day cells | Every active-tab project with a deadline inside the window appears on that day as a scaled-down copy of the card's big signal, preserving the capsule outline, the fill, the edge, and the knob's form and side: "Crew can go": green, tick, knob right; Blocked: red, stop sign, knob left; can't check: yellow, triangle; nothing planned: white, dashed ring), each in a 48px button with a name such as "Cedar Court, Block A, Crew can go, deadline Fri 23 Oct 2026". Selection adds a ring and the pressed state. At 48rem and wider, the short name is printed beneath |
| Below the grid | The selected project's card: the list's card at calendar width, ids prefixed `calendar-card`, inside a region named "Project on the calendar". Tapping an oval selects it. If a tab has projects yet none fall in the window, it shows "No deadlines between these dates."; a tab without projects, "No projects in this group." |

## 18. Map and Calendar pages (20 Oct 2026)

Author's request: divide the projects page into three pages. Tab bar entry Inventory becomes Map, Decisions becomes Calendar. Map receives the daily panel ("Today" down to the selected card) and Calendar the deadline calendar ("Today" down to its card); Projects retains the list. Requirements: FR34, AC 83.

| Topic | Implemented |
| --- | --- |
| Tab bar | Map (folded map), Calendar (calendar page), Projects, Guide; the order was changed the same day on the author's request |
| Location | Every tab page opens, below the picker line and the h1, with "Use my location" and its origin line ("Distances are from …"); the Guide makes no Mapbox call, as it shows no projects |
| Entry | When a browser tab begins its visit at `/sites`, it is redirected to Map, the first tab, with the history entry replaced so Back cannot go there; later in that visit, tapping Projects, reloading, or a filtered link (`/sites?status=shortage`) shows the list. "First tab" simply means the leading tab bar entry; it is not configurable yet (AC 84) |
| Projects (`/sites`) | h1 visible again, followed by filter, "Use my location" and cards; no panel |
| Map (`/map`), Calendar (`/calendar`) | Each holds a single unchanged panel with the list's card below and the shared provider for trips, so a project is presented identically on Map, Calendar and Projects |
| Inventory, Decisions | Still top-level pages, showing header and tab bar, though no tab represents them, so nothing is highlighted. The Guide no longer names or links them (20 Oct 2026: its tour now walks through Map and Calendar instead), and existing links to them still resolve |

## 19. Guide as a brochure (20 Oct 2026)

From the author: turn the whole Guide into a plain-spoken sales brochure rather than engineer-facing text, keeping no five-word sequence from the previous copy and describing today's tab set (Map, Calendar, Projects, Guide) replacing the former tabs Inventory and Decisions.

| Topic | Implemented |
| --- | --- |
| Headline | Large h1 "Know which crews can roll out today", followed by a lead sentence: each job is matched against shelf stock, so nobody drives to a site and arrives without parts |
| "Your four tabs" | A card per tab with icon, one everyday sentence, and a button such as "Open Map"; the cards form two columns at 30rem and wider. Inventory and Decisions now appear purely as tour links, not as tabs |
| "What the colours mean" | A colour sample for each signal tone: green for Go, red for Stop, yellow for unsure, white for not yet checked |
| Morning and tour | Three numbered morning steps (yellow numerals inside black circles), plus a two-minute tour built from links; a short note covers the Online switch |
| Overlap check | Old and new rendered texts were diffed at word level: no authored five-word run survives. The only shared runs come from the location note common to every tab page |

## 20. Back to the originating screen (20 Oct 2026)

From the author: the back control on a project page led to Projects no matter where the project had been opened from. Now it goes back to the actual origin, with a single rule shared by every back control rather than a hard-wired parent (AC 85).

| Topic | Implemented |
| --- | --- |
| Named target | When one of the six top-level pages lies underneath, the control carries its name: "‹ Map" coming from Map, "‹ Calendar" from Calendar, "‹ Guide" from the Guide's tour. Tapping pops that history entry |
| Fallback | The declared target of the page is used if there is no prior screen (direct open, reload), if the prior screen is that target already (query or anchor retained, as `?fromLog` and `?fromMaterial` did before), or if the prior screen is an unnamed inner page |
| First paint | The server knows nothing of the visit, so the first render shows the page's declared target, corrected once the page starts on the client |

## 21. Panel recoloured to the theme (20 Oct 2026)

From the author: red, green and pink panel backgrounds did not fit the black-and-yellow app. Green (crew can go) and red (blocked) are the only exceptions allowed; all backgrounds use theme colours, and text uses theme colours wherever legibility allows. No behaviour changed.

| Topic | Implemented |
| --- | --- |
| Panel | `--chrome-bg` black background; headline and tab labels white; first line and totals yellow; dark track; the active tab is yellow with black text. Identical for every verdict; `data-today` still carries the tone |
| Segments | Green and red survive only here: the go colour, and the stop colour with a bright outline for visibility on black; dimmed segments at 50% |
| First line | "Map · today is Tuesday 20 October 2026" on Map, "Calendar · …" on Calendar: the tab name in capitals followed by the browser's date, always in English. The server render shows only the tab name; the date is filled in as the page starts |
| Pins | Black on white labels (previously an off-black) |

## 22. Schedule changes on the card (20 Oct 2026)

From the author: make the card's Deadline line and Operator line buttons. The deadline opens the Calendar tab's calendar holding only this project; the operator opens a list of candidates with the current one chosen; each has Cancel top left and Confirm top right, and a pop-up says what changed. Keep the change in `data/sample` if the app can write there, otherwise in the browser, read before the sample data. Requirements: FR35, AC 86, AC 87. Copy: `src/ui/site-edits.ts`; components: `src/ui/SiteEdits.tsx`.

| Topic | Implemented |
| --- | --- |
| Deadline line | Unchanged words ("Deadline · Fri 23 Oct 2026"), now a full-width 48px button with a hairline above and a chevron at the end. Still the card's last line |
| Deadline dialog | Cancel, title "Change deadline", Confirm on one row; the project's name, its current deadline, then "Tap another date to move the deadline." (or "New deadline · …" once a day is picked). The calendar tab's month heading and steps; a grid where every day is a 48px button, the project's small signal on its current deadline and the picked day filled in the button colour. A little wider than other dialogs on a phone so the seven columns stay 48px |
| Operator line | "Operator · Mere Tane" as a muted 48px button with a chevron; Text operator and Call operator beneath as before, following the chosen person |
| Operator dialog | Cancel, "Change operator", Confirm; the project's name; the app's radio rows (as in pick reports), each with name and number. Confirming the same person just closes |
| Pop-up | An alert dialog with the sentence and OK: "Cedar Court, Block A: deadline updated to Mon 2 Nov 2026. Saved on this device only." / "You've updated the operator for Cedar Court, Block A to Wiremu Ngata. Saved on this device only." Focus returns to the line |
| Where it is kept | The deployed app cannot write `data/sample`, so the change is stored in this browser (localStorage) and read before the sample data on every card, the Calendar tab's grid, and the big signal's call. Other devices still show the sample data |
| Idle cards | A project with nothing planned now has one button, its deadline; it still has no call or text (AC 57) |

## 23. Inner pages follow the card (20 Oct 2026)

From the author: apply the same browser-first rule to the second-level pages wherever "Operator" or "Deadline" appears. Requirement: AC 88. Components: `StoredOperatorRow`, `StoredContacts` and `useOperator` in `src/ui/SiteEdits.tsx`.

| Place | Now reads this device's operator first |
| --- | --- |
| Site page header (shared by its inner pages) | "Operator · …", Text operator, Call operator (`OperatorRow` itself, fed the stored person), and the big signal's call |
| Blocked panel, "Ask before you decide" | The operator's row and its "Call … , operator" button; picker and operator share one row only when they are the same person |
| Picks section | Send the crew texts the stored operator |
| Deadline | Shown on no inner page, so nothing changed |

## 24. Controls in theme colours (20 Oct 2026)

From the author: check the colour of every control on every page, inner pages above all; every control must use the theme colours, and nothing but the colour may change. Requirement: AC 89. CSS only: `src/ui/primitives.module.css`. A crawl of 140 pages in both themes found the off-theme controls listed below; `e2e/theme-controls.spec.ts` now checks 16 representative pages in both themes and fails on any colour that is not a theme token.

| Control | Before | Now |
| --- | --- | --- |
| Penetration and material rows (marks, state labels, short-material lines) | Danger red and warning brown text | The link's own colour; the stop and warning icons and the words still say which |
| Chips inside links (material and penetration rows) | Dark red or amber backgrounds | Stops work: black with yellow text and edge. Warning: button yellow with black |
| Online switch in the header | Green online, red offline | Yellow online, white offline, black text on both; black while checking |
| Pick review answers | Yes in go green, No in stop red | Yes in button yellow with black ink; No black with yellow ink and edge |
| Signal, calendar ovals, map pins, verdict bar, Guide colour key | Go green, stop red | Unchanged: they are the signal, the one place green and red keep their meaning |

## 25. Solution stock and portable evidence (20 Oct 2026)

From the author: learn from the stock app (`qantum-stock-main`) how its shortage page completes the material table, and add "Inventory captured" and "Status" (READY, Quantity available; SHORTAGE, Insufficient quantity) to every material table here; put a solution-level stock file in `data/sample`, keyed by Internal Code, all in stock with random counts; note under the solution that selecting it changes the material plan and does not reserve stock; bring its "Portable evidence" over in front of Propose this, kept in the browser by site id; allow choosing a substitute only when it is in stock. Requirements: FR36, AC 90, AC 91. Copy: `src/ui/inventory.ts`, `src/ui/evidence.ts`; components: `FitTable`, `ShortageEvidence`, `ProposeDialog`.

| Topic | Implemented |
| --- | --- |
| Material tables | The nominated solution's table and each substitute's end with "Inventory captured" (`20 Oct 2026, 9:00 am NZDT`) and "Status" (a READY tick or SHORTAGE stop label, the reason beneath, and the kit count, "12 install kits counted") |
| Plan note | Under each substitute's table: "Selecting a Solution changes the material plan. It does not reserve stock." |
| Propose this | Enabled only for a READY substitute; otherwise disabled with "Not in stock, so this substitute can't be proposed." The server checks again |
| Portable evidence | Small capitalised "PORTABLE EVIDENCE", heading "Prepare shortage summary", the stock app's intro, checkboxes for this penetration's shortages, Optional note, Preview summary, a monospace preview and Copy summary. In the theme's colours and the app's 48px choice rows rather than the stock app's emerald |
| Kept on the device | Ticks and note under `team-leader:evidence`, keyed by site id; a reload or another penetration of the same site fills them back in |
| Known gap | Solution stock is a separate invented feed. A substitute can read READY while one of its materials is short at this site (the short-material line still says so), and crew readiness is still worked out from material stock alone |


## 26. Pick up from other sites (20 Oct 2026)

From the author: on a blocked site, give every row of its material table (the rows with Review) a button that opens a new page, Pick up from other sites. The page reuses the projects list whole (its filter, location and cards) with a tick on the left of each card; a ticked site must turn Blocked. Cancel top left, Confirm top right; Confirm then says that the status changed, so the deadline and operator need changing. Keep each touched site in the browser by site id (its materials, quantities and status), and read that before the sample data on the list and on each site. Requirements: FR37, AC 92 to AC 95. Copy: `src/ui/pickups.ts`; components: `src/ui/PickupChooser.tsx`, `src/ui/PickupStore.tsx`, `src/ui/SiteFeed.tsx`, `src/ui/HeldSiteSignal.tsx`.

| Topic | Implemented |
| --- | --- |
| Row button | "Pick up from other sites" under Review, the same 56px bordered button, on a line of its own so it never squeezes Review or the label |
| Header | The inner page's black bar with Cancel on the left, the Online switch, and Confirm (yellow, disabled until a ticked site gives something) on the right; the picker line under it |
| The line | A pick card: the material, "Quayside House, Levels 3 to 5 · need 10 · has 6", then in bold what it needs. A line with its planned amount says there is nothing to pick up |
| The list | Use my location, the filter and the cards of Projects, without this site. Each row is a 3rem column with a 48px tick, then what the site holds of the material and its card. A tick that can't be used is faded and says why |
| Ticked | The card turns Blocked straight away: red signal, the chip counting one shortage more, the material listed under Short. A bold line counts what the ticks take and what is still short |
| After Confirm | An alert dialog with the sentence and OK; a warning banner "Status changed…", Cancel reads Done, and the cards that gave stay in place with their Deadline and Operator buttons to change |
| On the site screens | The row says "2 picked up from other sites · on this phone" (tick) or "2 given to another site · on this phone" (stop, in the reported style); the signal of a site that gave is red |
| Known gap | The Map and Calendar verdicts, tabs and pins, the Pick check and review pages and the API still read the sample data. The move is on this device only |
