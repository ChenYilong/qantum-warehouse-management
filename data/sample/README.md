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
| `solution-stock.json` | solution-level stock: complete install kits on hand per catalogue Internal Code, with when it was counted (AC 90). All 148 solutions in stock, random counts |
| `picks.json` | each site's warehouse pick list: quantity planned, quantity picked, how many of those came from other sites (`pickedUpQty`, 0 here), spec and required parts |

`docs/sample-data-and-stubs.md` explains the scenario and the reasoning behind each number.

Per site, `sites.json` also carries:

- `date`: the deadline as `YYYY-MM-DD` (made up), rendered on the cards as "Deadline · Fri 23 Oct 2026";
- `location`: a made-up point in Auckland;
- the operator and picker, both fictional.

The app never writes these files. A deadline or operator a leader changes on a card (AC 86, 87) is kept in that browser's localStorage and read before the value here, on the cards and on each project's own pages (AC 88); the candidates for operator are the operators and pickers listed in `sites.json`, so no extra file is needed.

Phone numbers come from the block Ofcom reserves for TV and film (`07700 900000`–`07700 900999`, stored as `+44 7700 900156`), so Call and
Text in the app connect to nobody. Northgate Depot has a single person who both picks and installs, listed once.

Harbour View, Unit 7 (`site-e`) is blocked by a single shortage: one pipe collar for 25 mm pipe. Cedar Court, the project whose crew can go, has four collars picked, so picking one up from it makes Harbour View ready (AC 97).

A pick-up from other sites (AC 92 to 95) is kept the same way: in that browser's localStorage under `team-leader:site-pickups`, keyed by site id, holding each touched site's status (Blocked) and every one of its pick lines with the quantities after the move. The cards and the site screens read it before `picks.json` and the computed status, and fall back to them for a site or line it does not hold.
