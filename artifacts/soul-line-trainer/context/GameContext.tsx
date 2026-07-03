import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ─── COOK DATA ───────────────────────────────────────────────────────────────

export interface CookDef {
  sec: number;
  station: "fryer" | "grill" | "saute";
  flip: number | null;
  label: string;
  ticket: string;
  requiresCooked?: string[];
}

export const COOK: Record<string, CookDef> = {
  wings_bone: { sec: 600, station: "fryer", flip: null, label: "Bone-In Wings", ticket: "Wings (Bone)" },
  turkey_wings: { sec: 720, station: "fryer", flip: null, label: "Fried Turkey Wings", ticket: "Turkey Wings" },
  fritters: { sec: 240, station: "fryer", flip: null, label: "Conch Fritters", ticket: "Conch Fritters" },
  fries: { sec: 240, station: "fryer", flip: null, label: "Fries", ticket: "Fries" },
  wings_bls: { sec: 300, station: "fryer", flip: null, label: "Boneless Wings", ticket: "Boneless Wings" },
  tenders: { sec: 300, station: "fryer", flip: null, label: "Chicken Tenders", ticket: "Chicken Tenders" },
  crispy_chx: { sec: 360, station: "fryer", flip: null, label: "Crispy Chx Breast", ticket: "Crispy Chicken" },
  fried_snapper: { sec: 360, station: "fryer", flip: null, label: "Fried Snapper", ticket: "Snapper · Fried" },
  fried_shrimp: { sec: 180, station: "fryer", flip: null, label: "Fried Shrimp", ticket: "Shrimp · Fried" },
  fried_lobster: { sec: 240, station: "fryer", flip: null, label: "Fried Lobster Bites", ticket: "Lobster Bites · Fried" },
  cracked_conch: { sec: 240, station: "fryer", flip: null, label: "Cracked Conch", ticket: "Cracked Conch" },
  gator_bites: { sec: 240, station: "fryer", flip: null, label: "Crispy Gator Bites", ticket: "Gator · Crispy" },
  fried_lamb: { sec: 300, station: "fryer", flip: null, label: "Fried Lamb Chops", ticket: "Lamb · Fried" },
  grilled_chx: { sec: 720, station: "grill", flip: 360, label: "Grilled Chx Breast", ticket: "Grilled Chicken" },
  grilled_snapper: { sec: 540, station: "grill", flip: 270, label: "Grilled Snapper", ticket: "Snapper · Grilled" },
  grilled_shrimp: { sec: 240, station: "grill", flip: 120, label: "Grilled Shrimp", ticket: "Shrimp · Grilled" },
  grilled_lobster: { sec: 300, station: "grill", flip: 150, label: "Grilled Lobster Bites", ticket: "Lobster · Grilled" },
  grilled_salmon: { sec: 480, station: "grill", flip: 240, label: "Grilled Salmon", ticket: "Salmon · Grilled" },
  steak_well: { sec: 720, station: "grill", flip: 360, label: "Strip Steak (Well)", ticket: "Strip Steak · Well" },
  lamb_well: { sec: 480, station: "grill", flip: 240, label: "Grilled Lamb (Well)", ticket: "Lamb · Grilled · Well" },
  alfredo_chx: { sec: 240, station: "saute", flip: null, label: "Chx Alfredo", ticket: "Chicken Alfredo", requiresCooked: ["grilled_chx", "crispy_chx"] },
  alfredo_shrimp: { sec: 240, station: "saute", flip: null, label: "Shrimp Alfredo", ticket: "Shrimp Alfredo", requiresCooked: ["grilled_shrimp", "fried_shrimp"] },
  alfredo_salmon: { sec: 240, station: "saute", flip: null, label: "Salmon Alfredo", ticket: "Salmon Alfredo", requiresCooked: ["grilled_salmon"] },
};

export const BREADED_TO_COOK: Record<string, string> = {
  "_bls": "wings_bls",
  "_tenders": "tenders",
  "_crispy_chx": "crispy_chx",
  "_fried_snapper": "fried_snapper",
  "_fried_shrimp": "fried_shrimp",
  "_fried_lobster": "fried_lobster",
  "_cracked_conch": "cracked_conch",
  "_gator_bites": "gator_bites",
  "_fried_lamb": "fried_lamb",
};

export const BREADING_TIME = 30;

export interface Ingredient {
  id: string;
  name: string;
  direct: Record<string, string>;
}

