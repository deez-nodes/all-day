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

- `src/sim/` is pure: no imports from `src/scene/`, no DOM, no Phaser, no audio. Game
  rules, menu data (the client pack), cook timers, tickets, scoring, and economy live
  here. Steppers mutate sim state and return event objects — pure of presentation, not
  of mutation.
- The scene reads sim state each frame and calls sim actions; nothing else crosses the
  boundary. Presentation effects (sfx, toasts, buzz) hang off the event seam on the
  scene side.
- Interaction is drag-and-drop; tap-to-route is the fallback. Both input paths call the
  same sim actions.
- Slot counts (stations, window) come from the persisted `gear` object — never hardcoded.

## Invariants

- The save format is versioned behind a schema key. A one-time migration reads legacy
  `allday_*` localStorage shapes from the prototype; new code never writes legacy shapes.
- Menu and cook times are real. Changing client data means a new client pack, not edits
  scattered through code.
- Tests drive the sim directly through its actions; rendering is verified by the
  screenshot harness, never by tests reaching into the scene.

## Ratchet rule

> If a pattern exists only because the prototype did it that way, stop and redesign it
> in the current stack's idiom.

The frozen prototype lives in the sibling `cook-trainer` repo (tag `prototype-final`).
Behavior questions about it are answered by writing a test against the sim there,
watching it pass, and carrying the *test* — scene code is never read as a spec.
`docs/reference/` holds the carried visual references and prototype screenshots.

## Commands

- `npm test` — Vitest, sim only. The verification step; there is no typecheck/linter.
- `npm run shot [dir]` — boots the Vite dev server and headless Chrome, screenshots the
  scene, exits 1 on any page error. The only coverage rendering gets. Default output:
  `shots/` (gitignored).
- `npm run dev` — Vite dev server.
- `npm run build` — portable static bundle to `dist/`.

After changes: `npm test`, then `npm run shot` and eyeball the screenshots.

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
