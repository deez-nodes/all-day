# Iteration 01 — Refactoring Plan

Target: `src/index.html` (single self-contained file, ~1,640 lines).
Rules of the road: [CodingStyle](../../CodingStyle.md) — naming, modular, no magic
strings, pure functions. Verification after every batch: `npm test`.

---

## Current state

The file already has clear banner sections (DATA, META, AUDIO, SIM STATE, ORDERS,
HAND, ACTIONS, TICK, SCENE) and the sim/scene split is sound. The debt is:

1. **Magic strings everywhere** — station kinds (`"fryer"`, `"grill"`, `"bread"`,
   `"saute"`, `"window"`) appear ~22× as raw literals; `localStorage` keys
   (`"allday_*"`) are inlined at every call site; DOM ids and `data-oid` selectors
   are raw strings.
2. **Cryptic names** — `S` (sim state), `MAXG` (base station capacity), `GEO`
   (station geometry), `RAWC` (raw-food colors), `AC` (audio context), `st`
   (station key inside `COOK` entries), `fb` (fallback), single-letter locals.
3. **Impure functions** — `spawnOrder`, `tick`, and the `tap*` actions mix
   computation with mutation of the global `S` and DOM writes; hard to test pieces
   in isolation.

## Grouping — simple → structural

| Group | Work                                   | Risk | Type            |
| ----- | -------------------------------------- | ---- | --------------- |
| A     | Hoist magic strings to named constants | Low  | Mechanical      |
| B     | Rename cryptic identifiers             | Low  | Mechanical      |
| C     | Extract pure helpers out of `tick` / `spawnOrder` / `tap*` | Medium | Structural |
| D     | Section boundaries — one section, one responsibility, sim never touches DOM/canvas | Medium | Structural |

Groups A and B are the **simple group** — each item is a find-replace-scale change
that `npm test` fully covers. They are broken out as a standalone checklist in
[SIMPLE](SIMPLE.md) so they can be cleared one by one before any structural work
starts.

## Order of attack

1. Clear [SIMPLE](SIMPLE.md) (groups A + B), running `npm test` after each checkbox.
2. Group C — for each impure function, split *decide* from *do*:
   - `spawnOrder` → pure `rollOrder(menu, diff, rng)` returning an order object;
     the caller pushes it into state.
   - `tick` → pure per-subsystem steppers (`stepCooking`, `stepHolding`,
     `stepPatience`) that take state and return events; one thin driver applies
     them and fires side effects (sfx, toasts, DOM dirty flags).
   - `tap*` actions → keep as the mutation layer (tests drive them directly), but
     move their eligibility checks into pure predicates (`canDropOn(hand, station)`).
3. Group D — audit that every function sits in the right banner section and that
   no DATA/ACTIONS/TICK code reaches the canvas or DOM directly; route remaining
   violations through the render layer.

## Constraints

- Stays one file, no build step — "modular" means bounded sections and pure
  helpers, not ES modules.
- Slot counts always come from `gear`; renames must not touch its persisted keys
  (`allday_gear` object shape is saved in players' localStorage).
- `localStorage` key *values* must not change either — only hoist them.
- After the batches: `npm test`, then the puppeteer screenshot check at 844×390.
