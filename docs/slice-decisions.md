# Slice boundary decisions

Iteration 1 builds the team leader's decision flow. Neighbouring systems are described and replaced by stubs; none of them is implemented here.

## What the app owns

Persisted records are limited to leader actions: wait, escalate, substitute proposal.

Sites, nominations, stock and the solution catalogue are upstream data. The app reads them and never writes back.

## Inbound reads

- `GET /sites`: the sites a leader is allowed to open.
- `GET /sites/{id}/nominations`: planned penetrations, each with its nominated `internal_code`.
- `GET /stock`: inventory balances (read-only).

For the exercise, sample JSON answers all three. `data/solutions-excerpt.csv` is parsed at runtime so codes resolve without a network call. In production the catalogue has its own owner, and a nomination carries only the `internal_code`.

## Write endpoints

- `POST /sites/{id}/shortages/{shortageId}/wait`
- `POST /sites/{id}/shortages/{shortageId}/escalate`
- `POST /sites/{id}/penetrations/{penetrationId}/substitutions`
- `GET /sites/{id}/actions`

A proposal points at a solution that already exists in the catalogue; it never creates a new one. The status is always `proposed`.

## Consumers outside the slice

- The existing web app would approve or reject a proposal and then change the nomination. The brief gives no evidence that such a review queue exists today.
- Crew scheduling reads the ready/blocked outcome.
- Purchasing or the warehouse picks up escalations.
- Installation, floor-plan pins and photo evidence remain in the mobile app.

## Gap the slice has to fill

The CSV carries neither materials nor quantities. A shortfall calculation therefore relies on invented rows linking every solution to its materials, with an amount per install.

## Deferred

Production authentication, a live inventory feed, writing nominations, crew scheduling, and a compliance review for substitutes.
