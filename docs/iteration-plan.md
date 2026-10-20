# Iteration plan

Seven increments, each shippable by itself. Increment 1 is the slice defined in `slice-specification.md` and is live (section 3); work it left open moves to increments 2 through 7. Beyond increment 1 these are reasoned directions, not promises. Vocabulary: `glossary.md`.

## 1. Problem

A crew should leave only once the leader has confirmed stock for the planned work and dealt with each shortfall by waiting, escalating or switching solution. Crew planning hangs on that answer.

In production this needs four inputs: a known plan, known material per solution, known stock, and a decision that arrives with the right people. Other systems own the first three. Nothing provides the fourth today.

## 2. Choice of slice

| Candidate | Outcome |
| --- | --- |
| Read-only stock lookup ("what do I need, is it in stock") | Informative, but the leader still has to ring someone to act. |
| **Stock lookup plus a stored decision: wait, escalate, or a substitute proposal** | **Selected.** Closes the loop in the brief and produces the missing artefact: a stored decision. |
| Automatic substitution | Dropped. Catalogue data cannot establish compliance; the brief says a matching field proves nothing. |
| Crew scheduling | Dropped. Operations already own it; the slice only emits blocked or clear. |
| Offline-first mobile | Deferred. Leaders check before departure, normally with coverage, and installation already runs on mobile. |

Reading from upstream and owning only decisions keeps the slice small, independently testable, and cheap to connect to production systems later.

## 3. Roadmap

| # | Increment | Outcome | Prerequisites |
| --- | --- | --- | --- |
| 1 | Readiness plus decisions (this slice, live) | Shortages visible, decisions stored, crew status published. | Stubbed sites, nominations, stock, materials |
| 2 | Production data sources | Trustworthy figures; authentication and roles in place. | Access to production APIs; an identity provider |
| 3 | Escalation delivery | Escalations get received, acknowledged and closed. | Increment 1 records; a channel to purchasing and warehouse |
| 4 | Substitute approval | A proposal turns into a controlled, signed-off variation. | A reviewer role; a write path to nominations |
| 5 | Planning | Partial dispatch; stock allocated across sites. | Dependable stock data; a reservation model |
| 6 | On-site use | Usable with weak signal and inside the mobile app. | Increments 2 and 3 |
| 7 | AI assistance | A material photo pre-fills its details for a person to confirm. | Photos from increment 6; a product image library |

### Increment 1: readiness and decisions (live)

- **Scope:** as `slice-specification.md` defines. Upstream systems are sampled, the catalogue is real, and Supabase Postgres stores decisions, pick reports and on-site reviews.
- **Outcome:** the leader's loop is closed, and the decision data model is exercised end to end.
- **Done when:** CI passes acceptance criteria 1 through 91, a public URL serves the build, and the demo script works in a fresh browser. Status: achieved; each merge into `main` deploys and clears the smoke test.
- **Not proven:** how production upstreams behave (latency, data quality), actual users, an actual approval. In addition: sign-in is a client-side demo the server never checks; drive times rely on Mapbox; the offline queue holds pick reports but no decisions.

**Shipped beyond the original plan.** Phone walkthroughs pulled these into increment 1:

| Feature | Origin | Requirements |
| --- | --- | --- |
| Pick check, on-site review, pick-error reporting to the warehouse | Partly increment 3 (escalation delivery) | FR26 to FR28 |
| Offline queue for pick reports, flushed on reconnect, keyed for idempotency | Partly increment 6 (on-site use) | AC 66 |
| Demo sign-in that assigns a role, leader or operator | Placeholder for increment 2 (authentication) | FR25 |
| Persistent Online switch, offline details, Sync now | Not planned | FR18, FR24 |
| A single large per-site signal using shape plus colour, which phones the operator | Not planned | FR19, FR22, FR23 |
| Per-project map, directions and drive time, measured from a fallback origin until device location is shared | Not planned | FR30 |
| Daily verdict, deadlines per project, deadline calendar | Partly increment 5 (planning) | FR31 to FR33 |
| Four tabs (Map, Calendar, Projects, Guide), and back navigation that returns to the originating screen | Not planned | FR34; AC 83, 84, 85 |
| Readiness filter and text search over projects | Not planned | FR29 |
| Move a deadline and change the operator on a card, kept in the browser | Partly increment 5 (planning: write back to the planning system) | FR35; AC 86 to 88 |

### Increment 2: production data sources

- **Scope:** swap every stub adapter for its production client behind the unchanged port. Authenticate through QAntum's existing identity. Enforce row-level security on site membership. Source material mappings from the real system, or add products and quantities to the catalogue.
- **Outcome:** figures the leader can trust, and actions limited to authorised people.
- **Unknown:** whether product and quantity data exists anywhere yet. The brief claims the catalogue lists products; the excerpt lists none. If the data is missing, the increment begins by capturing it.
- **Also:** hand the catalogue defects in `catalogue-data-model.md` to their owner, and decide whether this app becomes a module inside the web app.
- **Moved from increment 1:** Supabase Auth replacing the demo sign-in; server-side role and assignment checks; a people table; leaders assigning operators to a site for a date.
- **Done when:** one real site's readiness agrees with the stock system and the specification, verified against a manager's own numbers.

