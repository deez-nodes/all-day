import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  PROTEINS,
  FRY_SIDES,
  HOLD_ITEMS,
  COLD_ITEMS,
  COOK,
  useGame,
  Difficulty,
} from "@/context/GameContext";
import { CookStationSlot, BreadStationSlot } from "@/components/StationSlot";
import { TicketCard } from "@/components/TicketCard";
import { InstantButton } from "@/components/InstantButton";
import { SectionHeader } from "@/components/SectionHeader";
import { useColors } from "@/hooks/useColors";

const SPEEDS_LIST = [1, 3, 6, 12];

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    state,
    startShift, endShift, togglePause, setSpeed, setDifficulty,
    pickIngredient, pickInstant, clearPick,
    onCookSlotPress, onBreadSlotPress, placeIntoSlot,
    onPassPress, selectTicket, sendOrder,
    fmtTime,
  } = useGame();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const pickedLabel = (() => {
    if (!state.picked) return null;
    const { picked } = state;
    if (picked.kind === "ingredient") {
      const ing = [...PROTEINS, ...FRY_SIDES].find(i => i.id === picked.id);
      if (!ing) return null;
      const stations = Object.keys(ing.direct).map(k => k.toUpperCase()).join("/");
      return { name: ing.name, drop: `Drop on: ${stations}` };
    }
    if (picked.kind === "breaded") {
      const key = picked.id.replace(/^_/, "").replace(/_/g, " ").toUpperCase();
      return { name: `Breaded ${key}`, drop: "Drop in: FRYER" };
    }
    if (picked.kind === "cooked") {
      return { name: COOK[picked.product].label, drop: "Drop on: PASS or SAUTÉ for alfredo" };
    }
    if (picked.kind === "side") {
      const it = HOLD_ITEMS.find(h => h.id === picked.id);
      return { name: it?.name || "", drop: "Drop on: PASS" };
    }
    if (picked.kind === "cold") {
      const it = COLD_ITEMS.find(h => h.id === picked.id);
      return { name: it?.name || "", drop: "Drop on: PASS" };
    }
    return null;
  })();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* ── TOP BAR ──────────────────────────────────────── */}
      <View style={[styles.topbar, { paddingTop: topPad + 4, borderBottomColor: colors.line, backgroundColor: "#0e1012" }]}>
        <View style={styles.brand}>
          <View style={[styles.dot, { backgroundColor: colors.hot, shadowColor: colors.hot }]} />
          <View>
            <Text style={[styles.brandTitle, { color: colors.foreground }]}>
              <Text style={{ color: colors.hot, fontStyle: "italic" }}>Soul</Text> · Line Trainer
            </Text>
            <Text style={[styles.brandSub, { color: colors.inkFaint }]}>SOUTHERN FOOD & VIBES</Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          {[
            { label: "SHIFT", val: fmtTime(state.shiftSec), color: colors.foreground },
            { label: "SENT", val: state.sent, color: colors.done },
            { label: "WALKED", val: state.walked, color: colors.burn },
            { label: "SCORE", val: state.score, color: colors.hotLight },
            { label: "STREAK", val: state.streak, color: colors.warn },
          ].map(s => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.inkFaint }]}>{s.label}</Text>
              <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
            </View>
          ))}
        </View>

        {state.started && (
          <View style={styles.controls}>
            <View style={styles.speedRow}>
              {SPEEDS_LIST.map(sp => (
                <Pressable
                  key={sp}
                  style={[styles.speedBtn, { borderColor: colors.line2, backgroundColor: state.speed === sp ? colors.hot : colors.bg3 }]}
                  onPress={() => setSpeed(sp)}
                >
                  <Text style={[styles.speedBtnText, { color: state.speed === sp ? "#1a0d04" : colors.foreground }]}>{sp}×</Text>
                </Pressable>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.ctrlBtn, { backgroundColor: colors.bg3, borderColor: colors.line2 }]}
              onPress={togglePause}
            >
              <Text style={[styles.ctrlBtnText, { color: colors.foreground }]}>{state.paused ? "RESUME" : "PAUSE"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctrlBtn, { backgroundColor: "transparent", borderColor: colors.line2 }]}
              onPress={endShift}
            >
              <Text style={[styles.ctrlBtnText, { color: colors.inkFaint }]}>END</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── HOLDING BANNER ────────────────────────────────── */}
      {pickedLabel && (
        <Pressable
          style={[styles.pickedBanner, { backgroundColor: colors.hot }]}
          onPress={clearPick}
        >
          <Text style={styles.pickedText}>HOLDING · {pickedLabel.name.toUpperCase()}</Text>
          <Text style={styles.pickedDrop}>{pickedLabel.drop} · Tap here to drop</Text>
        </Pressable>
      )}

      {/* ── MAIN 3-COLUMN ────────────────────────────────── */}
      <View style={styles.stage}>

        {/* LEFT: WALK-IN SIDEBAR */}
        <ScrollView
          style={[styles.sidebar, { backgroundColor: colors.bg2, borderRightColor: colors.line }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.sidebarContent, { paddingBottom: bottomPad + 20 }]}
        >
          <Text style={[styles.sidebarHead, { color: colors.inkFaint, borderBottomColor: colors.line }]}>PROTEINS</Text>
          {PROTEINS.map(ing => {
            const isSelected = state.picked?.kind === "ingredient" && state.picked.id === ing.id;
            const stations = Object.keys(ing.direct).map(k => k.toUpperCase()).join("/");
            return (
              <Pressable
                key={ing.id}
                style={[
                  styles.ingCard,
                  {
                    backgroundColor: isSelected ? "rgba(255,106,31,0.08)" : colors.bg3,
                    borderColor: isSelected ? colors.hot : colors.line,
                    borderLeftColor: isSelected ? colors.hot : colors.inkFaint,
                  },
                ]}
                onPress={() => pickIngredient(ing.id)}
              >
                <Text style={[styles.ingName, { color: colors.foreground }]}>{ing.name}</Text>
                <Text style={[styles.ingMeta, { color: colors.inkFaint }]}>{stations}</Text>
              </Pressable>
            );
          })}

          <Text style={[styles.sidebarHead, { color: colors.inkFaint, borderBottomColor: colors.line, marginTop: 10 }]}>SIDES</Text>
          {FRY_SIDES.map(ing => {
            const isSelected = state.picked?.kind === "ingredient" && state.picked.id === ing.id;
            return (
              <Pressable
                key={ing.id}
                style={[
                  styles.ingCard,
                  {
                    borderColor: isSelected ? colors.hot : colors.line,
                    borderLeftColor: isSelected ? colors.hot : colors.inkFaint,
                    backgroundColor: isSelected ? "rgba(255,106,31,0.08)" : colors.bg3,
                  },
                ]}
                onPress={() => pickIngredient(ing.id)}
              >
                <Text style={[styles.ingName, { color: colors.foreground }]}>{ing.name}</Text>
                <Text style={[styles.ingMeta, { color: colors.hotLight }]}>FRYER</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* CENTER: STATIONS */}
        <ScrollView
          style={[styles.floor, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.floorContent, { paddingBottom: bottomPad + 20 }]}
        >
          {/* Breading */}
          <View style={styles.station}>
            <SectionHeader title="Breading" sub="30s" />
            <View style={styles.row3}>
              {state.bread.map((item, idx) => (
                <BreadStationSlot
                  key={idx} item={item} idx={idx}
                  onPress={() => item ? onBreadSlotPress(idx) : placeIntoSlot("bread", idx)}
                />
              ))}
            </View>
          </View>

          {/* Fryer */}
          <View style={styles.station}>
            <SectionHeader title="Fryer 350°F" sub="4 baskets" />
            <View style={styles.row4}>
              {state.fryer.map((item, idx) => (
                <CookStationSlot key={idx} item={item} kind="fryer" idx={idx}
                  shiftSec={state.shiftSec}
                  onPress={() => item ? onCookSlotPress("fryer", idx) : placeIntoSlot("fryer", idx)} />
              ))}
            </View>
          </View>

          {/* Grill */}
          <View style={styles.station}>
            <SectionHeader title="Grill 450°F" sub="Flip at midpoint" />
            <View style={styles.row4}>
              {state.grill.map((item, idx) => (
                <CookStationSlot key={idx} item={item} kind="grill" idx={idx}
                  shiftSec={state.shiftSec}
                  onPress={() => item ? onCookSlotPress("grill", idx) : placeIntoSlot("grill", idx)} />
              ))}
            </View>
          </View>

          {/* Sauté */}
          <View style={styles.station}>
            <SectionHeader title="Sauté · Alfredo" sub="4 min after cook" />
            <View style={styles.row2}>
              {state.saute.map((item, idx) => (
                <CookStationSlot key={idx} item={item} kind="saute" idx={idx}
                  shiftSec={state.shiftSec}
                  onPress={() => item ? onCookSlotPress("saute", idx) : placeIntoSlot("saute", idx)} />
              ))}
            </View>
          </View>

          {/* Hot Hold */}
          <View style={styles.station}>
            <SectionHeader title="Hot Hold" sub="Instant" />
            <View style={styles.rowWrap}>
              {HOLD_ITEMS.map(it => (
                <InstantButton
                  key={it.id} name={it.name} kind="side"
                  selected={state.picked?.kind === "side" && state.picked.id === it.id}
                  onPress={() => pickInstant("side", it.id)}
                />
              ))}
            </View>
          </View>

          {/* Window */}
          <View style={styles.station}>
            <SectionHeader title="Window" sub="Drinks & Desserts" />
            <View style={styles.rowWrap}>
              {COLD_ITEMS.map(it => (
                <InstantButton
                  key={it.id} name={it.name} kind="cold"
                  selected={state.picked?.kind === "cold" && state.picked.id === it.id}
                  onPress={() => pickInstant("cold", it.id)}
                />
              ))}
            </View>
          </View>

          {/* Pass */}
          <View style={styles.station}>
            <SectionHeader title="The Pass" sub="Select ticket → plate" />
            <View style={styles.row3}>
              {state.pass.slice(0, 3).map((item, idx) => (
                <PassSlot key={idx} item={item} idx={idx} shiftSec={state.shiftSec} onPress={() => onPassPress(idx)} />
              ))}
            </View>
            <View style={[styles.row3, { marginTop: 6 }]}>
              {state.pass.slice(3, 6).map((item, idx) => (
                <PassSlot key={idx + 3} item={item} idx={idx + 3} shiftSec={state.shiftSec} onPress={() => onPassPress(idx + 3)} />
              ))}
            </View>
          </View>
        </ScrollView>

        {/* RIGHT: TICKETS */}
        <ScrollView
          style={[styles.tickets, { backgroundColor: "#0e1012", borderLeftColor: colors.line }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.ticketsContent, { paddingBottom: bottomPad + 20 }]}
        >
          <View style={[styles.ticketsHead, { borderBottomColor: colors.line }]}>
            <Text style={[styles.ticketsTitle, { color: colors.inkFaint }]}>TICKETS</Text>
            <View style={[styles.ticketsBadge, { backgroundColor: colors.hot }]}>
              <Text style={styles.ticketsBadgeText}>{state.orders.length}</Text>
            </View>
          </View>

          {state.orders.length === 0 ? (
            <View style={[styles.noTickets, { borderColor: colors.line2 }]}>
              <Text style={[styles.noTicketsText, { color: colors.inkFaint }]}>NO TICKETS{"\n"}WAITING…</Text>
            </View>
          ) : (
            state.orders.map(ord => (
              <TicketCard
                key={ord.id}
                order={ord}
                selected={state.selectedTicket === ord.id}
                shiftSec={state.shiftSec}
                onSelect={() => selectTicket(ord.id)}
                onSend={() => sendOrder(ord.id)}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* ── TOAST ZONE ─────────────────────────────────── */}
      <View style={[styles.toastZone, { bottom: bottomPad + 8 }]} pointerEvents="none">
        {state.toasts.map(t => (
          <View key={t.id} style={[
            styles.toast,
            { backgroundColor: colors.bg3, borderColor: t.kind === "good" ? colors.done : t.kind === "bad" ? colors.burn : t.kind === "warn" ? colors.warn : colors.line2 }
          ]}>
            <Text style={[styles.toastText, { color: t.kind === "good" ? colors.done : t.kind === "bad" ? colors.burn : t.kind === "warn" ? colors.warn : colors.foreground }]}>
              {t.msg}
            </Text>
          </View>
        ))}
      </View>

      {/* ── INTRO MODAL ─────────────────────────────────── */}
      <Modal visible={!state.started} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <IntroModal />
        </View>
      </Modal>
    </View>
  );
}

// ── PASS SLOT ──────────────────────────────────────────────────────────────────

function PassSlot({ item, idx, shiftSec, onPress }: { item: any; idx: number; shiftSec: number; onPress: () => void }) {
  const colors = useColors();
  if (!item) {
    return (
      <Pressable style={[styles.passSlot, { backgroundColor: colors.bg2, borderColor: colors.line2 }]} onPress={onPress}>
        <Text style={[styles.passEmpty, { color: colors.inkFaint }]}>Pass {idx + 1}</Text>
      </Pressable>
    );
  }
  let label = "";
  if (item.kind === "cooked") label = COOK[item.product]?.label || item.product;
  else if (item.kind === "side") label = HOLD_ITEMS.find((h: any) => h.id === item.id)?.name || item.id;
  else if (item.kind === "cold") label = COLD_ITEMS.find((h: any) => h.id === item.id)?.name || item.id;
  const ageSec = shiftSec - item.heldSince;
  const ageColor = ageSec > 90 ? colors.burn : ageSec > 45 ? colors.warn : colors.done;
  return (
    <Pressable style={[styles.passSlot, { backgroundColor: colors.bg2, borderColor: colors.done }]} onPress={onPress}>
      <Text style={[styles.passItem, { color: colors.foreground }]} numberOfLines={2}>{label}</Text>
      <Text style={[styles.passAge, { color: ageColor }]}>HELD {fmtTime(ageSec)}</Text>
    </Pressable>
  );
}

function fmtTime(s: number): string {
  s = Math.max(0, Math.round(s));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ── INTRO MODAL ─────────────────────────────────────────────────────────────

function IntroModal() {
  const colors = useColors();
  const { state, startShift, setDifficulty, setSpeed } = useGame();

  const DIFF_LABELS = [
    { key: "easy" as Difficulty, label: "Stage", sub: "Easy mode" },
    { key: "medium" as Difficulty, label: "Sat Lunch", sub: "Medium" },
    { key: "hard" as Difficulty, label: "Fri Rush", sub: "Hard" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.modalScroll}>
      <View style={[styles.modal, { backgroundColor: colors.bg2, borderColor: colors.line2 }]}>
        <View style={[styles.modalAccentBar, { backgroundColor: colors.hot }]} />
        <Text style={[styles.modalTitle, { color: colors.foreground }]}>
          <Text style={{ color: colors.hot, fontStyle: "italic" }}>Soul</Text> · Line Trainer
        </Text>
        <Text style={[styles.modalSub, { color: colors.inkDim }]}>REAL MENU · REAL COOK TIMES · DRILL THE RHYTHM</Text>

        {state.bestScore > 0 && (
          <View style={[styles.bestScore, { backgroundColor: colors.bg3, borderColor: colors.line2 }]}>
            <Text style={[styles.bestScoreLabel, { color: colors.inkFaint }]}>BEST SCORE</Text>
            <Text style={[styles.bestScoreVal, { color: colors.hotLight }]}>{state.bestScore}</Text>
          </View>
        )}

        <Text style={[styles.modalSectionHead, { color: colors.hotLight }]}>FRYER · 350°F</Text>
        <View style={styles.refGrid}>
          {[
            ["Bone Wings", "10:00 direct"], ["Turkey Wings", "12:00 direct"],
            ["Boneless / Tenders", "30s bread + 5:00"], ["Crispy Chx Breast", "30s + 6:00"],
            ["Fried Snapper", "30s + 6:00"], ["Fried Shrimp", "30s + 3:00"],
            ["Lobster Bites", "30s + 4:00"], ["Conch Fritter", "4:00 direct"],
            ["Gator Bites", "30s + 4:00"], ["Fries", "4:00 direct"],
          ].map(([k, v]) => (
            <View key={k} style={[styles.refRow, { borderBottomColor: colors.line }]}>
              <Text style={[styles.refKey, { color: colors.hotLight }]}>{k}</Text>
              <Text style={[styles.refVal, { color: colors.foreground }]}>{v}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.modalSectionHead, { color: colors.hotLight }]}>GRILL · 450°F · Flip at midpoint</Text>
        <View style={styles.refGrid}>
          {[
            ["Grilled Chx", "12:00 · flip 6:00"], ["Grilled Snapper", "9:00 · flip 4:30"],
            ["Grilled Shrimp", "4:00 · flip 2:00"], ["Grilled Salmon", "8:00 · flip 4:00"],
            ["Strip Steak Well", "12:00 · flip 6:00"], ["Lamb Chops Well", "8:00 · flip 4:00"],
            ["Alfredo (sauté)", "4:00 after cook"],
          ].map(([k, v]) => (
            <View key={k} style={[styles.refRow, { borderBottomColor: colors.line }]}>
              <Text style={[styles.refKey, { color: colors.hotLight }]}>{k}</Text>
              <Text style={[styles.refVal, { color: colors.foreground }]}>{v}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.modalSectionHead, { color: colors.hotLight }]}>PENALTIES</Text>
        <View style={[styles.refRow, { borderBottomColor: colors.line }]}>
          <Text style={[styles.refKey, { color: colors.burn }]}>Burn</Text>
          <Text style={[styles.refVal, { color: colors.foreground }]}>−25 · streak broken</Text>
        </View>
        <View style={[styles.refRow, { borderBottomColor: colors.line }]}>
          <Text style={[styles.refKey, { color: colors.burn }]}>Walked</Text>
          <Text style={[styles.refVal, { color: colors.foreground }]}>−75 · 2min over due</Text>
        </View>

        <Text style={[styles.modalSectionHead, { color: colors.hotLight }]}>SPEED</Text>
        <View style={styles.speedRow}>
          {SPEEDS_LIST.map(sp => (
            <Pressable key={sp} style={[styles.speedBtn, { borderColor: colors.line2, backgroundColor: state.speed === sp ? colors.hot : colors.bg3 }]} onPress={() => setSpeed(sp)}>
              <Text style={[styles.speedBtnText, { color: state.speed === sp ? "#1a0d04" : colors.foreground }]}>{sp}×</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.modalSectionHead, { color: colors.hotLight }]}>DIFFICULTY</Text>
        <View style={styles.diffRow}>
          {DIFF_LABELS.map(d => (
            <Pressable
              key={d.key}
              style={[styles.diffBtn, { borderColor: colors.line2, backgroundColor: state.difficulty === d.key ? colors.hot : colors.bg3 }]}
              onPress={() => setDifficulty(d.key)}
            >
              <Text style={[styles.diffBtnText, { color: state.difficulty === d.key ? "#1a0d04" : colors.foreground }]}>{d.label}</Text>
              <Text style={[styles.diffBtnSub, { color: state.difficulty === d.key ? "#1a0d04" : colors.inkFaint }]}>{d.sub}</Text>
            </Pressable>
          ))}
        </View>

        <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.hot }]} onPress={startShift}>
          <Text style={styles.startBtnText}>START SHIFT</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8,
  },
  brandTitle: { fontSize: 14, fontWeight: "700", letterSpacing: 1.5 },
  brandSub: { fontSize: 8, letterSpacing: 2.5, textTransform: "uppercase" },
  scoreRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  statItem: { alignItems: "center" },
  statLabel: { fontSize: 7, letterSpacing: 2, textTransform: "uppercase" },
  statVal: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  controls: { flexDirection: "row", gap: 6, alignItems: "center" },
  speedRow: { flexDirection: "row", gap: 0 },
  speedBtn: { paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderRadius: 0 },
  speedBtnText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  ctrlBtn: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderRadius: 2 },
  ctrlBtnText: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" },

  pickedBanner: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  pickedText: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, color: "#1a0d04" },
  pickedDrop: { fontSize: 9, color: "#1a0d04", opacity: 0.8, letterSpacing: 0.5, marginTop: 1 },

  stage: { flex: 1, flexDirection: "row" },

  sidebar: { width: 100, borderRightWidth: 1 },
  sidebarContent: { padding: 8 },
  sidebarHead: {
    fontSize: 8, letterSpacing: 2, textTransform: "uppercase",
    fontWeight: "600", marginBottom: 6, borderBottomWidth: 1, paddingBottom: 3,
  },
  ingCard: {
    padding: 7, marginBottom: 4,
    borderWidth: 1, borderLeftWidth: 3, borderRadius: 2,
  },
  ingName: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, lineHeight: 11 },
  ingMeta: { fontSize: 8, letterSpacing: 0.5, marginTop: 2 },

  floor: { flex: 1 },
  floorContent: { padding: 10, gap: 14 },
  station: {},
  row4: { flexDirection: "row", gap: 6 },
  row3: { flexDirection: "row", gap: 6 },
  row2: { flexDirection: "row", gap: 6 },
  rowWrap: { flexDirection: "row", gap: 5, flexWrap: "wrap" },

  passSlot: {
    flex: 1, minHeight: 72, padding: 8, borderRadius: 2,
    borderWidth: 1, borderStyle: "dashed",
    justifyContent: "space-between",
  },
  passEmpty: { fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", textAlign: "center", marginTop: 18 },
  passItem: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, lineHeight: 12 },
  passAge: { fontSize: 8, fontWeight: "700", letterSpacing: 1 },

  tickets: { width: 160, borderLeftWidth: 1 },
  ticketsContent: { padding: 8 },
  ticketsHead: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 10, borderBottomWidth: 1, paddingBottom: 6,
  },
  ticketsTitle: { fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: "600" },
  ticketsBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 2 },
  ticketsBadgeText: { color: "#1a0d04", fontWeight: "700", fontSize: 11 },
  noTickets: {
    borderWidth: 1, borderStyle: "dashed", borderRadius: 4,
    paddingVertical: 20, alignItems: "center",
  },
  noTicketsText: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", textAlign: "center", lineHeight: 16 },

  toastZone: {
    position: "absolute",
    left: 0, right: 0, alignItems: "center",
    gap: 5, pointerEvents: "none",
  },
  toast: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderRadius: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8,
  },
  toastText: { fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontWeight: "600" },

  // MODAL
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" },
  modalScroll: { padding: 16, minHeight: "100%" as any, justifyContent: "center" },
  modal: {
    borderWidth: 1, borderRadius: 2,
    padding: 20, width: "100%", maxWidth: 420,
    alignSelf: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.8, shadowRadius: 40,
  },
  modalAccentBar: { height: 3, borderRadius: 1, marginBottom: 14, marginHorizontal: -20, marginTop: -20, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  modalTitle: { fontSize: 22, fontWeight: "800", letterSpacing: 2, marginBottom: 2 },
  modalSub: { fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 14 },
  bestScore: { padding: 10, borderRadius: 2, borderWidth: 1, alignItems: "center", marginBottom: 14 },
  bestScoreLabel: { fontSize: 8, letterSpacing: 2.5, textTransform: "uppercase" },
  bestScoreVal: { fontSize: 28, fontWeight: "800", letterSpacing: 1 },
  modalSectionHead: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontWeight: "700", marginTop: 14, marginBottom: 6 },
  refGrid: { gap: 0 },
  refRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 4, borderBottomWidth: 1, borderStyle: "dashed",
  },
  refKey: { fontSize: 11, fontWeight: "700", flex: 1 },
  refVal: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right" },
  diffRow: { flexDirection: "row", gap: 6 },
  diffBtn: {
    flex: 1, padding: 8, borderRadius: 2, borderWidth: 1,
    alignItems: "center",
  },
  diffBtnText: { fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  diffBtnSub: { fontSize: 8, letterSpacing: 0.5, marginTop: 2 },
  startBtn: {
    marginTop: 18, paddingVertical: 14, borderRadius: 2,
    alignItems: "center",
    shadowColor: "#ff6a1f", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 12,
  },
  startBtnText: { fontSize: 16, fontWeight: "800", letterSpacing: 3, color: "#1a0d04" },
});
