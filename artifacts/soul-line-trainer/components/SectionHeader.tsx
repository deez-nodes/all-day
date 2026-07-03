import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  title: string;
  sub?: string;
}

export function SectionHeader({ title, sub }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {sub && <Text style={[styles.sub, { color: colors.inkFaint }]}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderBottomWidth: 1,
    paddingBottom: 5,
    marginBottom: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  sub: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    flexShrink: 1,
    flexWrap: "wrap",
    textAlign: "right",
    maxWidth: "55%",
  },
});
