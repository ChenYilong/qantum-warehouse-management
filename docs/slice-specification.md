# First-slice specification

Slice: **site readiness and shortage decisions for team leaders.** Boundary and endpoints are in `slice-decisions.md`. Architecture is in `technical-design.md`. Terms are in `glossary.md`. Where this spec and the design disagree, fix the spec first, then the design.

## 1. Purpose

Before a crew leaves for a site, the team leader needs to know whether the materials for the planned penetrations are in stock, and what to do about any shortage. The slice answers "can I send the crew?" and records the leader's decision when the answer is no.

**Users.** Primary: team leader. Secondary (receives the output, not a user of the slice): purchasing, warehouse, and the manager who would review a substitute.

**Value.** Replaces checking stock by phone or spreadsheet. Makes the shortage visible once, with a recorded decision, so crew planning can rely on it.

## 2. Scope

**In:** list sites, compute readiness for a site, show shortages and missing-data blockers, show each material's shared stock against every site's need, record wait, escalate and substitute-proposal, list recorded actions, suggest catalogue-similar substitutes. Field use round (2026-10-18): show the connection state on every screen and let the leader work offline, text or call a clear site's operator, and open a blocked site with what needs a decision. Signal round (2026-10-18): a big green or red switch for each site that calls the operator in one tap, and telling the operator when parts are missing, so nobody makes a wasted trip.

**Out (see section 8):** real auth, real inventory or nomination systems, approving substitutes, stock reservation across sites, crew scheduling, offline data and queued writes, install, pins and photos.

## 3. Functional requirements

| ID | Requirement |
| --- | --- |
| FR1 | A leader can list the sites available to them, each showing crew status (clear, blocked, nothing planned, or unavailable). |
| FR2 | For a site, the app computes materials required as the sum of quantity per install across its planned penetrations, grouped by material. Fractions round up to whole units. |
| FR3 | The app compares required quantity with stock on hand. On hand is the sum across all the leader's locations, is shared between sites, and is labelled as not reserved. |
| FR4 | A material where required exceeds on hand is shown as a shortage with required, on hand, shortfall and the affected penetrations. |
| FR5 | Missing data is never treated as zero. A material with no stock record is an actionable shortage of kind unknown. A nominated code with no catalogue entry, a nominated solution that does not fit its penetration (orientation, substrate, service, size, or a rating below the requirement), no material mapping, or an invalid mapped quantity (negative or not a finite number) is a blocker with a stated reason. Stock that is negative or not a finite number makes the material unknown. |
| FR6 | Crew status is blocked while any shortage or blocker exists, whatever decisions have been recorded. A site with no planned penetrations is "nothing planned", never clear. |
| FR7 | A leader can record **wait** on a current shortage, with an optional note. |
| FR8 | A leader can record **escalate** on a current shortage to purchasing or the warehouse, with a note. |
| FR9 | Wait and escalate do not change crew status. The screen says so when they are recorded. |
| FR10 | A recorded action is current only while the shortfall has not grown beyond what it was when recorded. Otherwise it appears as an earlier decision. Actions always show date and author. |
| FR11 | For a penetration, the app suggests substitutes from the catalogue using the matching rules in `technical-design.md` section 6. Each suggestion is labelled "catalogue match, not verified" and shows whether its materials are in stock. A material this site is already short of, or has no stock record for, never counts as in stock. |
| FR12 | A leader can record a **proposed substitute** for a penetration, choosing only from the suggested candidates and giving a reason. Status is always proposed. The nomination is not changed. |
| FR13 | When there are no candidates, the app says so. It offers escalate only when the penetration has a data problem; a material shortage is waited on or escalated on its material page. When the substrate is incomplete in the catalogue, it says that. |
| FR14 | A leader can list all recorded actions for a site, newest first. |
| FR15 | Every screen has a defined state for loading, empty, error and upstream-unavailable. Upstream failure never shows crew as clear. |
| FR16 | Every write requires an idempotency key, and a repeat records once. A repeat for the same target returns the original even if the shortage has since resolved. A repeat for a different target is rejected with 409. |
| FR17 | A menu (a bottom tab bar on phones, a side menu on wide screens) gives the three top-level views, Projects, Inventory and Decisions. Materials shows each material a site plans to use against the one shared stock, across sites, and is where a site's shortage is waited on or escalated. The Decisions lists every site's recorded decisions and proposals. A decision on a penetration also shows on its list row as a mark, and the penetration page has its own actions log. |
| FR18 | Every screen shows whether the phone can reach the app, when it last could, and the picker's last action. The leader can switch Online off to work offline; offline, the app sends nothing, says how old the screen is, and offers Sync now with the last sync time. |
| FR19 | Each site on the sites list has one big signal that doubles as its main action: a tap calls the site's operator (the operator is told first and passes word to the picker). Beside it, Text operator and Call operator stay as buttons. A blocked site also goes to what needs a decision. |
| FR20 | A blocked site opens with what needs a decision: what is short, with its unit and the penetrations it affects, what is covered, the options with what each does, and who to call. |
| FR21 | The screens are sized for gloves and glare: 18px body text and 48px targets. |
| FR22 | A site's crew status is a large switch in the style of an I/O toggle that shows the state by colour and by shape together: deep green with a tick and the knob on the right for "Crew can go"; deep red with a stop sign and the knob on the left for blocked; amber with a warning triangle when the site can't be checked; grey with a dashed ring when nothing is planned. It sits on every site card and at the top of the site screen, is at least 88px tall, and reads in sunlight and in greyscale. |
| FR23 | The operator is told in every state where a trip could be wasted. A clear site's text says the crew can go. A blocked site's text says the parts are not complete, to hold, and which materials are short. A site that can't be checked gets a hold text. The text is prepared and the leader presses send. It never says the crew can go unless the site is clear. |
| FR24 | The connection bar shows the connection by colour as well as by its words: green while online, red while offline, with text that stays readable on each. |
| FR25 | A demo sign-in covers the app on a first visit: username, password, a role (team leader or operator), forgot password and create account. Any username and password are accepted; the greeting then names the user, and the Guide offers Sign out. Everything is kept in this browser only; no password is stored. |

