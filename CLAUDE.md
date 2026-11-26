# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ALL DAY** — a kitchen-line trainer game for landscape phones. A training tool for real
line cooks: tickets come in on a familiar KOS-style rail, food gets cooked, plated, and
sent, and the player's internal clock for a real menu develops before they ever work the
line. The menu and cook times are real and must stay accurate — the training claim is the
product. `docs/PROJECT.md` has the premise.

Stack: Phaser 3 + Vite, Vitest for tests. The build output is a portable static bundle
(`vite build` → `dist/`) that runs from any static host — no platform-specific hosting
assumptions anywhere in the code. Demo channels (claude.ai artifact, itch.io, a store
wrapper) are redeploy targets, never the product's home.

## Architecture

- `index.html` and `src/styles.css` define the overlays and responsive layout.
- `src/line-game.js` coordinates shift actions, DOM updates, audio and saved progress.
- `src/sim/` holds the menu, order generation, station rules and time steppers.
  It has no dependencies on the browser DOM or Phaser.
- `src/scene/KitchenScene.js` runs the simulation clock and renders the kitchen into
  Phaser's Canvas renderer. `src/scene/kitchen-renderer.js` draws the scene and
  routes taps to the same shift actions used by the overlays.
- Equipment controls slot counts. Existing `allday_*` localStorage keys and data
  shapes preserve players' saves. Menu data and cook times live in the client pack.

The frozen prototype is available at the `prototype-final` tag. Its design notes
are under `docs/history/prototype/` and reference screenshots are under
`docs/reference/prototype-final/`.

## Commands

- `npm ci` installs locked dependencies.
- `npm run dev` starts the Vite development server.
- `npm test` runs the Vitest gameplay and configuration checks.
- `npm run build` creates the static bundle in `dist/`.
- `CHROME_PATH=/usr/bin/chromium npm run shot` checks the playable flow in Chromium
  and writes screenshots to `shots/`. Set `CHROME_PATH` to the local executable.

## Iteration workflow

`START.md` points at the current iteration's task file (`docs/iterations/NN/Tasks.md`).
Read that folder's `NOTES.md` first — it holds the handoff. Current-state facts live in
dated iteration `NOTES.md` handoffs, nowhere else; this file and standing docs state the
destination only.

## Code ownership

The sim is the pitch — the part Dan explains in a meeting and must own line by line. Dan
hand-writes or reviews every line of `src/sim/` before it lands; diffs sized for human
reading, one system at a time. Framework scaffolding, config, asset plumbing, and the
shot harness are LLM work, verified by the harness.

## Build Incrementally

Build one verified piece at a time. Never deliver a large untested block.

1. Skeleton — container with a placeholder
2. Verify it compiles and runs with zero errors
3. Replace the placeholder with the real element
4. Add the function that handles it
5. Add the data store behind it
6. Repeat for the next piece

An alternative flow is fine: full layout first, then fill in each piece bottom-up. Either
way, every step must compile clean before the next begins.

## No Comments

Write zero comments — inline, block, or doc — unless explicitly requested.

Code must explain itself through naming. If code seems to need a comment, rename or
restructure until it doesn't.

- Good: `calculateMonthlyInvoiceTotal()`
- Bad: `calc() // computes the monthly invoice total`

## Pragmatic Paradigms

Use the clearest, fastest expression for the problem. Plain functions and simple objects
are usually enough.

Avoid:

- OOP excess — deep inheritance, factory-factories, abstraction for pattern purity
- Functional excess — long point-free chains, clever composition that hides intent
- Any abstraction that doesn't pay for itself in clarity or reuse; inline it instead

## No Magic Strings

Never inline a raw string literal where a named reference can work.

Hoist to named constants at the top of the file (or a shared constants module):

- CSS class names and DOM ids
- Object keys, event names, scene keys
- Route paths and identifiers
- Config values and repeated literals

This buys autocompletion, typo safety, and single-point-of-change.

## Naming

Names carry the full meaning: descriptive, unambiguous, specific. Name constants for what
they mean, not what they contain.
