import {
  AGE_OK,
  AGE_WARN,
  AGE_LATE,
  DATASET_ORDER_ID,
  orderCardSelector,
  DIFF_EASY,
  DOM,
  TONE_GOOD,
  TONE_WARN,
  TONE_BAD,
  EV_BREADING_DONE,
  EV_COOK_READY,
  EV_COOK_BURNT,
  EV_WINDOW_DIED,
  EV_ORDER_WALKED,
  KIND_BREADED,
  KIND_BREADING,
  KIND_COLD,
  KIND_COOK,
  KIND_COOK_CHOICE,
  KIND_COOKED,
  KIND_ING,
  KIND_SIDE,
  STATE_BURNT,
  STATE_UP,
  ST_BREAD,
  ST_FRYER,
  ST_GRILL,
  ST_SAUTE,
  ST_WINDOW,
  KEY_BEST,
  KEY_SOUND,
  KEY_DIFF,
  KEY_SPEED,
  KEY_TIPS,
  KEY_XP,
  KEY_DAY,
  KEY_GEAR,
  KEY_PERKS,
  KEY_HIST,
} from "./constants.js";
import {
  BREAD_MAP,
  COLD,
  COOK,
  DIFF,
  PROTEINS,
  SIDES,
} from "./sim/menu.js";
import {
  canDropOn,
  canPlateToWindow,
  freshState,
  rollOrder,
  startCooking,
  stepBreading,
  stepCooking,
  stepHolding,
  stepPatience,
  ticketNeeds,
} from "./sim/line.js";
import { el, fmt, routeLabels } from "./line-format.js";