## 4. Acceptance criteria

Numbered for use as test names. Sample data is defined in section 7.

**Readiness**
1. Given site A with penetrations needing 12 and 8 units of material M and 15 on hand, then M shows required 20, on hand 15, shortfall 5, and crew status is blocked.
2. Given every material is covered, crew status is clear.
3. Given M is held in two locations of 6 and 9, on hand is 15.
4. Given a fractional requirement of 2.2 units, required shows 3. On hand is snapped to the same precision, so ten balances of 0.1 cover a requirement of 1, and stock of 4.2 against a requirement of 5 is short by 0.8.
5. Given a material with no stock record, it appears as an unknown shortage with null quantities, and wait and escalate are accepted for it. A stock row that is negative or not finite, or a sum that is not finite, also makes the material unknown.
6. Given a nominated code absent from the catalogue, a blocker `unknown_solution_code` is shown, crew is blocked, and wait is rejected with 422 while escalate is accepted.
7. Given a nominated code with no material mapping, a blocker `no_material_mapping` is shown and crew is blocked. Given a mapped quantity that is negative or not finite, a blocker `invalid_quantity` is shown, the penetration adds no requirement, and crew is blocked (it never cancels another penetration's need).
8. Given a site with no penetrations, status is "nothing planned", not clear.
9. Given the stock service fails, the API returns 502, the UI shows the approved can't-check banner ("Can't check this site right now. Don't assume it's clear. Try again."), and no clear status is shown. On the sites list that site shows the amber "Can't check" signal (AC 52).
10. Given two sites that each need 10 units of M with 15 on hand, both show clear, and the screen labels the figure "on hand, shared, not reserved".

**Decisions**
11. Recording wait on a current shortage returns 201 and the shortage shows state waiting. Crew status stays blocked.
12. Recording escalate requires `escalateTo` of purchasing or warehouse. A missing or invalid value returns 422.
13. Recording an action on a shortage that does not currently exist returns 404.
14. Given escalate then wait, the shortage state is escalated and both actions are listed.
15. Given an action recorded at shortfall 5 and the shortfall is now 8, the action shows "earlier decision, shortfall has grown" and the shortage state is open.
16. Repeating a POST with the same idempotency key and target returns the original record (200) and creates no second row, even after the shortage has resolved or the nomination has changed. The same key for a different target is 409 `idempotency_key_reused`. A POST without a key returns 400. Keys are unique per user.
17. A note or reason longer than 500 characters after trimming is rejected with 422, and a whitespace-only reason is rejected. A body over 10,000 bytes is rejected with 413 while streaming, whether or not `Content-Length` is sent.

**Substitution**
18. For penetration with nominated `0438` (PEX Ø25mm, wall, 60/30), candidates are `0451` and `0464`.
19. For `0789`, candidates are `0790` and `0791`. For `0434`, the candidate is `0435`.
20. For `0344`, there are no candidates and the empty state says so. It offers escalate only when the penetration has a data problem; the sealant shortage it uses is decided on the sealant's material page.
21. For a solution whose substrate is incomplete (`0943`), there are no candidates and the message says the catalogue substrate is incomplete.
22. A candidate whose insulation is not claimed is never offered for a stated insulation requirement.
23. Proposing a `to` code that is not a current candidate returns 422. A `from` code that is not the penetration's current nomination returns 409.
24. A successful proposal has status proposed, stores the reason, and does not change the nomination or the shortage.
25. Exactly 20 of the 148 catalogue solutions have at least one candidate under the matching rules (each solution's own rating taken as the requirement, incomplete substrates excluded). The test fails if this changes.

**Data and safety**
26. The catalogue loads all 148 rows, preserves raw text, and flags 6 rows with an incomplete substrate. The load check fails if either count changes.
27. Every sample penetration references an `internal_code` present in the catalogue (except the one deliberate missing-code case).
28. The client never receives database credentials.
29. Readiness and actions responses carry `Cache-Control: no-store`.

**Experience**
30. Every shortage shows its material, required, on hand, short by, the penetrations it is planned on, and its state, without relying on colour alone.
31. All controls are keyboard operable, and interactive targets are at least 48px (raised from 44px in the field use round).
32. On a 375px wide screen, nothing needs horizontal scrolling.
33. A candidate that uses a material the site is already short of has availability `short`, even when one install fits in the stock on hand. A material whose site stock is unknown makes the candidate `unknown`. Shortages of other materials leave a candidate that fits on hand `in_stock`.
34. On the site screen, a blocked site has no summary banner; it opens with its signal and operator row (AC 57), then the Needs your decision panel (AC 50). Filter chips for shortages, data problems and acted count the penetrations and narrow the list. Acted means a current wait or escalation on a shortage that lists the penetration or on its own data problem, or any substitute proposed for it; an earlier or resolved decision still shows as a row mark (AC 44) but does not count. Each row still shows its own line. A clear site's signal still reads "Crew can go." (AC 52). The sites list signal still names the shortage and data-problem counts.
35. A penetration whose nominated solution differs on orientation, normalised substrate, normalised service type or normalised size, or falls short of a stated integrity or insulation requirement, gets a `solution_mismatch` blocker listing the failing fields. The crew is blocked, wait is rejected with 422, escalate is accepted, and the penetration adds no material need. Text that differs only by spacing or capitals is not a mismatch. A substrate cut off after the family name, on either side, never fits, even against identical cut-off text. Blank text, or a requirement or rating that is not a usable number, never fits.
36. The penetration page shows each field side by side for the penetration and its nominated solution, and marks every field that does not fit with an icon and text, never colour alone.
37. Below 1024px wide, on the sites list, the materials list, the actions log and the landing page (Guide, at `/about-this-demo`; `/` redirects there), a tab bar fixed to the foot of the screen (one navigation named Main) lists Projects, Inventory, Decisions and Guide, with the current section marked; it stays in place while the page scrolls, and the page keeps room for it so nothing is hidden behind it. The header of those pages holds the theme choice (System, Light, Dark; System follows the device, and a choice is remembered on this device and applied before the page paints). Inner screens have no tab bar and lead with the back control instead, never both.
38. The materials list shows each material any site plans to use, by name, with on hand (or stock unknown), every site's need added up, and how many sites are short. A site that could not be checked is never counted as not short, and the total is then left out. When no site is short alone but the sites together need more than is on hand, the row says so instead of "not short" (stock is shared and not reserved).
39. A material page shows the shared stock and its age once, then one section per site that plans the material: that site's need, short by (or "not short for this site alone"), its places with identical ones grouped, and, only where it is short, the decision scope, Wait and Escalate, with a warning when an earlier decision no longer covers a grown shortfall. The decisions themselves are on the page's Decisions tab, not as a state label. A site that could not be checked says so and is never shown as enough.
40. On the penetration page, a shortage of the nominated solution (and of a substitute, when the site is already short of that material) is a line with this site's figures ("this site short 2 of 4", or "this site needs 1" when stock is unknown) that links to the material page at this site's section.
41. The former site-scoped material URL redirects to the material page at that site's section.
42. A material page opened from a penetration's shortage line has a back control that returns to that penetration. Opened any other way, or with a `from` that is not a penetration using the material, it returns to Materials.
43. The Decisions, from the side menu, shows one section per site in site order, each headed by a link to the site, with its recorded decisions then its proposals, newest first, with date, author and whether each still applies. A material decision opens the material page at that site's section, a data-problem decision or a proposal opens its penetration, and a resolved decision has no link. A site whose log cannot be read says so and never reads as nothing recorded; with no site readable the page is unavailable. Each site heading starts with the site icon and stays in view while its entries scroll. A page opened from the log (a site, a penetration or a material page) has a back control that returns to the log; opened any other way, or with an origin that is not one of its sites, back goes to its parent as before. The site and penetration pages have no actions log control, and the old `/sites/<id>/actions` URL opens the log at that site's section.
44. On the site screen, each penetration row shows its problems and decisions as icon marks inside the row's link: problems (with a count when a kind repeats), then escalations, waits and proposed substitutes, each always with its number, counted as that penetration's Decisions entries so they add up to its tab count. If the decisions cannot be read, rows show problems only and the list says so, never 0. Every mark has its full wording (for example "Short material × 2") for screen readers and on hover, and marks differ by shape as well as colour. The row stays one link; the marks are not controls.
45. The penetration page has two tabs, Solution (the default) and Decisions, as links (`?tab=log`) with the current one marked. Solution holds the nominated solution and substitutes. Decisions lists this penetration's decisions newest first: waits and escalations on a site shortage of a material its nominated solution uses (including resolved ones), on its own data problem, and substitutes proposed for it, each with date, author and whether it still applies. A material decision that still has a shortage says it applies to all N penetrations at this site, and opens the material page, whose back control returns to this tab. The tab shows a count; when the log cannot be read, it shows no number and never "nothing recorded". Tab links keep the log origin (`fromLog`).
46. The material page has two tabs, Stock (the default) and Decisions, as links (`?tab=log`) that keep `from` and `fromLog`. Decisions lists every wait and escalation on this material's shortage at every site, newest first, each naming its site, with no links; proposals are not listed. The count shows only when every site's log was read. A site that could not be read is named in a warning and its decisions are not listed; with no log readable the tab says it can't load. Never 0 or "nothing recorded" in either case.
47. From 1024px wide, the same entries and the theme choice sit in a side menu beside every page instead (one navigation named Main, the current section marked: a site or penetration marks Sites, a material marks Materials), and the tab bar and the top-level header are gone; inner pages keep their back control, and sticky headings still stick directly below whatever header remains. A Collapse menu control (Expand menu when collapsed, its state exposed) narrows the menu to an icon rail whose items keep their names as hidden labels and hover titles, each at least 44px; the choice is remembered on this device and applied before the page paints, so a collapsed menu never opens wide on reload. `/` redirects (temporarily) to `/about-this-demo`.

**Field use (2026-10-18)**
48. Every screen shows a connection bar above its own header: the picker's last action (the stock feed's time, or "unknown") on the left, and an Online switch on the right. Online needs the browser's network flag, an answer from `GET /api/health` (asked every 30 seconds, when the network returns and when the tab is shown) and the switch left on; before the first answer the bar says Checking, never Online, and switching Online back on shows Online only after the server answers. Switched off or unreachable, it reads Offline with when the phone last heard from the server; a banner at the foot of the screen says the data is from that time and opens Offline details (last online, when this screen and the stock figures are from, what is waiting to send, Sync now and the last sync time); and decision dialogs send nothing and say so. Sync now reaches the server, refreshes the screen and stamps the sync time; when it cannot, it says nothing was sent. Only real changes are announced. A stock feed that is down still answers the check, with no time.
49. Each site on the sites list is a card with its name as a link to the site, its signal (AC 52) and its actions. The cards form a waterfall: from 672px wide they fill two columns top to bottom, each keeping its own height (a column still leaves the signal its 280px); below that, one column. A site with an operator offers Text operator (a prepared message, AC 55) and Call operator, whatever its status except nothing planned. A blocked site also offers Sort out shortages, to its Needs your decision panel, or Check data problems when it has no shortage. A site that can't be checked has a signal that checks again when tapped. Nothing planned has no action. Action names never repeat the site name. A site carries an optional operator and picker, each a name and an international number; the sample numbers are from Ofcom's drama range, so they reach no one.
50. A blocked site screen opens with a Needs your decision panel: "Can't go yet" with its shortage and data-problem counts; each shortage with its figure and unit ("Short 2 of 10 cartridges", or "Stock unknown · needs 1 tube"), the penetrations it affects as a link to them ("4 penetrations affected"), and its Wait and Escalate; the data problems and the penetrations they affect, as a link to the filter; what each option does; the materials covered for this site alone, with the shared-stock caveat; and the picker and operator to call, listed once when one person does both. Nothing in the panel releases the crew. A clear or nothing-planned site has no panel.
51. Body text is 18px, with headings scaled to match, and AC 31's 48px targets hold on every screen at 375px with no horizontal scrolling.

**Signal (2026-10-18)**
52. A site's signal has four states that differ by colour, by the knob's shape and mark, and by the knob's side, so none depends on colour: go (green; a circle with a tick; knob right; an "I" at the left end) for a clear site only; blocked (red; a stop sign; knob left; an "O" at the right end); can't check (amber; a warning triangle; knob left), also for any status the app does not know; nothing planned (grey; a dashed ring; knob left). Its label is the status wording: "Crew can go", "Blocked · 2 shortages", "Can't check", "Nothing planned". Only a clear site is ever go.
53. In light and in dark, every signal's label and knob have a contrast of at least 7:1 with its fill, and its edge at least 3:1 with the page and with the card. Go is green and blocked is red, in hue.
54. Tapping the signal of a clear or blocked site with an operator calls that operator (`tel:`, the same link as Call operator). A signal never starts a text. A site that can't be checked checks again when tapped and never calls. A site with nothing planned, or with no operator, has a signal that cannot be tapped; with no operator it says "No operator assigned".
55. The text prepared for the operator names the site and its job ref and depends on the state. A clear site's keeps "shared, not reserved" and says the crew can go. A blocked site's says the parts are NOT complete and not to go yet, names up to three short materials and how many more, counts data problems, promises word when it is sorted, and never says the crew can go. A site that can't be checked says the materials can't be checked and not to go until confirmed. A clear, blocked or unchecked site with an operator shows Text operator and Call operator beside its signal, so the operator is told before a wasted trip.
56. `GET /api/sites` lists each blocked site's short materials as `shortages` (material id, name, unit, kind short or unknown, required, shortfall or null), in readiness order. The list is empty for a site that is not blocked, and its length equals `shortageCount`.
57. The signal is at least 88px tall and fits a 375px screen without scrolling sideways. On the sites list a blocked site's card shows its short materials, up to three and then a count of the rest. At the top of the site screen the signal and the operator row come before the Needs your decision panel, and a clear or nothing-planned site's signal replaces its banner. The signal's name never repeats the site name or the names of the Text operator and Call operator buttons.

**Connection colour and demo sign-in (2026-10-19)**
58. The connection bar's row is green with dark text while online and red with white text while offline (each at least 4.5:1); while it checks it stays black. The words Online and Offline stay, so colour is never alone.
59. On a first visit, or after signing out, a full-screen sign-in covers every page and the page behind cannot be reached. It asks for a username, a password and a role (Team leader or Operator, Team leader by default), with Forgot password and Create account. Signing in with a missing username or password says which is missing and stays; with both it closes, whatever the password. The header (and the side menu) then reads "Hi, <username>" instead of "Team leader", and a reload keeps the user signed in, without the sign-in flashing first.
60. The Guide has Sign out at its top right; it brings the sign-in back with the username filled in. Create account asks for a username, an optional email, a role and a password twice (they must match) and signs in. Forgot password takes a username or email and says that, in this demo, nothing is sent. The username, role, accounts (without passwords) and the signed-in state are kept in this browser only.

## 5. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Performance | Readiness for a site of 200 penetrations returns in under 1 s on the deployed app. |
| Safety | Fail closed: missing or unavailable data never produces a clear status. |
| Security | The app connects as a database role that can only read and insert the two action tables (append-only enforced by the database). Server-side credentials only, TLS in production. Author set on the server. Input validated at the boundary with a schema. Errors return `{code, message}` only. |
| Privacy | Logs contain ids and codes, not notes or reasons. |
| Accessibility | Meets WCAG 2.2 AA for every screen: contrast, focus order, labels, status not by colour alone. |
| Maintainability | Domain core has no framework or I/O imports. Each upstream sits behind one port. |
| Auditability | Actions are append-only with actor and timestamp. |
| Delivery | CI runs typecheck, lint, unit, API, database and end-to-end tests. Deploy follows a green run. |

## 6. Assumptions

Each is carried into the README as a known assumption.

1. Nominations include each penetration's orientation, substrate, service type, size, and required integrity and insulation.
2. Solution-to-material quantities exist in some form upstream. Here they are invented.
3. Stock is one shared figure per material, summed over locations.
4. Purchasing and warehouse are the escalation targets.
5. A team leader may open any site in the sample. Site membership is not modelled.
6. A shortage blocks the whole site. Partial dispatch is a later iteration.
7. Approval of substitutes happens elsewhere, in a process this slice does not depend on.
8. Site and material ids contain no `:` (the shortage id is `siteId:materialId`). Upstream data is validated at the boundary, and the domain additionally fails closed on bad numbers.
9. The catalogue file path is trusted server configuration, never user input.
10. The stock feed's time is the picker's last action: the warehouse changes stock when it picks. A real feed would add who and what.
11. Each site's operator and picker come with the site from the planning system. Here they are invented.

## 7. Sample data (all invented, clearly labelled)

Lives in `data/sample/` with a README that says so. The CSV is the only real data.

- **Sites:** at least three. One clear, one blocked by a shortage, one with a missing-data case.
- **Materials and mappings:** a small set (for example sealant, collar, wrap), mapped to the demo codes `0438`, `0789`, `0434`, `0344`, `0334` and their candidates `0451`, `0464`, `0790`, `0791`, `0435`, `0347`.
- **Stock:** one material comfortably in stock, one short, one held in two locations, and one with no record.
- **Penetrations:** include one nominating a code missing from the catalogue, and one nominating `0943` (incomplete substrate).
- **Requirements:** integrity and insulation on each penetration, set equal to the nominated solution's own rating, except pen-c-02, which needs 90 min insulation against 0435's 60 to show AC 35.

## 8. Exclusions

Real authentication, a real inventory or nomination service, approval of substitutes, stock reservation or allocation, crew scheduling, offline data and queued writes (the app shows the connection and holds its own sends, but it does not cache screens or queue decisions), rate limiting, push notifications (Text operator opens the leader's own messages app), install, pins and photos, other suppliers, and editing the catalogue.

## 9. Demonstration scenario

1. Open the app. The landing page says it is a demo with invented data. From the menu, open Sites: site B is blocked.
2. Open site B. The page lists the penetrations. There is no blocked banner. Filter chips count the penetrations, and the stock figures are labelled shared and not reserved.
3. Open a penetration nominating `0438` (L3, Riser 2). Its sealant line reads "this site short 2 of 10" and opens the sealant's page at site B's section. Escalate it to purchasing with a note. The sealant's Decisions tab shows the escalation at site B. Back returns to the penetration. On the sites list, site B is still blocked: a decision does not create stock.
4. On that penetration, see candidates `0451` and `0464` labelled not verified. `0451` uses sealant, which this site is short of, and says so. Propose `0451` with a reason. It is listed as proposed and nothing else changes.
5. Open the penetration nominating `0344` (L5, Plant room). See "no catalogue match"; its sealant shortage is decided on the sealant's page. Go back to the sites list, open the menu and choose Materials: the pipe collar is on hand 2 against 6 planned across sites, short at site B, while site A on its own is not short.
6. Open site C. The Data problems chip counts four. The rows name the kind; each penetration page gives the reason, including two nominated solutions that do not fit (L1, Stair core: 0943's substrate is cut off in the catalogue; L1, Riser 1: needs 90 min insulation, 0435 claims 60). The Shortages chip shows the one stock-unknown penetration, never a clear status.
7. On site B's list, the escalated penetrations show the escalation mark. Open L3, Riser 2 and its Decisions tab: the escalation and the proposal, with date and author. Then open the menu and choose Decisions: every site's decisions, grouped by site.

## 10. Production gaps (carried to README)

No login or role checks, no rate limiting, TLS that encrypts but does not authenticate the database server, offline support limited to the connection state (no cached screens or queued decisions), stub upstream systems, shared unreserved stock, and no approval workflow.

## 11. Open points

- Whether "fire rating" in QAntum is the integrity and insulation pair (affects FR11).
- Who actually approves substitutes, and whether that queue exists.
- Which locations count as "in stock" for a leader.
- Whether a recurrence at the same shortfall needs a fresh decision (affects FR10).
