# Iteration 03 — The Port

The prototype is done. It proved the design: the tap loop, the economy, the real menu and
cook times, the scene-based framing. Iteration 03 does not add features to it — it moves
the proven parts into a production stack and retires the rest.

Prerequisite: [02/Tasks](../02/Tasks.md) cleared. 02's three tasks (pure helpers, section
boundaries, client pack) are the extraction prep — the sim must be a clean, self-contained
layer *before* it crosses into the new repo, so it arrives without dragging the monolith's
context with it.

## Decisions

Each is the working default. Flipping one means editing this table before M1, not after.

| # | Decision | Choice | Rationale | Flip cost |
|---|----------|--------|-----------|-----------|
| D1 | Stack | Phaser 3.x + Vite + Vitest | Drag, tweens, sprites, particles, scene/state management out of the box — the exact REVIEW backlog (UX-01..04, ART-01/02). Vitest+jsdom is the same testing model as today. | Low before M2, high after M3 |
| D2 | Repo | New repo `all-day`; `cook-trainer` frozen as the reference | Physical isolation is the only isolation that holds (see Bleed Control). Fresh repo gets a CLAUDE.md written from intent on day one. | Low — it's a `git init` |
| D3 | Persisted data | New app loads existing `allday_*` data via a one-time migration; going forward the save format is versioned behind a schema key | With the artifact demoted to a test channel (D5), no real players are locked in yet — old-shape compat is cheap courtesy, not law. Versioning now avoids ever being frozen again. | Low until real distribution; high after |
| D4 | Interaction | Drag-and-drop primary, tap-to-route kept as fallback | Drag is the recorded intent ([PROJECT](../../PROJECT.md), [01/REVIEW](../01/REVIEW.md) UX-01). Tap survives because it's validated and costs nothing once both route through the same sim actions. | — |
| D5 | Distribution | The product is a portable static build (Vite `dist/` — runs from any static host, local file server, itch.io, or a store wrapper later). The claude.ai artifact is a test/demo channel only, redeployed at will, never the product's home. | The game must be movable — not stuck inside any one platform, Replit then, artifacts now. Same lesson. | Low — add channels anytime |

## The carry allowlist

The one-way valve. Exactly this crosses from `cook-trainer` into `all-day`, and nothing
else:

**As code**
- The sim layer: DATA / ACTIONS / TICK sections, post-02 shape (pure steppers, pure
  predicates, client-pack menu)
- `tests/game.test.js`, adapted to Vitest imports
- The client pack (menu, cook times, categories) — byte-for-byte; this data is the product
- `tools/shot.js` pattern (rewritten against the Vite dev server, not copied)

**As documents**
- [PROJECT](../../PROJECT.md) premise, [01/SYSTEMS](../01/SYSTEMS.md) map,
  [01/REVIEW](../01/REVIEW.md) backlog, `docs/reference/` (plating layout etc.)
- Final `npm run shot` screenshots of the frozen prototype — the visual reference

**Never**
- `drawScene`, the DOM overlay builders, any CSS, any canvas geometry
- Behavior questions about the old build are answered by writing a test against the sim
  in the old repo, watching it pass, and carrying the *test*. Scene code is never read as
  a spec.

## Bleed control

What let Replit bleed into this project, and the standing rule that plugs each channel:

1. **Code proximity.** New work iterated next to old code inherits it. → New repo (D2);
   old repo frozen at a tag; the allowlist above is exhaustive.
2. **Docs describing the status quo.** "Tap-to-route (no drag-and-drop)" in CLAUDE.md
   turned a stopgap into law. → In `all-day`, CLAUDE.md and standing docs state the
   destination only. Current-state facts live in dated iteration `NOTES.md` handoffs,
   nowhere else.
3. **Assistant context.** Sessions steeped in the prototype reproduce it. → `all-day`
   starts with its own CLAUDE.md written from this document before any code exists;
   first sessions there start fresh.

Ratchet rule, to be copied into `all-day/CLAUDE.md` verbatim:

> If a pattern exists only because the prototype did it that way, stop and redesign it
> in the current stack's idiom.

## `all-day/CLAUDE.md` must state

- Architecture: `src/sim/` is pure — no imports from `src/scene/`, no DOM, no Phaser.
  The scene reads sim state and calls sim actions; nothing else crosses.
- Invariants: the save format is versioned behind a schema key; a one-time migration
  reads legacy `allday_*` shapes (D3). Menu and cook times are real and must stay
  accurate. The build output is a portable static bundle — no platform-specific hosting
  assumptions anywhere in the code (D5).
- Interaction: drag-and-drop is the model (D4); tap fallback routes through the same
  actions.
- Verification: `npm test` (Vitest, sim only) + screenshot harness for anything rendered.
- The ratchet rule above.
- The house rules that carry over: build incrementally, no comments, no magic strings,
  pragmatic paradigms, naming.

## Code ownership

The sim is the pitch — the part Dan explains in a meeting and must own line by line.

- Sim extraction and the sim module in `all-day`: Dan hand-writes or reviews every line
  before it lands; diffs sized for human reading, one system at a time.
- Framework scaffolding, config, asset plumbing, shot harness: LLM work, verified by
  the harness.

## Milestones

Each milestone ends green (`npm test` + screenshots eyeballed) before the next begins.

- **M0** — Iteration 02 cleared in `cook-trainer`. Prototype tagged `prototype-final`,
  final reference screenshots committed.
- **M1** — `all-day` skeleton: Vite + Phaser + Vitest boot a blank scene with zero
  errors; CLAUDE.md and START.md/iteration-01 docs in place per this plan.
- **M2** — Sim ported: full test suite green in Vitest. Nothing renders yet.
- **M3** — Kitchen scene statics in Phaser: line, pass, rail equivalents drawn from sim
  state; screenshot harness running; compared side-by-side against the frozen prototype
  shots for layout parity (not pixel parity — Phaser idiom wins).
- **M4** — Interaction: drag from bank to stations, station to pass/tickets (UX-01,
  UX-02, UX-04), tap fallback; both routes through the same sim actions; playable
  end-to-end shift.
- **M5** — Look: food icons/sprites (ART-01/02), cook-state animation, plating
  arrangements (CFG-02). This is the "doesn't look like a $20 app" milestone; it is
  deliberately last because it iterates fastest once M3/M4 are stable.

M5 is not the end of art — it's the first pass that makes the pitch demo credible.
Client theming (S7) and the Longhorn pack build on the client-pack seam after that.
