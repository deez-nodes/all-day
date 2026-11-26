# ALL DAY — kitchen line trainer

A mobile (landscape) kitchen-line game: read tickets, run the stations, make your times.
The kitchen is a canvas-rendered scene — flame-lit grill, bubbling fryer oil, heat-lamp pass,
food that visibly browns from raw to golden to charred — with a city-builder meta layer:
tips buy equipment for the line, XP levels you from DISH PIT to CHEF DE CUISINE.

The training core uses a real menu with true cook times (flip windows, breading chain,
sauté builds), so the game doubles as a drill tool for new line cooks — the original
product premise (see `docs/PROJECT.md`).

Live playable build: https://claude.ai/code/artifact/3c5bd516-58a6-4d7a-8953-d777d617aa25

## Run it

The game is a single self-contained file with zero runtime dependencies.

```
npm run dev        # serves src/ — open on a phone in landscape
```

or just open `src/index.html` in a browser.

## Test

`tests/game.test.js` drives every interaction path headlessly through jsdom
(53 assertions: cook/flip/burn/bread/sauté/window/plating/send/walk/report/economy/shop).

```
npm install
npm test
```

## Layout

```
src/index.html       the whole game (sim engine + canvas scene + DOM overlays)
tests/game.test.js   headless jsdom harness
docs/PROJECT.md      product premise
docs/reference/      design reference images
```

## History

This repo previously held the Replit-era prototype (a pnpm monorepo with two
duplicated React/Expo apps and an unused API chain). It was replaced by this
project in the `Restructure` commit; the full legacy tree is preserved in the
first commit (`Snapshot: Replit-era monorepo before restructure`).
