# Iteration 01 — Systems

Design systems, not features. Every feature in [REVIEW](REVIEW.md) lands inside one
of these systems; each system is designed independently, with its effects on the
others stated up front.

| #  | System                | Owns                                                    | Code today (`src/index.html`)                          | Review items          |
| -- | --------------------- | ------------------------------------------------------- | ------------------------------------------------------ | --------------------- |
| S1 | Order Creation        | What a ticket contains: menu data, combos, sides, rng   | `MENU`, `PROTEINS`, `SIDES`, `COLD`, `spawnOrder`, `makeItem`, `addSidesTo` | `CFG-01`              |
| S2 | Ordering & Fulfillment | Ticket lifecycle: rail → fired → windowed → sent        | `tapTicket`, `sendOrder`, `tapWindow`, ticket rail DOM  | `UI-04`, `UI-05`, `CFG-03` |
| S3 | Timing                | All clocks: cook seconds, flips, hold decay, walk-aways | `tick`, `COOK[*].sec`, `HOLD_WARN`, `HOLD_DEAD`, `WALK_AFTER`, `FLIP_GRACE` | `TRN-01`              |
| S4 | Cooking               | Stations, slots, routing food onto heat                 | `tapBank`, `tapSlot`, `MAXG`, `gear`, `GEO`             | `UX-01`–`UX-06`, `UI-03` |
| S5 | Plating               | Assembling items into a send-able plate, plating specs  | window slots, `BREAD_MAP`; specs largely implicit today | `CFG-02`, `ART-01`, `ART-02` |
| S6 | Scoring & Economy     | Score, tips, streaks, XP, career levels, shop           | `S.score`/`S.streak`, `LEVELS`, `SHOP`, `saveMeta`, `endShift` | —                     |
| S7 | Theming               | Per-client look: menu skin, KDS layout, scene art       | CSS + `drawScene`; no client concept exists yet         | `CFG-01`–`CFG-03`, `UI-01`, `UI-02`, `ART-01` |

---

## Cross-system effects

Read this before designing any single system.

- **S1 → S2, S3, S4**: a swappable menu (`CFG-01`) means tickets, cook times, and
  station routing all become data-driven per client. `COOK` and `MENU` become a
  client pack, not globals.
- **S4 → S3**: interaction changes (drag vs tap, `UX-01`) change how much wall
  time a route costs; timing balance must be re-tuned after any interaction change.
- **S5 → S2**: plating conditions decide when `sendOrder` is legal; today that
  check is thin — making plating real (`CFG-02`, plating_layout reference) adds a
  gate in the fulfillment path.
- **S7 → everything**: theming per client only works if no other system hardcodes
  look or layout — which is the same discipline as the sim/scene split, extended
  to menu data and KDS layout.
- **S6 ← S2, S3, S5**: scoring only reads outcomes (sent on time, held too long,
  walked). Keep it a pure consumer of events so rebalancing never reaches into
  other systems.

## Order of design

1. **S1 Order Creation** — extracting the menu into a client pack unblocks the most
   (`CFG-01` and the Longhorn consideration) and is pure data work.
2. **S4 Cooking + S3 Timing** together — the interaction rework (`UX-*`) and its
   timing re-tune are one design conversation, not two.
3. **S2 Fulfillment + S5 Plating** together — the KDS screen (`UI-04`/`UI-05`) and
   plating gates share the ticket lifecycle.
4. **S7 Theming** — once the systems above are data-driven, theming is
   configuration, not surgery.
5. **S6 Scoring** — last; it consumes whatever events the others emit.
