import {
  DOM,
  HIT_SLOT,
  HIT_WINDOW,
  HIT_TRASH,
  HIT_LOWBOY,
  ST_BREAD,
  ST_FRYER,
  ST_GRILL,
  ST_SAUTE,
  HOLD_WARN,
  HOLD_DEAD,
  MAX_STATION_SLOTS,
  KIND_BREADED,
  KIND_COOKED,
  KIND_ING,
  KIND_SIDE,
  KIND_COLD,
  STATE_UP,
  STATE_BURNT,
  STATE_COOKING,
} from "../constants.js";
import { CLIENT_PACK, COOK, PROTEINS, BREAD_MAP } from "../sim/menu.js";
import { canDropOn, canPlateToWindow } from "../sim/line.js";
import { el, clamp, fmt } from "../line-format.js";

export function createKitchenRenderer(game, canvas, ctx) {
  const WORLD = { w: 1560, h: 500 };
  let view = { s: 1, ox: 0, oy: 0, railH: 150 };
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* station geometry (world units) */
  const SCENE_GEOMETRY = {
    pass: {
      x: 260,
      y: 16,
      w: 1040,
      h: 96,
      slots: [
        [560, 68],
        [720, 68],
        [880, 68],
        [1040, 68],
      ],
    },
    bread: {
      x: 40,
      y: 170,
      w: 230,
      h: 170,
      label: "BREADING",
      slots: [
        [105, 262],
        [196, 262],
      ],
    },
    fryer: {
      x: 300,
      y: 170,
      w: 400,
      h: 170,
      label: "FRYER · 350°",
      slots: [
        [352, 262],
        [442, 262],
        [532, 262],
        [622, 262],
      ],
    },
    grill: {
      x: 730,
      y: 170,
      w: 400,
      h: 170,
      label: "GRILL",
      slots: [
        [782, 262],
        [872, 262],
        [962, 262],
        [1052, 262],
      ],
    },
    saute: {
      x: 1160,
      y: 170,
      w: 200,
      h: 170,
      label: "SAUTÉ",
      slots: [
        [1212, 262],
        [1302, 262],
      ],
    },
    counter: { x: 0, y: 400, w: 1560, h: 100 },
    board: { x: 640, y: 410, w: 300, h: 82 },
    trash: { x: 1420, y: 404, w: 110, h: 92 },
    lowboy: { x: 30, y: 406, w: 560, h: 90 },
  };
  let hits = [];
  function buildHits() {
    const sim = game.state,
      gear = game.gear;
    hits = [];
    [ST_BREAD, ST_FRYER, ST_GRILL, ST_SAUTE].forEach((station) => {
      const geo = SCENE_GEOMETRY[station];
      for (let i = 0; i < (sim ? sim[station].length : gear[station]); i++) {
        const [cx, cy] = geo.slots[i];
        hits.push({
          kind: HIT_SLOT,
          station,
          idx: i,
          x: cx - 44,
          y: cy - 52,
          w: 88,
          h: 104,
        });
      }
    });
    for (let i = 0; i < (sim ? sim.window.length : gear.window); i++) {
      const [cx, cy] = SCENE_GEOMETRY.pass.slots[i];
      hits.push({
        kind: HIT_WINDOW,
        idx: i,
        x: cx - 52,
        y: cy - 38,
        w: 104,
        h: 76,
      });
    }
    hits.push({ kind: HIT_TRASH, ...SCENE_GEOMETRY.trash });
    hits.push({ kind: HIT_LOWBOY, ...SCENE_GEOMETRY.lowboy });
    hits.push({
      kind: HIT_LOWBOY,
      x: SCENE_GEOMETRY.board.x,
      y: SCENE_GEOMETRY.board.y,
      w: SCENE_GEOMETRY.board.w,
      h: SCENE_GEOMETRY.board.h,
    });
  }
  function resize(sw, sh) {
    const availH = Math.max(1, sh - view.railH - 8);
    view.s = Math.min(sw / WORLD.w, availH / WORLD.h);
    view.ox = (sw - WORLD.w * view.s) / 2;
    view.oy = view.railH + (availH - WORLD.h * view.s) / 2;
    el(DOM.rotate).classList.toggle("show", sh > sw * 1.15 && sw < 700);
  }

  /* color helpers */
  function lerpC(from, to, frac) {
    frac = clamp(frac, 0, 1);
    return (
      "rgb(" +
      Math.round(from[0] + (to[0] - from[0]) * frac) +
      "," +
      Math.round(from[1] + (to[1] - from[1]) * frac) +
      "," +
      Math.round(from[2] + (to[2] - from[2]) * frac) +
      ")"
    );
  }
  const RAW_FOOD_COLORS = CLIENT_PACK.foodColors.raw;
  const COOKED_FOOD_COLORS = CLIENT_PACK.foodColors.cooked;
  const CHARRED_COLOR = [26, 19, 15];
  function foodColor(cat, prog, burnt) {
    if (burnt) return lerpC(COOKED_FOOD_COLORS[cat], CHARRED_COLOR, 1);
    return lerpC(RAW_FOOD_COLORS[cat], COOKED_FOOD_COLORS[cat], prog);
  }

  /* particles */
  let parts = [];
  function spawnPart(type, x, y) {
    if (reduceMotion) return;
    if (parts.length > 220) return;
    if (type === "bubble")
      parts.push({
        type,
        x: x + (Math.random() * 40 - 20),
        y,
        vy: -14 - Math.random() * 10,
        life: 0.7 + Math.random() * 0.5,
        age: 0,
        r: 1.5 + Math.random() * 2,
      });
    if (type === "steam")
      parts.push({
        type,
        x: x + (Math.random() * 30 - 15),
        y,
        vy: -22 - Math.random() * 14,
        vx: Math.random() * 8 - 4,
        life: 1.6 + Math.random(),
        age: 0,
        r: 6 + Math.random() * 7,
      });
    if (type === "smoke")
      parts.push({
        type,
        x: x + (Math.random() * 24 - 12),
        y,
        vy: -18 - Math.random() * 10,
        vx: Math.random() * 6 - 3,
        life: 2 + Math.random(),
        age: 0,
        r: 7 + Math.random() * 8,
      });
    if (type === "spark")
      parts.push({
        type,
        x,
        y,
        vy: -40 - Math.random() * 40,
        vx: Math.random() * 50 - 25,
        life: 0.5 + Math.random() * 0.3,
        age: 0,
        r: 1.5,
      });
  }
  function drawParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      part.age += dt;
      if (part.age >= part.life) {
        parts.splice(i, 1);
        continue;
      }
      part.y += part.vy * dt;
      part.x += (part.vx || 0) * dt;
      const fade = 1 - part.age / part.life;
      if (part.type === "bubble") {
        ctx.fillStyle = "rgba(240,220,180," + 0.35 * fade + ")";
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.r, 0, 7);
        ctx.fill();
      } else if (part.type === "steam") {
        ctx.fillStyle = "rgba(200,205,210," + 0.13 * fade + ")";
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.r * (1.6 - fade * 0.6), 0, 7);
        ctx.fill();
      } else if (part.type === "smoke") {
        ctx.fillStyle = "rgba(40,38,36," + 0.4 * fade + ")";
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.r * (1.8 - fade * 0.8), 0, 7);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,180,94," + 0.9 * fade + ")";
        ctx.fillRect(part.x, part.y, 2, 2);
      }
    }
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function steelBody(g) {
    const grad = ctx.createLinearGradient(0, g.y, 0, g.y + g.h);
    grad.addColorStop(0, "#31383e");
    grad.addColorStop(0.12, "#272d33");
    grad.addColorStop(1, "#191d21");
    ctx.fillStyle = grad;
    roundedRect(g.x, g.y, g.w, g.h, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    ctx.lineWidth = 1;
    roundedRect(g.x + 0.5, g.y + 0.5, g.w - 1, g.h - 1, 10);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(g.x + 6, g.y + g.h - 8, g.w - 12, 4);
  }
  function stationLabel(g) {
    ctx.font =
      "700 15px 'Archivo Narrow','Arial Narrow','Roboto Condensed',sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(141,149,156,.75)";
    ctx.fillText(g.label, g.x + 12, g.y + 24);
  }
  function lockedCover(cx, cy) {
    ctx.fillStyle = "#1b2024";
    roundedRect(cx - 36, cy - 30, 72, 60, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.05)";
    ctx.stroke();
    ctx.fillStyle = "rgba(232,147,58,.5)";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, 7);
    ctx.fill();
    ctx.fillRect(cx - 1.5, cy, 3, 9);
  }

  /* food blobs — deterministic per slot index */
  function drawFood(cat, cx, cy, prog, burnt, onGrill, idx) {
    const col = foodColor(cat, prog, burnt);
    ctx.fillStyle = col;
    const j = (n) => ((idx * 73 + n * 37) % 17) / 17 - 0.5; // deterministic jitter
    if (cat === "chunks") {
      for (let n = 0; n < 5; n++) {
        const bx = cx + j(n) * 46,
          by = cy + j(n + 9) * 30;
        ctx.beginPath();
        ctx.ellipse(bx, by, 11 + ((idx + n) % 3) * 2, 8.5, j(n) * 1.2, 0, 7);
        ctx.fill();
      }
    } else if (cat === "fries") {
      for (let n = 0; n < 7; n++) {
        ctx.save();
        ctx.translate(cx + j(n) * 40, cy + j(n + 5) * 22);
        ctx.rotate(j(n) * 1.1);
        ctx.fillRect(-3, -14, 6, 28);
        ctx.restore();
      }
    } else if (cat === "fillet") {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 30, 17, -0.15, 0, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.12)";
      ctx.beginPath();
      ctx.ellipse(cx - 6, cy - 4, 14, 6, -0.2, 0, 7);
      ctx.fill();
    } else if (cat === "shrimp") {
      for (let n = 0; n < 3; n++) {
        ctx.beginPath();
        ctx.arc(cx - 20 + n * 20, cy + j(n) * 10, 10, 0.6, 4.2);
        ctx.lineWidth = 7;
        ctx.strokeStyle = col;
        ctx.stroke();
      }
    } else if (cat === "slab") {
      roundedRect(cx - 27, cy - 16, 54, 32, 9);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.08)";
      roundedRect(cx - 20, cy - 11, 26, 9, 4);
      ctx.fill();
    } else {
      /* pasta */
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, 7);
      ctx.fill();
      ctx.strokeStyle = "rgba(120,90,50,.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 3, cy + 2, 8, 1, 6);
      ctx.stroke();
    }
    if (onGrill && (prog > 0.25 || burnt)) {
      ctx.strokeStyle = "rgba(20,14,10," + (burnt ? 0.9 : 0.55) + ")";
      ctx.lineWidth = 3;
      for (let n = -1; n <= 1; n++) {
        ctx.beginPath();
        ctx.moveTo(cx - 24, cy + n * 10 - 4);
        ctx.lineTo(cx + 24, cy + n * 10 + 4);
        ctx.stroke();
      }
    }
  }
  function timerPill(cx, cy, txt, frac, color, flash, t) {
    if (flash && Math.sin(t * 9) > 0) return;
    const w = 64,
      h = 20;
    ctx.fillStyle = "rgba(8,10,12,.85)";
    roundedRect(cx - w / 2, cy - h / 2, w, h, 10);
    ctx.fill();
    if (frac != null) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        cx - w / 2 + 11,
        cy,
        6,
        -Math.PI / 2,
        -Math.PI / 2 + frac * Math.PI * 2,
      );
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx - w / 2 + 11, cy, 6, 0, 7);
      ctx.stroke();
    }
    ctx.font = "700 12px ui-monospace,'Cascadia Mono',Menlo,monospace";
    ctx.textAlign = frac != null ? "left" : "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(txt, frac != null ? cx - w / 2 + 22 : cx, cy + 0.5);
  }
  function targetGlow(cx, cy, w, h, t, round) {
    const a = 0.45 + 0.3 * Math.sin(t * 5);
    ctx.strokeStyle = "rgba(232,147,58," + a + ")";
    ctx.lineWidth = 3;
    if (round) {
      ctx.beginPath();
      ctx.arc(cx, cy, w / 2, 0, 7);
      ctx.stroke();
    } else {
      roundedRect(cx - w / 2, cy - h / 2, w, h, 10);
      ctx.stroke();
    }
  }

  function validTarget(station, idx) {
    const sim = game.state;
    return !!sim && canDropOn(sim.hand, sim[station][idx], station);
  }

  let frameT = 0,
    lastFrame = performance.now();
  function drawScene(sw, sh) {
    const sim = game.state,
      gear = game.gear;
    const now = performance.now();
    const fdt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    if (!reduceMotion) frameT += fdt;
    const t = frameT;
    ctx.save();
    ctx.setTransform(canvas.width / sw, 0, 0, canvas.height / sh, 0, 0);

    /* ambient */
    ctx.fillStyle = "#0b0d0e";
    ctx.fillRect(0, 0, sw, sh);
    const vg = ctx.createRadialGradient(
      sw / 2,
      sh * 0.45,
      sh * 0.2,
      sw / 2,
      sh * 0.45,
      sh * 0.95,
    );
    vg.addColorStop(0, "rgba(24,20,14,.28)");
    vg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, sw, sh);

    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.s, view.s);

    /* floor */
    ctx.fillStyle = "#101315";
    ctx.fillRect(
      -view.ox / view.s,
      110,
      WORLD.w + (2 * view.ox) / view.s,
      WORLD.h - 110,
    );
    ctx.strokeStyle = "rgba(255,255,255,.025)";
    ctx.lineWidth = 1;
    for (let x = -200; x < WORLD.w + 200; x += 130) {
      ctx.beginPath();
      ctx.moveTo(x, 112);
      ctx.lineTo(x, WORLD.h);
      ctx.stroke();
    }
    for (let y = 150; y < WORLD.h; y += 90) {
      ctx.beginPath();
      ctx.moveTo(-view.ox / view.s, y);
      ctx.lineTo(WORLD.w + view.ox / view.s, y);
      ctx.stroke();
    }

    /* ── PASS ── */
    const passGeo = SCENE_GEOMETRY.pass;
    /* heat lamp glow pool */
    const lampG = ctx.createRadialGradient(
      passGeo.x + passGeo.w / 2,
      passGeo.y + 50,
      20,
      passGeo.x + passGeo.w / 2,
      passGeo.y + 50,
      passGeo.w * 0.55,
    );
    const flick = reduceMotion
      ? 1
      : 0.92 + 0.08 * Math.sin(t * 11) + 0.04 * Math.sin(t * 23);
    lampG.addColorStop(0, "rgba(232,150,60," + 0.2 * flick + ")");
    lampG.addColorStop(1, "rgba(232,150,60,0)");
    ctx.fillStyle = lampG;
    ctx.fillRect(passGeo.x - 100, passGeo.y - 16, passGeo.w + 200, 140);
    steelBody(passGeo);
    /* lamp cones */
    for (let i = 0; i < 4; i++) {
      const lx = passGeo.x + 170 + i * 240;
      ctx.fillStyle = "#20262b";
      ctx.beginPath();
      ctx.moveTo(lx - 16, passGeo.y + 4);
      ctx.lineTo(lx + 16, passGeo.y + 4);
      ctx.lineTo(lx + 9, passGeo.y + 16);
      ctx.lineTo(lx - 9, passGeo.y + 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,180,94," + 0.75 * flick + ")";
      ctx.beginPath();
      ctx.ellipse(lx, passGeo.y + 17, 8, 3, 0, 0, 7);
      ctx.fill();
    }
    ctx.font = "700 14px 'Archivo Narrow','Arial Narrow',sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(141,149,156,.7)";
    ctx.fillText("PASS — HOT WINDOW", passGeo.x + 12, passGeo.y + 22);
    /* window plates */
    for (let i = 0; i < gear.window; i++) {
      const [cx, cy] = passGeo.slots[i];
      const held = sim ? sim.window[i] : null;
      /* plate */
      ctx.fillStyle = "#e7e2d6";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 8, 44, 15, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#d5cfc0";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 7, 34, 11, 0, 0, 7);
      ctx.fill();
      if (held) {
        const cook = COOK[held.product];
        drawFood(cook.cat, cx, cy - 2, 1, false, false, i + 3);
        if (!reduceMotion && Math.random() < 0.1)
          spawnPart("steam", cx, cy - 14);
        const age = sim.shiftSec - held.since;
        if (age > HOLD_WARN)
          timerPill(
            cx,
            cy - 34,
            fmt(HOLD_DEAD - age),
            null,
            "#d9a13b",
            false,
            t,
          );
      } else if (sim && canPlateToWindow(sim.hand, held)) {
        targetGlow(cx, cy + 4, 96, 50, t, false);
      }
    }
    for (let i = gear.window; i < MAX_STATION_SLOTS.window; i++) {
      const [cx, cy] = passGeo.slots[i];
      lockedCover(cx, cy);
    }

    /* ── HOT LINE stations ── */
    /* breading */
    const breadGeo = SCENE_GEOMETRY.bread;
    steelBody(breadGeo);
    stationLabel(breadGeo);
    for (let i = 0; i < gear.bread; i++) {
      const [cx, cy] = breadGeo.slots[i];
      /* flour tray */
      ctx.fillStyle = "#3a3f3a";
      roundedRect(cx - 38, cy - 30, 76, 60, 7);
      ctx.fill();
      ctx.fillStyle = "#c9c4ae";
      roundedRect(cx - 32, cy - 24, 64, 48, 5);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.25)";
      ctx.beginPath();
      ctx.ellipse(cx - 8, cy - 6, 14, 6, 0.3, 0, 7);
      ctx.fill();
      const breadItem = sim ? sim.bread[i] : null;
      if (breadItem) {
        const cookKey = BREAD_MAP[breadItem.breadKey];
        drawFood(COOK[cookKey].cat, cx, cy, 0, false, false, i);
        if (breadItem.done) {
          ctx.fillStyle = "rgba(240,236,220,.55)"; /* flour dust coat */
          ctx.beginPath();
          ctx.ellipse(cx, cy, 30, 18, 0, 0, 7);
          ctx.fill();
          timerPill(cx, cy - 46, "GRAB", null, "#4fa870", false, t);
        } else {
          timerPill(
            cx,
            cy - 46,
            fmt(game.breadSeconds - breadItem.elapsed),
            breadItem.elapsed / game.breadSeconds,
            "#c9cba9",
            false,
            t,
          );
        }
      } else if (sim && validTarget(ST_BREAD, i))
        targetGlow(cx, cy, 84, 66, t, false);
    }
    for (let i = gear.bread; i < MAX_STATION_SLOTS.bread; i++) {
      const [cx, cy] = breadGeo.slots[i];
      lockedCover(cx, cy);
    }

    /* fryer */
    const fryerGeo = SCENE_GEOMETRY.fryer;
    steelBody(fryerGeo);
    stationLabel(fryerGeo);
    for (let i = 0; i < gear.fryer; i++) {
      const [cx, cy] = fryerGeo.slots[i];
      /* oil well */
      ctx.fillStyle = "#141210";
      roundedRect(cx - 38, cy - 32, 76, 64, 8);
      ctx.fill();
      const oil = ctx.createRadialGradient(cx - 10, cy - 12, 4, cx, cy, 44);
      oil.addColorStop(0, "#4a3517");
      oil.addColorStop(0.5, "#2c2010");
      oil.addColorStop(1, "#1a130a");
      ctx.fillStyle = oil;
      roundedRect(cx - 33, cy - 27, 66, 54, 6);
      ctx.fill();
      /* moving sheen */
      if (!reduceMotion) {
        ctx.fillStyle = "rgba(232,180,110,.07)";
        ctx.beginPath();
        ctx.ellipse(
          cx + Math.sin(t * 1.3 + i) * 10,
          cy - 6 + Math.cos(t * 0.9 + i * 2) * 4,
          20,
          7,
          0.2,
          0,
          7,
        );
        ctx.fill();
      }
      const item = sim ? sim.fryer[i] : null;
      if (item) {
        const cook = COOK[item.cookKey];
        const prog = clamp(item.elapsed / cook.sec, 0, 1);
        drawFood(
          cook.cat,
          cx,
          cy + 2,
          prog,
          item.state === STATE_BURNT,
          false,
          i,
        );
        /* oil covers lower part */
        ctx.fillStyle = "rgba(30,21,10,.45)";
        ctx.beginPath();
        ctx.ellipse(cx, cy + 14, 33, 12, 0, 0, 7);
        ctx.fill();
        if (item.state === STATE_COOKING) {
          if (!reduceMotion && Math.random() < 0.5)
            spawnPart("bubble", cx, cy + 8);
          timerPill(
            cx,
            cy - 48,
            fmt(cook.sec - item.elapsed),
            prog,
            "#e8933a",
            false,
            t,
          );
        } else if (item.state === STATE_UP) {
          timerPill(
            cx,
            cy - 48,
            "UP " + fmt(item.elapsed - cook.sec),
            null,
            "#4fa870",
            false,
            t,
          );
          if (!reduceMotion && Math.random() < 0.06)
            spawnPart("steam", cx, cy - 10);
        } else {
          timerPill(cx, cy - 48, "BURNT", null, "#e86a5e", false, t);
          if (!reduceMotion && Math.random() < 0.2)
            spawnPart("smoke", cx, cy - 8);
        }
      } else if (sim && validTarget(ST_FRYER, i))
        targetGlow(cx, cy, 84, 70, t, false);
      /* basket handle */
      ctx.strokeStyle = "#454c52";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - 32);
      ctx.lineTo(cx + 14, cy - 32);
      ctx.stroke();
    }
    for (let i = gear.fryer; i < MAX_STATION_SLOTS.fryer; i++) {
      const [cx, cy] = fryerGeo.slots[i];
      lockedCover(cx, cy);
    }

    /* grill */
    const grillGeo = SCENE_GEOMETRY.grill;
    steelBody(grillGeo);
    stationLabel(grillGeo);
    for (let i = 0; i < gear.grill; i++) {
      const [cx, cy] = grillGeo.slots[i];
      const item = sim ? sim.grill[i] : null;
      /* fire glow under grates */
      const heat = item && item.state !== STATE_BURNT ? 1 : 0.35;
      const fg = ctx.createRadialGradient(cx, cy + 6, 4, cx, cy + 6, 42);
      const ff = reduceMotion
        ? 1
        : 0.85 + 0.15 * Math.sin(t * 9 + i * 2.1) + 0.07 * Math.sin(t * 17 + i);
      fg.addColorStop(0, "rgba(226,98,34," + 0.5 * heat * ff + ")");
      fg.addColorStop(0.6, "rgba(160,52,20," + 0.25 * heat * ff + ")");
      fg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = "#0d0b09";
      roundedRect(cx - 38, cy - 32, 76, 64, 8);
      ctx.fill();
      ctx.fillStyle = fg;
      roundedRect(cx - 38, cy - 32, 76, 64, 8);
      ctx.fill();
      /* grates */
      ctx.strokeStyle = "#1c1f22";
      ctx.lineWidth = 5;
      for (let n = 0; n < 5; n++) {
        ctx.beginPath();
        ctx.moveTo(cx - 36, cy - 24 + n * 12);
        ctx.lineTo(cx + 36, cy - 24 + n * 12);
        ctx.stroke();
      }
      if (item) {
        const cook = COOK[item.cookKey];
        const prog = clamp(item.elapsed / cook.sec, 0, 1);
        drawFood(cook.cat, cx, cy, prog, item.state === STATE_BURNT, true, i);
        if (item.state === STATE_COOKING) {
          const inFlip =
            cook.flip && !item.flipped && item.elapsed >= cook.flip;
          if (inFlip) {
            timerPill(cx, cy - 48, "FLIP", null, "#d9a13b", true, t);
            if (!reduceMotion && Math.random() < 0.15)
              spawnPart("spark", cx, cy);
          } else {
            timerPill(
              cx,
              cy - 48,
              fmt(cook.sec - item.elapsed),
              prog,
              cook.flip && !item.flipped ? "#d9a13b" : "#e8933a",
              false,
              t,
            );
          }
          if (cook.flip && item.flipped) {
            ctx.font = "700 11px ui-monospace,monospace";
            ctx.textAlign = "center";
            ctx.fillStyle = "#4fa870";
            ctx.fillText("⤾✓", cx + 28, cy - 38);
          }
          if (!reduceMotion && Math.random() < 0.12)
            spawnPart("steam", cx, cy - 16);
        } else if (item.state === STATE_UP) {
          timerPill(
            cx,
            cy - 48,
            "UP " + fmt(item.elapsed - cook.sec),
            null,
            "#4fa870",
            false,
            t,
          );
        } else {
          timerPill(cx, cy - 48, "BURNT", null, "#e86a5e", false, t);
          if (!reduceMotion && Math.random() < 0.2)
            spawnPart("smoke", cx, cy - 10);
        }
      } else if (sim && validTarget(ST_GRILL, i))
        targetGlow(cx, cy, 84, 70, t, false);
    }
    for (let i = gear.grill; i < MAX_STATION_SLOTS.grill; i++) {
      const [cx, cy] = grillGeo.slots[i];
      lockedCover(cx, cy);
    }

    /* sauté */
    const sauteGeo = SCENE_GEOMETRY.saute;
    steelBody(sauteGeo);
    stationLabel(sauteGeo);
    for (let i = 0; i < gear.saute; i++) {
      const [cx, cy] = sauteGeo.slots[i];
      /* burner ring */
      ctx.strokeStyle = "#111417";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, 7);
      ctx.stroke();
      const item = sim ? sim.saute[i] : null;
      if (item || !sim) {
        /* pan */
        ctx.fillStyle = "#15181b";
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, 7);
        ctx.fill();
        ctx.strokeStyle = "#31383e";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, 7);
        ctx.stroke();
        ctx.strokeStyle = "#262c31";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(cx + 27, cy - 8);
        ctx.lineTo(cx + 48, cy - 16);
        ctx.stroke();
      }
      if (item) {
        /* gas flame */
        if (item.state !== STATE_BURNT && !reduceMotion) {
          ctx.fillStyle =
            "rgba(90,140,235," + (0.5 + 0.2 * Math.sin(t * 13 + i)) + ")";
          for (let n = 0; n < 8; n++) {
            const a = (n / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.ellipse(
              cx + Math.cos(a) * 33,
              cy + Math.sin(a) * 33,
              2.5,
              5,
              a + Math.PI / 2,
              0,
              7,
            );
            ctx.fill();
          }
        }
        const cook = COOK[item.cookKey];
        const prog = clamp(item.elapsed / cook.sec, 0, 1);
        drawFood("pasta", cx, cy, prog, item.state === STATE_BURNT, false, i);
        if (item.state === STATE_COOKING) {
          timerPill(
            cx,
            cy - 48,
            fmt(cook.sec - item.elapsed),
            prog,
            "#e8933a",
            false,
            t,
          );
          if (!reduceMotion && Math.random() < 0.15)
            spawnPart("steam", cx, cy - 12);
        } else if (item.state === STATE_UP)
          timerPill(
            cx,
            cy - 48,
            "UP " + fmt(item.elapsed - cook.sec),
            null,
            "#4fa870",
            false,
            t,
          );
        else timerPill(cx, cy - 48, "BURNT", null, "#e86a5e", false, t);
      } else if (sim && validTarget(ST_SAUTE, i))
        targetGlow(cx, cy, 74, 74, t, true);
    }
    for (let i = gear.saute; i < MAX_STATION_SLOTS.saute; i++) {
      const [cx, cy] = sauteGeo.slots[i];
      lockedCover(cx, cy);
    }

    /* ── COUNTER / LOWBOY ── */
    const counterGeo = SCENE_GEOMETRY.counter;
    const cg = ctx.createLinearGradient(
      0,
      counterGeo.y,
      0,
      counterGeo.y + counterGeo.h,
    );
    cg.addColorStop(0, "#2b3137");
    cg.addColorStop(0.1, "#22272c");
    cg.addColorStop(1, "#15181b");
    ctx.fillStyle = cg;
    ctx.fillRect(
      counterGeo.x - view.ox / view.s,
      counterGeo.y,
      counterGeo.w + (2 * view.ox) / view.s,
      counterGeo.h,
    );
    ctx.fillStyle = "rgba(255,255,255,.05)";
    ctx.fillRect(
      counterGeo.x - view.ox / view.s,
      counterGeo.y,
      counterGeo.w + (2 * view.ox) / view.s,
      2,
    );
    /* lowboy drawers */
    const lowboyGeo = SCENE_GEOMETRY.lowboy;
    for (let i = 0; i < 3; i++) {
      const dx = lowboyGeo.x + 8 + i * 186;
      ctx.fillStyle = "#1d2226";
      roundedRect(dx, lowboyGeo.y + 8, 174, 76, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.06)";
      roundedRect(dx + 0.5, lowboyGeo.y + 8.5, 173, 75, 6);
      ctx.stroke();
      ctx.fillStyle = "#454c52";
      roundedRect(dx + 52, lowboyGeo.y + 18, 70, 7, 3.5);
      ctx.fill();
    }
    ctx.font = "700 15px 'Archivo Narrow','Arial Narrow',sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(232,147,58,.8)";
    ctx.fillText("LOWBOY — TAP FOR STOCK", lowboyGeo.x + 12, lowboyGeo.y - 4);
    /* cutting board + held item */
    const boardGeo = SCENE_GEOMETRY.board;
    ctx.fillStyle = "#4a3d2c";
    roundedRect(boardGeo.x, boardGeo.y, boardGeo.w, boardGeo.h, 8);
    ctx.fill();
    ctx.fillStyle = "#5b4c37";
    roundedRect(
      boardGeo.x + 6,
      boardGeo.y + 6,
      boardGeo.w - 12,
      boardGeo.h - 12,
      6,
    );
    ctx.fill();
    if (sim && sim.hand) {
      const hand = sim.hand;
      let cat = "chunks",
        prog = 0;
      if (hand.kind === KIND_COOKED) {
        cat = COOK[hand.product].cat;
        prog = 1;
      } else if (hand.kind === KIND_BREADED) cat = COOK[BREAD_MAP[hand.id]].cat;
      else if (hand.kind === KIND_ING) {
        const direct = PROTEINS.find((p) => p.id === hand.id).direct;
        const cookKey =
          direct.fryer ||
          direct.grill ||
          (direct.bread ? BREAD_MAP[direct.bread] : null);
        cat = cookKey ? COOK[cookKey].cat : "chunks";
      }
      if (hand.kind === KIND_SIDE || hand.kind === KIND_COLD) {
        ctx.fillStyle = hand.kind === KIND_SIDE ? "#c9a86a" : "#b9c4cc";
        ctx.beginPath();
        ctx.ellipse(
          boardGeo.x + boardGeo.w / 2,
          boardGeo.y + boardGeo.h / 2,
          26,
          15,
          0,
          0,
          7,
        );
        ctx.fill();
      } else {
        drawFood(
          cat,
          boardGeo.x + boardGeo.w / 2,
          boardGeo.y + boardGeo.h / 2,
          prog,
          false,
          false,
          1,
        );
        if (hand.kind === KIND_BREADED) {
          ctx.fillStyle = "rgba(240,236,220,.5)";
          ctx.beginPath();
          ctx.ellipse(
            boardGeo.x + boardGeo.w / 2,
            boardGeo.y + boardGeo.h / 2,
            30,
            17,
            0,
            0,
            7,
          );
          ctx.fill();
        }
      }
    } else {
      ctx.font = "700 12px 'Archivo Narrow','Arial Narrow',sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillText(
        "BOARD",
        boardGeo.x + boardGeo.w / 2,
        boardGeo.y + boardGeo.h / 2 + 4,
      );
    }
    /* trash */
    const trashGeo = SCENE_GEOMETRY.trash;
    ctx.fillStyle = "#1a1e22";
    roundedRect(trashGeo.x + 18, trashGeo.y + 20, 74, 58, 7);
    ctx.fill();
    ctx.fillStyle = "#22272c";
    roundedRect(trashGeo.x + 12, trashGeo.y + 10, 86, 14, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.07)";
    ctx.lineWidth = 1.5;
    for (let n = 0; n < 3; n++) {
      ctx.beginPath();
      ctx.moveTo(trashGeo.x + 36 + n * 19, trashGeo.y + 30);
      ctx.lineTo(trashGeo.x + 36 + n * 19, trashGeo.y + 70);
      ctx.stroke();
    }
    ctx.font = "700 11px 'Archivo Narrow','Arial Narrow',sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(141,149,156,.55)";
    ctx.fillText("WASTE", trashGeo.x + 55, trashGeo.y + 90);
    if (sim && sim.hand)
      targetGlow(trashGeo.x + 55, trashGeo.y + 48, 96, 86, t, false);

    drawParts(fdt);
    ctx.restore();
    ctx.restore();
  }

  /* pointer → world hit test */
  function pointerDown(e) {
    const sim = game.state;
    buildHits();
    if (!sim || !sim.running || sim.paused) return;
    const bounds = canvas.getBoundingClientRect();
    const wx = (e.clientX - bounds.left - view.ox) / view.s,
      wy = (e.clientY - bounds.top - view.oy) / view.s;
    for (const hit of hits) {
      if (
        wx >= hit.x &&
        wx <= hit.x + hit.w &&
        wy >= hit.y &&
        wy <= hit.y + hit.h
      ) {
        if (hit.kind === HIT_SLOT) game.tapSlot(hit.station, hit.idx);
        else if (hit.kind === HIT_WINDOW) game.tapWindow(hit.idx);
        else if (hit.kind === HIT_TRASH) game.tapTrash();
        else if (hit.kind === HIT_LOWBOY && !sim.hand) game.openDrawer();
        return;
      }
    }
  }

  canvas.addEventListener("pointerdown", pointerDown);
  return {
    resize,
    drawScene,
    destroy() {
      canvas.removeEventListener("pointerdown", pointerDown);
    },
  };
}
