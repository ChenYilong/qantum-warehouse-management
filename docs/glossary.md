# Glossary

Domain vocabulary for the slice, defined from the business side. Every entry is tagged with its source:

- **Brief**: comes from the exercise brief.
- **CSV**: observable in `data/solutions-excerpt.csv`.
- **Assumed**: our interpretation; the source is silent. Needs business confirmation.
- **Sample**: fabricated for this slice.
- **Industry**: general passive-fire background, not defined by the brief. Verify before relying on it.

## 1. Domain

**Passive fire protection.** Rated building elements (walls, floors, doors, seals) that hold back fire and smoke with no power and no moving parts, as opposed to *active* systems such as sprinklers or alarms. *(Industry)*

**Compartmentation.** Splitting a building into fire-resisting cells, each bounded by rated elements, so that fire is held back for a rated period. Everything this app does serves that containment. *(Industry)*

**Penetration.** An opening through a rated wall, ceiling or floor that carries a service: pipe, cable or duct. Unsealed, it compromises the compartment. It is the team leader's work unit: one hole, one seal. *(Brief; the brief uses the word throughout)*

**Fire stopping.** The seal installed in or around a penetration to bring the element back to its fire rating. *(Brief)*

**Solution.** A published, tested method for sealing one exact case: given service type, given substrate, given size, given rating, from a single supplier. Think recipe, not product. *(CSV: one row per solution)*

**Nominated solution.** The solution a specifier assigned to a particular penetration; installers are meant to fit precisely that one. *(Brief: "solutions nominated for each site")*

**Specification.** The design-side record of which solution applies where. QAntum stores it inside its web application. *(Brief)*

**Variation.** An installation that deviates from the specification, flagged automatically by QAntum. Using a substitute is an intentional variation and needs sign-off first. *(Brief)*

**Golden thread.** The unbroken, reliable trail of building-safety information across design, installation and inspection. It is the reason pins, photos and approvals matter, and the reason a substitute that is "probably fine" is unacceptable. *(Brief; the term originates in UK building-safety regulation)*

**Compliance evidence.** Proof of correct installation: for each penetration, a floor-plan pin and a photo. *(Brief)*

## 2. Roles and systems

**Operative.** On-site installer. Installs, pins and photographs using the offline mobile app. *(Brief)*

**Team leader.** Leads a crew of operatives at a site and decides where and when it works. The slice is built for this role. *(Brief)*

**Back-office manager.** Writes specifications, checks pins and progress, and presumably signs off substitutes. *(Role from the Brief; the sign-off duty is Assumed)*

**Quantity surveyor.** Follows quantities and cost, with live sight of progress. Not a user here. *(Brief)*

**Purchasing / warehouse.** Who an escalation lands with. Purchasing buys more; the warehouse relocates what exists. *(Assumed; the brief only says "others in the business")*

**Web app.** QAntum's current application for admin, specification and reporting; it owns sites, nominations and penetrations. *(Brief)*

**Mobile app.** Flutter app used offline-first by operatives; outside the slice. *(Brief)*

**Upstream system.** Anything the slice consumes read-only (stock, nominations, sites). *(Our term; `slice-decisions.md`)*

## 3. Catalogue columns

**Internal code.** QAntum's identifier for a solution, e.g. `0334`; the key across this slice. *(CSV)*

**Supplier reference code.** Supplier-issued identifier, e.g. `V1.11-22SFR00038-146-E`, pointing at the test or assessment that backs the row. *(CSV)*

**Supplier.** Publisher of the solution; Ryanfire on every row. *(CSV)*

**Orientation.** Values `Wall`, `Floor`, `Ceiling`. A wall-tested solution carries no automatic validity in a floor. *(CSV)*

**Substrate.** The construction being penetrated: layered plasterboard of some thickness, concrete, a timber infill, and so on. Its make-up drives fire performance. *(CSV)*

**Substrate option.** A loose family label like "Plasterboard Wall". Many constructions map to one option, so it helps browsing and must not drive suitability. *(CSV; warning in `catalogue-data-model.md`)*

**Service.** Whatever runs through the opening (cable, pipe, duct, bundle), or nothing in the case of a blank opening. *(CSV: "penetrating service")*

**Service classification.** The service's broad category. Values: pipes that are combustible (plastic, which melts or burns), non-combustible (steel, copper) or insulated; electrical; structural; other. Plastic burns away and leaves a void, which calls for a different seal. *(Values from the CSV; the reasoning is Industry)*

