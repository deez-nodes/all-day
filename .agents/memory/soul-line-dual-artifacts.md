---
name: Soul Line Trainer dual artifacts
description: The Soul Line Trainer game ships as two artifacts (web + mobile) with duplicated, manually-synced game logic.
---

# Soul · Line Trainer — two artifacts, duplicated logic

The kitchen-line game exists twice:
- `artifacts/soul-line-web` — React + Vite web app, route `/` (PRIMARY, desktop/wide).
- `artifacts/soul-line-trainer` — Expo mobile app, route `/mobile`.

The game engine is **copied, not shared via a lib**. `soul-line-web/src/game/GameContext.tsx`
is a 1:1 port of `soul-line-trainer/context/GameContext.tsx`; the only intended difference is
storage (`localStorage` on web vs `AsyncStorage` on mobile).

**Why:** the user chose a full native-web rewrite rather than reusing the RN code. Extracting a
shared lib was out of scope.

**How to apply:** any change to game rules, menu/cook data, scoring, order generation, or the
tick loop must be made in BOTH `GameContext.tsx` files or the two versions drift apart. If asked
to change "the game," confirm which artifact(s) — default to keeping them consistent.

## Web DnD interaction gotcha (documented in code + ARCHITECTURE.md)
The web UI supports both drag-and-drop and click-to-pick. The picked item is set on drag start
(`onDragStartFn`) or on click. The pick functions (`pickIngredient`/`pickInstant`) are TOGGLES,
so drop/place handlers must ONLY call the place action — re-calling a pick function in the drop
handler clears the picked item and the placement silently fails. Pass items store side/cold under
`id` and cooked under `product` (mismatching that field blanks the plated label).
