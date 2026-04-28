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

### Soul · Line Trainer (`artifacts/soul-line-trainer`)
- **Type**: Expo mobile app (React Native / Expo Router)
- **Purpose**: Kitchen line trainer game for a Soul food restaurant
- **Storage**: AsyncStorage (no backend needed)
- **Key files**:
  - `context/GameContext.tsx` — all game state, logic, order generation, tick loop
  - `app/index.tsx` — main screen with 3-column layout: walk-in | stations | tickets
  - `components/StationSlot.tsx` — cook/bread station slot with timer & progress
  - `components/TicketCard.tsx` — KDS-style paper ticket card
  - `constants/colors.ts` — dark Soul theme (hot orange #ff6a1f)
- **Game mechanics**:
  - Pick ingredients from walk-in → drop on stations (breading/fryer/grill/sauté)
  - Timers count down with flip prompts; overcooking burns items
  - Select ticket → plate cooked items to the Pass → press SEND
  - Hot Hold (instant sides) + Window (drinks/desserts)
  - 3 difficulties: Stage/Sat Lunch/Fri Rush; 4 speed multipliers

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
