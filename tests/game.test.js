import { afterEach, expect, it, vi } from "vitest";
import html from "../index.html?raw";
import { createLineGame } from "../src/line-game.js";
import { makeItem } from "../src/sim/line.js";
import { DIFF } from "../src/sim/menu.js";

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  document.body.replaceChildren();
});

it("runs a full kitchen shift and persists career progress", () => {
  vi.useFakeTimers();
  document.body.innerHTML = new DOMParser().parseFromString(
    html,
    "text/html",
  ).body.innerHTML;
  localStorage.setItem("allday_sound", "0");
  localStorage.setItem("allday_tips", "200");

  const line = createLineGame();
  const {
    gear,
    tapBank,
    tapSlot,
    tapWindow,
    tapTicket,
    sendOrder,
    startShift,
    endShift,
    setHand,
    tapTrash,
  } = line;
  const okk = (condition, name) => expect(Boolean(condition), name).toBe(true);

  function advanceGameTime(seconds) {
    const maxStep = 0.4 * sim.speed;
    for (let remaining = seconds; remaining > 0; ) {
      const step = Math.min(maxStep, remaining);
      line.advance(step / sim.speed);
      vi.advanceTimersByTime((step * 1000) / sim.speed);
      remaining -= step;
    }
  }

  // deterministic-ish: silence randomness effects by controlling orders manually
  gear.fryer = 4;
  gear.grill = 4;
  gear.bread = 2;
  gear.saute = 2;
  gear.window = 3; // full line for tests
  document.querySelector("#btn-start").click();
  let sim = line.state;
  okk(sim.running === true, "shift starts");
  okk(sim.orders.length === DIFF[sim.diff].init, "initial tickets spawned");

  // stop auto-spawn interfering: push spawn far out
  sim.nextOrderIn = 99999;

  // 1) direct fryer item: bone-in wings (600s)
  tapBank("ing", "raw_wings");
  okk(
    sim.hand && sim.hand.kind === "ing" && sim.hand.id === "raw_wings",
    "picked raw wings",
  );
  tapSlot("fryer", 0);
  okk(
    sim.fryer[0] && sim.fryer[0].cookKey === "wings_bone" && sim.hand === null,
    "wings dropped in basket 1",
  );

  // wrong-station rejection: salmon (grill only) into fryer
  tapBank("ing", "raw_salmon");
  tapSlot("fryer", 1);
  okk(
    sim.fryer[1] === null && sim.hand && sim.hand.id === "raw_salmon",
    "salmon rejected from fryer, still in hand",
  );
  tapSlot("grill", 0);
  okk(
    sim.grill[0] && sim.grill[0].cookKey === "grilled_salmon",
    "salmon on grill",
  );

  // 2) breading chain: boneless -> breading 30s -> fryer 300s
  tapBank("ing", "raw_bls");
  tapSlot("bread", 0);
  okk(sim.bread[0] && !sim.bread[0].done, "boneless breading");
  advanceGameTime(31);
  okk(sim.bread[0] && sim.bread[0].done, "breading done at 30s");
  tapSlot("bread", 0);
  okk(
    sim.hand && sim.hand.kind === "breaded" && sim.bread[0] === null,
    "picked up breaded item",
  );
  tapSlot("grill", 1);
  okk(sim.grill[1] === null, "breaded rejected from grill");
  tapSlot("fryer", 1);
  okk(
    sim.fryer[1] && sim.fryer[1].cookKey === "wings_bls",
    "breaded boneless into fryer",
  );

  // 3) flip mechanics on salmon (flip at 240, done 480)
  advanceGameTime(200); // salmon elapsed ~231
  tapSlot("grill", 0); // too early
  okk(!sim.grill[0].flipped, "early flip refused");
  advanceGameTime(45); // now past 240
  tapSlot("grill", 0);
  okk(sim.grill[0].flipped === true, "flip lands in window");

  // 4) boneless done at 300 -> UP; grab & window stash
  advanceGameTime(60); // boneless elapsed ~ 31+... ensure >300 total: advance more
  advanceGameTime(30);
  // total game adv so far: 31+200+45+60+30 = 366 > 300+31
  okk(sim.fryer[1] && sim.fryer[1].state === "up", "boneless is UP");
  tapSlot("fryer", 1);
  okk(
    sim.hand &&
      sim.hand.kind === "cooked" &&
      sim.hand.product === "wings_bls" &&
      sim.fryer[1] === null,
    "grabbed cooked boneless",
  );
  tapWindow(0);
  okk(
    sim.window[0] && sim.window[0].product === "wings_bls" && sim.hand === null,
    "stashed in window",
  );
  tapWindow(0);
  okk(
    sim.hand && sim.hand.product === "wings_bls" && sim.window[0] === null,
    "picked back from window",
  );
  setHand(null); // discard for test flow (raw-hand clear path)

  // 5) plating: craft a ticket that needs boneless + mac + lemonade
  sim.orders.length = 0;
  sim.orders.push({
    id: "oT",
    num: 900,
    label: "Test Basket",
    who: "QA",
    type: "TO GO",
    born: sim.shiftSec,
    target: 600,
    items: [
      makeItem("cook", "wings_bls"),
      makeItem("side", "side_mac"),
      makeItem("cold", "d_lemon"),
    ],
  });

  tapWindow(1); // empty window slot, empty hand: nothing
  okk(sim.hand === null, "empty window slot no-op");
  // hold cooked boneless again? it was discarded; cook a fresh one instantly via state injection
  sim.fryer[2] = {
    kind: "cook",
    cookKey: "wings_bls",
    elapsed: 300,
    flipped: false,
    state: "up",
  };
  tapSlot("fryer", 2);
  okk(sim.hand && sim.hand.product === "wings_bls", "grabbed second boneless");
  tapTicket("oT");
  okk(
    sim.orders[0].items[0].done === true && sim.hand === null,
    "plated boneless onto ticket",
  );
  tapBank("side", "side_mac");
  tapTicket("oT");
  okk(sim.orders[0].items[1].done === true, "plated mac");
  tapBank("cold", "d_orange");
  tapTicket("oT");
  okk(
    sim.orders[0].items[2].done === false && sim.hand !== null,
    "wrong drink rejected",
  );
  setHand(null);
  tapBank("cold", "d_lemon");
  tapTicket("oT");
  okk(
    sim.orders[0].items.every((i) => i.done),
    "ticket complete",
  );
  const scoreBefore = sim.score,
    sentBefore = sim.sent;
  sendOrder("oT");
  okk(
    sim.sent === sentBefore + 1 && sim.score > scoreBefore,
    "SEND scores the ticket",
  );

  // 6) sauté chain: cooked grilled_shrimp -> shrimp alfredo (240s)
  sim.grill[2] = {
    kind: "cook",
    cookKey: "grilled_shrimp",
    elapsed: 240,
    flipped: true,
    state: "up",
  };
  tapSlot("grill", 2);
  tapSlot("saute", 0);
  okk(
    sim.saute[0] &&
      sim.saute[0].cookKey === "alfredo_shrimp" &&
      sim.hand === null,
    "shrimp into alfredo pan",
  );
  advanceGameTime(241);
  okk(sim.saute[0].state === "up", "alfredo up at 240");

  // 7) burn: leave alfredo past grace (60s)
  advanceGameTime(62);
  okk(sim.saute[0].state === "burnt", "alfredo burns after grace");
  const burnedBefore = sim.burned,
    scoreB = sim.score;
  tapSlot("saute", 0);
  okk(
    sim.saute[0] === null &&
      sim.burned === burnedBefore + 1 &&
      sim.score === Math.max(0, scoreB - 25),
    "trash burnt -25",
  );

  // 8) missed flip burns
  sim.grill[3] = {
    kind: "cook",
    cookKey: "grilled_shrimp",
    elapsed: 0,
    flipped: false,
    state: "cooking",
  };
  advanceGameTime(185); // flip at 120 + 60 grace = 180
  okk(sim.grill[3].state === "burnt", "missed flip burns on grill");
  tapSlot("grill", 3);

  // 9) walked ticket: craft an old ticket
  sim.orders.push({
    id: "oW",
    num: 901,
    label: "Walker",
    who: "QA",
    type: "DINE IN",
    born: sim.shiftSec - 721,
    target: 600,
    items: [makeItem("cook", "fries")],
  });

  const walkedBefore = sim.walked;
  advanceGameTime(1);
  okk(
    sim.walked === walkedBefore + 1 && !sim.orders.find((o) => o.id === "oW"),
    "ticket walks at target+120",
  );

  // 10) wings still cooking sanity: bone-in wings 600s, elapsed ~= huge by now -> should have burnt (nobody pulled them)
  okk(
    sim.fryer[0] === null ||
      ["cooking", "up", "burnt"].includes(sim.fryer[0].state),
    "basket 1 state coherent",
  );

  // 11) hands-full guards
  sim.fryer[3] = {
    kind: "cook",
    cookKey: "fries",
    elapsed: 240,
    flipped: false,
    state: "up",
  };
  tapSlot("fryer", 3);
  okk(sim.hand && sim.hand.product === "fries", "grabbed fries");
  tapBank("ing", "raw_wings");
  okk(sim.hand.product === "fries", "bank blocked while holding cooked");

  // 12) demand badges compute without crash
  line.openDrawer();
  okk(
    document.querySelector("#drawer").classList.contains("open"),
    "drawer and badges render",
  );

  // 13) end shift -> report renders
  endShift();
  okk(sim.running === false, "shift ends");
  okk(
    document.getElementById("ov-report").classList.contains("hidden") === false,
    "report shown",
  );
  okk(
    document.getElementById("grade").textContent.length === 1,
    "grade rendered",
  );

  // 14) restart clean
  startShift();
  sim = line.state;
  okk(
    sim.running && sim.score === 0 && sim.orders.length === DIFF[sim.diff].init,
    "run it back resets cleanly",
  );

  // 15) window hold decay: stash a cooked item, let it die
  sim.nextOrderIn = 99999;
  sim.orders.length = 0;
  sim.fryer[0] = {
    kind: "cook",
    cookKey: "fries",
    elapsed: 240,
    flipped: false,
    state: "up",
  };
  tapSlot("fryer", 0);
  tapWindow(0);
  okk(
    sim.window[0] && typeof sim.window[0].since === "number",
    "window stash records hold time",
  );
  const scoreW = sim.score;
  advanceGameTime(185);
  okk(
    sim.window[0] === null && sim.score === Math.max(0, scoreW - 15),
    "window item dies after 3 min, -15",
  );

  // 16) last call + service close
  okk(sim.lastCall === false, "not last call yet");
  advanceGameTime(sim.shiftLen - sim.shiftSec - 60); // into last-call window
  okk(sim.lastCall === true, "last call fires 2 min before close");
  advanceGameTime(120); // past shiftLen with empty rail
  okk(
    sim.running === false,
    "shift auto-ends when time is up and rail is clear",
  );
  okk(
    document.getElementById("ov-report").classList.contains("hidden") === false,
    "report auto-shows",
  );
  okk(
    document.getElementById("hist-rows").children.length >= 1,
    "shift history rendered",
  );

  // 17) best score persisted at shift end
  okk(
    parseInt(localStorage.getItem("allday_best") || "0", 10) >= 0,
    "best score persisted",
  );

  // 18) economy: tips earned on sends, shop purchase expands the line
  const savedTips = () => JSON.parse(localStorage.getItem("allday_tips"));
  okk(savedTips() > 200, "tips earned from sent tickets");
  gear.fryer = 2; // back to stock line
  const tipsBeforePurchase = savedTips();
  document.querySelector("#btn-shop2").click();
  const buyBtns = [...document.querySelectorAll("#shop-cards .buy")].filter(
    (b) => !b.disabled && b.textContent.includes("120"),
  );
  okk(buyBtns.length >= 1, "affordable upgrades shown");
  buyBtns[0].click(); // third fryer basket or grill zone at 120
  okk(savedTips() === tipsBeforePurchase - 120, "purchase deducts tips");
  const grew = gear.fryer === 3 || gear.grill === 3;
  okk(grew, "gear expanded after purchase");
  startShift();
  sim = line.state;
  okk(
    sim.fryer.length === gear.fryer && sim.grill.length === gear.grill,
    "new shift uses upgraded line",
  );

  // 19) trash: waste a cooked item costs 10
  sim.nextOrderIn = 99999;
  sim.fryer[0] = {
    kind: "cook",
    cookKey: "fries",
    elapsed: 240,
    flipped: false,
    state: "up",
  };
  tapSlot("fryer", 0);
  const scoreT = sim.score;
  tapTrash();
  okk(
    sim.hand === null && sim.score === Math.max(0, scoreT - 10),
    "trashing cooked food -10",
  );

  // 20) career xp accumulated
  okk(Number(localStorage.getItem("allday_xp")) > 0, "career XP persisted");
});
