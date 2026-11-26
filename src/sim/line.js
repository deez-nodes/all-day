import {
  ST_BREAD,
  ST_FRYER,
  ST_GRILL,
  ST_SAUTE,
  KIND_BREADING,
  KIND_BREADED,
  KIND_ING,
  KIND_COOK,
  KIND_COOKED,
  KIND_COOK_CHOICE,
  KIND_COLD,
  KIND_SIDE,
  STATE_BURNT,
  STATE_COOKING,
  STATE_UP,
  FLIP_GRACE,
  HOLD_DEAD,
  WALK_AFTER,
  EV_BREADING_DONE,
  EV_COOK_READY,
  EV_COOK_BURNT,
  EV_WINDOW_DIED,
  EV_ORDER_WALKED,
} from "../constants.js";
import {
  COOK,
  BREAD_MAP,
  PROTEINS,
  DIFF,
  SIDE_IDS,
  COMBO_POOL,
  COLD_DRINKS,
  COLD_DES,
  COMBO_LABEL,
  COMBO_TARGET_SEC,
  NAMES,
  TYPES,
  MENU,
  SIMPLE_IDS,
} from "./menu.js";

const pick = (a) => a[Math.floor(Math.random() * a.length)];
export function freshState(diff, speed, gear) {
  return {
    running: false,
    paused: false,
    diff,
    speed,
    shiftSec: 0,
    hand: null,
    fryer: Array(gear.fryer).fill(null),
    grill: Array(gear.grill).fill(null),
    bread: Array(gear.bread).fill(null),
    saute: Array(gear.saute).fill(null),
    window: Array(gear.window).fill(null),
    orders: [],
    nextNum: 101,
    nextOrderIn: 5,
    score: 0,
    sent: 0,
    walked: 0,
    burned: 0,
    late: 0,
    streak: 0,
    bestStreak: 0,
    sumTicketTime: 0,
    shiftLen: DIFF[diff].shiftMin * 60,
    lastCall: false,
    earned: 0,
  };
}

/* ══════════ ORDERS ══════════ */
export function makeItem(kind, product, products) {
  return {
    kind,
    product: product || null,
    products: products || null,
    done: false,
    uid: Math.random().toString(36).slice(2, 8),
  };
}
function addSidesTo(items, count) {
  const chosen = [];
  while (chosen.length < count) {
    const sideId = pick(SIDE_IDS);
    if (!chosen.includes(sideId)) chosen.push(sideId);
  }
  chosen.forEach((sideId) => items.push(makeItem(KIND_SIDE, sideId)));
}
export function rollOrder(diffConfig, rng) {
  if (!diffConfig.simple && rng() < diffConfig.combo) {
    const pickA = pick(COMBO_POOL),
      pickB = pick(COMBO_POOL.filter((x) => x !== pickA));
    const items = [makeItem(KIND_COOK, pickA), makeItem(KIND_COOK, pickB)];
    addSidesTo(items, 2);
    addSidesTo(items, 2);
    items.push(makeItem(KIND_COLD, pick(COLD_DRINKS)));
    return {
      label: COMBO_LABEL,
      who: pick(NAMES),
      type: pick(TYPES),
      target: COMBO_TARGET_SEC,
      items,
    };
  }
  const pool = diffConfig.simple
    ? MENU.filter((m) => SIMPLE_IDS.includes(m.id))
    : MENU;
  const menuItem = pick(pool);
  const items = [];
  menuItem.cook.forEach((choice) =>
    items.push(
      choice.length > 1
        ? makeItem(KIND_COOK_CHOICE, null, choice)
        : makeItem(KIND_COOK, choice[0]),
    ),
  );
  if (menuItem.sides) addSidesTo(items, menuItem.sides);
  if (menuItem.drink && (menuItem.drink === 1 || rng() < menuItem.drink))
    items.push(makeItem(KIND_COLD, pick(COLD_DRINKS)));
  if (menuItem.dessert && rng() < menuItem.dessert)
    items.push(makeItem(KIND_COLD, pick(COLD_DES)));
  return {
    label: menuItem.name,
    who: pick(NAMES),
    type: pick(TYPES),
    target: menuItem.target,
    items,
  };
}
const matches = (item, key) =>
  item.kind === KIND_COOK_CHOICE
    ? item.products.includes(key)
    : item.product === key;
export const ticketNeeds = (ord, key) =>
  ord.items.find((it) => !it.done && matches(it, key));

