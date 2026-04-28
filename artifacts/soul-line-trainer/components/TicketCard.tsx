import React from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COOK, HOLD_ITEMS, COLD_ITEMS, Order } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  order: Order;
  selected: boolean;
  shiftSec: number;
  onSelect: () => void;
  onSend: () => void;
  compact?: boolean;
}

function fmtTime(s: number): string {
  s = Math.max(0, Math.round(s));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function TicketCard({ order, selected, shiftSec, onSelect, onSend, compact }: Props) {
  const colors = useColors();
  const age = shiftSec - order.bornAt;
  const remain = order.dueAt - shiftSec;
  const allFulfilled = order.items.every(i => i.fulfilled);
  const isUrgent = remain < 0;
  const isWarn = remain >= 0 && remain < 60;
  const stripBg = isUrgent ? colors.burn : isWarn ? "#7a5a00" : "#1e2124";

  return (
    <Pressable onPress={onSelect}>
      <View style={[
        styles.card,
        { backgroundColor: "#fff", borderRadius: 6 },
        compact && { width: 230, marginRight: 8, marginBottom: 0 },
        selected && { borderWidth: 2, borderColor: colors.hot },
      ]}>
        <View style={[styles.strip, { backgroundColor: stripBg }]}>
          <Text style={styles.stripAge}>{fmtTime(age)}</Text>
          <Text style={styles.stripType}>{order.type}</Text>
        </View>

        <View style={styles.head}>
          <Text style={styles.orderNum}>#{order.num}</Text>
          <View style={styles.headRight}>
            <Text style={styles.orderLabel} numberOfLines={1}>{order.label}</Text>
            <Text style={styles.customerName}>{order.customer}</Text>
          </View>
        </View>

        <View style={styles.items}>
          {order.items.map((it, i) => {
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
              const s = COLD_ITEMS.find(h => h.id === it.product);
              name = s?.name || it.product || "";
            } else if (it.kind === "side") {
              const s = HOLD_ITEMS.find(h => h.id === it.product);
              name = s?.name || it.product || "";
            }

            const sideItems = order.items.filter(x => x.kind === "side" && x.parent === it._key);

            return (
              <View key={i} style={[styles.line, it.fulfilled && styles.lineFulfilled]}>
                <Text style={[styles.lineQty, { color: "#1c1c1c" }]}>1</Text>
                <View style={styles.lineBody}>
                  <Text style={[styles.lineText, it.fulfilled && styles.lineTextFulfilled]}>{name}</Text>
                  {!!mod && <Text style={styles.lineMod}>{mod}</Text>}
                  {sideItems.map((s, j) => {
                    const si = HOLD_ITEMS.find(h => h.id === s.product);
                    return (
                      <Text key={j} style={[styles.lineSide, s.fulfilled && styles.lineSideFulfilled]}>
                        + {si?.name || s.product}
                      </Text>
                    );
                  })}
                </View>
                <Text style={[styles.lineCheck, { color: it.fulfilled ? "#4caf50" : "#999" }]}>
                  {it.fulfilled ? "✓" : "○"}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.sendBtn, allFulfilled && styles.sendBtnReady]}
            disabled={!allFulfilled}
            onPress={onSend}
          >
            <Text style={[styles.sendText, allFulfilled && styles.sendTextReady]}>
              {allFulfilled ? "SEND" : "SEND"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  strip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stripAge: {
    fontFamily: "Inter_700Bold",
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  stripType: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  orderNum: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1c1c1c",
    lineHeight: 24,
    marginRight: 10,
  },
  headRight: { flex: 1 },
  orderLabel: { fontSize: 13, fontWeight: "700", color: "#1c1c1c", lineHeight: 16 },
  customerName: { fontSize: 11, color: "#555", fontWeight: "500", lineHeight: 14, marginTop: 1 },
  items: { paddingHorizontal: 10, paddingBottom: 6 },
  line: { flexDirection: "row", gap: 6, paddingVertical: 3, alignItems: "flex-start" },
  lineFulfilled: { opacity: 0.5 },
  lineQty: { fontSize: 13, fontWeight: "700", width: 14, textAlign: "center" },
  lineBody: { flex: 1 },
  lineText: { fontSize: 13, fontWeight: "600", color: "#1c1c1c", lineHeight: 17 },
  lineTextFulfilled: { textDecorationLine: "line-through" },
  lineMod: { fontSize: 11, color: "#c4392c", fontWeight: "600", lineHeight: 14 },
  lineSide: { fontSize: 10, color: "#555", lineHeight: 13 },
  lineSideFulfilled: { textDecorationLine: "line-through", opacity: 0.6 },
  lineCheck: { fontSize: 14, fontWeight: "700", width: 16, textAlign: "center" },
  actions: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    borderStyle: "dashed",
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    gap: 6,
  },
  sendBtn: {
    flex: 1,
    backgroundColor: "#ccc",
    borderRadius: 3,
    paddingVertical: 7,
    alignItems: "center",
  },
  sendBtnReady: { backgroundColor: "#ff6a1f" },
  sendText: { fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#888" },
  sendTextReady: { color: "#1a0d04" },
});
