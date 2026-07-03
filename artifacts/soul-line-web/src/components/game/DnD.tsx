import React from "react";
import { cn } from "@/lib/utils";

interface DraggableProps extends React.HTMLAttributes<HTMLDivElement> {
  payload: any;
  onDragStartFn?: () => void;
  disabled?: boolean;
}

export function Draggable({ payload, onDragStartFn, disabled, className, children, ...props }: DraggableProps) {
  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("application/json", JSON.stringify(payload));
        if (onDragStartFn) onDragStartFn();
      }}
      className={cn(disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing", className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface DroppableProps extends React.HTMLAttributes<HTMLDivElement> {
  accepts: (payload: any) => boolean;
  onDropFn: (payload: any) => void;
}

export function Droppable({ accepts, onDropFn, className, children, ...props }: DroppableProps) {
  const [isOver, setIsOver] = React.useState(false);

  return (
    <div
      onDragOver={(e) => {
        try {
          // Note: dataTransfer is technically protected during dragover, so we can't reliably read the JSON.
          // We will just allow the drop and validate in onDrop.
          e.preventDefault();
          setIsOver(true);
        } catch (err) {}
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        try {
          const payload = JSON.parse(e.dataTransfer.getData("application/json"));
          if (accepts(payload)) {
            onDropFn(payload);
          }
        } catch (err) {}
      }}
      className={cn("transition-colors", isOver && "ring-2 ring-primary bg-primary/10", className)}
      {...props}
    >
      {children}
    </div>
  );
}
