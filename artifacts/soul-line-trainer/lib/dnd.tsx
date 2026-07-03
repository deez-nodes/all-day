import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  LayoutChangeEvent,
  Platform,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

type Zone = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  onDrop: (payload: unknown) => void;
  accepts?: (payload: unknown) => boolean;
  measure: () => void;
};

type DragState = {
  payload: unknown;
  ghost: React.ReactNode;
  pos: Animated.ValueXY;
  w: number;
  h: number;
};

type Ctx = {
  registerZone: (id: string, zone: Omit<Zone, "id">) => void;
  unregisterZone: (id: string) => void;
  startDrag: (s: {
    payload: unknown;
    x: number;
    y: number;
    ghost: React.ReactNode;
    w: number;
    h: number;
  }) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  hoveredZoneId: string | null;
  isDragging: boolean;
};

const DndContext = createContext<Ctx | null>(null);

export function DndProvider({ children }: { children: React.ReactNode }) {
  const zones = useRef<Map<string, Zone>>(new Map()).current;
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const registerZone = useCallback(
    (id: string, zone: Omit<Zone, "id">) => {
      zones.set(id, { ...zone, id });
    },
    [zones],
  );

  const unregisterZone = useCallback(
    (id: string) => {
      zones.delete(id);
    },
    [zones],
  );

  const findZone = useCallback(
    (x: number, y: number, payload: unknown): string | null => {
      let found: string | null = null;
      const hits: string[] = [];
      zones.forEach((z, id) => {
        if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
          hits.push(id);
          if (found) return;
          const accepted = !z.accepts || z.accepts(payload);
          if (accepted) found = id;
        }
      });
      if ((globalThis as any).__DND_DEBUG__) {
        console.log(`[DND] findZone (${x.toFixed(0)},${y.toFixed(0)}) payload=${JSON.stringify(payload)} hits=[${hits.join(",")}] -> ${found}`);
      }
      return found;
    },
    [zones],
  );

  const startDrag: Ctx["startDrag"] = useCallback(
    ({ payload, x, y, ghost, w, h }) => {
      // Re-measure all zones at drag start so coordinates reflect current scroll
      zones.forEach((z) => z.measure());
      const pos = new Animated.ValueXY({ x: x - w / 2, y: y - h / 2 });
      dragPosRef.current = { x, y };
      if ((globalThis as any).__DND_DEBUG__) {
        console.log(`[DND] startDrag at (${x.toFixed(0)},${y.toFixed(0)}) payload=${JSON.stringify(payload)} zoneCount=${zones.size}`);
      }
      setDrag({ payload, ghost, pos, w, h });
    },
    [zones],
  );

  const updateDrag = useCallback(
    (x: number, y: number) => {
      const d = dragRef.current;
      if (!d) return;
      d.pos.setValue({ x: x - d.w / 2, y: y - d.h / 2 });
      dragPosRef.current = { x, y };
      const id = findZone(x, y, d.payload);
      setHoveredZoneId((prev) => (prev === id ? prev : id));
    },
    [findZone],
  );

  const endDrag = useCallback(() => {
    const d = dragRef.current;
    if (!d) {
      setHoveredZoneId(null);
      return;
    }
    const { x, y } = dragPosRef.current;
    const id = findZone(x, y, d.payload);
    if (id) {
      const z = zones.get(id);
      if (z) z.onDrop(d.payload);
    }
    setDrag(null);
    setHoveredZoneId(null);
  }, [findZone, zones]);

  const cancelDrag = useCallback(() => {
    setDrag(null);
    setHoveredZoneId(null);
  }, []);

  const value = useMemo(
    () => ({
      registerZone,
      unregisterZone,
      startDrag,
      updateDrag,
      endDrag,
      cancelDrag,
      hoveredZoneId,
      isDragging: !!drag,
    }),
    [
      registerZone,
      unregisterZone,
      startDrag,
      updateDrag,
      endDrag,
      cancelDrag,
      hoveredZoneId,
      drag,
    ],
  );

  return (
    <DndContext.Provider value={value}>
      <View style={{ flex: 1 }} collapsable={false}>
        {children}
        {drag && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                width: drag.w,
                height: drag.h,
                zIndex: 9999,
                opacity: 0.92,
              },
              Platform.OS === "android" ? { elevation: 24 } : null,
              { transform: drag.pos.getTranslateTransform() },
            ]}
          >
            {drag.ghost}
          </Animated.View>
        )}
      </View>
    </DndContext.Provider>
  );
}

export function useDnd() {
  const ctx = useContext(DndContext);
  if (!ctx) throw new Error("useDnd must be used within DndProvider");
  return ctx;
}

// ─── DROP ZONE ──────────────────────────────────────────────────────────────

