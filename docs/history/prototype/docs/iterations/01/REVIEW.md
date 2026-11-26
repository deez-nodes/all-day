# Iteration 01 — Review

Items to settle before expanding the app. Organized by the type of work each item is,
so a whole group can be tackled in one pass.

---

## Naming conventions

These conventions are defined here and applied throughout iteration docs.

| Convention   | Rule                                                          | Example                 |
| ------------ | ------------------------------------------------------------- | ----------------------- |
| Item id      | `<GROUP>-<nn>` — group code plus two digits, unique per doc   | `UX-03`                 |
| Group codes  | `UX` interaction · `UI` layout · `ART` assets · `CFG` client config · `TRN` training design | `UI-02` |
| Terminology  | The kitchen screen is a **KDS** (kitchen display system) — not "KOS" or "board" | `UI-04` |
| Asset files  | kebab-case under `docs/reference/`                             | `unutilized-space.png`  |
| Cross-refs   | Point at items by id                                           | "blocked by `UX-01`"    |

---

## UX — Interaction

- [ ] `UX-01` **Draggable food items** — dragging builds the mental map of maneuvering food (see `TRN-01`)
- [ ] `UX-02` **Drag from food bank onto the line** — bank items drag into stations/drop zones
- [ ] `UX-03` **Food bank hotkey** — one key opens and closes the bank
- [ ] `UX-04` **Drop after close** — once the bank closes, held food is dragged to drop zones
- [ ] `UX-05` **Hold queue** — if drop zones are full, the workspace holds the next items
- [ ] `UX-06` **Bulk drops** — drop multiple items in one gesture

## UI — Layout & Screens

- [ ] `UI-01` **Wasted space** — reclaim unused screen area (see reference images below)
- [ ] `UI-02` **Remove the board**
- [ ] `UI-03` **Food bank as left vertical panel**
    - most-used items at the top
    - aligned close to its station
    - overlays the interface when open instead of reserving invisible space
- [ ] `UI-04` **Interactable KDS screen**
- [ ] `UI-05` **Match the default Square KDS layout** — kanban with sublists

## ART — Visual Assets

- [ ] `ART-01` **Food icons**
- [ ] `ART-02` **Sauces**

## CFG — Client Configuration

- [ ] `CFG-01` **Swappable menu per client** — Longhorn's, Chili's, independent
- [ ] `CFG-02` **Client plating** — plating specs per client
- [ ] `CFG-03` **Interchangeable KDS interface per client**

## TRN — Training Design

- [ ] `TRN-01` **Brain Train** — every interaction should exercise the cook's mental map of the line; `UX-01`–`UX-06` serve this goal

---

## Consider

- [ ] Menu change to Longhorn — the author knows that process better (`CFG-01`)
- [ ] Design systems, not features — picked up as [SYSTEMS](SYSTEMS.md)

---

## Reference images

| File                                 | Details                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `docs/reference/unutilized-space.png` | green = general space, red = component space                                         |
| `docs/reference/plating_layout.png`   | multiple columns hold multiple plates per ticket; tickets numbered to match the KDS |
