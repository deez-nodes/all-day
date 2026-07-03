import React, { useEffect, useState } from "react";
import { useGame } from "@/game/GameContext";
import { cn } from "@/lib/utils";
import { Draggable, Droppable } from "@/components/game/DnD";
import { DemandBadge } from "@/components/game/DemandBadge";
import { CookStationSlot, BreadStationSlot } from "@/components/game/StationSlot";
import { PROTEINS, FRY_SIDES, HOLD_ITEMS, COLD_ITEMS, COOK, BREADED_TO_COOK } from "@/game/GameContext";
import { ingredientDemand, instantDemand } from "@/lib/demand";

export default function Game() {
  const { state, startShift, setDifficulty, setSpeed } = useGame();

  if (!state.started) {
    return <StartScreen />;
  }

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col overflow-hidden font-sans select-none">
      <HUD />
      
      {state.picked && <HoldingBanner />}

      <div className="flex-1 flex flex-row overflow-hidden relative">
        <WalkIn />
        <Stations />
        <PassAndTickets />
      </div>

      <Toasts />
    </div>
  );
}

function StartScreen() {
  const { state, startShift, setDifficulty, setSpeed } = useGame();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-8 relative overflow-hidden soul-bg-stripes">
      <div className="max-w-xl w-full bg-card border border-border p-10 rounded-xl shadow-2xl z-10 flex flex-col items-center">
        <div className="mb-8 text-center">
          <h1 className="text-6xl font-black tracking-tight uppercase soul-text-glow text-foreground mb-2">
            <span className="text-primary italic mr-4">Soul</span>Line
          </h1>
          <p className="text-muted-foreground tracking-widest uppercase font-semibold text-sm">Southern Food Kitchen Simulator</p>
        </div>

        {state.bestScore > 0 && (
          <div className="mb-8 text-center bg-muted/30 px-6 py-3 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">High Score</div>
            <div className="text-2xl font-black text-primary">{state.bestScore}</div>
          </div>
        )}

        <div className="w-full space-y-6">
          <div>
            <label className="text-xs uppercase font-bold text-muted-foreground tracking-widest mb-3 block text-center">Difficulty</label>
            <div className="flex gap-4 justify-center">
              {(["easy", "medium", "hard"] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "px-6 py-3 rounded text-sm uppercase font-bold tracking-wider transition-all",
                    state.difficulty === d ? "bg-primary text-primary-foreground soul-border-glow" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-muted-foreground tracking-widest mb-3 block text-center">Game Speed</label>
            <div className="flex gap-4 justify-center">
              {[1, 3, 6, 12].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    state.speed === s ? "bg-primary text-primary-foreground soul-border-glow" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={startShift}
          className="mt-12 w-full py-5 bg-primary text-primary-foreground text-2xl font-black uppercase tracking-widest rounded-lg hover:brightness-110 active:scale-[0.98] transition-all soul-border-glow"
        >
          Start Shift
        </button>
      </div>
    </div>
  );
}

function HUD() {
  const { state, togglePause, endShift, setSpeed, fmtTime } = useGame();

  return (
    <div className="h-16 w-full bg-card border-b border-border flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_#ff6a1f]" />
          <div className="text-xl font-black uppercase tracking-tight text-foreground">
            <span className="text-primary italic">Soul</span> Line
          </div>
        </div>
        <div className="flex items-center gap-2 border-l border-border pl-6">
          {[1, 3, 6, 12].map(sp => (
            <button
              key={sp}
              onClick={() => setSpeed(sp)}
              className={cn(
                "w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all",
                state.speed === sp ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {sp}x
            </button>
          ))}
          <button onClick={togglePause} className="w-8 h-8 rounded bg-muted text-foreground flex items-center justify-center ml-2 hover:bg-muted/80 font-bold">
            {state.paused ? "▶" : "⏸"}
          </button>
          <button onClick={endShift} className="px-3 h-8 rounded border border-border text-muted-foreground hover:text-foreground text-xs font-bold ml-2">
            END
          </button>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <Stat label="Shift" value={fmtTime(state.shiftSec)} />
        <Stat label="Sent" value={state.sent} color="text-green-500" />
        <Stat label="Walked" value={state.walked} color="text-destructive" />
        <Stat label="Score" value={state.score} color="text-primary" />
        <Stat label="Streak" value={state.streak} color="text-amber-500" />
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-foreground" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</span>
      <span className={cn("text-lg font-black font-mono leading-none", color)}>{value}</span>
    </div>
  );
}

function HoldingBanner() {
  const { state, clearPick } = useGame();
  
  let name = "";
  const picked = state.picked;
  if (picked) {
    if (picked.kind === "ingredient") {
      name = [...PROTEINS, ...FRY_SIDES].find(i => i.id === picked.id)?.name || "";
    } else if (picked.kind === "breaded") {
      name = `Breaded ${picked.id.replace(/^_/, "").replace(/_/g, " ")}`;
    } else if (picked.kind === "cooked") {
      name = COOK[picked.product]?.label || "";
    } else if (picked.kind === "side") {
      name = HOLD_ITEMS.find(h => h.id === picked.id)?.name || "";
    } else if (picked.kind === "cold") {
      name = COLD_ITEMS.find(h => h.id === picked.id)?.name || "";
    }
  }

  return (
    <div 
      className="w-full bg-primary text-primary-foreground py-2 px-6 flex items-center justify-between cursor-pointer hover:bg-primary/90 transition-colors z-20 shadow-md"
      onClick={clearPick}
    >
      <div className="font-bold uppercase tracking-wider text-sm">
        Holding: <span className="font-black">{name}</span>
      </div>
      <div className="text-xs font-semibold opacity-80 uppercase tracking-widest">
        Click to drop
      </div>
    </div>
  );
}

function WalkIn() {
  const { state, pickIngredient, pickInstant } = useGame();

  return (
    <div className="w-80 h-full border-r border-border bg-card flex flex-col shrink-0">
      <div className="p-4 border-b border-border bg-muted/20">
        <h2 className="text-sm uppercase font-bold tracking-widest text-foreground">Walk-In</h2>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Raw Proteins & Sides</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 hide-scrollbar flex flex-col gap-8">
        <div className="grid grid-cols-2 gap-3">
          {[...PROTEINS, ...FRY_SIDES].map(ing => {
            const isSelected = state.picked?.kind === "ingredient" && state.picked.id === ing.id;
            const demand = ingredientDemand(ing.id, state.orders);
            const targets = Object.keys(ing.direct).map(k => k.toUpperCase()).join("/");
            
            return (
              <Draggable
                key={ing.id}
                payload={{ kind: "walkIn", id: ing.id }}
                onDragStartFn={() => pickIngredient(ing.id)}
                onClick={() => pickIngredient(ing.id)}
                className={cn(
                  "relative p-3 rounded border bg-muted/30 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center text-center gap-1",
                  isSelected ? "border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,106,31,0.2)]" : "border-border"
                )}
              >
                <div className="text-xs font-bold leading-tight text-foreground">{ing.name}</div>
                <div className="text-[9px] uppercase tracking-widest font-semibold text-primary">{targets}</div>
                <DemandBadge count={demand} />
              </Draggable>
            );
          })}
        </div>

        <div>
          <h3 className="text-xs uppercase font-bold tracking-widest text-foreground mb-3 border-b border-border pb-1">Hot Hold (Sides)</h3>
          <div className="grid grid-cols-2 gap-3">
            {HOLD_ITEMS.map(it => {
              const isSelected = state.picked?.kind === "side" && state.picked.id === it.id;
              const demand = instantDemand(it.id, state.orders);
              return (
                <Draggable
                  key={it.id}
                  payload={{ kind: "instant", instantKind: "side", id: it.id }}
                  onDragStartFn={() => pickInstant("side", it.id)}
                  onClick={() => pickInstant("side", it.id)}
                  className={cn(
                    "relative p-2 rounded border bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-center text-center",
                    isSelected ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  <div className="text-[10px] font-bold leading-tight uppercase text-foreground">{it.name}</div>
                  <DemandBadge count={demand} />
                </Draggable>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase font-bold tracking-widest text-foreground mb-3 border-b border-border pb-1">Window (Cold)</h3>
          <div className="grid grid-cols-2 gap-3">
            {COLD_ITEMS.map(it => {
              const isSelected = state.picked?.kind === "cold" && state.picked.id === it.id;
              const demand = instantDemand(it.id, state.orders);
              return (
                <Draggable
                  key={it.id}
                  payload={{ kind: "instant", instantKind: "cold", id: it.id }}
                  onDragStartFn={() => pickInstant("cold", it.id)}
                  onClick={() => pickInstant("cold", it.id)}
                  className={cn(
                    "relative p-2 rounded border bg-slate-900/50 hover:bg-slate-900 transition-colors flex items-center justify-center text-center",
                    isSelected ? "border-sky-400 bg-slate-800" : "border-slate-800"
                  )}
                >
                  <div className="text-[10px] font-bold leading-tight uppercase text-sky-100">{it.name}</div>
                  <DemandBadge count={demand} />
                </Draggable>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stations() {
  const { state, placeIntoSlot, onBreadSlotPress, onCookSlotPress } = useGame();

  // The picked item is already set on drag start (onDragStartFn), so drop
  // handlers must ONLY place — re-calling the pick functions here would toggle
  // the picked item back off and the placement would fail.
  const handleDrop = (station: "bread" | "fryer" | "grill" | "saute", payload: any) => {
    if (payload.kind === "walkIn") {
      const ing = [...PROTEINS, ...FRY_SIDES].find(i => i.id === payload.id);
      if (ing && ing.direct[station]) {
        const arr = state[station];
        const idx = arr.findIndex((s: any) => !s);
        if (idx !== -1) placeIntoSlot(station, idx);
      }
    } else if (station === "fryer" && payload.kind === "breadSlot") {
      const idx = state.fryer.findIndex((s: any) => !s);
      if (idx !== -1) placeIntoSlot("fryer", idx);
    } else if (station === "saute" && payload.kind === "cookSlot") {
      const idx = state.saute.findIndex((s: any) => !s);
      if (idx !== -1) placeIntoSlot("saute", idx);
    }
  };

  const stationAccepts = (station: "bread" | "fryer" | "grill" | "saute") => (p: any) => {
    if (p.kind === "walkIn") {
      const ing = [...PROTEINS, ...FRY_SIDES].find(i => i.id === p.id);
      return !!ing?.direct[station];
    }
    if (p.kind === "breadSlot") return station === "fryer";
    if (p.kind === "cookSlot" && station === "saute") return true; // simplified check
    return false;
  };

  return (
    <div className="flex-1 h-full bg-background overflow-y-auto hide-scrollbar p-6">
      <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto">
        
        {/* Breading */}
        <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="p-3 border-b border-border bg-muted/10 flex justify-between items-end">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Breading</h3>
              <p className="text-[10px] text-muted-foreground uppercase">30s</p>
            </div>
          </div>
          <Droppable 
            accepts={stationAccepts("bread")} 
            onDropFn={(p) => handleDrop("bread", p)}
            className="p-4 flex-1"
          >
            <div className="grid grid-cols-3 gap-3">
              {state.bread.map((item, idx) => (
                <div key={idx} className="relative">
                  {item?.done ? (
                    <Draggable
                      payload={{ kind: "breadSlot", idx }}
                      onDragStartFn={() => onBreadSlotPress(idx)}
                    >
                      <BreadStationSlot item={item} idx={idx} onPress={() => onBreadSlotPress(idx)} />
                    </Draggable>
                  ) : (
                    <BreadStationSlot item={item} idx={idx} onPress={() => placeIntoSlot("bread", idx)} />
                  )}
                </div>
              ))}
            </div>
          </Droppable>
        </div>

        {/* Saute */}
        <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="p-3 border-b border-border bg-muted/10 flex justify-between items-end">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Sauté · Alfredo</h3>
              <p className="text-[10px] text-muted-foreground uppercase">4 min after cook</p>
            </div>
          </div>
          <Droppable 
            accepts={stationAccepts("saute")} 
            onDropFn={(p) => handleDrop("saute", p)}
            className="p-4 flex-1"
          >
            <div className="grid grid-cols-2 gap-4">
              {state.saute.map((item, idx) => (
                <div key={idx} className="relative">
                  {item?.done && !item.overcooked ? (
                    <Draggable
                      payload={{ kind: "cookSlot", station: "saute", idx }}
                      onDragStartFn={() => onCookSlotPress("saute", idx)}
                    >
                      <CookStationSlot item={item} kind="saute" idx={idx} onPress={() => onCookSlotPress("saute", idx)} />
                    </Draggable>
                  ) : (
                    <CookStationSlot item={item} kind="saute" idx={idx} onPress={() => item ? onCookSlotPress("saute", idx) : placeIntoSlot("saute", idx)} />
                  )}
                </div>
              ))}
            </div>
          </Droppable>
        </div>

        {/* Fryer */}
        <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="p-3 border-b border-border bg-muted/10 flex justify-between items-end">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Fryer 350°F</h3>
              <p className="text-[10px] text-muted-foreground uppercase">4 baskets</p>
            </div>
          </div>
          <Droppable 
            accepts={stationAccepts("fryer")} 
            onDropFn={(p) => handleDrop("fryer", p)}
            className="p-4 flex-1"
          >
            <div className="grid grid-cols-2 gap-4">
              {state.fryer.map((item, idx) => (
                <div key={idx} className="relative">
                  {item?.done && !item.overcooked ? (
                    <Draggable
                      payload={{ kind: "cookSlot", station: "fryer", idx }}
                      onDragStartFn={() => onCookSlotPress("fryer", idx)}
                    >
                      <CookStationSlot item={item} kind="fryer" idx={idx} onPress={() => onCookSlotPress("fryer", idx)} />
                    </Draggable>
                  ) : (
                    <CookStationSlot item={item} kind="fryer" idx={idx} onPress={() => item ? onCookSlotPress("fryer", idx) : placeIntoSlot("fryer", idx)} />
                  )}
                </div>
              ))}
            </div>
          </Droppable>
        </div>

        {/* Grill */}
        <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="p-3 border-b border-border bg-muted/10 flex justify-between items-end">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Grill 450°F</h3>
              <p className="text-[10px] text-muted-foreground uppercase">Flip at midpoint</p>
            </div>
          </div>
          <Droppable 
            accepts={stationAccepts("grill")} 
            onDropFn={(p) => handleDrop("grill", p)}
            className="p-4 flex-1"
          >
            <div className="grid grid-cols-2 gap-4">
              {state.grill.map((item, idx) => (
                <div key={idx} className="relative">
                  {item?.done && !item.overcooked ? (
                    <Draggable
                      payload={{ kind: "cookSlot", station: "grill", idx }}
                      onDragStartFn={() => onCookSlotPress("grill", idx)}
                    >
                      <CookStationSlot item={item} kind="grill" idx={idx} onPress={() => onCookSlotPress("grill", idx)} />
                    </Draggable>
                  ) : (
                    <CookStationSlot item={item} kind="grill" idx={idx} onPress={() => item ? onCookSlotPress("grill", idx) : placeIntoSlot("grill", idx)} />
                  )}
                </div>
              ))}
            </div>
          </Droppable>
        </div>

      </div>
    </div>
  );
}

function PassAndTickets() {
  const { state, selectTicket, onPassPress } = useGame();

  // The picked item is already set on drag start; only plate it here.
  const handlePassDrop = (idx: number, p: any) => {
    if (state.pass[idx]) return;
    if (p.kind === "cookSlot" || p.kind === "instant") {
      onPassPress(idx);
    }
  };

  const passAccepts = (idx: number) => (p: any) => {
    if (state.pass[idx]) return false;
    return p.kind === "cookSlot" || p.kind === "instant";
  };

  return (
    <div className="w-[450px] h-full border-l border-border bg-card flex flex-col shrink-0">
      {/* The Pass */}
      <div className="h-64 border-b border-border flex flex-col bg-muted/10 shrink-0">
        <div className="p-3 border-b border-border flex justify-between items-end bg-card">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">The Pass</h3>
            <p className="text-[10px] text-muted-foreground uppercase">Plate items here</p>
          </div>
        </div>
        <div className="flex-1 p-3 grid grid-cols-3 gap-2 content-start">
          {state.pass.map((item, idx) => (
            <Droppable
              key={idx}
              accepts={passAccepts(idx)}
              onDropFn={(p) => handlePassDrop(idx, p)}
              onClick={() => onPassPress(idx)}
              className={cn(
                "h-20 border-2 rounded flex flex-col items-center justify-center p-2 cursor-pointer transition-colors text-center",
                item 
                  ? "border-primary bg-primary/10 shadow-[0_0_10px_rgba(255,106,31,0.1)]" 
                  : "border-dashed border-border bg-muted/20 hover:bg-muted/40"
              )}
            >
              {item ? (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-foreground line-clamp-2 leading-tight">
                    {item.kind === "cooked" ? COOK[item.product!]?.label :
                     item.kind === "side" ? HOLD_ITEMS.find(h => h.id === item.id)?.name :
                     COLD_ITEMS.find(h => h.id === item.id)?.name}
                  </div>
                  {item.ticketId && (
                    <div className="text-[9px] mt-1 bg-background px-1.5 py-0.5 rounded border border-border text-muted-foreground uppercase font-bold">
                      Ticket {state.orders.find(o => o.id === item.ticketId)?.num}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Empty</span>
              )}
            </Droppable>
          ))}
        </div>
      </div>

      {/* Tickets */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="p-3 border-b border-border flex justify-between items-end bg-card">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Tickets</h3>
            <p className="text-[10px] text-muted-foreground uppercase">{state.orders.length} Open</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-4">
          {state.orders.map(order => (
            <Ticket key={order.id} order={order} />
          ))}
          {state.orders.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 gap-3">
              <span className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/60" />
              <span className="text-xs uppercase tracking-widest font-bold">No Open Tickets</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Ticket({ order }: { order: any }) {
  const { state, selectTicket, sendOrder, fmtTime } = useGame();
  
  const selected = state.selectedTicket === order.id;
  const age = state.shiftSec - order.bornAt;
  const remain = order.dueAt - state.shiftSec;
  const allFulfilled = order.items.every((i: any) => i.fulfilled);
  
  const isUrgent = remain < 0;
  const isWarn = remain >= 0 && remain < 60;
  
  const stripBg = isUrgent ? "bg-destructive" : isWarn ? "bg-amber-600" : "bg-muted-foreground";

  return (
    <div 
      onClick={() => selectTicket(order.id)}
      className={cn(
        "w-full bg-white rounded-md overflow-hidden shadow-lg transition-all cursor-pointer",
        selected ? "ring-4 ring-primary scale-[1.02]" : "hover:scale-[1.01]"
      )}
    >
      <div className={cn("px-3 py-1.5 flex justify-between items-center text-white", stripBg)}>
        <span className="font-bold text-sm tracking-wide">{fmtTime(age)}</span>
        <span className="font-bold text-[10px] uppercase tracking-widest">{order.type}</span>
      </div>

      <div className="px-3 pt-2 pb-1 flex items-start gap-3">
        <span className="text-2xl font-black text-slate-900 leading-none mt-1">#{order.num}</span>
        <div className="flex-1">
          <div className="text-sm font-bold text-slate-900 leading-tight">{order.label}</div>
          <div className="text-[11px] font-semibold text-slate-500">{order.customer}</div>
        </div>
      </div>

      <div className="px-3 py-2 space-y-1">
        {order.items.map((it: any, i: number) => {
          if (it.kind === "side" && it.parent) return null;
          
          let name = "";
          let mod = "";
          if (it.kind === "cook") {
            name = COOK[it.product!].ticket;
            mod = it.modifier || "";
          } else if (it.kind === "cook_choice") {
            const base = COOK[it.products![0]].ticket.split(" ·")[0];
            name = `${base} · Fried or Grilled`;
            mod = it.chosenProduct?.startsWith("grilled_") || it.chosenProduct?.endsWith("_well") ? "Grilled" : "Fried";
          } else if (it.kind === "cold") {
            name = COLD_ITEMS.find(h => h.id === it.product)?.name || it.product;
          } else if (it.kind === "side") {
            name = HOLD_ITEMS.find(h => h.id === it.product)?.name || it.product;
          }

          const sideItems = order.items.filter((x: any) => x.kind === "side" && x.parent === it._key);

          return (
            <div key={i} className={cn("flex gap-2 items-start py-0.5", it.fulfilled && "opacity-40")}>
              <span className="text-sm font-bold text-slate-900 w-4 text-center">1</span>
              <div className="flex-1">
                <div className={cn("text-sm font-bold text-slate-900 leading-tight", it.fulfilled && "line-through")}>
                  {name}
                </div>
                {mod && <div className="text-[11px] font-bold text-red-700 leading-tight">{mod}</div>}
                {sideItems.map((s: any, j: number) => (
                  <div key={j} className={cn("text-[11px] font-semibold text-slate-600", s.fulfilled && "line-through")}>
                    + {HOLD_ITEMS.find(h => h.id === s.product)?.name || s.product}
                  </div>
                ))}
              </div>
              <span
                className={cn(
                  "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                  it.fulfilled ? "bg-green-600 border-green-600" : "border-slate-300"
                )}
              >
                {it.fulfilled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-slate-200 border-dashed bg-slate-50">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (allFulfilled) sendOrder(order.id);
          }}
          disabled={!allFulfilled}
          className={cn(
            "w-full py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors",
            allFulfilled 
              ? "bg-primary text-primary-foreground hover:brightness-110" 
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function Toasts() {
  const { state } = useGame();
  
  if (state.toasts.length === 0) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50 pointer-events-none">
      {state.toasts.map(t => (
        <div 
          key={t.id}
          className={cn(
            "px-6 py-3 rounded-lg shadow-xl border font-bold uppercase tracking-widest text-xs animate-in slide-in-from-bottom-5 fade-in duration-300",
            t.kind === "good" ? "bg-green-600 text-white border-green-500" :
            t.kind === "bad" ? "bg-destructive text-white border-red-500" :
            t.kind === "warn" ? "bg-amber-500 text-white border-amber-400" :
            "bg-card text-foreground border-border"
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