export interface DropZoneProps<T = unknown> {
  zoneId: string;
  accepts?: (payload: T) => boolean;
  onDrop: (payload: T) => void;
  children: React.ReactNode | ((args: { isOver: boolean }) => React.ReactNode);
  style?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function DropZone<T = unknown>({
  zoneId,
  accepts,
  onDrop,
  children,
  style,
  onLayout,
}: DropZoneProps<T>) {
  const ctx = useDnd();
  // Store ctx in a ref so the cleanup effect doesn't depend on `ctx` identity.
  // The DndProvider re-creates its context value whenever drag/hover state
  // changes, which would otherwise cause every DropZone's cleanup to run
  // mid-drag and unregister all zones.
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const ref = useRef<View>(null);
  const acceptsRef = useRef(accepts);
  acceptsRef.current = accepts;
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const measure = useCallback(() => {
    requestAnimationFrame(() => {
      ref.current?.measureInWindow((x, y, w, h) => {
        if (!isFinite(x) || !isFinite(y) || w === 0 || h === 0) {
          if ((globalThis as any).__DND_DEBUG__) {
            console.log(`[DND] measure SKIP zone=${zoneId} x=${x} y=${y} w=${w} h=${h}`);
          }
          return;
        }
        if ((globalThis as any).__DND_DEBUG__) {
          console.log(`[DND] measure OK zone=${zoneId} (${x.toFixed(0)},${y.toFixed(0)}) ${w.toFixed(0)}x${h.toFixed(0)}`);
        }
        ctxRef.current.registerZone(zoneId, {
          x,
          y,
          w,
          h,
          accepts: acceptsRef.current
            ? (p: unknown) => acceptsRef.current!(p as T)
            : undefined,
          onDrop: (p: unknown) => onDropRef.current(p as T),
          measure,
        });
      });
    });
  }, [zoneId]);

  useEffect(() => {
    return () => ctxRef.current.unregisterZone(zoneId);
  }, [zoneId]);

  const handleLayout = (e: LayoutChangeEvent) => {
    measure();
    onLayout?.(e);
  };

  const isHovered = ctx.hoveredZoneId === zoneId;
  const rendered =
    typeof children === "function"
      ? (children as (a: { isOver: boolean }) => React.ReactNode)({
          isOver: isHovered,
        })
      : children;

  return (
    <View ref={ref} onLayout={handleLayout} style={style} collapsable={false}>
      {rendered}
    </View>
  );
}

// ─── DRAGGABLE ──────────────────────────────────────────────────────────────

export interface DraggableProps<T = unknown> {
  payload: T;
  ghost?: React.ReactNode;
  ghostSize?: { w: number; h: number };
  onTap?: () => void;
  enabled?: boolean;
  longPressMs?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Draggable<T = unknown>({
  payload,
  ghost,
  ghostSize,
  children,
  onTap,
  style,
  enabled = true,
  longPressMs = 180,
}: DraggableProps<T>) {
  const ctx = useDnd();
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);

  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const ghostRef = useRef<React.ReactNode>(ghost ?? children);
  ghostRef.current = ghost ?? children;
  const ghostSizeRef = useRef(ghostSize);
  ghostSizeRef.current = ghostSize;
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const begin = useCallback((x: number, y: number) => {
    if (!enabledRef.current) return;
    activeRef.current = true;
    setActive(true);
    const w = ghostSizeRef.current?.w ?? 96;
    const h = ghostSizeRef.current?.h ?? 56;
    ctxRef.current.startDrag({
      payload: payloadRef.current,
      x,
      y,
      ghost: ghostRef.current,
      w,
      h,
    });
  }, []);

  const update = useCallback((x: number, y: number) => {
    if (!activeRef.current) return;
    ctxRef.current.updateDrag(x, y);
  }, []);

  const end = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setActive(false);
    ctxRef.current.endDrag();
  }, []);

  const cancel = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setActive(false);
    ctxRef.current.cancelDrag();
  }, []);

  const fireTap = useCallback(() => {
    onTapRef.current?.();
  }, []);

  const composed = useMemo(() => {
    // Pan that activates only after a long-press (held still for ~180ms).
    // This lets parent ScrollViews handle quick swipes naturally.
    const pan = Gesture.Pan()
      .activateAfterLongPress(longPressMs)
      .enabled(enabled)
      .onStart((e) => {
        begin(e.absoluteX, e.absoluteY);
      })
      .onUpdate((e) => {
        update(e.absoluteX, e.absoluteY);
      })
      .onEnd(() => {
        end();
      })
      .onFinalize((_e, success) => {
        if (!success && activeRef.current) cancel();
      })
      .runOnJS(true);

    // Quick tap (released before long-press threshold).
    const tap = Gesture.Tap()
      .maxDuration(longPressMs - 1)
      .onEnd((_e, success) => {
        if (success) fireTap();
      })
      .runOnJS(true);

    return Gesture.Exclusive(pan, tap);
  }, [longPressMs, enabled, begin, update, end, cancel, fireTap]);

  return (
    <GestureDetector gesture={composed}>
      <View
        style={[style, active && { opacity: 0.35 }]}
        collapsable={false}
      >
        {children}
      </View>
    </GestureDetector>
  );
}