export function createLineGame() {
  /* ══════════ META (persisted career/economy) ══════════ */
  function loadJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (err) {
      return fallback;
    }
  }
  let best = loadJSON(KEY_BEST, 0);
  let soundOn = localStorage.getItem(KEY_SOUND) !== "0";
  let chosenDiff = localStorage.getItem(KEY_DIFF) || DIFF_EASY;
  let chosenSpeed = loadJSON(KEY_SPEED, 3);
  let tips = loadJSON(KEY_TIPS, 0);
  let xp = loadJSON(KEY_XP, 0);
  let day = loadJSON(KEY_DAY, 1);
  let gear = Object.assign(
    { fryer: 2, grill: 2, bread: 1, saute: 1, window: 2 },
    loadJSON(KEY_GEAR, {}),
  );
  let perks = Object.assign(
    { tongs: false, prep: false },
    loadJSON(KEY_PERKS, {}),
  );
  function saveMeta() {
    localStorage.setItem(KEY_TIPS, JSON.stringify(tips));
    localStorage.setItem(KEY_XP, JSON.stringify(xp));
    localStorage.setItem(KEY_DAY, JSON.stringify(day));
    localStorage.setItem(KEY_GEAR, JSON.stringify(gear));
    localStorage.setItem(KEY_PERKS, JSON.stringify(perks));
  }
  const LEVELS = [
    [0, "DISH PIT"],
    [300, "PREP"],
    [800, "FRY COOK"],
    [1600, "GRILL COOK"],
    [2800, "LINE COOK"],
    [4500, "SOUS CHEF"],
    [7000, "CHEF DE CUISINE"],
  ];
  function careerAt(xpTotal) {
    let level = 0;
    for (let j = 0; j < LEVELS.length; j++)
      if (xpTotal >= LEVELS[j][0]) level = j;
    return level;
  }
  const graceSec = () => 60 + (perks.tongs ? 30 : 0);
  const breadSec = () => (perks.prep ? 15 : 30);

  const SHOP = [
    {
      id: "fryer3",
      name: "Third fryer basket",
      desc: "One more drop going at once.",
      cost: 120,
      kind: "gear",
      key: ST_FRYER,
      to: 3,
    },
    {
      id: "fryer4",
      name: "Fourth fryer basket",
      desc: "Full fry bank.",
      cost: 260,
      kind: "gear",
      key: ST_FRYER,
      to: 4,
    },
    {
      id: "grill3",
      name: "Third grill zone",
      desc: "More grate to work with.",
      cost: 120,
      kind: "gear",
      key: ST_GRILL,
      to: 3,
    },
    {
      id: "grill4",
      name: "Fourth grill zone",
      desc: "The whole grill is yours.",
      cost: 260,
      kind: "gear",
      key: ST_GRILL,
      to: 4,
    },
    {
      id: "bread2",
      name: "Second breading tray",
      desc: "Bread two items at once.",
      cost: 150,
      kind: "gear",
      key: ST_BREAD,
      to: 2,
    },
    {
      id: "saute2",
      name: "Second sauté burner",
      desc: "Two pastas going at once.",
      cost: 180,
      kind: "gear",
      key: ST_SAUTE,
      to: 2,
    },
    {
      id: "window3",
      name: "Third window slot",
      desc: "More room under the lamps.",
      cost: 100,
      kind: "gear",
      key: ST_WINDOW,
      to: 3,
    },
    {
      id: "window4",
      name: "Fourth window slot",
      desc: "A deep hot hold.",
      cost: 200,
      kind: "gear",
      key: ST_WINDOW,
      to: 4,
    },
    {
      id: "tongs",
      name: "Sharper instincts",
      desc: "Food survives 30s longer before it dies.",
      cost: 220,
      kind: "perk",
      key: "tongs",
    },
    {
      id: "prep",
      name: "Prep cook",
      desc: "Breading takes 15s instead of 30s.",
      cost: 300,
      kind: "perk",
      key: "prep",
    },
  ];

  /* ══════════ AUDIO + HAPTICS + TOASTS ══════════ */
  let audioContext = null;
  function tone(freq, dur, type, vol, when) {
    if (!soundOn) return;
    try {
      audioContext =
        audioContext ||
        new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const startAt = audioContext.currentTime + (when || 0);
      const osc = audioContext.createOscillator(),
        gainNode = audioContext.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      gainNode.gain.setValueAtTime(0, startAt);
      gainNode.gain.linearRampToValueAtTime(vol || 0.08, startAt + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
      osc.connect(gainNode).connect(audioContext.destination);
      osc.start(startAt);
      osc.stop(startAt + dur + 0.05);
    } catch (e) {}
  }
  const sfx = {
    pick: () => tone(340, 0.06, "triangle", 0.06),
    place: () => {
      tone(220, 0.08, "square", 0.05);
      tone(440, 0.05, "triangle", 0.04, 0.02);
    },
    up: () => {
      tone(880, 0.12, "sine", 0.09);
      tone(1174, 0.14, "sine", 0.07, 0.09);
    },
    flip: () => tone(520, 0.07, "triangle", 0.07),
    plate: () => tone(660, 0.08, "sine", 0.07),
    send: () => {
      tone(587, 0.1, "sine", 0.09);
      tone(784, 0.12, "sine", 0.09, 0.08);
      tone(1046, 0.16, "sine", 0.08, 0.16);
    },
    burn: () => {
      tone(120, 0.25, "sawtooth", 0.07);
      tone(90, 0.3, "sawtooth", 0.05, 0.08);
    },
    walk: () => {
      tone(330, 0.14, "sine", 0.08);
      tone(220, 0.2, "sine", 0.08, 0.12);
    },
    deny: () => tone(180, 0.09, "square", 0.05),
    coin: () => {
      tone(1318, 0.07, "triangle", 0.06);
      tone(1760, 0.1, "triangle", 0.05, 0.06);
    },
    newTicket: () => {
      tone(988, 0.06, "sine", 0.05);
      tone(988, 0.06, "sine", 0.05, 0.11);
    },
  };
  const buzz = (ms) => {
    try {
      navigator.vibrate && navigator.vibrate(ms);
    } catch (e) {}
  };
  function toast(msg, kind) {
    const box = el(DOM.toasts);
    while (box.children.length >= 3) box.removeChild(box.firstChild);
    const node = document.createElement("div");
    node.className = "toast " + (kind || "");
    node.textContent = msg;
    box.appendChild(node);
    setTimeout(() => {
      node.classList.add("out");
      setTimeout(() => node.remove(), 320);
    }, 2100);
  }

  /* ══════════ SIM STATE ══════════ */
  let sim = null;
  function spawnOrder() {
    const diff = DIFF[sim.diff];
    if (sim.orders.length >= diff.max) return;
    const ord = rollOrder(diff, Math.random);
    ord.id = "o" + sim.nextNum;
    ord.num = sim.nextNum;
    ord.born = sim.shiftSec;
    sim.nextNum++;
    sim.orders.push(ord);
    ordersDirty = true;
    sfx.newTicket();
  }
  /* ══════════ HAND ══════════ */
  function handKey() {
    if (!sim.hand) return null;
    if (sim.hand.kind === KIND_COOKED) return sim.hand.product;
    if (sim.hand.kind === KIND_SIDE || sim.hand.kind === KIND_COLD)
      return sim.hand.id;
    return null;
  }
  function handLabel() {
    const hand = sim.hand;
    if (!hand) return "";
    if (hand.kind === KIND_ING)
      return PROTEINS.find((p) => p.id === hand.id).name;
    if (hand.kind === KIND_BREADED)
      return COOK[BREAD_MAP[hand.id]].label + " · breaded";
    if (hand.kind === KIND_COOKED) return COOK[hand.product].label;
    if (hand.kind === KIND_SIDE)
      return SIDES.find((s) => s.id === hand.id).name;
    return COLD.find((c) => c.id === hand.id).name;
  }
  function handHint() {
    const hand = sim.hand;
    if (!hand) return "Open the LOWBOY to grab food.";
    if (hand.kind === KIND_ING) {
      const ing = PROTEINS.find((p) => p.id === hand.id);
      return "Drop on " + routeLabels(ing.direct, " or ") + " — it's glowing.";
    }
    if (hand.kind === KIND_BREADED) return "Into the fryer.";
    if (hand.kind === KIND_COOKED) {
      const alf = Object.values(COOK).some(
        (c) => c.needs && c.needs.includes(hand.product),
      );
      return (
        "Tap its ticket" +
        (alf ? ", a sauté pan," : "") +
        " or hold it under the lamps."
      );
    }
    return "Tap the ticket it belongs to.";
  }
  function setHand(hand) {
    sim.hand = hand;
    renderHand();
    if (hand) sfx.pick();
  }

  /* ══════════ ACTIONS ══════════ */
  function dropDenial(hand, station) {
    if (hand.kind === KIND_ING) {
      const ing = PROTEINS.find((p) => p.id === hand.id);
      return ing.name + " goes on " + routeLabels(ing.direct, " / ");
    }
    if (hand.kind === KIND_BREADED) return "Breaded items go in the fryer";
    if (hand.kind === KIND_COOKED)
      return station === ST_SAUTE
        ? "No pasta calls for " + COOK[hand.product].label
        : "Cooked food goes to a ticket, the window, or sauté";
    return "That doesn't go there";
  }
  function tapBank(kind, id) {
    if (!sim.running || sim.paused) return;
    if (
      sim.hand &&
      (sim.hand.kind === KIND_ING ||
        sim.hand.kind === KIND_SIDE ||
        sim.hand.kind === KIND_COLD) &&
      sim.hand.id === id
    ) {
      setHand(null);
      return;
    }
    if (sim.hand && sim.hand.kind === KIND_COOKED) {
      toast("Hands full — plate or stash it first", TONE_WARN);
      sfx.deny();
      return;
    }
    if (sim.hand && sim.hand.kind === KIND_BREADED) {
      toast("Hands full — drop it in the fryer", TONE_WARN);
      sfx.deny();
      return;
    }
    setHand(kind === KIND_ING ? { kind: KIND_ING, id } : { kind, id });
    closeDrawer();
  }
  function tapSlot(station, idx) {
    if (!sim.running || sim.paused) return;
    const slots = sim[station],
      item = slots[idx];
    if (!item) {
      const hand = sim.hand;
      if (!hand) return;
      if (!canDropOn(hand, item, station)) {
        toast(dropDenial(hand, station), TONE_WARN);
        sfx.deny();
        if (hand.kind === KIND_ING) buzz(30);
        return;
      }
      slots[idx] = startCooking(hand, station);
      setHand(null);
      sfx.place();
      buzz(15);
      return;
    }
    if (item.kind === KIND_BREADING) {
      if (!item.done) {
        toast("Still breading…", TONE_WARN);
        return;
      }
      if (sim.hand) {
        toast("Hands full", TONE_WARN);
        sfx.deny();
        return;
      }
      slots[idx] = null;
      setHand({ kind: KIND_BREADED, id: item.breadKey });
      return;
    }
    const cook = COOK[item.cookKey];
    if (item.state === STATE_BURNT) {
      slots[idx] = null;
      sim.score = Math.max(0, sim.score - 25);
      sim.streak = 0;
      sim.burned++;
      toast("Trashed " + cook.label + "  −25", TONE_BAD);
      sfx.burn();
      buzz([40, 40, 40]);
      renderHUD();
      return;
    }
    if (item.state === STATE_UP) {
      if (sim.hand) {
        toast("Hands full", TONE_WARN);
        sfx.deny();
        return;
      }
      slots[idx] = null;
      setHand({ kind: KIND_COOKED, product: item.cookKey });
      return;
    }
    if (cook.flip && !item.flipped) {
      if (item.elapsed >= cook.flip) {
        item.flipped = true;
        toast("Flipped " + cook.label, TONE_GOOD);
        sfx.flip();
        buzz(15);
      } else
        toast("Early — flip in " + fmt(cook.flip - item.elapsed), TONE_WARN);
      return;
    }
    toast(fmt(cook.sec - item.elapsed) + " left on " + cook.label, TONE_WARN);
  }
  function tapWindow(idx) {
    if (!sim.running || sim.paused) return;
    const windowItem = sim.window[idx];
    if (canPlateToWindow(sim.hand, windowItem)) {
      sim.window[idx] = { product: sim.hand.product, since: sim.shiftSec };
      setHand(null);
      sfx.place();
      return;
    }
    if (!sim.hand && windowItem) {
      sim.window[idx] = null;
      setHand({ kind: KIND_COOKED, product: windowItem.product });
      return;
    }
    if (sim.hand && windowItem) {
      toast("Slot's taken", TONE_WARN);
      sfx.deny();
    }
  }
  function tapTrash() {
    if (!sim.running || sim.paused || !sim.hand) return;
    const hand = sim.hand;
    if (hand.kind === KIND_COOKED) {
      sim.score = Math.max(0, sim.score - 10);
      toast("Wasted " + handLabel() + "  −10", TONE_BAD);
      renderHUD();
    } else toast("Put back " + handLabel());
    setHand(null);
  }
  function tapTicket(ordId) {
    if (!sim.running || sim.paused) return;
    const ord = sim.orders.find((o) => o.id === ordId);
    if (!ord) return;
    const key = handKey();
    if (!key) {
      if (sim.hand) {
        toast("That's raw — cook it first", TONE_WARN);
        sfx.deny();
      }
      return;
    }
    const need = ticketNeeds(ord, key);
    if (!need) {
      toast("#" + ord.num + " doesn't call for " + handLabel(), TONE_WARN);
      sfx.deny();
      buzz(30);
      flashTicketReject(ordId);
      return;
    }
    need.done = true;
    setHand(null);
    sfx.plate();
    buzz(12);
    ordersDirty = true;
    renderTickets();
  }
  function sendOrder(ordId) {
    const i = sim.orders.findIndex((o) => o.id === ordId);
    if (i < 0) return;
    const ord = sim.orders[i];
    if (!ord.items.every((it) => it.done)) return;
    const elapsed = sim.shiftSec - ord.born,
      remain = ord.target - elapsed;
    let pts = 100,
      kind = TONE_GOOD,
      msg = "ORDER UP  +100";
    sim.streak++;
    if (remain < 0) {
      pts = Math.max(20, 60 + Math.floor(remain / 30) * 10);
      msg = "Sent late  +" + pts;
      kind = TONE_WARN;
      sim.streak = 0;
      sim.late++;
    } else if (remain < 30) {
      pts = 130;
      msg = "TIGHT!  +130";
    } else if (sim.streak >= 3) {
      pts += 25;
      msg = "STREAK ×" + sim.streak + "  +" + pts;
    }
    sim.bestStreak = Math.max(sim.bestStreak, sim.streak);
    sim.score += pts;
    sim.sent++;
    sim.sumTicketTime += elapsed;
    const coins = Math.max(1, Math.round(pts / 5));
    sim.earned += coins;
    tips += coins;
    xp += pts;
    saveMeta();
    if (sim.score > best) {
      best = sim.score;
      localStorage.setItem(KEY_BEST, JSON.stringify(best));
    }
    toast(msg, kind);
    sfx.send();
    sfx.coin();
    buzz([20, 30, 20]);
    bumpTicketThen(ordId, () => {
      const j = sim.orders.findIndex((o) => o.id === ordId);
      if (j >= 0) {
        sim.orders.splice(j, 1);
        ordersDirty = true;
        renderTickets();
      }
    });
    renderHUD();
  }

  /* ══════════ TICK ══════════ */
  let lastT = performance.now();
  let ordersDirty = false;
  const EVENT_EFFECTS = {
    [EV_BREADING_DONE]: () => {
      sfx.up();
      buzz(20);
    },
    [EV_COOK_READY]: () => {
      sfx.up();
      buzz(25);
    },
    [EV_COOK_BURNT]: (ev) => {
      toast(ev.msg, TONE_BAD);
      sfx.burn();
      buzz([50, 50, 50]);
    },
    [EV_WINDOW_DIED]: (ev) => {
      toast(ev.msg, TONE_BAD);
      sfx.burn();
    },
    [EV_ORDER_WALKED]: (ev) => {
      toast(ev.msg, TONE_BAD);
      sfx.walk();
      buzz([60, 40, 60]);
      ordersDirty = true;
    },
  };
  function tick() {
    const now = performance.now();
    const real = (now - lastT) / 1000;
    lastT = now;
    advance(real);
  }
  function advance(real) {
    if (!sim || !sim.running || sim.paused) return;
    const dt = Math.min(real, 0.5) * sim.speed;
    sim.shiftSec += dt;

    const events = [
      ...stepBreading(sim, dt, breadSec()),
      ...stepCooking(sim, dt, graceSec()),
      ...stepHolding(sim),
      ...stepPatience(sim),
    ];
    events.forEach((ev) => EVENT_EFFECTS[ev.kind](ev));
    if (!sim.lastCall && sim.shiftSec >= sim.shiftLen - 120) {
      sim.lastCall = true;
      toast("LAST CALL — clear the rail", TONE_WARN);
      sfx.walk();
    }
    if (sim.shiftSec >= sim.shiftLen && sim.orders.length === 0) {
      endShift();
      return;
    }
    if (sim.shiftSec >= sim.shiftLen + 300) {
      endShift();
      return;
    }
    sim.nextOrderIn -= dt;
    if (sim.nextOrderIn <= 0) {
      const diff = DIFF[sim.diff];
      if (!sim.lastCall && sim.orders.length < diff.max) spawnOrder();
      sim.nextOrderIn =
        diff.gapMin + Math.random() * (diff.gapMax - diff.gapMin);
    }
    renderHUD();
    if (ordersDirty) renderTickets();
    else updateTicketAges();
    badgeTimer -= 1;
    if (badgeTimer <= 0) {
      badgeTimer = 5;
      updateBadges();
    }
  }
  /* ══════════ DOM UI ══════════ */
  function ticketLineHTML(item) {
    let txt,
      cls = "t-line";
    if (item.kind === KIND_COOK) txt = "1 " + COOK[item.product].ticket;
    else if (item.kind === KIND_COOK_CHOICE)
      txt = "1 " + COOK[item.products[0]].ticket.split(" ")[0] + " F/G";
    else if (item.kind === KIND_SIDE) {
      cls += " side";
      txt = "+ " + SIDES.find((s) => s.id === item.product).short;
    } else {
      cls += " side";
      txt = "+ " + COLD.find((c) => c.id === item.product).short;
    }
    if (item.done) cls += " done";
    return '<div class="' + cls + '">' + txt + "</div>";
  }
  function renderTickets() {
    const rail = el(DOM.rail);
    const savedScroll = rail.scrollLeft;
    rail.innerHTML = "";
    sim.orders.forEach((order, i) => {
      const card = document.createElement("div");
      card.className =
        "ticket" + (sim.shiftSec - order.born < 1.2 ? " fresh" : "");
      card.dataset[DATASET_ORDER_ID] = order.id;
      card.style.setProperty("--tilt", (((i * 47) % 5) - 2) * 0.6 + "deg");
      const complete = order.items.every((it) => it.done);
      card.innerHTML =
        '<div class="t-head"><span>#' +
        order.num +
        '</span><span class="t-type">' +
        order.type +
        '</span><span class="t-age"></span></div>' +
        '<div class="t-meal">' +
        order.label +
        " · " +
        order.who +
        "</div>" +
        '<div class="t-items">' +
        order.items.map(ticketLineHTML).join("") +
        "</div>" +
        (complete ? '<button class="t-send">SEND</button>' : "");
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("t-send")) sendOrder(order.id);
        else tapTicket(order.id);
      });
      rail.appendChild(card);
    });
    if (sim.running) {
      const ghost = document.createElement("div");
      ghost.className = "ghost-ticket";
      ghost.id = DOM.ghostTicket;
      rail.appendChild(ghost);
    }
    rail.scrollLeft = savedScroll;
    ordersDirty = false;
    markTicketTargets();
    updateTicketAges();
  }
  function updateTicketAges() {
    const rail = el(DOM.rail);
    sim.orders.forEach((order) => {
      const card = rail.querySelector(orderCardSelector(order.id));
      if (!card) return;
      const age = sim.shiftSec - order.born,
        ageFrac = age / order.target;
      card.dataset.age =
        ageFrac >= 1 ? AGE_LATE : ageFrac >= 0.6 ? AGE_WARN : AGE_OK;
      const ageEl = card.querySelector(".t-age");
      if (ageEl) ageEl.textContent = fmt(age);
    });
    const ghost = el(DOM.ghostTicket);
    if (ghost) {
      const diff = DIFF[sim.diff];
      ghost.innerHTML = sim.lastCall
        ? "kitchen<br>closed"
        : sim.orders.length >= diff.max
          ? "line<br>full"
          : sim.nextOrderIn > 90
            ? "next<br>later"
            : "next<br>~" + Math.max(1, Math.ceil(sim.nextOrderIn)) + "s";
    }
  }
  function markTicketTargets() {
    const key = sim ? handKey() : null;
    document.querySelectorAll(".ticket").forEach((card) => {
      const order = sim.orders.find(
        (x) => x.id === card.dataset[DATASET_ORDER_ID],
      );
      card.classList.toggle(
        "match",
        !!(key && order && ticketNeeds(order, key)),
      );
    });
  }
  function flashTicketReject(ordId) {
    const card = document.querySelector(orderCardSelector(ordId));
    if (card) {
      card.classList.remove("reject");
      void card.offsetWidth;
      card.classList.add("reject");
    }
  }
  function bumpTicketThen(ordId, onGone) {
    const card = document.querySelector(orderCardSelector(ordId));
    if (card) {
      card.classList.add("bump");
      setTimeout(onGone, 300);
    } else onGone();
  }
  function renderHand() {
    const chip = el(DOM.handChip),
      hint = el(DOM.handHint);
    if (sim && sim.hand) {
      chip.classList.add("show");
      chip.textContent = handLabel();
    } else chip.classList.remove("show");
    hint.textContent = sim ? handHint() : "";
    document.querySelectorAll(".chip").forEach((chipBtn) => {
      chipBtn.classList.toggle(
        "held",
        !!(sim && sim.hand) &&
          (sim.hand.kind === KIND_ING ||
            sim.hand.kind === KIND_SIDE ||
            sim.hand.kind === KIND_COLD) &&
          chipBtn.dataset.id === sim.hand.id,
      );
    });
    markTicketTargets();
  }
  function buildBank() {
    const proteinBox = el(DOM.bankProteins);
    proteinBox.innerHTML = "";
    PROTEINS.forEach((protein) => {
      const routes = Object.keys(protein.direct)
        .map((k) => (k === ST_BREAD ? "BRD" : k === ST_FRYER ? "FRY" : "GRL"))
        .join("·");
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.dataset.id = protein.id;
      btn.innerHTML =
        '<span class="c-name">' +
        protein.name +
        '</span><span class="c-route">' +
        routes +
        '</span><span class="badge"></span>';
      btn.addEventListener("click", () => tapBank(KIND_ING, protein.id));
      proteinBox.appendChild(btn);
    });
    const instantBox = el(DOM.bankInstant);
    instantBox.innerHTML = "";
    SIDES.forEach((side) => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.dataset.id = side.id;
      btn.innerHTML =
        '<span class="c-name">' +
        side.short +
        '</span><span class="c-route">HOT HOLD</span><span class="badge"></span>';
      btn.addEventListener("click", () => tapBank(KIND_SIDE, side.id));
      instantBox.appendChild(btn);
    });
    COLD.forEach((cold) => {
      const btn = document.createElement("button");
      btn.className = "chip cold-chip";
      btn.dataset.id = cold.id;
      btn.innerHTML =
        '<span class="c-name">' +
        cold.short +
        '</span><span class="c-route">COLD</span><span class="badge"></span>';
      btn.addEventListener("click", () => tapBank(KIND_COLD, cold.id));
      instantBox.appendChild(btn);
    });
  }
  let badgeTimer = 0;
  function updateBadges() {
    if (!sim) return;
    const demand = {};
    sim.orders.forEach((o) =>
      o.items.forEach((it) => {
        if (it.done) return;
        const keys = it.kind === KIND_COOK_CHOICE ? it.products : [it.product];
        keys.forEach(
          (k) =>
            (demand[k] =
              (demand[k] || 0) + (it.kind === KIND_COOK_CHOICE ? 0.5 : 1)),
        );
      }),
    );
    document.querySelectorAll("#bank-proteins .chip").forEach((chip) => {
      const protein = PROTEINS.find((x) => x.id === chip.dataset.id);
      let count = 0;
      Object.values(protein.direct).forEach((route) => {
        const cookKey = route.startsWith("_") ? BREAD_MAP[route] : route;
        count += demand[cookKey] || 0;
        Object.entries(COOK).forEach(([dishKey, dish]) => {
          if (dish.needs && dish.needs.includes(cookKey))
            count += demand[dishKey] || 0;
        });
      });
      const badge = chip.querySelector(".badge");
      count = Math.ceil(count);
      badge.classList.toggle("on", count > 0);
      badge.textContent = count > 9 ? "9+" : count;
    });
    document.querySelectorAll("#bank-instant .chip").forEach((chip) => {
      const count = Math.ceil(demand[chip.dataset.id] || 0);
      const badge = chip.querySelector(".badge");
      badge.classList.toggle("on", count > 0);
      badge.textContent = count > 9 ? "9+" : count;
    });
  }
  function renderHUD() {
    if (!sim) return;
    el(DOM.score).textContent = sim.score;
    el(DOM.tips).textContent = tips;
    el(DOM.streak).textContent = sim.streak >= 2 ? "◆×" + sim.streak : "";
    const clockEl = el(DOM.clock),
      left = sim.shiftLen - sim.shiftSec;
    clockEl.textContent = fmt(sim.shiftSec);
    clockEl.style.color =
      left <= 0 ? "var(--late-hi)" : sim.lastCall ? "var(--warn)" : "";
    el(DOM.dayLine).textContent =
      "DAY " + day + " · " + LEVELS[careerAt(xp)][1];
  }
  function openDrawer() {
    el(DOM.drawer).classList.add("open");
    updateBadges();
  }
  function closeDrawer() {
    el(DOM.drawer).classList.remove("open");
  }

  /* ══════════ SHIFT FLOW ══════════ */
  function startShift() {
    sim = freshState(chosenDiff, chosenSpeed, gear);
    sim.running = true;
    buildBank();
    renderHand();
    el(DOM.ovStart).classList.add("hidden");
    el(DOM.ovReport).classList.add("hidden");
    el(DOM.ovShop).classList.add("hidden");
    closeDrawer();
    const d = DIFF[sim.diff];
    for (let i = 0; i < d.init; i++) spawnOrder();
    sim.nextOrderIn = d.gapMin;
    renderTickets();
    updateBadges();
    renderHUD();
    lastT = performance.now();
    sfx.send();
  }
  function endShift() {
    sim.running = false;
    if (sim.score > best) {
      best = sim.score;
      localStorage.setItem(KEY_BEST, JSON.stringify(best));
    }
    day++;
    saveMeta();
    const avg = sim.sent ? sim.sumTicketTime / sim.sent : 0;
    const total = sim.sent + sim.walked;
    const acc = total ? sim.sent / total : 0;
    let grade = "D",
      word = "Rough shift";
    if (sim.sent >= 3 && acc >= 0.95 && sim.late === 0 && sim.burned === 0) {
      grade = "S";
      word = "Flawless service";
    } else if (sim.sent >= 2 && acc >= 0.9 && sim.burned <= 1) {
      grade = "A";
      word = "Solid line cook";
    } else if (acc >= 0.7) {
      grade = "B";
      word = "Getting there";
    } else if (sim.sent > 0) {
      grade = "C";
      word = "Keep drilling";
    }
    el(DOM.grade).textContent = grade;
    el(DOM.grade).classList.toggle("low", grade === "C" || grade === "D");
    el(DOM.gradeWord).innerHTML =
      word +
      "<small>" +
      DIFF[sim.diff].name +
      " · " +
      sim.speed +
      "× clock</small>";
    el(DOM.earnLine).textContent =
      "+" + sim.earned + " tips earned · " + tips + " total";
    const stat = (value, label, cls) =>
      '<div class="stat"><div class="v ' +
      (cls || "") +
      '">' +
      value +
      '</div><div class="k">' +
      label +
      "</div></div>";
    el(DOM.statGrid).innerHTML =
      stat(sim.score, "Score") +
      stat(sim.sent, "Tickets sent", TONE_GOOD) +
      stat(sim.walked, "Walked", sim.walked ? TONE_BAD : "") +
      stat(sim.burned, "Burned", sim.burned ? TONE_BAD : "") +
      stat(sim.late, "Sent late", sim.late ? TONE_BAD : "") +
      stat("×" + sim.bestStreak, "Best streak") +
      stat(sim.sent ? fmt(avg) : "—", "Avg ticket time") +
      stat(best, "Best score");
    let hist = loadJSON(KEY_HIST, []);
    hist.unshift({
      g: grade,
      score: sim.score,
      sent: sim.sent,
      walked: sim.walked,
      diff: sim.diff,
      speed: sim.speed,
    });
    hist = hist.slice(0, 6);
    localStorage.setItem(KEY_HIST, JSON.stringify(hist));
    el(DOM.histRows).innerHTML = hist
      .map(
        (shiftRow, i) =>
          '<div class="hist-row' +
          (i === 0 ? " now" : "") +
          '"><b>' +
          shiftRow.g +
          "</b><span>" +
          DIFF[shiftRow.diff].name +
          " · " +
          shiftRow.speed +
          "×</span>" +
          '<span class="hr-n">' +
          shiftRow.sent +
          " sent" +
          (shiftRow.walked ? " · " + shiftRow.walked + " walked" : "") +
          '</span><span class="hr-s">' +
          shiftRow.score +
          "</span></div>",
      )
      .join("");
    el(DOM.ovReport).classList.remove("hidden");
  }

  /* ══════════ START / SHOP / MENU SCREENS ══════════ */
  function buildStart() {
    const diffBox = el(DOM.diffCards);
    diffBox.innerHTML = "";
    Object.entries(DIFF).forEach(([key, diff]) => {
      const btn = document.createElement("button");
      btn.className = "diff-card" + (key === chosenDiff ? " on" : "");
      btn.innerHTML =
        '<span class="d-dot"></span><span><span class="d-name">' +
        diff.name +
        '</span><div class="d-desc">' +
        diff.desc +
        " " +
        diff.shiftMin +
        "-minute service.</div></span>";
      btn.addEventListener("click", () => {
        chosenDiff = key;
        localStorage.setItem(KEY_DIFF, key);
        buildStart();
      });
      diffBox.appendChild(btn);
    });
    const speedBox = el(DOM.speedRow);
    speedBox.innerHTML = "";
    [1, 2, 3, 4].forEach((speed) => {
      const btn = document.createElement("button");
      btn.className = "speed-pill" + (speed === chosenSpeed ? " on" : "");
      btn.textContent = speed + "×";
      btn.addEventListener("click", () => {
        chosenSpeed = speed;
        localStorage.setItem(KEY_SPEED, JSON.stringify(speed));
        buildStart();
      });
      speedBox.appendChild(btn);
    });
    el(DOM.bestLine).textContent =
      (best ? "BEST SCORE  " + best + "   ·   " : "") + "TIPS  " + tips;
    const levelIdx = careerAt(xp);
    el(DOM.careerTitle).textContent = LEVELS[levelIdx][1];
    const next = LEVELS[levelIdx + 1];
    el(DOM.careerXp).textContent = next
      ? xp + " / " + next[0] + " XP"
      : xp + " XP · MAXED";
    el(DOM.xpFill).style.width = next
      ? Math.round(
          ((xp - LEVELS[levelIdx][0]) / (next[0] - LEVELS[levelIdx][0])) * 100,
        ) + "%"
      : "100%";
  }
  function buildShop() {
    el(DOM.shopTips).textContent = "TIPS  " + tips;
    const box = el(DOM.shopCards);
    box.innerHTML = "";
    SHOP.forEach((item) => {
      const owned =
        item.kind === "gear" ? gear[item.key] >= item.to : perks[item.key];
      const blocked = item.kind === "gear" && gear[item.key] < item.to - 1;
      const card = document.createElement("div");
      card.className = "shop-card" + (owned ? " owned" : "");
      card.innerHTML =
        '<span><span class="s-name">' +
        item.name +
        '</span><div class="s-desc">' +
        item.desc +
        "</div></span>";
      const btn = document.createElement("button");
      btn.className = "buy" + (owned ? " owned-tag" : "");
      if (owned) {
        btn.textContent = "ON THE LINE";
        btn.disabled = true;
      } else {
        btn.textContent = item.cost + " TIPS";
        btn.disabled = tips < item.cost || blocked;
        if (blocked) btn.textContent = "LOCKED";
        btn.addEventListener("click", () => {
          if (tips < item.cost) return;
          tips -= item.cost;
          if (item.kind === "gear") gear[item.key] = item.to;
          else perks[item.key] = true;
          saveMeta();
          sfx.coin();
          buzz(20);
          toast(item.name + " — on the line", TONE_GOOD);
          buildShop();
          buildStart();
        });
      }
      card.appendChild(btn);
      box.appendChild(card);
    });
  }
  function buildMenuStudy() {
    const box = el(DOM.menuRows);
    const breadedKeys = new Set(Object.values(BREAD_MAP));
    const row = (name, note, time, flip) =>
      '<div class="menu-row"><span class="m-name">' +
      name +
      (note ? '<span class="m-note">' + note + "</span>" : "") +
      "</span>" +
      (flip ? '<span class="m-flip">flip ' + fmt(flip) + "</span>" : "") +
      (time != null ? '<span class="m-time">' + fmt(time) + "</span>" : "") +
      "</div>";
    let html = "";
    html += '<div class="menu-sec">FRYER · 350°</div>';
    Object.entries(COOK)
      .filter(([, cook]) => cook.station === ST_FRYER)
      .sort((a, b) => a[1].sec - b[1].sec)
      .forEach(([key, cook]) => {
        html += row(
          cook.label,
          breadedKeys.has(key) ? "bread first · " + breadSec() + "s" : null,
          cook.sec,
          null,
        );
      });
    html += '<div class="menu-sec">GRILL</div>';
    Object.entries(COOK)
      .filter(([, cook]) => cook.station === ST_GRILL)
      .sort((a, b) => a[1].sec - b[1].sec)
      .forEach(([, cook]) => {
        html += row(cook.label, null, cook.sec, cook.flip);
      });
    html += '<div class="menu-sec">SAUTÉ</div>';
    Object.entries(COOK)
      .filter(([, cook]) => cook.station === ST_SAUTE)
      .forEach(([, cook]) => {
        html += row(
          cook.label,
          "start from cooked " +
            cook.needs
              .map((needKey) => COOK[needKey].label.toLowerCase())
              .join(" or "),
          cook.sec,
          null,
        );
      });
    html += '<div class="menu-sec">HOT HOLD · COLD — INSTANT</div>';
    html +=
      '<div class="menu-row"><span class="m-name">' +
      SIDES.map((side) => side.name).join(" · ") +
      '<span class="m-note">sides — plate straight to the ticket</span></span></div>';
    html +=
      '<div class="menu-row"><span class="m-name">' +
      COLD.map((cold) => cold.name).join(" · ") +
      '<span class="m-note">drinks & desserts — plate straight to the ticket</span></span></div>';
    box.innerHTML = html;
  }

  /* ══════════ WIRING ══════════ */
  el(DOM.btnStart).addEventListener("click", startShift);
  el(DOM.btnAgain).addEventListener("click", startShift);
  el(DOM.btnMenu2).addEventListener("click", () => {
    buildStart();
    el(DOM.ovReport).classList.add("hidden");
    el(DOM.ovStart).classList.remove("hidden");
  });
  el(DOM.btnEnd).addEventListener("click", () => {
    if (sim && sim.running) endShift();
  });
  el(DOM.btnPause).addEventListener("click", () => {
    if (!sim || !sim.running) return;
    sim.paused = !sim.paused;
    el(DOM.pauseVeil).classList.toggle("show", sim.paused);
    el(DOM.btnPause).textContent = sim.paused ? "▶" : "II";
    if (!sim.paused) lastT = performance.now();
  });
  el(DOM.pauseVeil).addEventListener("click", () => {
    if (!sim) return;
    sim.paused = false;
    el(DOM.pauseVeil).classList.remove("show");
    el(DOM.btnPause).textContent = "II";
    lastT = performance.now();
  });
  el(DOM.btnSound).addEventListener("click", () => {
    soundOn = !soundOn;
    localStorage.setItem(KEY_SOUND, soundOn ? "1" : "0");
    el(DOM.btnSound).style.opacity = soundOn ? "1" : "0.4";
  });
  el(DOM.btnSound).style.opacity = soundOn ? "1" : "0.4";
  el(DOM.handChip).addEventListener("click", () => {
    if (!sim || !sim.hand) return;
    if (sim.hand.kind === KIND_COOKED) {
      toast("Don't waste it — window, ticket, or trash", TONE_WARN);
      return;
    }
    if (sim.hand.kind === KIND_BREADED) {
      toast("It's breaded — fryer only now", TONE_WARN);
      return;
    }
    setHand(null);
  });
  el(DOM.drawerTab).addEventListener("click", () => {
    if (!sim || !sim.running) return;
    el(DOM.drawer).classList.contains("open") ? closeDrawer() : openDrawer();
  });
  document.querySelector(".dr-close").addEventListener("click", closeDrawer);
  el(DOM.btnStudy).addEventListener("click", () => {
    buildMenuStudy();
    el(DOM.ovMenu).classList.remove("hidden");
  });
  el(DOM.btnStudyBack).addEventListener("click", () =>
    el(DOM.ovMenu).classList.add("hidden"),
  );
  el(DOM.btnShop).addEventListener("click", () => {
    buildShop();
    el(DOM.ovShop).classList.remove("hidden");
  });
  el(DOM.btnShop2).addEventListener("click", () => {
    buildShop();
    el(DOM.ovShop).classList.remove("hidden");
  });
  el(DOM.btnShopBack).addEventListener("click", () =>
    el(DOM.ovShop).classList.add("hidden"),
  );

  buildStart();

  return {
    get state() {
      return sim;
    },
    get gear() {
      return gear;
    },
    get breadSeconds() {
      return breadSec();
    },
    get graceSeconds() {
      return graceSec();
    },
    tick,
    advance,
    startShift,
    endShift,
    tapBank,
    tapSlot,
    tapWindow,
    tapTrash,
    tapTicket,
    sendOrder,
    setHand,
    openDrawer,
  };
}
