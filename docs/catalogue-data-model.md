# Catalogue data model

Scope: `data/solutions-excerpt.csv` and nothing else. The file is a Ryanfire solutions catalogue of 148 rows. It holds no product kits, no quantities, no stock, no sites and no schedules.

## Grain

Each row describes a single fire-stopping **solution** that has been tested: one penetrating service through one substrate, for one size and rating, published by one supplier.

Both `internal_code` and `supplier_ref_code` are unique across the excerpt (148 of 148). `internal_code` serves as the QAntum primary key; `supplier_ref_code` is kept as the supplier's identifier.

## Columns

| CSV column | Field | Content |
| --- | --- | --- |
| Internal Code | `internal_code` | QAntum id for the solution; string, unique |
| Supplier Ref. Code | `supplier_ref_code` | Supplier's document reference; unique in this file |
| Supplier | `supplier` | `Ryanfire` on every row |
| Orientation | `orientation` | One of `Wall`, `Floor`, `Ceiling` |
| Substrate | `substrate_detail` | Free-text construction (layers, thicknesses). Dirty: stray spaces, cut-off values such as `FR plasterboard,` |
| Substrate Option | `substrate_option` | Broad substrate group, 15 distinct values, e.g. `Plasterboard Wall`, `Concrete Floor` |
| Service Classification | `service_classification` | Top-level class, one of six (pipes: combustible, non-combustible, insulated; then electrical, structural, other) |
| Service Type | `service_type` | The exact item passing through, insulation wrap included where present (`Copper Pipe - 38mm Nitrile Rubber`) |
| Service Type Option | `service_type_option` | Grouped label for that item, 19 distinct values. It can differ from the service type (`PVC Socket` becomes `PVC Pipe`; `Blank` becomes `Other`) |
| Service Size | `service_size` | Diameter or opening dimensions exactly as printed (`Ø50mm`, `1100x10mm`); kept as text |
| Integrity | `integrity_minutes` | Minutes the seal resists flame and hot gas; numeric on every row (30 to 240) |
| Insulation | `insulation_minutes` | Minutes the seal restricts heat transfer. `-` (8 rows) means no claim and maps to null |

## Normalised shape

The file repeats text heavily. A normalised equivalent with the same content:

```text
supplier
  id, name

substrate_option
  id, name                         -- coarse family

substrate
  id
  substrate_option_id
  detail                           -- the raw Substrate string
  orientation                      -- wall / floor / ceiling, as stated with that detail

service_classification
  id, name

service_type_option
  id, name                         -- coarse label

service_type
  id
  service_classification_id
  service_type_option_id
  name                             -- raw Service Type

solution
  internal_code          PK
  supplier_id
  supplier_ref_code      unique
  substrate_id
  service_type_id
  service_size
  integrity_minutes
  insulation_minutes     nullable
```

Iteration 1 keeps a flat `Solution` per CSV row. The lookup tables show how to treat the repeated strings; they are not a day-one schema requirement.

## Observed relationships

- `substrate_option` groups many `substrate_detail` values: numerous plasterboard thicknesses, for instance, all roll up to `Plasterboard Wall`.
- `service_type_option` groups `service_type` values and can erase a distinction that matters, such as socket versus pipe or a blank opening versus "other".
- Integrity and insulation vary independently; a row may carry integrity with no insulation.
- No column lists the collars, sealants or other products an installation consumes. The brief says the full catalogue carries required products; the excerpt does not, and inventing a product column and attributing it to the file is not allowed.

## Data quality

Verified on every one of the 148 rows. It matters because substitutes are proposed by exact field comparison (`technical-design.md`, section 6).

| Problem | Rows | Example |
| --- | --- | --- |
| Two consecutive spaces in `Service Type` | 15 | `Copper Pipe  - 50mm Fibreglass` (`0375`) |
| Substrate truncated right after the family | 6 (`0853`, `0943`, `0944`, `0946`, `0952`, `0955`) | `FR plasterboard,` without the build-up |
| Space after an opening bracket | 2 | `( 1 layer 13mm)` (`0452`, `0479`) |
| Space between value and unit | 1 | `(51 mm)` (`0734`) |
| One construction, two spellings | 2 | `385mm hollow core concrete floor` vs `385mm hollow core floor` (`0534`, `0535`) |
| Mixed `Service Size` formats | 24 of 148 off the common form | `Ø50mm` (124), `80mm` (12), `1100x10mm` (9), `900mm x 50mm` (2), bare `60` (1) |

Truncation is the critical defect: such a value identifies no construction, so two truncated substrates are never considered equal. Everything else is cosmetic and absorbed by normalisation. Letter case also varies, so comparisons ignore case.

Raw distinct substrates: 42; after collapsing whitespace and case: 41.

## Feedback for the catalogue owner

The slice does not repair upstream data; it reports it. The README's limitations repeat these points.

1. **Six solutions with a truncated substrate** (`0853`, `0943`, `0944`, `0946`, `0952`, `0955`). Without the build-up they match no construction. They never get substitutes, and nominating one turns the penetration into a crew-blocking data problem (AC 35).
2. **`0534` and `0535` spell one construction differently**, with and without "concrete". Confirmation needed on whether the build-ups are identical.
3. **Formatting drift**: double spaces in 15 service types, stray spaces in 3 substrates, five different size formats. The slice normalises whitespace for comparison only.
4. **Products and quantities missing.** The brief promises required products in the catalogue; the excerpt has none, so the slice's shortage calculation runs on fabricated mappings.

## Outside this model

Stock, quantities, delivery dates, site nominations and crew rosters belong to the slice's sample data; none of it is catalogue content.