**Service type.** The precise item, insulation wrap included, e.g. `Copper Pipe - 38mm Nitrile Rubber`. *(CSV)*

**Service type option.** A grouped label over service types that can mask a real distinction (sockets are not pipes). *(CSV)*

**Service size.** Diameter or opening dimensions verbatim (`Ø50mm`, `1100x10mm`), stored as text. *(CSV)*

**Fire integrity.** Minutes for which the seal prevents flame and hot gas crossing; 60 = an hour. Detail in section 3a. *(CSV column "Integrity", range 30–240)*

**Fire insulation.** Minutes for which the unexposed side remains below ignition temperature for nearby materials. A dash is an absent claim, which differs from zero. The two ratings are independent claims. Detail in section 3a. *(CSV)*

**Fire rating.** The integrity and insulation pair written together, e.g. 60/30. A nominated rating is the floor a penetration has to reach. *(Assumed notation)*

## 3a. Fire performance detail

Imagine fire burning against one face of a wall that a pipe crosses. The seal has two separate duties, and the catalogue gives each a figure in minutes.

**Integrity (E).** First duty: no flame or hot gas reaches the far side. If it fails, fire travels through the opening. CSV column `Integrity`, populated on every row, between 30 and 240.

| Integrity (min) | 30 | 60 | 90 | 120 | 180 | 240 |
| --- | --- | --- | --- | --- | --- | --- |
| Rows | 5 | 72 | 10 | 55 | 4 | 2 |

 *(CSV; the letters E and I are Industry usage)*

**Insulation (I).** Second duty: keep the *unexposed* face below the temperature that would ignite nearby material or injure a person. A seal may block flame yet let a metal pipe carry heat across, so this is an independent and stricter claim. CSV column `Insulation`.

| Insulation (min) | none | 15 | 30 | 45 | 60 | 90 | 120 | 180 | 240 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rows | 8 | 2 | 11 | 3 | 64 | 18 | 36 | 4 | 2 |

 *(CSV)*

**No claim (`-`).** The supplier publishes no insulation figure. That is neither zero nor acceptable; handle it as unknown. Example: `0334` (copper Ø100mm, integrity 60, no insulation figure) cannot replace `0344` (steel, 60/60) although the integrity values agree. *(8 CSV rows; interpretation is ours)*

**Rating notation.** Integrity/insulation in minutes:

| Code | Service | Rating | Meaning for the leader |
| --- | --- | --- | --- |
| `0334` | Copper pipe Ø100mm | 60 / no claim | Blocks flame for an hour; silent on far-side heat. |
| `0344` | Steel pipe Ø28mm | 60 / 60 | Blocks flame and limits heat, both for an hour. |
| `0345` | Copper pipe Ø100mm | 120 / 90 | Two hours against flame, 90 minutes against heat. |
| `0435` | KELOX pipe Ø32mm | 60 / 60 | An hour on each measure. |
| `0434` | KELOX pipe Ø32mm | 60 / 30 | Identical pipe and size to `0435`, but insulation lasts half as long; the two cannot be swapped. |

**Insulation ≤ integrity.** Holds on all 148 rows, which matches the definitions: once flame passes, the far side has no protection left. *(Observed in the CSV; rationale is Industry)*

