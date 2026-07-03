# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is a Replit-started prototype that serves as an example of the idea — the entire architecture can change. It has Linux-specific parts that can be misleading; the project is open in PowerShell on Windows. Read `PROJECT.md` for the product premise (a kitchen-line trainer game that simulates a restaurant KDS: tickets come in, ingredients are dragged from a food bank to cooking stations with cook timers, finished items are plated to complete orders).

`ARCHITECTURE.md` and `DEPLOY.md` are legacy Replit docs, but they contain the most detailed notes on game mechanics, key files, and hard-won DnD/layout gotchas — read them before touching game code.

## Windows gotcha (important)

`pnpm-workspace.yaml` contains package overrides that intentionally exclude ALL non-Linux-x64 platform binaries (esbuild, rollup, lightningcss, tailwind-oxide — including all `win32-*` variants, mapped to `"-"`). Installing and building on this Windows machine will fail with missing-native-binary errors until those overrides are removed or replaced. Node 24 + pnpm are the expected toolchain.

## Commands

- `pnpm run typecheck` — full typecheck across all packages (libs via `tsc --build`, then per-package `typecheck` scripts)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/soul-line-web run dev` — run the primary web game
- `pnpm --filter @workspace/soul-line-trainer run dev` — run the Expo mobile game
- `pnpm --filter @workspace/api-server run dev` — run the Express API server
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas from the OpenAPI spec (Orval)
- `pnpm --filter @workspace/db run push` — push Drizzle schema changes (dev only)
- Typecheck a single package: `pnpm --filter <pkg> run typecheck`

There are no tests or linters configured; `typecheck` is the verification step. The Vite apps (`soul-line-web`, `mockup-sandbox`) fail fast if `PORT` and `BASE_PATH` env vars are unset (e.g. web app ran with `PORT=23262 BASE_PATH=/`).

## Architecture

pnpm workspace monorepo (TypeScript 5.9). `artifacts/` holds deployable apps, `lib/` holds shared packages consumed as raw TS source via `workspace:*`.

### The game exists twice — keep both in sync

The game logic is intentionally duplicated, not shared through a lib:

- `artifacts/soul-line-web` (**primary**) — React + Vite desktop/wide-screen app. Engine in `src/game/GameContext.tsx`, entire game UI in `src/pages/Game.tsx`, dependency-free HTML5 drag-and-drop in `src/components/game/DnD.tsx`. Persists to `localStorage`; no backend.
- `artifacts/soul-line-trainer` — Expo / React Native (Expo Router) mobile app. Engine in `context/GameContext.tsx`, main screen in `app/index.tsx`, gesture-handler-based DnD in `lib/dnd.tsx`. Persists to AsyncStorage; no backend.

The web `GameContext.tsx` is a 1:1 port of the mobile one (only AsyncStorage→localStorage differs). **Any change to game rules, data, timers, or scoring must be applied to BOTH copies.**

Interaction model in both apps: drag-and-drop AND tap/click-to-pick both work. Pick functions are toggles — drop/place handlers must only place, never re-call pick (re-calling clears the picked item; this caused a real drag-placement bug). See `ARCHITECTURE.md` for the mobile DnD `unregisterZone` ref gotcha and portrait-layout flexbox constraints.

### Backend chain (scaffolding, unused by the games)

`lib/api-spec` (OpenAPI spec + Orval codegen) → generates into `lib/api-zod` (Zod schemas) and `lib/api-client-react` (TanStack Query hooks) → consumed by `artifacts/api-server` (Express 5 + Drizzle/PostgreSQL via `lib/db`, bundled with esbuild). The spec is the source of truth: edit it, then run codegen — don't hand-edit generated output.

`artifacts/mockup-sandbox` is a dev-only component preview app (shadcn/Radix UI); `scripts/` is a scratch package for one-off tsx scripts.
