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

- `npm test` — headless QA: `tests/game.test.js` runs the full interaction suite in jsdom (needs `npm install` once for jsdom). This is the verification step; there is no typecheck/linter.
- `npm run dev` — serve `src/` locally.

## Working on the game

- The sim and the scene are deliberately separated inside `index.html`: game rules live in
  the DATA/ACTIONS/TICK sections and never touch the canvas; the scene reads state each
  frame. Keep it that way — tests drive the sim functions directly (`tapBank`, `tapSlot`,
  `tapWindow`, `tapTicket`, `sendOrder`, `startShift`, `endShift`).
- Interaction model is tap-to-route (no drag-and-drop): pick → valid targets glow → tap target.
  Station/window slot counts come from the persisted `gear` object (upgrade shop), so never
  hardcode slot counts.
- jsdom has no canvas: all drawing is guarded behind a null `ctx`; keep new draw code inside
  `drawScene` or similarly guarded.
- After changes: `npm test`, then visually verify with a puppeteer-core screenshot at
  844×390 (local Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`) before
  redeploying the artifact.

## History

The first commit (`Snapshot: Replit-era monorepo before restructure`) preserves the old
Replit prototype (soul-line-web / soul-line-trainer / api chain). Recover legacy files from
there if ever needed; do not reintroduce the monorepo structure.
