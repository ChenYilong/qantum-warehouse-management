# Sample data

All files here are fabricated for the exercise, and each one says so in its `label` field. Two things are real:
`../solutions-excerpt.csv`, and the `nominatedCode` values in `nominations.json`, which are genuine catalogue codes
apart from `9999`, left absent from the catalogue on purpose.

| File | Replaces |
| --- | --- |
| `sites.json` | `GET /sites` from the current specification system |
| `nominations.json` | `GET /sites/{id}/nominations`, one entry per site id |
| `solution-materials.json` | per-solution material and quantity per install, absent from the supplied catalogue |
| `stock.json` | `GET /stock` from the inventory system |
| `picks.json` | each site's warehouse pick list: quantity planned, quantity picked, spec and required parts |

`docs/sample-data-and-stubs.md` explains the scenario and the reasoning behind each number.

Per site, `sites.json` also carries:

- `date`: the deadline as `YYYY-MM-DD` (made up), rendered on the cards as "Deadline · Fri 23 Oct 2026";
- `location`: a made-up point in Auckland;
- the operator and picker, both fictional.

Phone numbers come from the block Ofcom reserves for TV and film (`07700 900000`–`07700 900999`, stored as `+44 7700 900156`), so Call and
Text in the app connect to nobody. Northgate Depot has a single person who both picks and installs, listed once.
