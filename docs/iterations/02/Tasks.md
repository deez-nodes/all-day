# Iteration 02 — Tasks

Read [NOTES](NOTES.md) first. Verify every step with `npm test` + `npm run shot`.

# id: 1 — Pure helpers ([01/PLAN](../01/PLAN.md) group C)

Split *decide* from *do*; the `tap*` actions stay as the mutation layer.

- [ ] `spawnOrder` → pure `rollOrder(menu, diff, rng)` returning an order object; caller pushes it into `sim`
- [ ] `tick` → pure per-subsystem steppers (`stepBreading`, `stepCooking`, `stepHolding`, `stepPatience`) that take state and return events; one thin driver applies them and fires sfx/toasts/dirty flags
- [ ] Eligibility checks out of `tapSlot`/`tapWindow`/`tapTicket` into pure predicates (`canDropOn(hand, station)`, reuse `validTarget`)

---

# id: 2 — Section boundaries ([01/PLAN](../01/PLAN.md) group D)

- [ ] Audit that every function sits in the right banner section
- [ ] No DATA/ACTIONS/TICK code touches DOM or canvas directly; route violations through the render layer
- [ ] Decide the fate of section-banner comments vs the No Comments rule (see NOTES)

---

# id: 3 — S1 Order Creation: menu as a client pack ([01/SYSTEMS](../01/SYSTEMS.md))

- [ ] Gather `COOK`, `BREAD_MAP`, `PROTEINS`, `SIDES`, `COLD`, `MENU`, `SIMPLE_IDS`, `COMBO_POOL` (and the food-category color tables) into one client-pack object with a defined shape
- [ ] Sim reads only the pack — no direct references to the old globals
- [ ] Proves out `CFG-01` (swappable menu) and opens the door to the Longhorn pack the user is considering