### Increment 3: escalation delivery

- **Scope:** purchasing and the warehouse get an inbox for escalations, acknowledge them and close them; the leader can see each state. Notifications go by email or whatever channel is already in use.
- **Outcome:** an escalation is no longer an unread note; the leader knows the owner and the due date.
- **Unknown:** today's recipients of escalations and the tool they use.
- **Moved from increment 1:** warehouse-side status on pick reports, reported back to the leader; one-tap restock requests from site; arrival alerts in the app and by SMS.
- **Done when:** during a trial a real recipient acknowledges an escalated shortage, and the leader sees the acknowledgement.

### Increment 4: substitute approval

- **Scope:** reviewers get each proposal with its evidence (supplier assessment, tested scope, installation limits), accept or reject it, giving a reason; the web app then rewrites the nomination. The leader sees the outcome, and the crew can be released.
- **Outcome:** substitution becomes a sanctioned way to release blocked work, while the golden thread stores approver, decision and reason.
- **Unknown:** whether any approval process exists. The brief describes managers checking installation progress and variations; it never mentions a queue ahead of site work. The business must define review rules and who holds approval authority.
- **Done when:** an accepted substitute rewrites the nomination, clears the shortfall and is written to the audit log; a rejection tells the leader why.
- **Moved from increment 1:** risk-based substitution. Fire-stopping products are never swapped automatically; low-risk consumables are swapped only for equivalents approved beforehand.

### Increment 5: planning

- **Scope:** partial dispatch (crews work the unaffected penetrations), stock allocation or reservation between sites, and delivery dates that give "wait" an expected end.
- **Outcome:** lifts both known constraints of increment 1, the whole-site block and pooled stock that can be promised twice.
- **Prerequisites:** inventory-owned reservations; delivery data.
- **Done when:** two sites contending for one stock line both get accurate answers, and a partially ready site can start.
- **Moved from increment 1:** a decision cut-off before departure that defaults to the safest outcome (penetrations that are short wait, and purchasing gets notified); per-leader ranked shortage strategies with "escalate and hold" fixed in last place; a wastage factor on demand; a pre-departure packing slip (planned versus picked, exceptions on top).

### Increment 6: on-site use

- **Scope:** read access without signal, a write queue built on the existing idempotency keys, plus a Flutter client on the same API.
- **Outcome:** works at sites with poor signal, inside the app operatives already use.
- **Prerequisites:** stable contracts out of increments 2 and 3; the mobile sync pattern.
- **Done when:** a decision captured offline syncs later with no duplicate.
- **Moved from increment 1:** offline reads in IndexedDB; decisions queued the same way as pick reports; actual photo upload, more than one per report (the current build stores only a "photo attached" flag); a position attached to each report (GPS coordinates or a floor-plan pin); a report type for drawing mismatches.

### Increment 7: AI assistance

- **Scope:** a material photo is compared with the product library to propose the product, its size and its fire rating, plus a confidence score. Under a threshold a person has to confirm; any field stays editable; the record stores both the model's suggestion and the human edits. AR remains a mobile-app concern.
- **Outcome:** less data entry on site, while the compliance call stays with a person.
- **Prerequisites:** increment 6 photos; a labelled product image set.
- **Done when:** a trial shows the suggestions save time, and nothing unconfirmed is ever persisted.

## 4. Ownership

| Concern | Owner | Reason |
| --- | --- | --- |
| Installation, pins, photos | Mobile app | Not on the leader's path |
| Sites, penetrations, nominations | Existing web app | Read-only for the slice |
| Stock | Inventory system | Read-only for the slice |
| Crew schedule | Existing operations | Consumes blocked or clear |
| Decisions (waits, escalations, proposals), pick reports, on-site reviews | This app | The genuinely new data |

## 5. Key unknowns

| Question | Increment | Approach |
| --- | --- | --- |
| Are materials and quantities per solution recorded anywhere? | 2 | Find the system of record, or begin capturing the data |
| Who handles escalations, and through what? | 3 | Pilot with actual recipients |
| Is there an approval process? | 4 | Confirm with the business first |
| Does pooled stock mislead in practice? | 1 (labelled), 5 (resolved) | Look for double commitment in a pilot |
| Should blocking apply per site or per penetration? | 1 (per site), 5 | Watch how leaders actually plan crews |

## 6. Notes

- Sequencing follows dependencies and risk. If approvals matter sooner than escalation tracking, increments 3 and 4 can swap.
- Ports and contracts from increment 1 carry forward, so later increments extend the code instead of rewriting it.
- Increment 1 states its limits openly: stubbed upstreams, pooled unreserved stock, whole-site blocking, a client-side demo sign-in.
- Technical debt: the fallback origin's coordinates carry more precision than a demo requires and should be rounded; one catalogue unit test locates the CSV by a path that fails in folders with non-ASCII names on a developer machine (CI is unaffected) and should not rely on the path; end-to-end tests stay on Playwright rather than the Robot Framework option considered early, as the existing suite already runs axe, the AC gate and three server configurations.