function sauteKeyFor(product) {
  const entry = Object.entries(COOK).find(
    ([, cook]) =>
      cook.station === ST_SAUTE && cook.needs && cook.needs.includes(product),
  );
  return entry ? entry[0] : null;
}
export function canDropOn(hand, slotItem, station) {
  if (!hand || slotItem) return false;
  if (hand.kind === KIND_ING)
    return !!PROTEINS.find((p) => p.id === hand.id).direct[station];
  if (hand.kind === KIND_BREADED) return station === ST_FRYER;
  if (hand.kind === KIND_COOKED && station === ST_SAUTE)
    return !!sauteKeyFor(hand.product);
  return false;
}
export function startCooking(hand, station) {
  if (hand.kind === KIND_ING) {
    const key = PROTEINS.find((p) => p.id === hand.id).direct[station];
    if (station === ST_BREAD)
      return {
        kind: KIND_BREADING,
        id: hand.id,
        breadKey: key,
        elapsed: 0,
        done: false,
      };
    return {
      kind: KIND_COOK,
      cookKey: key,
      elapsed: 0,
      flipped: false,
      state: STATE_COOKING,
    };
  }
  if (hand.kind === KIND_BREADED)
    return {
      kind: KIND_COOK,
      cookKey: BREAD_MAP[hand.id],
      elapsed: 0,
      flipped: false,
      state: STATE_COOKING,
    };
  return {
    kind: KIND_COOK,
    cookKey: sauteKeyFor(hand.product),
    elapsed: 0,
    flipped: false,
    state: STATE_COOKING,
  };
}
export function canPlateToWindow(hand, windowItem) {
  return !!hand && hand.kind === KIND_COOKED && !windowItem;
}

export function stepBreading(state, dt, doneSec) {
  const events = [];
  state.bread.forEach((breadItem) => {
    if (!breadItem || breadItem.kind !== KIND_BREADING || breadItem.done)
      return;
    breadItem.elapsed += dt;
    if (breadItem.elapsed >= doneSec) {
      breadItem.done = true;
      events.push({ kind: EV_BREADING_DONE });
    }
  });
  return events;
}
export function stepCooking(state, dt, holdGraceSec) {
  const events = [];
  [ST_FRYER, ST_GRILL, ST_SAUTE].forEach((station) => {
    state[station].forEach((item) => {
      if (!item || item.kind !== KIND_COOK || item.state === STATE_BURNT)
        return;
      const cook = COOK[item.cookKey];
      item.elapsed += dt;
      if (item.state === STATE_COOKING) {
        if (
          cook.flip &&
          !item.flipped &&
          item.elapsed > cook.flip + FLIP_GRACE
        ) {
          item.state = STATE_BURNT;
          events.push({
            kind: EV_COOK_BURNT,
            msg: cook.label + " burned — missed the flip",
          });
        } else if ((!cook.flip || item.flipped) && item.elapsed >= cook.sec) {
          item.state = STATE_UP;
          events.push({ kind: EV_COOK_READY });
        }
      } else if (
        item.state === STATE_UP &&
        item.elapsed > cook.sec + holdGraceSec
      ) {
        item.state = STATE_BURNT;
        events.push({
          kind: EV_COOK_BURNT,
          msg:
            cook.label +
            " died in the " +
            (station === ST_FRYER ? "basket" : station),
        });
      }
    });
  });
  return events;
}
export function stepHolding(state) {
  const events = [];
  state.window.forEach((windowItem, i) => {
    if (!windowItem) return;
    if (state.shiftSec - windowItem.since > HOLD_DEAD) {
      state.window[i] = null;
      state.score = Math.max(0, state.score - 15);
      events.push({
        kind: EV_WINDOW_DIED,
        msg: COOK[windowItem.product].label + " died in the window  −15",
      });
    }
  });
  return events;
}
export function stepPatience(state) {
  const events = [];
  for (let i = state.orders.length - 1; i >= 0; i--) {
    const order = state.orders[i];
    if (state.shiftSec - order.born > order.target + WALK_AFTER) {
      state.orders.splice(i, 1);
      state.walked++;
      state.streak = 0;
      state.score = Math.max(0, state.score - 75);
      events.push({
        kind: EV_ORDER_WALKED,
        msg: "#" + order.num + " walked  −75",
      });
    }
  }
  return events;
}
