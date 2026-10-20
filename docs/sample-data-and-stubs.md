# Fixture data and stubbed upstreams

Fabricated data plus the contract that upstream systems must honour for the API layer. Status: **approved 3 Oct 2026**; revised 6 Oct 2026 (insulation on `pen-c-02`, the new `pen-c-05`, the `0348` mapping; logged in `submission-checklist.md`). The JSON files under `data/sample/` exist and were validated by executing the production domain code against them (section 4). Vocabulary: `glossary.md`. Requirements: `slice-specification.md` §7.

**Only the catalogue is real.** Real data is limited to `data/solutions-excerpt.csv` and the `nominatedCode` values; all else is fabricated, and each sample file states that in a `label` property.

## 1. Intent

Four sites. Each is built so a particular screen state of the demo script appears without manual setup, and so the edge cases surfaced in review are visible in the UI, not just in tests.

| Site | Crew status | Purpose |
| --- | --- | --- |
| `site-a` Cedar Court, Block A | clear | Happy path. Draws on the stock site B lacks, so "shared, not reserved" becomes observable |
| `site-b` Quayside House, Levels 3 to 5 | blocked | Two shortages, a stock figure that only adds up across two locations, substitutes both in and out of stock, all empty states |
| `site-c` Northgate Depot, Phase 2 | blocked | Missing data and non-fitting solutions: code `9999` absent from the catalogue; `0393` with no material mapping; `0943` whose catalogue substrate is truncated (cannot fit, AC 35); `pen-c-02` requiring 90 min insulation where `0435` offers 60 (fabricated); `pen-c-05` (`0348`) needing fire mastic, which has no stock row |
| `site-d` Foundry Lane Annex | nothing planned | Must never render as clear |

## 2. Data set

### Materials (fabricated)

| Id | Name | Unit |
| --- | --- | --- |
| `MAT-SEALANT` | Intumescent sealant, 310 ml cartridge | cartridge |
| `MAT-COLLAR-25` | Pipe collar for 25 mm pipe | each |
| `MAT-COLLAR-32` | Pipe collar for 32 mm pipe | each |
| `MAT-WRAP` | Intumescent wrap strip | metre |
| `MAT-BATT` | Mineral wool batt | each |
| `MAT-PUTTY` | Fire putty pad | each |
| `MAT-MASTIC` | Fire mastic tube | tube |

The names are deliberately generic and assert nothing about Ryanfire's real product choices.

### Solution → material (fabricated; amount per install)

