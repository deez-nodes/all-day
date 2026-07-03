# Iteration 03 — Tasks

Read [PORT](PORT.md) first; it holds the decisions (D1–D5), the carry allowlist, and the
milestone definitions. NOTES.md for this folder gets written when iteration 02 closes.
Do not start id: 2 until every 02 task is checked.

Ids 1–2 happen in this repo. Ids 3–5 are worked day-to-day in `all-day`'s own iteration
docs (seeded by id: 2) and mirrored here only so this repo records when the port is done.

# id: 1 — Freeze the prototype (M0)

- [x] Iteration 02 fully cleared (`../02/Tasks.md` all checked), `npm test` green
- [x] Reference screenshots committed under `docs/reference/prototype-final/` (`node tools/shot.js <dir>`)
- [x] Tag `prototype-final` on the freezing commit
- [x] [NOTES](NOTES.md) written — the 02→03 handoff, including the sim's true boundaries and the `EVENT_EFFECTS` seam

---

# id: 2 — Birth the new repo (M1)

- [x] `git init` `all-day` (sibling of `cook-trainer`); Vite + Phaser 3.x + Vitest skeleton boots a blank scene, zero console errors
- [x] `all-day/CLAUDE.md` written from [PORT](PORT.md) — destination only, invariants, ratchet rule, house rules
- [x] `all-day/START.md` + `docs/iterations/01/Tasks.md` seeded with M2–M5
- [x] Screenshot harness against the Vite dev server (shot.js pattern, rewritten not copied); exits 1 on page errors

---

# id: 3 — Port the sim (M2)

- [ ] Sim layer (post-02 shape: client pack, pure steppers, pure predicates, actions) moved into `all-day/src/sim/` — Dan reviews every line before it lands
- [ ] `tests/game.test.js` adapted to Vitest imports; full suite green
- [ ] Persisted-shape compat proven: a localStorage snapshot written by the prototype loads clean in the new sim (D3)
- [ ] Nothing in `src/sim/` imports Phaser, DOM, or `src/scene/`

---

# id: 4 — Scene statics (M3)

- [ ] Phaser kitchen scene renders line / pass / rail from sim state
- [ ] Slot counts come from `gear` — never hardcoded
- [ ] Screenshots compared against `prototype-final/` for layout parity; Phaser idiom wins on style

---

# id: 5 — Drag interaction (M4)

- [ ] Drag bank → station, station → pass / ticket, anything → waste (UX-01, UX-02, UX-04)
- [ ] Tap-to-route fallback; both input paths call the same sim actions
- [ ] Full shift playable end-to-end on a landscape phone viewport
