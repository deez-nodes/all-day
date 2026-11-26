# Iteration 01 — Tasks

Read [NOTES](NOTES.md) first — it records the state of the repo at birth (M1). Milestone
definitions and the port decisions (D1–D5) live in
`prototype/docs/iterations/03/PORT.md`; each milestone ends green (`npm test` +
screenshots eyeballed) before the next begins.

# id: 1 — Port the sim (M2)

- [ ] Sim layer (post-02 shape: client pack, pure steppers, pure predicates, actions)
      lands in `src/sim/` — Dan reviews every line before it lands, one system at a time
- [ ] Prototype `tests/game.test.js` adapted to Vitest imports; full suite green
- [ ] Save format versioned behind a schema key; one-time migration proves a localStorage
      snapshot written by the prototype loads clean
- [ ] Nothing in `src/sim/` imports Phaser, DOM, or `src/scene/`

---

# id: 2 — Scene statics (M3)

- [ ] Phaser kitchen scene renders line / pass / rail equivalents from sim state
- [ ] Slot counts come from `gear` — never hardcoded
- [ ] Screenshots compared against `docs/reference/prototype-final/` for layout parity;
      Phaser idiom wins on style

---

# id: 3 — Drag interaction (M4)

- [ ] Drag bank → station, station → pass / ticket, anything → waste (UX-01, UX-02, UX-04)
- [ ] Tap-to-route fallback; both input paths call the same sim actions
- [ ] Full shift playable end-to-end on a landscape phone viewport

---

# id: 4 — Look (M5)

- [ ] Food icons/sprites replace placeholder shapes (ART-01/02)
- [ ] Cook-state animation on stations and held food
- [ ] Plating arrangements per `docs/reference/plating_layout.png` (CFG-02)
- [ ] Screenshots read as a credible pitch demo, not a $20 app