| Code | Service | Materials |
| --- | --- | --- |
| `0344` | Steel pipe Ø28 | wrap 1.5, sealant 0.5 |
| `0375` | Insulated copper Ø32 | wrap 2, sealant 0.5 |
| `0452` | PEX-AL Ø25 | collar-25 1 |
| `0438` | PEX Ø25, 60/30 | collar-25 1, sealant 0.5 |
| `0451` | PEX Ø25, 60/60; substitute candidate for 0438 | putty 1, sealant 0.25 |
| `0464` | PEX Ø25, 60/60; substitute candidate for 0438 | **unmapped on purpose** |
| `0434` | KELOX Ø32, 60/30 | collar-32 1, sealant 0.25 |
| `0435` | KELOX Ø32, 60/60; substitute candidate for 0434 | collar-32 1, sealant 0.5 |
| `0789` | Blank 1100x10, 60/60 | sealant 2, batt 1 |
| `0790` | Blank 1100x10, 120/120; substitute candidate for 0789 | sealant 2, batt 2 |
| `0791` | Blank 1100x10, 120/60; substitute candidate for 0789 | sealant 3, batt 1 |
| `0334` | Copper Ø100, 60/no claim | batt 2, sealant 1 |
| `0347` | Copper Ø100, 60/60; substitute candidate for 0334 | batt 2, putty 2 |
| `0943` | Blank 50mm, truncated substrate | sealant 1, mastic 1 (left out of totals: `pen-c-01` is classed under data problems, AC 35) |
| `0348` | Copper Ø40, 60/60 | mastic 1 (Northgate's unknown-stock shortage comes from this demand at `pen-c-05`) |
| `0393` | HVAC bundle, floor | **unmapped on purpose** |

Fractional amounts (0.25, 0.5, 1.5) make rounding up visible in totals.

### Penetrations per site

Catalogue fields are copied from the nominated code's CSV row, and the required rating equals that row's rating, with one exception: `pen-c-02` requires 90 min insulation against the 60 that `0435` offers (fabricated to exercise AC 35).

| Site | Nominations (count × code) |
| --- | --- |
| A | 2 × `0344`, 2 × `0375`, 2 × `0452` |
| B | 4 × `0438`, 3 × `0434`, 2 × `0789`, 1 × `0344`, 2 × `0334` |
| C | `0943`, `0435`, one with `9999` (**absent from the catalogue**), one with `0393`, `0348` at `pen-c-05` (Plant room on L2) |
| D | — |

### Stock (fabricated)

| Material | Location | Quantity |
| --- | --- | --- |
| sealant | Warehouse | 6 |
| sealant | Van 2 | 2 |
| collar-25 | Warehouse | 2 |
| collar-32 | Warehouse | 5 |
| wrap | Warehouse | 12 |
| batt | Warehouse | 10 |
| putty | Warehouse | 20 |
| mastic | (missing on purpose) | |

## 3. Rationale for the figures

- **Sealant split over two locations** (6 + 2): the on-hand figure reaches 8 only when locations are added together (AC 3).
- **Sealant and collar-25 are contested by A and B.** A requires two sealant and two collars, which it gets, so it is clear; B requires ten sealant and four collars and falls short. Combined demand exceeds supply: the double commitment that pooled, unreserved stock hides. The label on screen calls this out and the demo can show it (AC 10). On the Materials page it is explicit: collar-25 has 2 on hand versus 6 planned over all sites, short at B (AC 38).
- **Each of B's substitute cases differs.** `0438` → `0451` (needs sealant, which B lacks, so it reads short; AC 33) and `0464` (unmapped, so "no material mapping"). `0434` → `0435`, short for the same sealant reason. `0789` → two candidates competing for the same scarce sealant. `0334` → `0347`, fully in stock: the single "Materials in stock" case. `0344` → none, so the screen shows its empty state offering escalation.
- **On site C, `pen-c-01` nominates `0943`**, whose catalogue substrate is truncated: fit is unprovable, which puts it under data problems (AC 35), and its substitute view reports the incomplete catalogue substrate (AC 21). **`pen-c-05`** (`0348`, fabricated mapping: one fire mastic) carries the unknown-stock case. Mastic has no stock row, which yields a shortage of unknown size the leader can still act on (AC 5).
- **Site D** covers nothing planned (AC 8).

## 4. Results from running the code

Produced by the real `computeSiteReadiness` and `findCandidates` on these files, not by hand:

| Site | Crew | Shortages | Blockers |
| --- | --- | --- | --- |
| A | clear | — | — |
| B | blocked | Sealant: demand 10 (from 9.25, rounded up), 8 available, shortfall 2, 12 penetrations. Collar-25: demand 4, on hand 2, shortfall 2 | — |
| C | blocked | Mastic: demand 1, stock not known (`pen-c-05`) | `solution_mismatch` (`0943` substrate; `0435` insulation), `unknown_solution_code` (`9999`), `no_material_mapping` (`0393`) |
| D | nothing planned | — | — |

Candidate sets: `0438` → `0451`, `0464`. `0434` → `0435`. `0789` → `0790`, `0791`. `0334` → `0347`. `0344` → none. `0452` → `0465`. `0943` → `substrate_incomplete`. `9999` → `nominated_code_unknown`.

The first execution exposed a defect in my generated data: penetrations had `siteId` set to `a` and `b` rather than `site-a` and `site-b`, so A and B appeared to have nothing planned. Corrected; a contract check (section 7) now catches it.

## 5. Upstream contract

How the app expects the upstream reads to behave. Stubs implement exactly this; a production client would parse identical shapes.

| Read | Response |
| --- | --- |
| `GET /sites` | `{ sites: Site[] }` |
| `GET /sites/{id}/nominations` | `{ siteId, penetrations: Penetration[] }` |
| `GET /stock?materialIds=a,b` | `{ asOf, balances: Balance[] }` limited to the requested materials |
| `GET /solution-materials?codes=x,y` | `{ materials: Material[], items: SolutionMaterial[] }` limited to the requested codes |
| `GET /sites/{id}/picks` | `{ picker, lastAction, lastActionAt, lines: PickLine[] }`, absent when a site has no pick list |

Requesting stock and mappings for specific ids keeps payloads small and avoids pulling the entire inventory, a point raised in design review.

```ts
// src/ports/schemas.ts (Zod). Shared by the stubs and any future HTTP client.
const Id = z.string().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/); // no ':' (shortage id is siteId:materialId)

Site            = { id: Id, name: string, reference: string, address?: string,
                    operator?: Contact, picker?: Contact,    // Contact = { name, phone: "+44 7700 900156" }
                    location?: { lat: number, lng: number }, // the project map (AC 74)
                    date?: string }                          // the deadline, YYYY-MM-DD (AC 80)
Penetration     = { id: Id, siteId: Id, floor: string, location: string,
                    orientation: "Wall" | "Floor" | "Ceiling",
                    substrateDetail: string, serviceType: string, serviceSize: string,
                    requiredIntegrityMinutes: number | null,
                    requiredInsulationMinutes: number | null,
                    nominatedCode: string }
Balance         = { materialId: Id, location: string, quantity: number }
Material        = { id: Id, name: string, unit: string }
SolutionMaterial= { internalCode: string, materialId: Id, quantityPerInstall: number }
```

Contract rules:

- **Shape strict, values lenient.** A missing property, a wrong type or an invalid id rejects the full response; the API answers 502 `upstream_invalid`. A negative quantity is still a valid number, so it gets through, and the domain converts it into an `invalid_quantity` blocker or marks the material unknown. Rejecting a whole page over a single bad row would hide every other site's valid data and make the fail-closed domain rules unreachable.
- **Extra properties are dropped**, so upstream schemas can grow safely.
- **Finite numbers only.** `JSON.parse("1e999")` yields `Infinity`; the schema therefore tests finiteness explicitly.
- **Display-only properties** (`floor`, `location`, `reference`, `address`, a site's `date`) feed the UI; the domain ignores them.

## 6. Stubs

- **Location:** `src/adapters/stub/` implements the four ports over the JSON in `data/sample/` and validates each file against the schemas above. Port interfaces live in `src/ports/`.
- **Files instead of HTTP endpoints:** the deployed demo has no external dependency, and moving to a real client is a one-adapter change for each port. The schemas define the contract, so nothing meaningful is lost.
- **Test failure modes:** each stub takes a mode: `normal`, `down` (raises an upstream error), `empty` (valid, no data) or `malformed` (schema failure). These modes back AC 9 and the tests expecting 502.
- **No public failure switch.** The production URL cannot be forced to fail. Showing "stock unavailable" to the panel would need an environment flag limited to preview deployments; still open (section 9).
- **Error handling:** any stub failure turns into one `UpstreamError` carrying a code and no raw text, so file paths or contents cannot leak to clients.

## 7. Tests built on this data

- **Contract:** each fixture validates; all nominated codes except `9999` resolve in the catalogue; every penetration's `siteId` matches its parent key (the section 4 defect); every mapped `materialId` is defined in `materials`; ids never contain `:`.
- **Scenario:** an e2e test and an API-level test both assert section 4's results (AC 1, 2, 3, 5 to 8, 10, 18 to 21, 33 to 36).
- **Failure modes:** every stub mode leads to the correct 502 or empty screen; none can produce `clear`.
- **Drift guard:** candidate lists for the demo codes are pinned by a test; changing the catalogue or the matching rules fails CI loudly.

## 8. Coverage of this data

Demonstrated: the complete decision loop over realistic and messy fixtures; all empty and data-missing states; the contract production systems must satisfy.

Not demonstrated: real latency, authentication, data quality, concurrent stock changes, or whether real materials and quantities resemble these. Those need the production systems, i.e. iteration 2.

## 9. Open questions

Settled at approval (3 Oct 2026): generic material names remain, a single `Van 2` location suffices, and no failure switch is built for now. A stock-down switch on preview deployments stays available for the walkthrough.

## 10. Pick lists (fabricated, 19 Oct 2026)

`data/sample/picks.json` replaces the pick system the warehouse runs (AC 61). The warehouse has set every line to `picked`, so the pick check must detect problems on its own:

| Site | Lines | Pick check |
| --- | --- | --- |
| Cedar Court (`site-a`) | sealant 2/2 with nozzle; collar 4/4 with fixing kits | Matches the plan |
| Quayside House (`site-b`) | sealant 6/10 with no nozzle (part-picked); collar 6/6 lacking fixing kits (missing parts); batt picked at FRR −/60/60 where the plan says −/120/120 (wrong spec); wrap 2/2 | Not ready, 3 issues |
| Northgate Depot (`site-c`) | mastic 1/1; collar 2/2 with kits | Matches the plan |
| Foundry Lane Annex (`site-d`) | — | Can't check: there is no pick list |

Pickers in `sites.json` have `example.com` email addresses, a domain set aside for documentation, so Email links go nowhere. The UI labels the picker "(sample)".

## 11. Site coordinates (fabricated, 19 Oct 2026)

Every site in `sites.json` has a `location` (`{ lat, lng }`) that drives the map and the directions link (AC 74). The points are invented, in Auckland, close to each fictional address: the waterfront for Cedar Court, Wynyard Quarter for Quayside House, Albany for Northgate Depot, Onehunga for Foundry Lane Annex. They sit on public streets, not on real projects. End-to-end tests place the simulated phone in Grafton (-36.8615, 174.769), giving straight-line distances of 1.9, 2.5, 15.7 and 7.0 km.