export const PROTEINS: Ingredient[] = [
  { id: "raw_wings_bone", name: "Wings (Bone-In)", direct: { fryer: "wings_bone" } },
  { id: "raw_wings_bls", name: "Boneless Wings", direct: { bread: "_bls" } },
  { id: "raw_tenders", name: "Chicken Tenders", direct: { bread: "_tenders" } },
  { id: "raw_chx_breast", name: "Chicken Breast", direct: { bread: "_crispy_chx", grill: "grilled_chx" } },
  { id: "raw_turkey", name: "Turkey Wings", direct: { fryer: "turkey_wings" } },
  { id: "raw_snapper", name: "Snapper", direct: { bread: "_fried_snapper", grill: "grilled_snapper" } },
  { id: "raw_shrimp", name: "Jumbo Shrimp", direct: { bread: "_fried_shrimp", grill: "grilled_shrimp" } },
  { id: "raw_lobster", name: "Lobster Bites", direct: { bread: "_fried_lobster", grill: "grilled_lobster" } },
  { id: "raw_salmon", name: "Salmon", direct: { grill: "grilled_salmon" } },
  { id: "raw_conch", name: "Cracked Conch", direct: { bread: "_cracked_conch" } },
  { id: "raw_fritter", name: "Conch Fritter Mix", direct: { fryer: "fritters" } },
  { id: "raw_gator", name: "Alligator Tail", direct: { bread: "_gator_bites" } },
  { id: "raw_steak", name: "Strip Steak", direct: { grill: "steak_well" } },
  { id: "raw_lamb", name: "Lamb Chops", direct: { bread: "_fried_lamb", grill: "lamb_well" } },
];

export const FRY_SIDES: Ingredient[] = [
  { id: "raw_fries", name: "Fries", direct: { fryer: "fries" } },
];

export interface HoldItem { id: string; name: string; ticketKey: string; }
export interface ColdItem { id: string; name: string; ticketKey: string; }

export const HOLD_ITEMS: HoldItem[] = [
  { id: "side_mac", name: "Mac n Cheese", ticketKey: "mac" },
  { id: "side_greens", name: "Southern Greens", ticketKey: "greens" },
  { id: "side_yams", name: "Yams", ticketKey: "yams" },
  { id: "side_corn", name: "Cream Corn", ticketKey: "corn" },
  { id: "side_pots", name: "Smothered Potatoes", ticketKey: "pots" },
];

export const COLD_ITEMS: ColdItem[] = [
  { id: "drink_orange", name: "Orange Drank", ticketKey: "d_orange" },
  { id: "drink_lemon", name: "Lemonade", ticketKey: "d_lemon" },
  { id: "drink_tea", name: "Sweet Tea", ticketKey: "d_tea" },
  { id: "des_pudding", name: "Banana Pudding", ticketKey: "des_pudding" },
  { id: "des_cake", name: "Creamsicle Cake", ticketKey: "des_cake" },
  { id: "des_cookies", name: "Red Velvet Cookies", ticketKey: "des_cookies" },
];

// ─── COOKING SLOT ─────────────────────────────────────────────────────────────

export interface CookSlot {
  cookKey: string;
  elapsed: number;
  done: boolean;
  overcooked: boolean;
  flipped: boolean;
}

export interface BreadSlot {
  id: string;
  elapsed: number;
  done: boolean;
}

// ─── TICKET ──────────────────────────────────────────────────────────────────

export interface TicketItem {
  kind: "cook" | "cook_choice" | "side" | "cold";
  product?: string;
  products?: string[];
  chosenProduct?: string;
  modifier?: string;
  fulfilled: boolean;
  _key?: string;
  parent?: string;
}

export interface Order {
  id: string;
  num: number;
  label: string;
  customer: string;
  type: string;
  items: TicketItem[];
  bornAt: number;
  dueAt: number;
  target: number;
}

// ─── PASS SLOT ────────────────────────────────────────────────────────────────

export interface PassItem {
  kind: "cooked" | "side" | "cold";
  id?: string;
  product?: string;
  heldSince: number;
  ticketId: string | null;
  fulfillKey: string;
}

// ─── PICKED ──────────────────────────────────────────────────────────────────

export type Picked =
  | { kind: "ingredient"; id: string }
  | { kind: "breaded"; id: string }
  | { kind: "cooked"; product: string }
  | { kind: "side"; id: string }
  | { kind: "cold"; id: string };

// ─── DIFFICULTY ──────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard";

const DIFF: Record<Difficulty, { initialOrders: number; maxOrders: number; gapMin: number; gapMax: number; simple: boolean; comboBias: number }> = {
  easy: { initialOrders: 1, maxOrders: 3, gapMin: 30, gapMax: 50, simple: true, comboBias: 0 },
  medium: { initialOrders: 2, maxOrders: 5, gapMin: 18, gapMax: 32, simple: false, comboBias: 0.15 },
  hard: { initialOrders: 3, maxOrders: 7, gapMin: 8, gapMax: 18, simple: false, comboBias: 0.35 },
};

