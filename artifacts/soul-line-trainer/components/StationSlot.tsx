import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COOK, BreadSlot, CookSlot } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

interface CookStationSlotProps {
  item: CookSlot | null;
  kind: "fryer" | "grill" | "saute";
  idx: number;
  onPress?: () => void;
  shiftSec: number;
  /** Render as non-interactive View when parent handles touches (e.g. Draggable). */
  asView?: boolean;
}

function fmtTime(s: number): string {
  s = Math.max(0, Math.round(s));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function CookStationSlot({ item, kind, idx, onPress, shiftSec, asView }: CookStationSlotProps) {
  const colors = useColors();

  if (!item) {
    return (
      <Pressable style={[styles.slot, { backgroundColor: colors.bg2, borderColor: colors.line2 }]} onPress={onPress}>
        <Text style={[styles.emptyText, { color: colors.inkFaint }]}>Empty</Text>
      </Pressable>
    );
  }

  const c = COOK[item.cookKey];
  const total = c.sec;
  const remain = Math.max(0, total - item.elapsed);
  const pct = Math.min(100, (item.elapsed / total) * 100);
  const flipNeeded = !!c.flip && !item.flipped && item.elapsed >= c.flip;

  let borderColor = colors.line2;
  let timerColor = colors.foreground;
  let statusText = "COOKING";
  let timerText = fmtTime(remain);

  if (item.overcooked) {
    borderColor = colors.burn;
    timerColor = colors.burn;
    statusText = "BURNT — TRASH";
    timerText = "BURNT";
  } else if (item.done) {
    borderColor = colors.done;
    timerColor = colors.done;
    statusText = "DONE · PICK UP";
    timerText = "DONE";
  } else if (flipNeeded) {
    borderColor = colors.warn;
    timerColor = colors.warn;
    statusText = "FLIP NOW!";
    timerText = "FLIP";
  }

  const progressColor = item.overcooked ? colors.burn : item.done ? colors.done : colors.hot;

  const slotContent = (
    <>
      <View>
        <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>{c.label}</Text>
        <Text style={[styles.status, { color: statusText === "FLIP NOW!" ? colors.warn : statusText.includes("DONE") ? colors.done : statusText.includes("BURNT") ? colors.burn : colors.inkDim }]}>{statusText}</Text>
      </View>
      <View>
        <Text style={[styles.timer, { color: timerColor }]}>{timerText}</Text>
        <View style={[styles.progressBg, { backgroundColor: colors.line }]}>
          <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: progressColor }]} />
        </View>
      </View>
    </>
  );

  const slotStyle = [styles.slot, { backgroundColor: colors.bg2, borderColor, borderWidth: 1.5 }];
  if (asView) {
    return <View style={slotStyle}>{slotContent}</View>;
  }
  return (
    <Pressable style={slotStyle} onPress={onPress}>{slotContent}</Pressable>
  );
}

interface BreadStationSlotProps {
  item: BreadSlot | null;
  idx: number;
  onPress?: () => void;
  asView?: boolean;
}

export function BreadStationSlot({ item, idx, onPress, asView }: BreadStationSlotProps) {
  const colors = useColors();

  if (!item) {
    return (
      <Pressable style={[styles.slot, { backgroundColor: colors.bg2, borderColor: colors.line2 }]} onPress={onPress}>
        <Text style={[styles.emptyText, { color: colors.inkFaint }]}>Empty</Text>
      </Pressable>
    );
  }

  const pct = Math.min(100, (item.elapsed / 30) * 100);
  const remain = Math.max(0, 30 - item.elapsed);

  const slotStyle = [styles.slot, { backgroundColor: colors.bg2, borderColor: item.done ? colors.done : colors.warn, borderWidth: 1.5 }];
  const slotContent = (
    <>
      <View>
        <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>Breading</Text>
        <Text style={[styles.status, { color: item.done ? colors.done : colors.hotLight }]}>
          {item.done ? "READY · PICK UP" : "BREADING…"}
        </Text>
      </View>
      <View>
        <Text style={[styles.timer, { color: item.done ? colors.done : colors.warn }]}>
          {item.done ? "DONE" : fmtTime(remain)}
        </Text>
        <View style={[styles.progressBg, { backgroundColor: colors.line }]}>
          <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: item.done ? colors.done : colors.warn }]} />
        </View>
      </View>
    </>
  );

  if (asView) {
    return <View style={slotStyle}>{slotContent}</View>;
  }
  return <Pressable style={slotStyle} onPress={onPress}>{slotContent}</Pressable>;
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    minHeight: 64,
    padding: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "space-between",
  },
  emptyText: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 18,
  },
  itemName: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    lineHeight: 11,
  },
  status: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 1,
  },
  timer: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  progressBg: {
    height: 3,
    borderRadius: 1,
    marginTop: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1,
  },
});
