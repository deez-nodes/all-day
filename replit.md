# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

There are TWO versions of the same game. The game LOGIC is duplicated (not shared via a lib): the web `GameContext.tsx` is a 1:1 port of the mobile one (only AsyncStorage→localStorage differs). Any rules/data change must be applied to BOTH copies to keep them in sync.

### Soul · Line Trainer — Web (`artifacts/soul-line-web`) — PRIMARY
- **Type**: React + Vite web app (desktop / wide screen)
- **Route**: `/` (previewPath and BASE_PATH `/`)
- **Purpose**: Wide-desktop rebuild of the kitchen line trainer game
- **Storage**: `localStorage` (no backend needed)
- **Key files**:
  - `src/game/GameContext.tsx` — full game engine (ported 1:1 from the mobile app), exposes `GameProvider` + `useGame()`. Owns all rules/data/timers/scoring.
  - `src/pages/Game.tsx` — entire game UI: start screen, HUD, 3-column floor (Walk-In | Stations | Pass+Tickets).
  - `src/components/game/DnD.tsx` — dependency-free HTML5 drag-and-drop (`Draggable` serializes a payload to `dataTransfer`; `Droppable` validates via `accepts` and fires `onDropFn`). No `@dnd-kit`/`react-native-gesture-handler`.
  - `src/components/game/StationSlot.tsx`, `DemandBadge.tsx`, `src/lib/demand.ts`.
- **Interaction model**: BOTH drag-and-drop AND tap/click-to-pick work. The picked item is set on drag start (`onDragStartFn`) OR on click; drop/place handlers must ONLY place — they must NOT re-call the pick functions, which are toggles and would clear the picked item (caused a drag-placement bug). Pass items store side/cold under `id` and cooked under `product`.

### Soul · Line Trainer — Mobile (`artifacts/soul-line-trainer`)
- **Type**: Expo mobile app (React Native / Expo Router)
- **Route**: `/mobile` (previewPath, paths, BASE_PATH all `/mobile`)
- **Purpose**: Kitchen line trainer game for a Soul food restaurant
- **Storage**: AsyncStorage (no backend needed)
- **Key files**:
  - `context/GameContext.tsx` — all game state, logic, order generation, tick loop
  - `app/index.tsx` — main screen, responsive: 3-column landscape (walk-in | stations | tickets) and stacked portrait (header / h-scroll tickets / vertical stations / h-scroll walk-in) when window width < 760
  - Portrait mode auto-scrolls the stations area to the relevant station when an ingredient is picked, using onLayout-captured offsets and a ScrollView ref
  - `components/StationSlot.tsx` — cook/bread station slot with timer & progress; supports `asView` to render non-interactive when wrapped by a Draggable
  - `components/InstantButton.tsx` — Hot Hold/Window button; supports `asView` for the same reason
  - `components/TicketCard.tsx` — KDS-style paper ticket card
  - `lib/dnd.tsx` — drag-and-drop primitives (`DndProvider`, `Draggable`, `DropZone`, `useDnd`) built on `react-native-gesture-handler`. Pan activates after a 180ms long-press composed `Exclusive` with a quick Tap (≤179ms) so quick taps still fire `onTap` and parent ScrollViews keep their swipe gestures. Ghost is rendered absolutely over a transparent overlay; zones re-measure at drag start.
  - `constants/colors.ts` — dark Soul theme (hot orange #ff6a1f)
- **Game mechanics**:
  - Drag ingredients from walk-in → drop on stations (breading/fryer/grill/sauté). Stations have a station-level drop zone that auto-fills the first empty slot. Pass and Sauté also expose per-slot drop zones.
  - Timers count down with flip prompts; overcooking burns items
  - Select ticket → drag cooked items / sides / drinks to a Pass slot to plate; press SEND when ticket is complete
  - Tap-to-pick still works as a fallback (long-press to drag, quick-tap to pick)
  - Walk-in cards & Hot Hold/Window buttons show a small orange demand badge in the top-right corner with the count of open ticket items the ingredient could fulfill (collapses to "9+" past 9)
  - 3 difficulties: Stage/Sat Lunch/Fri Rush; 4 speed multipliers
- **DnD gotcha**: `DropZone`'s `unregisterZone` cleanup must NOT depend on the live `ctx` value — store it in a ref. The `DndProvider` re-creates its context value whenever drag/hover state changes, and depending on `ctx` would unregister every zone mid-drag (only the first hover would land; subsequent drops would silently miss).
- **Portrait layout gotcha**: in `app/index.tsx` styles, `walkinBar` and `ticketsBar` need `flexShrink: 0`, `walkinBar` needs `minHeight: 78`, `floor` (the stations ScrollView) needs `flex: 1, minHeight: 0`, and `stagePortrait` needs `flex: 1, minHeight: 0, flexDirection: "column"`. Without these, on initial mount on certain device heights the floor ScrollView can overflow and squish the walk-in bar offscreen — the walk-in only reappears after an orientation change forces a relayout.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