const NAMES = ["Bella Bella","Tasha M","Marcus J","Latoya","Demetrius","Aisha K","Jerome W","Keke","Amari R","Tyrese","Janelle B","DeAndre","Imani","Reggie","Tasha B","Kenya M","Mike T","Sarah L","Brittany","Darius","Malcolm","Nia","Jamal","Ericka","Trey","Latrice"];
const ORDER_TYPES = ["Dine In","To Go","Dine In","To Go","To Go"];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ─── MENU ─────────────────────────────────────────────────────────────────────

interface MenuTemplate {
  id: string;
  name: string;
  target: number;
  items: TicketItem[] | "pick2";
  picksSides?: number;
  picksDrink?: boolean | number;
  picksDessert?: number;
  simple?: boolean;
}

const MENU: MenuTemplate[] = [
  { id: "WINGS_DIN", name: "Wings Dinner", target: 600, items: [{ kind: "cook", product: "wings_bone", modifier: "Bone-in", fulfilled: false }], picksSides: 2, picksDrink: true, picksDessert: 0.4 },
  { id: "WINGS_FRIES", name: "Wings & Fries", target: 540, items: [{ kind: "cook", product: "wings_bone", modifier: "Bone-in", fulfilled: false }, { kind: "cook", product: "fries", fulfilled: false }], picksDrink: true, picksDessert: 0.2 },
  { id: "BLS_DIN", name: "Boneless Wing Basket", target: 500, items: [{ kind: "cook", product: "wings_bls", modifier: "Boneless · Breaded", fulfilled: false }, { kind: "cook", product: "fries", fulfilled: false }], picksDrink: true, picksDessert: 0.2 },
  { id: "TENDER_DIN", name: "Chicken Tender Dinner", target: 540, items: [{ kind: "cook", product: "tenders", modifier: "4 ct · Breaded", fulfilled: false }], picksSides: 2, picksDrink: true, picksDessert: 0.3 },
  { id: "GRILL_CHX", name: "Grilled Chicken Dinner", target: 780, items: [{ kind: "cook", product: "grilled_chx", modifier: "Grilled · Well", fulfilled: false }], picksSides: 2, picksDrink: true, picksDessert: 0.3 },
  { id: "TURKEY_DIN", name: "Turkey Wings Dinner", target: 780, items: [{ kind: "cook", product: "turkey_wings", modifier: "Fried", fulfilled: false }], picksSides: 2, picksDrink: true, picksDessert: 0.3 },
  { id: "SNAPPER_DIN", name: "Snapper Fried or Grilled", target: 660, items: [{ kind: "cook_choice", products: ["fried_snapper", "grilled_snapper"], fulfilled: false }], picksSides: 2, picksDrink: true, picksDessert: 0.4 },
  { id: "SHRIMP_DIN", name: "Jumbo Shrimp Dinner", target: 480, items: [{ kind: "cook_choice", products: ["fried_shrimp", "grilled_shrimp"], fulfilled: false }], picksSides: 2, picksDrink: true, picksDessert: 0.3 },
  { id: "SALMON_DIN", name: "Salmon Grilled", target: 600, items: [{ kind: "cook", product: "grilled_salmon", modifier: "Grilled", fulfilled: false }], picksSides: 2, picksDrink: true, picksDessert: 0.3 },
  { id: "STEAK_DIN", name: "Grilled Strip Steak Dinner", target: 780, items: [{ kind: "cook", product: "steak_well", modifier: "Well", fulfilled: false }], picksSides: 2, picksDrink: true, picksDessert: 0.3 },
  { id: "LAMB_DIN", name: "Lamb Chops Dinner", target: 660, items: [{ kind: "cook_choice", products: ["fried_lamb", "lamb_well"], fulfilled: false }], picksSides: 2, picksDrink: true, picksDessert: 0.4 },
  { id: "CONCH_DIN", name: "Cracked Conch Dinner", target: 540, items: [{ kind: "cook", product: "cracked_conch", modifier: "Breaded", fulfilled: false }], picksSides: 2, picksDrink: true, picksDessert: 0.2 },
  { id: "GATOR_DIN", name: "Alligator Bites Dinner", target: 540, items: [{ kind: "cook", product: "gator_bites", modifier: "Crispy Cajun", fulfilled: false }], picksSides: 2, picksDrink: true, picksDessert: 0.3 },
  { id: "CHX_ALF", name: "Chicken Alfredo", target: 840, items: [{ kind: "cook", product: "alfredo_chx", modifier: "Grilled or Crispy", fulfilled: false }], picksDrink: true, picksDessert: 0.3 },
  { id: "SHRIMP_ALF", name: "Shrimp Alfredo", target: 720, items: [{ kind: "cook", product: "alfredo_shrimp", modifier: "Fried or Grilled", fulfilled: false }], picksDrink: true, picksDessert: 0.3 },
  { id: "SALMON_ALF", name: "Salmon Alfredo", target: 780, items: [{ kind: "cook", product: "alfredo_salmon", modifier: "Grilled", fulfilled: false }], picksDrink: true, picksDessert: 0.3 },
  { id: "WINGS_APP", name: "Wings Only", target: 540, items: [{ kind: "cook", product: "wings_bone", modifier: "Bone-in · 6 ct", fulfilled: false }], picksDrink: 0.5 },
  { id: "FRITTERS", name: "6 Conch Fritters", target: 300, items: [{ kind: "cook", product: "fritters", fulfilled: false }] },
  { id: "SHRIMP_APP", name: "6 Jumbo Shrimp", target: 300, items: [{ kind: "cook", product: "fried_shrimp", modifier: "Breaded", fulfilled: false }] },
];

