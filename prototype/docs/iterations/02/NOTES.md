# Iteration 02 — Notes from 01

Read this before touching code. State of the world as of 2026-07-03.

## Where 01 ended

- All of [01/SIMPLE](../01/SIMPLE.md) is cleared: every magic string family (stations,
  storage keys, DOM ids, kinds, states, tones, hits, ages) now lives in the CONSTANTS
  section at the top of the script in `src/index.html`, and the cryptic globals are
  renamed (`S`→`sim`, `MAXG`→`MAX_STATION_SLOTS`, `GEO`→`SCENE_GEOMETRY`, `cv`→`canvas`, …).
- [01/PLAN](../01/PLAN.md) groups A + B are done. Groups C (pure helpers) and D
  (section-boundary audit) are NOT started — they are this iteration's ids 1 and 2.
- [01/SYSTEMS](../01/SYSTEMS.md) is the design map; its recommended order starts with
  S1 Order Creation (menu → client pack), which unblocks the Longhorn menu idea.

## Verification workflow

1. `npm test` — 53 jsdom assertions, drives sim functions directly.
2. `npm run shot` — puppeteer screenshots (start / shift / cooking) at 844×390 via
   local Chrome; exits 1 on any page error. Pass an output dir as the first arg,
   otherwise it writes next to `tools/shot.js`.
3. Eyeball the screenshots — jsdom has no canvas, so `drawScene` is ONLY covered by
   step 2.

## Traps that bit (or almost bit) during 01

- **Persisted shapes are load-bearing.** `allday_*` localStorage key values, the
  `gear` object keys, and the history entry shape `{g,score,sent,walked,diff,speed}`
  live in players' browsers. Rename code, never these values. The `{g:grade,…}` in
  `endShift` is deliberate — do not "fix" it to shorthand.
- **The test harness shares page globals.** `tests/game.test.js` injects scripts into
  the page scope and references `sim`, `lastT`, `tick`, `gear`, `DIFF` by name —
  renaming a global means updating the tests in the same change.
- **Blind regex renames clobber strings.** `"S"` (the grade), `"c-name"` (CSS class),
  `.w`/`.h` (geometry props) all collide with single-letter identifiers. Replace with
  string-aware, dot-lookbehind patterns, and grep `==="` afterwards — that final scan
  is what caught two missed `!=="burnt"`.
- **sed on the file you just added constants to** will rewrite the definitions
  themselves (`KEY_BEST="allday_best"` → `KEY_BEST=KEY_BEST`). Add definitions after
  the replacement pass, or use context-anchored patterns.

## Deliberately left

- Food categories (`"chunks"`, `"fillet"`, …) stay literal until S1 extracts the menu
  into a client pack — they are data keys, not code strings.
- Particle types, shop kinds, `"suspended"` (Web Audio value) — see the bottom of
  [01/SIMPLE](../01/SIMPLE.md).
- Section-banner comments (`/* ══ DATA ══ */`) conflict with the No Comments rule but
  are the file's only navigation — resolve during group D, not before.
