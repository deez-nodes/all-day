# Iteration 01 — Notes at birth

State of the repo as of 2026-07-03, the day M1 closed. This repo was seeded from
`docs/history/prototype/docs/iterations/03/PORT.md`; the decisions (D1–D5), carry allowlist, and
milestone definitions live there.

## What exists

- Vite 7 + Phaser 3.90 + Vitest 3, vanilla JS ESM, no TypeScript. `vite.config.js`
  carries the Vitest config (`environment: jsdom` — same testing model as the prototype).
- `src/main.js` boots a `Phaser.Game` at 844×390 (`Scale.FIT`, `CENTER_BOTH`) into
  `#game`; `src/scene/KitchenScene.js` is an empty scene; `src/config.js` holds the
  hoisted constants. `src/sim/` does not exist yet — M2 creates it.
- `tests/config.test.js` is a placeholder smoke test so `npm test` has teeth from day
  one; the real suite arrives with the sim port.
- `tools/shot.js` starts the Vite dev server in-process (`createServer` from the vite
  Node API, random port), drives headless Chrome via puppeteer-core, waits for the
  Phaser canvas, writes `shot-boot.png`, exits 1 on any page error. Chrome path
  overridable via `CHROME_PATH`. Output dir is `process.argv[2]`, default `shots/`
  (gitignored, auto-created).
- `public/favicon.svg` exists because the harness treats the browser's automatic
  favicon 404 as a page error — do not remove one without the other.
- `npm run build` produces the portable `dist/` bundle; Phaser makes it a single
  ~1.2 MB chunk and Vite warns about chunk size. Ignore until it hurts; code-splitting
  is not an M2–M5 concern.

## Traps carried from the prototype

- Persisted `allday_*` localStorage shapes and the shift-history entry shape
  (`{g,score,sent,walked,diff,speed}`) are load-bearing — the M2 migration reads them,
  nothing ever writes them again.
- The prototype's steppers mutate sim state AND return `EV_*` events — pure of
  presentation, not of mutation. Keep that contract; `EVENT_EFFECTS` is the seam the
  Phaser scene plugs into.
- Behavior questions about the prototype: write a test against the sim in
  the `prototype-final` tag, watch it pass, carry the test. Never read its scene code as a spec.