const SIMPLE_IDS = ["WINGS_DIN", "WINGS_FRIES", "BLS_DIN", "TENDER_DIN", "WINGS_APP", "FRITTERS"];
const MAIN_PROTEINS = ["wings_bone","tenders","grilled_chx","crispy_chx","fried_snapper","grilled_snapper","fried_shrimp","grilled_shrimp","cracked_conch","gator_bites","fried_lobster","grilled_lobster"];

// ─── GAME STATE ────────────────────────────────────────────────────────────────

const NUM_FRYER = 4;
const NUM_GRILL = 4;
const NUM_BREAD = 3;
const NUM_SAUTE = 2;
const NUM_PASS = 6;

export interface GameState {
  started: boolean;
  paused: boolean;
  speed: number;
  difficulty: Difficulty;
  shiftSec: number;
  picked: Picked | null;
  fryer: (CookSlot | null)[];
  grill: (CookSlot | null)[];
  bread: (BreadSlot | null)[];
  saute: (CookSlot | null)[];
  pass: (PassItem | null)[];
  orders: Order[];
  selectedTicket: string | null;
  nextTicketNum: number;
  score: number;
  sent: number;
  walked: number;
  streak: number;
  nextOrderIn: number;
  toasts: Toast[];
  bestScore: number;
}

export interface Toast {
  id: string;
  msg: string;
  kind: "" | "good" | "bad" | "warn";
}

const makeInitialState = (): GameState => ({
  started: false,
  paused: false,
  speed: 3,
  difficulty: "easy",
  shiftSec: 0,
  picked: null,
  fryer: Array(NUM_FRYER).fill(null),
  grill: Array(NUM_GRILL).fill(null),
  bread: Array(NUM_BREAD).fill(null),
  saute: Array(NUM_SAUTE).fill(null),
  pass: Array(NUM_PASS).fill(null),
  orders: [],
  selectedTicket: null,
  nextTicketNum: 101,
  score: 0,
  sent: 0,
  walked: 0,
  streak: 0,
  nextOrderIn: 5,
  toasts: [],
  bestScore: 0,
});

// ─── CONTEXT ──────────────────────────────────────────────────────────────────

interface GameContextValue {
  state: GameState;
  startShift: () => void;
  endShift: () => void;
  togglePause: () => void;
  setSpeed: (s: number) => void;
  setDifficulty: (d: Difficulty) => void;
  pickIngredient: (id: string) => void;
  pickInstant: (kind: "side" | "cold", id: string) => void;
  clearPick: () => void;
  onCookSlotPress: (kind: "fryer" | "grill" | "saute", idx: number) => void;
  onBreadSlotPress: (idx: number) => void;
  placeIntoSlot: (kind: "fryer" | "grill" | "bread" | "saute", idx: number) => void;
  onPassPress: (idx: number) => void;
  selectTicket: (id: string) => void;
  sendOrder: (id: string) => void;
  dismissToast: (id: string) => void;
  fmtTime: (s: number) => string;
}

