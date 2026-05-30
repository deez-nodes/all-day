import React from "react";
import { cn } from "@/lib/utils";

export function DemandBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  
  return (
    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground border-2 border-background shadow-md pointer-events-none z-10">
      {count > 9 ? "9+" : count}
    </div>
  );
}
