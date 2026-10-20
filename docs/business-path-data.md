# Team-leader workflow and missing data

Step-by-step trace of the workflow in the brief. For each step: the records involved, what the catalogue already supplies, and what has to come from elsewhere.

Key: **have** = present in `solutions-excerpt.csv`. **assume** = held somewhere in QAntum, absent from this file. **sample** = fabricated for this slice.

## Workflow

1. Each site carries planned penetrations; every penetration references a nominated solution.
2. Ahead of departure, the leader needs the material list for that plan and its stock position.
3. Every shortfall ends in one of three outcomes: escalation, a wait, or another solution.
4. The outcome feeds crew scheduling.

Installation, pinning and photo capture belong to operatives in the mobile app. The trace ends at the go/no-go call for the crew.

## 1. Planned work

Owned by the existing web specification. Neither the catalogue nor this slice's database holds it.

The leader app has no direct access to that system's tables: no joins on penetrations or nominations. It consumes two read endpoints as an upstream contract. During the exercise, sample JSON with the identical shape answers both.

- `GET /sites`: sites visible to the leader (id, name, plus a street address or job ref).
- `GET /sites/{id}/nominations`: planned penetrations for one site with their nominated `internal_code`.

**Penetration** (assume; a single opening at a site)

- site, floor or plan, position
- the attributes a solution must fit: size, orientation, substrate, service type
- integrity and insulation the opening requires
- the nominated `solution.internal_code`
- state: planned, ready or blocked

**Gap:** sites, plans and nominations are absent from the CSV. A handful of sampled penetrations reference genuine `internal_code` values.

## 2. Solution requirements

**Solution** (have): internal and supplier codes, plus the orientation, substrate and service it covers, its size, and its integrity and insulation ratings. Field notes: `docs/catalogue-data-model.md`.

**Gap:** the excerpt names neither products nor quantities, although the brief says the full catalogue has products.

**Solution material** (sample; links a solution to a material)

- `solution.internal_code`
- material
- amount used per installation

This link is the only route from a plan to its material demand.

## 3. Stock position

**Material** (sample): name and unit.

**Stock balance** (upstream, sampled): the material, the amount on hand, and where it sits (warehouse or van).

Inventory belongs to another system; the leader app reads balances and writes nothing back. The stub is `GET /stock` (optionally narrowed to a site's materials). The brief places stock in neither the catalogue nor the spec app, so the design treats it as its own upstream service instead of storing it in this slice's schema.

**Gap:** the supplied file has no balances, no delivery dates and no warehouse. Sampled balances include at least one material that runs short.

Computed on read, never stored: demand across a group of penetrations is the sum of their solution-material amounts; the shortfall is demand minus on hand whenever demand is larger.

## 4. Leader decision

**Shortage** (sample; the record of the decision)

- the affected penetrations and the material
- shortfall amount
- outcome: escalate, wait or substitute
- state: open, escalated, waiting or resolved

**Escalation** (sample): the shortage, its recipient (purchasing, or the warehouse), a note, a timestamp.

**Substitution** (stored as a proposal, only when the slice covers it): penetration, current solution, proposed solution, the rationale, status `proposed`.

Sign-off sits downstream in QAntum's current web application, where a manager accepts or rejects before any nomination changes. What the brief describes is managers and clients watching progress and variations during installation, not a review queue before work starts, so this design does not take such an audit step for granted. Matching catalogue fields does not equal approval. Escalate and wait need no sign-off at all.

**Schedule** (assume crews are scheduled elsewhere; only the slice's part is sampled): crew, site, date, and whether open shortages block it.

## System of record

| Record | Owner |
| --- | --- |
| Solution | Catalogue (supplied CSV). |
| Penetration, nomination | Current spec system, through its API; sample JSON replaces the endpoint. |
| Material, per-solution amount | Missing from the excerpt; sampled. |
| Stock balance | Upstream inventory, read-only API; sample JSON replaces it. |
| Shortage, escalation, substitution | This new leader slice. |
| Crew schedule | Existing operations; the slice only reads blocked versus clear. |
| Installation, pin, photo | Mobile app, outside the slice. |

## Iteration 1 scope

Included: nominated penetrations, the materials their solutions use, the stock comparison, and one leader outcome (escalate or wait).

Excluded: production authentication, a live inventory system, automatic substitution claimed as compliant, mobile installation.

## Write endpoints

Leader actions are the only persisted data. Sites, nominations, stock and the catalogue come from upstream (during the exercise the catalogue is read from the CSV it was given).

- `POST /sites/{id}/shortages/{shortageId}/wait`: store a wait; the crew remains blocked until stock moves.
- `POST /sites/{id}/shortages/{shortageId}/escalate`: store an escalation; the body names the recipient (purchasing or warehouse) and carries a note.
- `POST /sites/{id}/penetrations/{penetrationId}/substitutions`: store a substitute proposal; body carries the current and proposed `internal_code` and a reason; status fixed at `proposed`.
- `GET /sites/{id}/actions`: every wait, escalation and proposal for one site.

Approving a substitution is out of scope; changing the nomination afterwards is a job for QAntum's web application.
