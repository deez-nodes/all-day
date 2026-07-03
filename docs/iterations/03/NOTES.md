# Iteration 03 — Notes from 02

Read this and [PORT](PORT.md) before touching anything. State of the world as of 2026-07-03.

## Where 02 ended

All three 02 tasks cleared on the `iteration-02` branch, merged to main. The sim layer is
now port-shaped:

- **Orders**: `rollOrder(diffConfig, rng)` is pure and returns an unstamped order
  (`{label,who,type,target,items}`); `spawnOrder` stamps `id`/`num`/`born` from sim and
  pushes. `sauteKeyFor` answers "which pasta needs this product".
- **Tick**: `stepBreading`/`stepCooking`/`stepHolding`/`stepPatience` mutate sim state and
  return `EV_*` event objects; `tick` is a thin driver that maps events through
  `EVENT_EFFECTS` to sfx/toast/buzz/ordersDirty. The `EV_*` constants live in CONSTANTS.
- **Eligibility**: `canDropOn`/`dropDenial`/`startCooking`/`canPlateToWindow` are pure and
  single-source the drop rules; `validTarget` (scene glow) is a one-line wrapper. Ticket
  matching was already shared (`handKey`/`ticketNeeds`).
- **Data**: `CLIENT_PACK` in DATA is the single source for
  cook/breadMap/proteins/sides/cold/drinkIds/dessertIds/menu/simpleIds/comboPool/combo/
  foodColors. The old global names (`COOK`, `MENU`, …) are destructured views of it —
  call sites unchanged, swap the literal to swap the client.

## Traps that carry forward

- Everything in [02/NOTES](../02/NOTES.md) still applies: persisted `allday_*` shapes,
  test-harness page globals (`sim`, `lastT`, `tick`, `gear`, `DIFF`), string-collision
  renames.
- `tools/shot.js` needs its output dir to exist and args passed directly
  (`node tools/shot.js <dir>`, not `npm run shot <dir>`).
- Steppers mutate state AND return events — they are pure of *presentation*, not of
  mutation. In the port, the sim module keeps this contract: no DOM, no audio, no Phaser.
- `EVENT_EFFECTS` is the seam the new scene plugs into: replace the toast/sfx handlers
  with Phaser-side handlers and the sim never notices.

## The freeze

This iteration's remaining work happens mostly OUTSIDE this repo — see
[PORT](PORT.md) decisions D1–D5 and [Tasks](Tasks.md). The prototype is frozen at tag
`prototype-final`; reference screenshots live in `docs/reference/prototype-final/`.
Per PORT.md bleed control, start the `all-day` repo in a FRESH session with its own
CLAUDE.md written from PORT.md — do not build it from a session steeped in this file.
