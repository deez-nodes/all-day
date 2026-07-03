# ALL DAY — reimagined line-trainer concept

A ground-up reimagining of the line trainer as a **scene-based mobile game** (landscape phone), not a panel UI.
Single self-contained HTML file, zero dependencies — open `all-day.html` in any browser, or serve it statically.

Live playable build (Claude artifact): https://claude.ai/code/artifact/3c5bd516-58a6-4d7a-8953-d777d617aa25

## What it is

A canvas-rendered kitchen you look into and touch, in the register of mobile cooking games / city builders but non-cartoonish:

- **The scene**: flame-lit grill grates, fryer wells with bubbling oil and a moving sheen, a flour breading tray, gas-ring sauté burners, a pass with flickering heat lamps, a lowboy counter, and a waste bin — all drawn in code (gradients + particles: steam, smoke, oil bubbles, sparks). Food is rendered per category (chunks / fillet / shrimp / slab / fries / pasta) and **visibly browns** from raw to golden to charred as it cooks.
- **Tickets**: thermal-paper cards hanging from a rail with clips, monospace print, age shown green → amber → red-flagged.
- **Interaction**: tap-to-route. Tap the lowboy → drawer of raw stock (with live demand badges) → valid stations glow in the scene → tap to drop. When food is up, grab it and tap its ticket to plate, hold it under the pass lamps (dies after 3 game-min), sauté it into a pasta, or trash it.
- **Economy / meta (city-builder layer)**: you start with a small line (2 baskets, 2 grill zones, 1 breading tray, 1 burner, 2 window slots — locked positions are visible on the equipment). Sent tickets earn **tips**; spend them in THE LINE shop on more equipment and perks (faster breading, longer hold grace). XP levels you from DISH PIT to CHEF DE CUISINE. Day counter, best score, and recent-shift history persist.
- **Training core kept 1:1** from the original engine: the full menu with true cook times, 30s breading chain, flip windows + 60s grace burns, alfredo builds requiring a cooked protein, scoring (+100 / +130 tight / streak bonus / late decay / −75 walked / −25 burnt), timed service (20/25/30 min) with LAST CALL, graded shift report.

## Testing

`test-game.js` is a jsdom harness that drives every interaction path headlessly
(53 assertions: cook/flip/burn/bread/sauté/window/plating/send/walk/report/restart/economy/shop/trash).

```
npm install jsdom
node test-game.js
```

## Recommended real-version stack

Web-first PWA (installable on phones/work tablets with zero app-store friction), Canvas 2D scene + DOM overlays exactly as prototyped — no game engine needed at this object count. localStorage → later a thin sync API from the existing `api-spec` chain. Wrap with Capacitor only if app-store presence is ever required.
