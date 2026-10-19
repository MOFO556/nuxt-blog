# Architecture docs maintenance

Update these docs whenever product or wiring changes.

## When this applies

Any of:

- New or removed **feature / module**
- New or changed **API route**, repository method, store, task, middleware, or plugin
- New or changed **DB table, column, FK, or Drizzle relation**
- New **cross-module** call (A starts using B)
- Resolving or adding an item in **review-flags**

## Checklist (all that apply)

1. **[modules.md](modules.md)** — Module section lists purpose and key paths; remove stale paths.
2. **[db-map.md](db-map.md)** — Tables, FKs, constraints, and Mermaid ER match schema under `server/database/schema/`.
3. **[relations-map.md](relations-map.md)** — Client→API and API→utils/schema edges, tasks/cron, and broadcast channels stay accurate.
4. **[README.md](README.md)** — Adjust the short project description if user-visible capabilities changed.

## Done when

- Every modified module, table, or call edge appears in the right map.
- No new orphan file was introduced without either a modules entry or a review-flags row.

## Do not

- Edit generated SQL under `server/database/migrations/` by hand.
