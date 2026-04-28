import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  name: string;
  selected: boolean;
  kind: "side" | "cold";
  onPress: () => void;
}

export function InstantButton({ name, selected, kind, onPress }: Props) {
  const colors = useColors();
  const isCold = kind === "cold";

  return (
    <Pressable
      style={[
        styles.btn,
        {
          backgroundColor: isCold ? "#1c2d3a" : colors.bg3,
          borderColor: selected ? colors.hot : isCold ? "#2c4459" : colors.line2,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.name, { color: selected ? colors.hot : colors.foreground }]} numberOfLines={2}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 8,
    paddingVertical: 8,
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
    lineHeight: 12,
  },
});