**Fire resistance period.** Total time the penetration must hold, which drawings usually give as a single figure (30, 60, 90 or 120 minutes). It fixes the integrity minimum; any insulation requirement is a second, separate condition. *(Industry; QAntum's storage of it is Assumed)*

**Required vs offered.** The specification gives a penetration its *required* rating; a solution's test gives it an *offered* rating. A solution qualifies only if offered meets or exceeds required on **each** measure, and a missing insulation claim never satisfies a stated insulation requirement. *(Our matching rule, `technical-design.md` §6)*

**Fire test.** A laboratory run in which the exact assembly (substrate, service, seal, size) is heated along a standard time–temperature curve until failure, and the minutes are recorded. Source of every number a solution carries. *(Industry)*

**Assessment (engineering judgement).** A qualified body's written opinion that a variant of a tested assembly also performs. A supplier reference might rest on an assessment instead of a direct test; the CSV gives no way to tell. *(Industry; not in the CSV)*

**Why the exact assembly matters.** A test result covers the tested combination only. Alter substrate thickness, pipe material, lagging or size and the figure may no longer apply. That is the core of the brief's caution that agreeing fields do not prove compliance. *(Caution from the Brief; explanation is Industry)*

**"Insulated pipe" vs fire insulation.** Two meanings of one word. "Insulated Pipe" as a classification refers to *thermal lagging* (fibreglass, nitrile rubber, Thermobreak). "Insulation" as a rating refers to limiting *fire* heat transfer. A lagged pipe may carry any insulation rating. Insulated Pipe appears on 13 rows. *(CSV)*

**Plastic vs metal pipe.** Plastics such as PEX, PVC or PP-R melt or burn and open a void; the seal therefore has to shut the void while the pipe burns away. Metals stay put yet carry heat across, so their insulation figures tend to be low or missing. Counts: combustible 76, non-combustible 19. *(Counts from the CSV; behaviour is Industry)*

**Intumescent.** Swells when heated, filling gaps and shutting the opening; found in most collars, wraps and sealants. *(Industry)*

**Typical products.** Kinds of item a solution may consume: collars, wraps, sealant or mastic, batts or boards, pillows. None are named in the excerpt, so every material in the slice is invented. *(Industry; the gap in the CSV is documented)*

## 4. Slice terms

**Planned work.** A site's penetrations scheduled for the crew, each carrying a nominated solution. *(Brief; the shape is Assumed)*

**Required product / material.** Physical items an installation consumes, e.g. collars, wraps, boards, sealant. The brief claims the catalogue lists these; the excerpt does not. *(Brief; absent from the CSV)*

**Quantity per install.** Usage of one material by a single penetration; missing from the CSV. *(Sample)*

**Solution material.** Our mapping from a solution to its materials and per-install quantities. *(Sample; our term)*

**Stock balance.** Quantity of a material on hand and where it is held (warehouse or van), as read from inventory. *(System Assumed; data Sample)*

**Shortage.** Demand from the planned work exceeds what is on hand. Derived on every read, never typed in. Keyed by site + material in our design. *(Our term; see `technical-design.md`)*

**Shortfall.** The gap, calculated as demand less on-hand. *(Our term)*

**Blocked / clear.** Crew status per site. Blocked: one or more shortages, or missing data, prevent completing the planned work. Clear: all required material is available. *(Our term, from the ready/blocked split in `slice-decisions.md`)*

**Unknown.** Required data is absent (no stock row, no material mapping). Handled as blocked with an explicit reason; never read as zero. *(Our rule)*

**Wait.** Decision to hold until stock turns up. Stored; the crew stays blocked. *(Our term)*

**Escalate.** Decision that passes the shortage, with a note, to the warehouse or purchasing. Stored; the crew is blocked until the stock figure changes. *(Our term)*

**Substitute (proposed).** Decision that proposes a different solution from the catalogue for a penetration whose nominated one cannot be fitted. Remains a proposal until signed off. *(Our term)*

**Catalogue match.** A substitute candidate whose catalogue fields agree with the penetration. It justifies opening a review; it does not prove compliance. The data lacks products, installation limits and test scope, so a match alone cannot establish suitability. *(Brief: "A matching catalogue field alone should not be treated as proof")*

**Approval.** A qualified person confirms the substitute is acceptable; only then does the web application update the nomination. Nothing in this slice approves. *(Process Assumed; boundary per `slice-decisions.md`)*

**Idempotency.** A request sent twice is stored once. Important on patchy mobile networks, where taps repeat. *(Technical term)*

## 5. Commonly confused pairs

| Pair | Distinction |
| --- | --- |
| Solution vs product | Solution: the method proven by test for one case. Products: the items that build it. The CSV contains solutions only. |
| Integrity vs insulation | Integrity: flame and gas stay on their side. Insulation: the far face stays cool. Either can exist alone. |
| Substrate vs substrate option | Substrate: the precise construction. Option: a broad family label. |
| Wait vs escalate | Wait pauses; escalate hands action to someone else. The crew remains blocked in both cases. |
| Substitute vs approved substitute | The leader proposes; someone else approves, and only approval alters the nomination. |
| Blocked vs unknown | Blocked: cause known. Unknown: data missing; still never reported as clear. |
| Variation vs substitute | Variation: any deviation from spec. Approved substitute: a controlled, recorded deviation. |

## 6. Open questions for the business

- Is "fire rating" the integrity/insulation pair, or does QAntum mean something stricter?
- Who signs off substitutes, and is there a queue for it today?
- Who handles escalations, and through which channel?
- Is stock held per warehouse, per van, as a site allocation, or all of those?
- With one material short, is the whole site blocked or only the penetrations it affects?
