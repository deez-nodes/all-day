import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  name: string;
  selected: boolean;
  kind: "side" | "cold";
  onPress?: () => void;
  /**
   * If `true`, renders a non-interactive View instead of a Pressable.
   * Use when the parent (e.g. a Draggable) already handles touches.
   */
  asView?: boolean;
}

export function InstantButton({ name, selected, kind, onPress, asView }: Props) {
  const colors = useColors();
  const isCold = kind === "cold";

  const style = [
    styles.btn,
    {
      backgroundColor: isCold ? "#1c2d3a" : colors.bg3,
      borderColor: selected ? colors.hot : isCold ? "#2c4459" : colors.line2,
      borderWidth: selected ? 2 : 1,
    },
  ];

  const content = (
    <Text style={[styles.name, { color: selected ? colors.hot : colors.foreground }]} numberOfLines={2}>
      {name}
    </Text>
  );

  if (asView) {
    return <View style={style}>{content}</View>;
  }

  return (
    <Pressable style={style} onPress={onPress}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    minHeight: 40,
    minWidth: 64,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 9,
    letterSpacing: 0.5,
    fontWeight: "600",
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 11,
  },
});
