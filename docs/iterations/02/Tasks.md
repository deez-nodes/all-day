# Iteration 02 — Tasks

Read [NOTES](NOTES.md) first. Verify every step with `npm test` + `npm run shot`.

# id: 1 — Pure helpers ([01/PLAN](../01/PLAN.md) group C)

Split *decide* from *do*; the `tap*` actions stay as the mutation layer.

- [x] `spawnOrder` → pure `rollOrder(diffConfig, rng)` returning an unstamped order (`{label,who,type,target,items}`); `spawnOrder` stamps `id`/`num`/`born` and pushes
- [x] `tick` → pure steppers (`stepBreading`, `stepCooking`, `stepHolding`, `stepPatience`) that mutate sim state and return `EV_*` events; `tick` maps events through `EVENT_EFFECTS` to sfx/toast/buzz/dirty
- [x] Eligibility into pure predicates: `canDropOn`/`dropDenial`/`startCooking`/`canPlateToWindow` in ACTIONS; `validTarget` and the window glow are now thin wrappers (ticket matching already shared `handKey`/`ticketNeeds`)

---

# id: 2 — Section boundaries ([01/PLAN](../01/PLAN.md) group D)

- [x] Audit that every function sits in the right banner section — clean; `el`/`orderCardSelector` stay with the generic helpers/CONSTANTS (needed before DOM UI loads)
- [x] No DATA/ACTIONS/TICK code touches DOM or canvas directly — two violations found and routed: `tapTicket` reject flash → `flashTicketReject`, `sendOrder` card bump → `bumpTicketThen` (both in DOM UI)
- [x] Banner comments stay: they are structural navigation for the single file, not explanation, and they become module boundaries at the port ([03/PORT](../03/PORT.md) M2) — the No Comments rule targets explanatory comments

---

# id: 3 — S1 Order Creation: menu as a client pack ([01/SYSTEMS](../01/SYSTEMS.md))

- [ ] Gather `COOK`, `BREAD_MAP`, `PROTEINS`, `SIDES`, `COLD`, `MENU`, `SIMPLE_IDS`, `COMBO_POOL` (and the food-category color tables) into one client-pack object with a defined shape
- [ ] Sim reads only the pack — no direct references to the old globals
- [ ] Proves out `CFG-01` (swappable menu) and opens the door to the Longhorn pack the user is considering
