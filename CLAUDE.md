# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ALL DAY** — a kitchen-line trainer game for landscape phones. Single self-contained
`src/index.html` (vanilla JS): a pure simulation engine (menu data, cook timers, tickets,
scoring, economy) driving a Canvas 2D kitchen scene with DOM overlays (ticket rail, lowboy
drawer, HUD, start/report/shop screens). No frameworks, no build step, no runtime deps.
`docs/PROJECT.md` has the product premise (training tool for real line cooks; the menu and
cook times are real and must stay accurate).

Published artifact (redeploy target): https://claude.ai/code/artifact/3c5bd516-58a6-4d7a-8953-d777d617aa25

## Commands

- `npm test` — headless QA: `tests/game.test.js` runs the full interaction suite in jsdom (needs `npm install` once). This is the verification step; there is no typecheck/linter.
- `npm run shot` — puppeteer screenshots (start / shift / cooking) at 844×390 via local Chrome; exits 1 on any page error. Optional first arg: output directory. jsdom has no canvas, so this is the only coverage `drawScene` gets.
- `npm run dev` — serve `src/` locally.

## Iteration workflow

`START.md` points at the current iteration's task file (`docs/iterations/NN/Tasks.md`).
Each iteration folder carries its own docs; read `NOTES.md` there first — it holds the
handoff from the previous iteration. `docs/iterations/01/` has the standing references:
`PLAN.md` (refactor roadmap), `SYSTEMS.md` (system map and design order), `SIMPLE.md`
(completed magic-string/rename pass).

## Working on the game

- The sim and the scene are deliberately separated inside `index.html`: game rules live in
  the DATA/ACTIONS/TICK sections and never touch the canvas; the scene reads state each
  frame. Keep it that way — tests drive the sim functions directly (`tapBank`, `tapSlot`,
  `tapWindow`, `tapTicket`, `sendOrder`, `startShift`, `endShift`).
- Interaction model is tap-to-route (no drag-and-drop): pick → valid targets glow → tap target.
  Station/window slot counts come from the persisted `gear` object (upgrade shop), so never
  hardcode slot counts.
- The CONSTANTS section at the top of the script holds every hoisted string family
  (`ST_*` stations, `KEY_*` storage, `DOM` ids, `KIND_*`, `STATE_*`, `TONE_*`, `HIT_*`,
  `AGE_*`). New code uses these — never re-inline the raw strings.
- Persisted data is load-bearing: `allday_*` localStorage key values, `gear` object keys,
  and the shift-history entry shape (`{g,score,sent,walked,diff,speed}`) live in players'
  browsers. Rename code freely; never change these values or shapes.
- The test harness injects scripts into the page scope and references globals (`sim`,
  `lastT`, `tick`, `gear`, `DIFF`) by name — renaming a global means updating
  `tests/game.test.js` in the same change.
- jsdom has no canvas: all drawing is guarded behind a null `ctx`; keep new draw code inside
  `drawScene` or similarly guarded.
- After changes: `npm test`, then `npm run shot` and eyeball the screenshots before
  redeploying the artifact.

## History

The first commit (`Snapshot: Replit-era monorepo before restructure`) preserves the old
Replit prototype (soul-line-web / soul-line-trainer / api chain). Recover legacy files from
there if ever needed; do not reintroduce the monorepo structure.

## Build Incrementally

Build one verified piece at a time. Never deliver a large untested block.

1. Skeleton — container with a placeholder (e.g., a `chatbox` div with dummy content)
2. Verify it compiles and runs with zero errors
3. Replace the placeholder with the real element
4. Add the function that handles it
5. Add the data store behind it
6. Repeat for the next piece

An alternative flow is fine: full layout first, then fill in each piece bottom-up. Either way, every step must compile clean before the next begins.

## No Comments

Write zero comments — inline, block, or doc — unless explicitly requested.

Code must explain itself through naming. If code seems to need a comment, rename or restructure until it doesn't.

- Good: `calculateMonthlyInvoiceTotal()`
- Bad: `calc() // computes the monthly invoice total`

## Pragmatic Paradigms

Use the clearest, fastest expression for the problem. Plain functions and simple objects are usually enough.

Avoid:

- OOP excess — deep inheritance, factory-factories, abstraction for pattern purity
- Functional excess — long point-free chains, clever composition that hides intent
- Any abstraction that doesn't pay for itself in clarity or reuse; inline it instead

## No Magic Strings

Never inline a raw string literal where a named reference can work.

- Good: `<Thing className={namedClass} />`
- Bad: `<Thing className="cname" />`

Hoist to named constants at the top of the file (or a shared constants module):

- CSS class names
- Object keys and event names
- Route paths and identifiers
- Config values and repeated literals

This buys autocompletion, typo safety, and single-point-of-change.

## Naming

Names carry the full meaning: descriptive, unambiguous, specific. Name constants for what they mean, not what they contain.