const GameContext = createContext<GameContextValue | null>(null);

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be inside GameProvider");
  return ctx;
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtTime(s: number): string {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function addSides(items: TicketItem[], parentKey: string, count: number): TicketItem[] {
  const allSides = ["side_mac","side_greens","side_yams","side_corn","side_pots"];
  const chosen: string[] = [];
  while (chosen.length < count) {
    const s = pick(allSides);
    if (!chosen.includes(s)) chosen.push(s);
  }
  return chosen.map(s => ({ kind: "side" as const, product: s, parent: parentKey, fulfilled: false }));
}

function itemMatches(ticketItem: TicketItem, fulfillKey: string): boolean {
  if (ticketItem.kind === "cook") return ticketItem.product === fulfillKey;
  if (ticketItem.kind === "cook_choice") return (ticketItem.products ?? []).includes(fulfillKey);
  if (ticketItem.kind === "side") return ticketItem.product === fulfillKey;
  if (ticketItem.kind === "cold") return ticketItem.product === fulfillKey;
  return false;
}

// ─── PROVIDER ────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(makeInitialState());
  const stateRef = useRef(state);
  const lastTickRef = useRef(Date.now());
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);
  stateRef.current = state;

  useEffect(() => {
    AsyncStorage.getItem("bestScore").then(val => {
      if (val) setState(s => ({ ...s, bestScore: parseInt(val, 10) }));
    });
  }, []);

  const addToast = useCallback((msg: string, kind: "" | "good" | "bad" | "warn" = "") => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setState(s => ({ ...s, toasts: [...s.toasts.slice(-3), { id, msg, kind }] }));
    setTimeout(() => setState(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) })), 2500);
  }, []);

  const spawnOrder = useCallback((s: GameState): GameState => {
    const d = DIFF[s.difficulty];
    if (s.orders.length >= d.maxOrders) return s;
    let pool = d.simple ? MENU.filter(m => SIMPLE_IDS.includes(m.id)) : MENU;
    let template = pick(pool);
    if (!d.simple && Math.random() < d.comboBias) {
      // pick 2 combo
      const a = pick(MAIN_PROTEINS);
      const b = pick(MAIN_PROTEINS.filter(x => x !== a));
      const ord: Order = {
        id: "o" + s.nextTicketNum,
        num: s.nextTicketNum,
        label: "Combo · Pick 2",
        customer: pick(NAMES),
        type: pick(ORDER_TYPES),
        items: [],
        bornAt: s.shiftSec,
        dueAt: s.shiftSec + 780,
        target: 780,
      };
      const it1: TicketItem = { kind: "cook", product: a, modifier: "", fulfilled: false, _key: "m0" };
      const it2: TicketItem = { kind: "cook", product: b, modifier: "", fulfilled: false, _key: "m1" };
      ord.items.push(it1, it2, ...addSides([], "m0", 2), ...addSides([], "m1", 2));
      ord.items.push({ kind: "cold", product: pick(["drink_orange","drink_lemon","drink_tea"]), fulfilled: false });
      return { ...s, orders: [...s.orders, ord], nextTicketNum: s.nextTicketNum + 1 };
    }

    const ord: Order = {
      id: "o" + s.nextTicketNum,
      num: s.nextTicketNum,
      label: template.name,
      customer: pick(NAMES),
      type: pick(ORDER_TYPES),
      items: [],
      bornAt: s.shiftSec,
      dueAt: s.shiftSec + (template.target || 600),
      target: template.target || 600,
    };

    if (template.items !== "pick2") {
      for (const tit of template.items) {
        const cloned: TicketItem = JSON.parse(JSON.stringify(tit));
        if (cloned.kind === "cook_choice") cloned.chosenProduct = pick(cloned.products!);
        cloned._key = "m" + ord.items.filter(x => x._key?.startsWith("m")).length;
        cloned.fulfilled = false;
        ord.items.push(cloned);
      }
    }

    if (template.picksSides && ord.items.length > 0) {
      const mainKey = ord.items[0]._key || "m0";
      ord.items.push(...addSides(ord.items, mainKey, template.picksSides));
    }

    if (template.picksDrink === true || (typeof template.picksDrink === "number" && Math.random() < template.picksDrink)) {
      ord.items.push({ kind: "cold", product: pick(["drink_orange","drink_lemon","drink_tea"]), fulfilled: false });
    }
    if (typeof template.picksDessert === "number" && Math.random() < template.picksDessert) {
      ord.items.push({ kind: "cold", product: pick(["des_pudding","des_cake","des_cookies"]), fulfilled: false });
    }

    return { ...s, orders: [...s.orders, ord], nextTicketNum: s.nextTicketNum + 1 };
  }, []);

  // ─── TICK ──────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const now = Date.now();
    const s = stateRef.current;
    if (!s.started || s.paused) { lastTickRef.current = now; return; }
    const realDelta = (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;
    const dt = realDelta * s.speed;

    let ns: GameState = { ...s, shiftSec: s.shiftSec + dt };

    // Breading
    ns.bread = ns.bread.map(b => {
      if (!b || b.done) return b;
      const elapsed = b.elapsed + dt;
      return { ...b, elapsed, done: elapsed >= BREADING_TIME };
    });

    // Cook stations
    const cookStation = (arr: (CookSlot | null)[]): (CookSlot | null)[] =>
      arr.map(it => {
        if (!it || it.done || it.overcooked) return it;
        const c = COOK[it.cookKey];
        const elapsed = it.elapsed + dt;
        const overcooked = (c.flip && !it.flipped && elapsed > c.flip + 60) ||
          (it.done && elapsed > c.sec + 60) || false;
        const done = elapsed >= c.sec && !overcooked;
        return { ...it, elapsed, done, overcooked };
      });

    ns.fryer = cookStation(ns.fryer);
    ns.grill = cookStation(ns.grill);
    ns.saute = cookStation(ns.saute);

    // Walk orders over 2 min past due
    const walked: number[] = [];
    ns.orders.forEach((o, i) => {
      if (ns.shiftSec - o.dueAt > 120) walked.push(i);
    });
    if (walked.length > 0) {
      const walkedNums: number[] = [];
      walked.reverse().forEach(i => {
        const ord = ns.orders[i];
        ns.pass = ns.pass.map(p => (p?.ticketId === ord.id ? null : p));
        if (ns.selectedTicket === ord.id) ns.selectedTicket = null;
        walkedNums.push(ord.num);
        ns.orders = [...ns.orders.slice(0, i), ...ns.orders.slice(i + 1)];
      });
      ns.walked += walked.length;
      ns.score = Math.max(0, ns.score - 75 * walked.length);
      ns.streak = 0;
      walkedNums.forEach(num => addToast(`#${num} walked −75`, "bad"));
    }

    // Spawn orders
    ns.nextOrderIn -= dt;
    if (ns.nextOrderIn <= 0 && ns.orders.length < DIFF[ns.difficulty].maxOrders) {
      ns = spawnOrder(ns);
      const d = DIFF[ns.difficulty];
      ns.nextOrderIn = d.gapMin + Math.random() * (d.gapMax - d.gapMin);
    }

    setState(ns);
  }, [addToast, spawnOrder]);

  useEffect(() => {
    rafRef.current = setInterval(tick, 100);
    return () => { if (rafRef.current) clearInterval(rafRef.current); };
  }, [tick]);

  // ─── ACTIONS ──────────────────────────────────────────────────────────────

  const startShift = useCallback(() => {
    setState(s => {
      const d = DIFF[s.difficulty];
      let ns: GameState = { ...s, started: true };
      for (let i = 0; i < d.initialOrders; i++) ns = spawnOrder(ns);
      ns.nextOrderIn = d.gapMin;
      return ns;
    });
  }, [spawnOrder]);

  const endShift = useCallback(() => {
    setState(s => {
      if (s.score > s.bestScore) AsyncStorage.setItem("bestScore", String(s.score));
      return {
        ...makeInitialState(),
        bestScore: Math.max(s.score, s.bestScore),
        difficulty: s.difficulty,
      };
    });
  }, []);

  const togglePause = useCallback(() => setState(s => ({ ...s, paused: !s.paused })), []);
  const setSpeed = useCallback((speed: number) => setState(s => ({ ...s, speed })), []);
  const setDifficulty = useCallback((difficulty: Difficulty) => setState(s => ({ ...s, difficulty })), []);

  const pickIngredient = useCallback((id: string) => {
    setState(s => ({
      ...s,
      picked: s.picked?.kind === "ingredient" && s.picked.id === id
        ? null
        : { kind: "ingredient", id },
    }));
  }, []);

  const pickInstant = useCallback((kind: "side" | "cold", id: string) => {
    setState(s => ({
      ...s,
      picked: s.picked?.kind === kind && s.picked.id === id
        ? null
        : { kind, id },
    }));
  }, []);

  const clearPick = useCallback(() => setState(s => ({ ...s, picked: null })), []);

  const placeIntoSlot = useCallback((kind: "fryer" | "grill" | "bread" | "saute", idx: number) => {
    setState(s => {
      if (!s.picked) { addToast("Pick something up first", "warn"); return s; }
      const { picked } = s;

      if (picked.kind === "ingredient") {
        const ing = [...PROTEINS, ...FRY_SIDES].find(i => i.id === picked.id);
        if (!ing) return s;
        const cookable = ing.direct[kind];
        if (!cookable) {
          const stations = Object.keys(ing.direct).map(k => k.toUpperCase()).join("/");
          addToast(`That goes on ${stations}`, "warn"); return s;
        }
        if (kind === "bread") {
          if (s.bread[idx]) { addToast("Breading station busy", "warn"); return s; }
          const newBread = [...s.bread];
          newBread[idx] = { id: picked.id, elapsed: 0, done: false };
          return { ...s, bread: newBread, picked: null };
        }
        if (kind === "fryer") {
          if (s.fryer[idx]) { addToast("Basket occupied", "warn"); return s; }
          const newFryer = [...s.fryer];
          newFryer[idx] = { cookKey: cookable, elapsed: 0, done: false, overcooked: false, flipped: false };
          return { ...s, fryer: newFryer, picked: null };
        }
        if (kind === "grill") {
          if (s.grill[idx]) { addToast("Grill spot occupied", "warn"); return s; }
          const newGrill = [...s.grill];
          newGrill[idx] = { cookKey: cookable, elapsed: 0, done: false, overcooked: false, flipped: false };
          return { ...s, grill: newGrill, picked: null };
        }
      }

      if (picked.kind === "breaded") {
        if (kind !== "fryer") { addToast("Breaded items go in the fryer", "warn"); return s; }
        if (s.fryer[idx]) { addToast("Basket occupied", "warn"); return s; }
        const cookKey = BREADED_TO_COOK[picked.id];
        const newFryer = [...s.fryer];
        newFryer[idx] = { cookKey, elapsed: 0, done: false, overcooked: false, flipped: false };
        return { ...s, fryer: newFryer, picked: null };
      }

      if (picked.kind === "cooked") {
        if (kind === "saute") {
          if (s.saute[idx]) { addToast("Pan in use", "warn"); return s; }
          const alfredo = Object.entries(COOK).find(([, v]) =>
            v.station === "saute" && v.requiresCooked?.includes(picked.product)
          );
          if (!alfredo) { addToast(`Can't make alfredo with ${COOK[picked.product].label}`, "warn"); return s; }
          const newSaute = [...s.saute];
          newSaute[idx] = { cookKey: alfredo[0], elapsed: 0, done: false, overcooked: false, flipped: false };
          return { ...s, saute: newSaute, picked: null };
        }
        addToast("Cooked items go to PASS or SAUTÉ", "warn"); return s;
      }

      addToast("That doesn't go there", "warn"); return s;
    });
  }, [addToast]);

  const onCookSlotPress = useCallback((kind: "fryer" | "grill" | "saute", idx: number) => {
    setState(s => {
      const arr = kind === "fryer" ? s.fryer : kind === "grill" ? s.grill : s.saute;
      const item = arr[idx];
      if (!item) return s; // empty, handled by placeIntoSlot

      if (item.overcooked) {
        const newArr = [...arr];
        newArr[idx] = null;
        const ns = kind === "fryer" ? { ...s, fryer: newArr } : kind === "grill" ? { ...s, grill: newArr } : { ...s, saute: newArr };
        addToast("Trashed burnt food −25", "bad");
        return { ...ns, score: Math.max(0, s.score - 25), streak: 0 };
      }

      if (item.done) {
        const newArr = [...arr];
        newArr[idx] = null;
        const ns = kind === "fryer" ? { ...s, fryer: newArr } : kind === "grill" ? { ...s, grill: newArr } : { ...s, saute: newArr };
        return { ...ns, picked: { kind: "cooked", product: item.cookKey } };
      }

      const c = COOK[item.cookKey];
      if (c.flip && !item.flipped && item.elapsed >= c.flip) {
        const newArr = [...arr];
        newArr[idx] = { ...item, flipped: true };
        const ns = kind === "fryer" ? { ...s, fryer: newArr } : kind === "grill" ? { ...s, grill: newArr } : { ...s, saute: newArr };
        addToast("Flipped " + c.label, "good");
        return ns;
      } else if (c.flip && !item.flipped) {
        addToast(`Too early — ${fmtTime(c.flip - item.elapsed)} until flip`, "warn");
      } else {
        addToast("Patience — let it cook", "warn");
      }
      return s;
    });
  }, [addToast]);

  const onBreadSlotPress = useCallback((idx: number) => {
    setState(s => {
      const item = s.bread[idx];
      if (!item) return s;
      if (!item.done) { addToast("Still breading…", "warn"); return s; }
      const ing = PROTEINS.find(i => i.id === item.id);
      const breadKey = ing ? Object.values(ing.direct).find(v => v.startsWith("_")) : null;
      if (!breadKey) return s;
      const newBread = [...s.bread];
      newBread[idx] = null;
      return { ...s, bread: newBread, picked: { kind: "breaded", id: breadKey } };
    });
  }, [addToast]);

  const onPassPress = useCallback((idx: number) => {
    setState(s => {
      const item = s.pass[idx];

      if (!s.picked && item) {
        const newPass = [...s.pass];
        newPass[idx] = null;
        if (item.ticketId) {
          const orders = s.orders.map(o => {
            if (o.id !== item.ticketId) return o;
            const items = o.items.map(it => {
              if (it.fulfilled && (it as any)._fulfilledKey === item.fulfillKey)
                return { ...it, fulfilled: false };
              return it;
            });
            return { ...o, items };
          });
          return { ...s, pass: newPass, orders };
        }
        addToast("Pulled from pass", "warn");
        return { ...s, pass: newPass };
      }

      if (!s.picked) return s;
      if (item) { addToast("Pass slot taken", "warn"); return s; }
      if (!s.selectedTicket) { addToast("Select a ticket first", "warn"); return s; }

      const ticket = s.orders.find(o => o.id === s.selectedTicket);
      if (!ticket) return s;

      const { picked } = s;
      let fulfillKey = "";
      if (picked.kind === "cooked") fulfillKey = picked.product;
      else if (picked.kind === "side") fulfillKey = picked.id;
      else if (picked.kind === "cold") fulfillKey = picked.id;
      else { addToast("That can't be plated", "warn"); return s; }

      const newPass = [...s.pass];
      const passItem: PassItem = {
        kind: picked.kind === "cooked" ? "cooked" : picked.kind === "side" ? "side" : "cold",
        id: picked.kind !== "cooked" ? (picked as any).id : undefined,
        product: picked.kind === "cooked" ? picked.product : undefined,
        heldSince: s.shiftSec,
        ticketId: ticket.id,
        fulfillKey,
      };

      const need = ticket.items.find(it => !it.fulfilled && itemMatches(it, fulfillKey));
      if (!need) {
        addToast(`#${ticket.num} doesn't need ${fulfillKey.replace(/_/g," ")}`, "warn");
        newPass[idx] = { ...passItem, ticketId: null };
        return { ...s, pass: newPass, picked: null };
      }

      const newOrders = s.orders.map(o => {
        if (o.id !== ticket.id) return o;
        let found = false;
        const items = o.items.map(it => {
          if (!found && !it.fulfilled && itemMatches(it, fulfillKey)) {
            found = true;
            return { ...it, fulfilled: true, _fulfilledKey: fulfillKey };
          }
          return it;
        });
        return { ...o, items };
      });

      newPass[idx] = passItem;
      addToast("Plated for #" + ticket.num, "good");
      return { ...s, pass: newPass, orders: newOrders, picked: null };
    });
  }, [addToast]);

  const selectTicket = useCallback((id: string) => {
    setState(s => ({ ...s, selectedTicket: s.selectedTicket === id ? null : id }));
  }, []);

  const sendOrder = useCallback((id: string) => {
    setState(s => {
      const idx = s.orders.findIndex(o => o.id === id);
      if (idx < 0) return s;
      const ord = s.orders[idx];
      if (!ord.items.every(i => i.fulfilled)) return s;

      const newPass = s.pass.map(p => (p?.ticketId === ord.id ? null : p));
      const remain = ord.dueAt - s.shiftSec;
      let pts = 100;
      let kind: "" | "good" | "bad" | "warn" = "good";
      let msg = "ORDER UP! +100";
      let streak = s.streak + 1;

      if (remain < 0) {
        pts = Math.max(20, 60 + Math.floor(remain / 30) * 10);
        msg = `Sent late +${pts}`; kind = "warn"; streak = 0;
      } else if (remain < 30) {
        pts = 130; msg = "TIGHT! +130";
      } else if (streak >= 3) {
        pts += 25; msg = `STREAK ×${streak} +${pts}`;
      }

      const newScore = s.score + pts;
      if (newScore > s.bestScore) AsyncStorage.setItem("bestScore", String(newScore));
      addToast(msg, kind);

      return {
        ...s,
        pass: newPass,
        orders: [...s.orders.slice(0, idx), ...s.orders.slice(idx + 1)],
        selectedTicket: s.selectedTicket === id ? null : s.selectedTicket,
        score: newScore,
        bestScore: Math.max(newScore, s.bestScore),
        sent: s.sent + 1,
        streak,
      };
    });
  }, [addToast]);

  const dismissToast = useCallback((id: string) => {
    setState(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) }));
  }, []);

  return (
    <GameContext.Provider value={{
      state,
      startShift, endShift, togglePause, setSpeed, setDifficulty,
      pickIngredient, pickInstant, clearPick,
      onCookSlotPress, onBreadSlotPress, placeIntoSlot,
      onPassPress, selectTicket, sendOrder,
      dismissToast, fmtTime,
    }}>
      {children}
    </GameContext.Provider>
  );
}
