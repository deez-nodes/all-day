import React from "react";
import { COOK, CookSlot, BreadSlot } from "@/game/GameContext";
import { cn } from "@/lib/utils";

function fmtTime(s: number): string {
  s = Math.max(0, Math.round(s));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function CookStationSlot({ item, kind, idx, onPress }: { item: CookSlot | null; kind: "fryer" | "grill" | "saute"; idx: number; onPress?: () => void }) {
  if (!item) {
    return (
      <div 
        onClick={onPress}
        className="w-full h-24 border-2 border-dashed border-border rounded bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-center cursor-pointer text-muted-foreground text-xs uppercase tracking-widest font-semibold"
      >
        Empty
      </div>
    );
  }

  const c = COOK[item.cookKey];
  const total = c.sec;
  const remain = Math.max(0, total - item.elapsed);
  const pct = Math.min(100, (item.elapsed / total) * 100);
  const flipNeeded = !!c.flip && !item.flipped && item.elapsed >= c.flip;

  let borderColor = "border-border";
  let timerColor = "text-foreground";
  let statusText = "COOKING";
  let timerText = fmtTime(remain);
  let progressColor = "bg-primary";

  if (item.overcooked) {
    borderColor = "border-destructive";
    timerColor = "text-destructive";
    statusText = "BURNT — TRASH";
    timerText = "BURNT";
    progressColor = "bg-destructive";
  } else if (item.done) {
    borderColor = "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]";
    timerColor = "text-green-500";
    statusText = "DONE · PICK UP";
    timerText = "DONE";
    progressColor = "bg-green-500";
  } else if (flipNeeded) {
    borderColor = "border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse";
    timerColor = "text-amber-500";
    statusText = "FLIP NOW!";
    timerText = "FLIP";
    progressColor = "bg-amber-500";
  }

  return (
    <div 
      onClick={onPress}
      className={cn(
        "w-full h-24 border-2 rounded bg-card p-2 flex flex-col justify-between cursor-pointer transition-all hover:brightness-110 select-none",
        borderColor
      )}
    >
      <div>
        <div className="text-xs font-bold leading-tight uppercase tracking-wider truncate text-foreground">
          {c.label}
        </div>
        <div className={cn("text-[10px] uppercase font-bold tracking-widest mt-1", timerColor)}>
          {statusText}
        </div>
      </div>
      <div>
        <div className={cn("text-lg font-black font-mono leading-none tracking-tight", timerColor)}>
          {timerText}
        </div>
        <div className="h-1.5 w-full bg-border rounded-full mt-1.5 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-300 ease-linear", progressColor)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export function BreadStationSlot({ item, idx, onPress }: { item: BreadSlot | null; idx: number; onPress?: () => void }) {
  if (!item) {
    return (
      <div 
        onClick={onPress}
        className="w-full h-24 border-2 border-dashed border-border rounded bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-center cursor-pointer text-muted-foreground text-xs uppercase tracking-widest font-semibold"
      >
        Empty
      </div>
    );
  }

  const pct = Math.min(100, (item.elapsed / 30) * 100);
  const remain = Math.max(0, 30 - item.elapsed);

  const doneColor = item.done ? "text-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" : "text-primary border-primary";
  const bgColor = item.done ? "bg-green-500" : "bg-primary";

  return (
    <div 
      onClick={onPress}
      className={cn(
        "w-full h-24 border-2 rounded bg-card p-2 flex flex-col justify-between cursor-pointer transition-all hover:brightness-110 select-none",
        doneColor
      )}
    >
      <div>
        <div className="text-xs font-bold leading-tight uppercase tracking-wider text-foreground">
          Breading
        </div>
        <div className={cn("text-[10px] uppercase font-bold tracking-widest mt-1", item.done ? "text-green-500" : "text-primary")}>
          {item.done ? "READY · PICK UP" : "BREADING..."}
        </div>
      </div>
      <div>
        <div className={cn("text-lg font-black font-mono leading-none tracking-tight", item.done ? "text-green-500" : "text-amber-500")}>
          {item.done ? "DONE" : fmtTime(remain)}
        </div>
        <div className="h-1.5 w-full bg-border rounded-full mt-1.5 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-300 ease-linear", bgColor)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
