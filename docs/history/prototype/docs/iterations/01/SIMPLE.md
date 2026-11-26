# Iteration 01 — Simple Group

The low-risk mechanical items from [PLAN](PLAN.md), groups A and B. Cleared top to
bottom with `npm test` after every checkbox. All renames are internal — persisted
localStorage key strings and saved object shapes kept their current values.

## A — Hoist magic strings

- [x] `A-01` Station kinds — `ST_FRYER`, `ST_GRILL`, `ST_BREAD`, `ST_SAUTE`, `ST_WINDOW`; all raw `"fryer"`-style literals replaced (COOK entries, tick, actions, shop keys, scene)
- [x] `A-02` localStorage keys — `KEY_BEST` … `KEY_HIST`; every inline `"allday_*"` replaced
- [x] `A-03` DOM ids — `DOM` lookup table (46 ids); every `el("…")` call site now `el(DOM.name)`
- [x] `A-04` Data attributes — `DATASET_ORDER_ID` + `orderCardSelector()` replace all `data-oid` strings
- [x] `A-05` Order types — `ORDER_TYPE_DINE_IN` / `ORDER_TYPE_TO_GO` feed `TYPES`
- [x] `A-06` Difficulty ids — `DIFF_EASY` / `DIFF_MEDIUM` / `DIFF_HARD`; `DIFF` uses computed keys
- [x] `A-07` Status tones — `TONE_GOOD` / `TONE_WARN` / `TONE_BAD` (shared by toasts and report stat cells, so named TONE not TOAST)

## B — Rename cryptic identifiers

- [x] `B-01` `S` → `sim` (game + test harness)
- [x] `B-02` `MAXG` → `MAX_STATION_SLOTS` (not BASE — it is the upgrade ceiling, not the starting count)
- [x] `B-03` `GEO` → `SCENE_GEOMETRY` (not STATION — it also holds pass, counter, board, trash, lowboy)
- [x] `B-04` `RAWC` → `RAW_FOOD_COLORS`, plus siblings `COOKC` → `COOKED_FOOD_COLORS`, `CHAR` → `CHARRED_COLOR`
- [x] `B-05` `AC` → `audioContext`, plus `cv` → `canvas`
- [x] `B-06` `COOK` entry field `st` → `station`
- [x] `B-07` `loadJSON(k, fb)` → `loadJSON(key, fallback)`
- [x] `B-08` One-letter locals renamed across sim (`tone`, `toast`, hand fns, `spawnOrder`, `tapSlot`, `tapWindow`, `tick`, `careerAt`), scene (`drawScene` geometry aliases → `passGeo`/`fryerGeo`/…, `buildHits`, `validTarget`, `drawParts`, `lerpC`), and DOM UI (`renderTickets`, `updateTicketAges`, `buildBank`, `updateBadges`, `renderHUD`, `endShift`, `buildStart`, `buildMenuStudy`); loop indices kept; dead `ing` lookup in the breading draw block deleted

## Exit check

- [x] `npm test` green (53/53 after every checkbox)
- [x] Puppeteer screenshots at 844×390 (start, shift, cooking) match the pre-refactor scene; zero page errors

## Discovered during the pass — cleared in the same session

- [x] `A-08` Hand + item kinds — `KIND_ING`, `KIND_BREADED`, `KIND_COOKED`, `KIND_SIDE`, `KIND_COLD`, `KIND_COOK`, `KIND_COOK_CHOICE`, `KIND_BREADING` (hand kinds and order/slot item kinds share one value space, so one KIND family covers both A-08 and A-10)
- [x] `A-09` Cook states — `STATE_COOKING` / `STATE_UP` / `STATE_BURNT`
- [x] `A-10` Item kinds — folded into `A-08`
- [x] `A-11` Hit kinds — `HIT_SLOT` / `HIT_WINDOW` / `HIT_TRASH` / `HIT_LOWBOY`
- [x] `A-12` Ticket age states — `AGE_OK` / `AGE_WARN` / `AGE_LATE`
- [x] `B-09` `rr` → `roundedRect`; duplicated route-label map in `handHint`/`tapSlot` → `routeLabels(direct, sep)`

## Deliberately left as literals

- Food categories (`"chunks"`, `"fillet"`, …) — data keys shared by `COOK` entries and the color tables; they belong to the S1 menu-pack extraction in [SYSTEMS](SYSTEMS.md)
- Particle types (`"bubble"`, `"steam"`, `"smoke"`, `"spark"`) — scene-internal, single call site pair
- Shop kinds (`"gear"` / `"perk"`) and `data-age` values inside CSS selectors
- `"suspended"` — Web Audio API platform value
