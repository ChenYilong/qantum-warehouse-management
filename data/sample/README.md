# Sample data

Everything in this folder is **invented** for the exercise. Only `../solutions-excerpt.csv` is real, plus the
`nominatedCode` values in `nominations.json`, which are real catalogue codes (with one deliberate missing code,
`9999`). Each file carries a `label` field saying so.

| File | Stands in for |
| --- | --- |
| `sites.json` | the existing spec system's `GET /sites` |
| `nominations.json` | `GET /sites/{id}/nominations` (keyed by site id) |
| `solution-materials.json` | materials and quantity per install per solution, which the supplied catalogue lacks |
| `stock.json` | the inventory system's `GET /stock` |

The scenario, the numbers and why they were chosen are in `docs/sample-data-and-stubs.md`.

Each site in `sites.json` also names its operator and picker (invented people). The phone numbers are from Ofcom's
range reserved for drama (07700 900000 to 07700 900999, written `+44 7700 900156`), so the Call and Text links
in the app reach no one. At Northgate Depot one person picks and installs, so the site lists them once.
