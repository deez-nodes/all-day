import React from "react";
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
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  PROTEINS,
  FRY_SIDES,
  HOLD_ITEMS,
  COLD_ITEMS,
  COOK,
  BREADED_TO_COOK,
  useGame,
  Difficulty,
  Order,
  Ingredient,
} from "@/context/GameContext";
import { CookStationSlot, BreadStationSlot } from "@/components/StationSlot";
import { TicketCard } from "@/components/TicketCard";
import { InstantButton } from "@/components/InstantButton";
import { SectionHeader } from "@/components/SectionHeader";
import { useColors } from "@/hooks/useColors";
import { Draggable, DropZone } from "@/lib/dnd";

type DragPayload =
  | { kind: "walkIn"; id: string }
  | { kind: "instant"; instantKind: "side" | "cold"; id: string }
  | { kind: "breadSlot"; idx: number }
  | { kind: "cookSlot"; station: "fryer" | "grill" | "saute"; idx: number };

const SPEEDS_LIST = [1, 3, 6, 12];

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLandscape = width >= 760;

  const {
    state,
    togglePause, setSpeed, endShift,
    pickIngredient, pickInstant, clearPick,
    onCookSlotPress, onBreadSlotPress, placeIntoSlot,
    onPassPress, selectTicket, sendOrder,
    fmtTime,
  } = useGame();

  const topPad = Platform.OS === "web" ? 12 : insets.top;
  const bottomPad = Platform.OS === "web" ? 12 : insets.bottom;

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

  // ── Auto-scroll to relevant station when picking ───────────────────────
  const stationsScrollRef = React.useRef<ScrollView | null>(null);
  const stationOffsets = React.useRef<Record<string, number>>({}).current;

  React.useEffect(() => {
    if (!state.picked || isLandscape) return;
    let target: string | null = null;
    if (state.picked.kind === "ingredient") {
      const pickedId = state.picked.id;
      const ing = [...PROTEINS, ...FRY_SIDES].find(i => i.id === pickedId);
      if (ing) {
        // Scroll to the top-most relevant station so the user can scan downward
        // through all valid destinations (bread → fryer → grill → saute).
        const stations = Object.keys(ing.direct);
        if (stations.includes("bread")) target = "bread";
        else if (stations.includes("fryer")) target = "fryer";
        else if (stations.includes("grill")) target = "grill";
        else if (stations.includes("saute")) target = "saute";
      }
    } else if (state.picked.kind === "breaded") {
      target = "fryer";
    } else if (state.picked.kind === "cooked") {
      // Cooked proteins can go to sauté (Alfredo) or straight to the pass —
      // scroll to sauté so both stations are visible together.
      target = "saute";
    } else if (state.picked.kind === "side" || state.picked.kind === "cold") {
      target = "pass";
    }
    const tryScroll = (attempt: number) => {
      if (!target) return;
      const y = stationOffsets[target];
      if (y !== undefined) {
        stationsScrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
      } else if (attempt < 3) {
        setTimeout(() => tryScroll(attempt + 1), 80);
      }
    };
    tryScroll(0);
  }, [state.picked, isLandscape, stationOffsets]);

  const onStationLayout = (key: string) => (e: { nativeEvent: { layout: { y: number } } }) => {
    stationOffsets[key] = e.nativeEvent.layout.y;
  };

  // ── Demand counters for badges ─────────────────────────────────────────
  const ingredientProducts = (ing: Ingredient): Set<string> => {
    const products = new Set<string>();
    Object.entries(ing.direct).forEach(([station, target]) => {
      if (station === "bread") {
        const cooked = BREADED_TO_COOK[target];
        if (cooked) products.add(cooked);
      } else {
        products.add(target);
      }
    });
    return products;
  };

  const ingredientDemand = (ingId: string): number => {
    const ing = [...PROTEINS, ...FRY_SIDES].find(i => i.id === ingId);
    if (!ing) return 0;
    const products = ingredientProducts(ing);
    let count = 0;
    state.orders.forEach((o: Order) => {
      o.items.forEach(it => {
        if (it.fulfilled) return;
        if (it.kind === "cook" && it.product && products.has(it.product)) count++;
        else if (it.kind === "cook_choice" && it.products?.some(p => products.has(p))) count++;
      });
    });
    return count;
  };

  const instantDemand = (id: string): number => {
    let count = 0;
    state.orders.forEach((o: Order) => {
      o.items.forEach(it => {
        if (it.fulfilled) return;
        if ((it.kind === "side" || it.kind === "cold") && it.product === id) count++;
      });
    });
    return count;
  };

  // ── Drop handlers (atomic pickup + place via chained functional setStates)
  const dropWalkInToStation = (
    ingId: string,
    station: "bread" | "fryer" | "grill" | "saute",
  ) => {
    const ing = [...PROTEINS, ...FRY_SIDES].find(i => i.id === ingId);
    if (!ing || !ing.direct[station]) return;
    const arr =
      station === "bread" ? state.bread :
      station === "fryer" ? state.fryer :
      station === "grill" ? state.grill : state.saute;
    const idx = arr.findIndex(s => !s);
    if (idx === -1) return;
    pickIngredient(ingId);
    placeIntoSlot(station, idx);
  };

  const dropBreadedToFryer = (srcIdx: number) => {
    const idx = state.fryer.findIndex(s => !s);
    if (idx === -1) return;
    onBreadSlotPress(srcIdx);
    placeIntoSlot("fryer", idx);
  };

  const dropCookedToPass = (
    src: { station: "fryer" | "grill" | "saute"; idx: number },
    passIdx: number,
  ) => {
    onCookSlotPress(src.station, src.idx);
    onPassPress(passIdx);
  };

  const dropCookedToSaute = (
    src: { station: "fryer" | "grill" | "saute"; idx: number },
    sauteIdx: number,
  ) => {
    onCookSlotPress(src.station, src.idx);
    placeIntoSlot("saute", sauteIdx);
  };

  const dropInstantToPass = (
    instantKind: "side" | "cold",
    id: string,
    passIdx: number,
  ) => {
    pickInstant(instantKind, id);
    onPassPress(passIdx);
  };

  // ── Drop zone accept predicates ────────────────────────────────────────
  const stationAccepts = (station: "bread" | "fryer" | "grill" | "saute") => (p: DragPayload) => {
    if (p.kind === "walkIn") {
      const ing = [...PROTEINS, ...FRY_SIDES].find(i => i.id === p.id);
      return !!ing?.direct[station];
    }
    if (p.kind === "breadSlot") return station === "fryer";
    return false;
  };

  const passSlotAccepts = (idx: number) => (p: DragPayload) => {
    if (state.pass[idx]) return false;
    return p.kind === "cookSlot" || p.kind === "instant";
  };

  const sauteSlotAccepts = (idx: number) => (p: DragPayload) => {
    if (state.saute[idx]) return false;
    if (p.kind !== "cookSlot") return false;
    const slot =
      p.station === "fryer" ? state.fryer[p.idx] :
      p.station === "grill" ? state.grill[p.idx] : state.saute[p.idx];
    if (!slot?.done || slot.overcooked) return false;
    return Object.values(COOK).some(
      v => v.station === "saute" && v.requiresCooked?.includes(slot.cookKey),
    );
  };

  // ── Helpers for ghosts and badges ──────────────────────────────────────
  const simpleGhost = (label: string, kind: "ing" | "cooked" | "side" | "cold" | "breaded" = "ing") => (
    <View style={[styles.ghostCard, {
      borderColor: kind === "cooked" ? colors.done : kind === "side" ? colors.warn : kind === "cold" ? colors.raw : colors.hot,
      backgroundColor: colors.bg3,
    }]}>
      <Text style={[styles.ghostText, { color: colors.foreground }]} numberOfLines={2}>{label}</Text>
    </View>
  );

  const DemandBadge = ({ n }: { n: number }) => {
    if (n <= 0) return null;
    return (
      <View style={[styles.demandBadge, { backgroundColor: colors.hot, borderColor: "#0e1012" }]}>
        <Text style={styles.demandBadgeText}>{n > 9 ? "9+" : n}</Text>
      </View>
    );
  };

  // ── Wrappers: cook & bread slots (draggable when done) ─────────────────
  const renderBreadSlot = (item: any, idx: number) => {
    if (!item) {
      return <BreadStationSlot key={idx} item={item} idx={idx} onPress={() => placeIntoSlot("bread", idx)} />;
    }
    return (
      <Draggable
        key={idx}
        enabled={!!item.done}
        payload={{ kind: "breadSlot", idx } as DragPayload}
        ghost={simpleGhost(`Breaded ${item.id.replace(/^_/, "").replace(/_/g, " ")}`, "breaded")}
        ghostSize={{ w: 110, h: 56 }}
        onTap={() => onBreadSlotPress(idx)}
        style={styles.slotWrap}
      >
        <BreadStationSlot asView item={item} idx={idx} />
      </Draggable>
    );
  };

  const renderCookSlot = (
    station: "fryer" | "grill" | "saute",
    item: any,
    idx: number,
  ) => {
    if (!item) {
      return (
        <CookStationSlot
          key={idx} item={item} kind={station} idx={idx}
          shiftSec={state.shiftSec}
          onPress={() => placeIntoSlot(station, idx)}
        />
      );
    }
    const draggable = item.done && !item.overcooked;
    const label = COOK[item.cookKey]?.label || item.cookKey;
    return (
      <Draggable
        key={idx}
        enabled={draggable}
        payload={{ kind: "cookSlot", station, idx } as DragPayload}
        ghost={simpleGhost(label, "cooked")}
        ghostSize={{ w: 110, h: 56 }}
        onTap={() => onCookSlotPress(station, idx)}
        style={styles.slotWrap}
      >
        <CookStationSlot asView item={item} kind={station} idx={idx} shiftSec={state.shiftSec} />
      </Draggable>
    );
  };

  // ── Stations content (shared by portrait & landscape) ──────────────────
  const stationsContent = (
    <>
      <View style={styles.station} onLayout={onStationLayout("bread")}>
        <SectionHeader title="Breading" sub="30s" />
        <DropZone<DragPayload>
          zoneId="station-bread"
          accepts={stationAccepts("bread")}
          onDrop={(p) => {
            if (p.kind === "walkIn") dropWalkInToStation(p.id, "bread");
          }}
        >
          {({ isOver }) => (
            <View style={[styles.row3, isOver && styles.rowOver]}>
              {state.bread.map((item, idx) => renderBreadSlot(item, idx))}
            </View>
          )}
        </DropZone>
      </View>

      <View style={styles.station} onLayout={onStationLayout("fryer")}>
        <SectionHeader title="Fryer 350°F" sub="4 baskets" />
        <DropZone<DragPayload>
          zoneId="station-fryer"
          accepts={stationAccepts("fryer")}
          onDrop={(p) => {
            if (p.kind === "walkIn") dropWalkInToStation(p.id, "fryer");
            else if (p.kind === "breadSlot") dropBreadedToFryer(p.idx);
          }}
        >
          {({ isOver }) => (
            <View style={[styles.row4, isOver && styles.rowOver]}>
              {state.fryer.map((item, idx) => renderCookSlot("fryer", item, idx))}
            </View>
          )}
        </DropZone>
      </View>

      <View style={styles.station} onLayout={onStationLayout("grill")}>
        <SectionHeader title="Grill 450°F" sub="Flip at midpoint" />
        <DropZone<DragPayload>
          zoneId="station-grill"
          accepts={stationAccepts("grill")}
          onDrop={(p) => {
            if (p.kind === "walkIn") dropWalkInToStation(p.id, "grill");
          }}
        >
          {({ isOver }) => (
            <View style={[styles.row4, isOver && styles.rowOver]}>
              {state.grill.map((item, idx) => renderCookSlot("grill", item, idx))}
            </View>
          )}
        </DropZone>
      </View>

      <View style={styles.station} onLayout={onStationLayout("saute")}>
        <SectionHeader title="Sauté · Alfredo" sub="4 min after cook" />
        <View style={styles.row2}>
          {state.saute.map((item, idx) => (
            <DropZone<DragPayload>
              key={idx}
              zoneId={`saute-${idx}`}
              accepts={sauteSlotAccepts(idx)}
              onDrop={(p) => {
                if (p.kind === "cookSlot") dropCookedToSaute({ station: p.station, idx: p.idx }, idx);
              }}
              style={styles.slotWrap}
            >
              {({ isOver }) => (
                <View style={isOver ? styles.slotOver : undefined}>
                  {renderCookSlot("saute", item, idx)}
                </View>
              )}
            </DropZone>
          ))}
        </View>
      </View>

      <View style={styles.station} onLayout={onStationLayout("hold")}>
        <SectionHeader title="Hot Hold" sub="Instant · Drag to Pass" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.instantScroll}>
          {HOLD_ITEMS.map(it => {
            const demand = instantDemand(it.id);
            return (
              <Draggable
                key={it.id}
                payload={{ kind: "instant", instantKind: "side", id: it.id } as DragPayload}
                ghost={simpleGhost(it.name, "side")}
                ghostSize={{ w: 96, h: 44 }}
                onTap={() => pickInstant("side", it.id)}
              >
                <View>
                  <InstantButton
                    asView
                    name={it.name} kind="side"
                    selected={state.picked?.kind === "side" && state.picked.id === it.id}
                  />
                  <DemandBadge n={demand} />
                </View>
              </Draggable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.station} onLayout={onStationLayout("window")}>
        <SectionHeader title="Window" sub="Drinks & Desserts · Drag to Pass" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.instantScroll}>
          {COLD_ITEMS.map(it => {
            const demand = instantDemand(it.id);
            return (
              <Draggable
                key={it.id}
                payload={{ kind: "instant", instantKind: "cold", id: it.id } as DragPayload}
                ghost={simpleGhost(it.name, "cold")}
                ghostSize={{ w: 96, h: 44 }}
                onTap={() => pickInstant("cold", it.id)}
              >
                <View>
                  <InstantButton
                    asView
                    name={it.name} kind="cold"
                    selected={state.picked?.kind === "cold" && state.picked.id === it.id}
                  />
                  <DemandBadge n={demand} />
                </View>
              </Draggable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.station} onLayout={onStationLayout("pass")}>
        <SectionHeader title="The Pass" sub="Select ticket · Drop cooked/sides here" />
        <View style={styles.row3}>
          {state.pass.slice(0, 3).map((item, idx) => (
            <PassDropSlot
              key={idx} idx={idx} item={item} shiftSec={state.shiftSec}
              accepts={passSlotAccepts(idx)}
              onTap={() => onPassPress(idx)}
              onDrop={(p) => {
                if (p.kind === "cookSlot") dropCookedToPass({ station: p.station, idx: p.idx }, idx);
                else if (p.kind === "instant") dropInstantToPass(p.instantKind, p.id, idx);
              }}
            />
          ))}
        </View>
        <View style={[styles.row3, { marginTop: 5 }]}>
          {state.pass.slice(3, 6).map((item, idx) => (
            <PassDropSlot
              key={idx + 3} idx={idx + 3} item={item} shiftSec={state.shiftSec}
              accepts={passSlotAccepts(idx + 3)}
              onTap={() => onPassPress(idx + 3)}
              onDrop={(p) => {
                if (p.kind === "cookSlot") dropCookedToPass({ station: p.station, idx: p.idx }, idx + 3);
                else if (p.kind === "instant") dropInstantToPass(p.instantKind, p.id, idx + 3);
              }}
            />
          ))}
        </View>
      </View>
    </>
  );

  // ── Walk-in (proteins + sides) ─────────────────────────────────────────
  const renderIngCard = (ing: typeof PROTEINS[number], showFryer = false) => {
    const isSelected = state.picked?.kind === "ingredient" && state.picked.id === ing.id;
    const stations = showFryer ? "FRYER" : Object.keys(ing.direct).map(k => k.toUpperCase()).join("/");
    const demand = ingredientDemand(ing.id);
    return (
      <Draggable
        key={ing.id}
        payload={{ kind: "walkIn", id: ing.id } as DragPayload}
        ghost={simpleGhost(ing.name, "ing")}
        ghostSize={{ w: isLandscape ? 110 : 96, h: 50 }}
        onTap={() => pickIngredient(ing.id)}
      >
        <View
          style={[
            isLandscape ? styles.ingCard : styles.ingCardH,
            {
              backgroundColor: isSelected ? "rgba(255,106,31,0.08)" : colors.bg3,
              borderColor: isSelected ? colors.hot : colors.line,
              borderLeftColor: isSelected ? colors.hot : colors.inkFaint,
            },
          ]}
        >
          <Text style={[styles.ingName, { color: colors.foreground }]} numberOfLines={2}>{ing.name}</Text>
          <Text style={[styles.ingMeta, { color: showFryer ? colors.hotLight : colors.inkFaint }]}>{stations}</Text>
          <DemandBadge n={demand} />
        </View>
      </Draggable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* ── TOP BAR ──────────────────────────────────────── */}
      <View style={[styles.topbar, { paddingTop: topPad + 4, borderBottomColor: colors.line, backgroundColor: "#0e1012" }]}>
        <View style={styles.topbarRow}>
          <View style={styles.brand}>
            <View style={[styles.dot, { backgroundColor: colors.hot, shadowColor: colors.hot }]} />
            <View>
              <Text style={[styles.brandTitle, { color: colors.foreground }]}>
                <Text style={{ color: colors.hot, fontStyle: "italic" }}>Soul</Text> · Line
              </Text>
              <Text style={[styles.brandSub, { color: colors.inkFaint }]}>SOUTHERN FOOD</Text>
            </View>
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
                <Text style={[styles.ctrlBtnText, { color: colors.foreground }]}>{state.paused ? "▶" : "⏸"}</Text>
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
      </View>

      {/* ── HOLDING BANNER ────────────────────────────────── */}
      {pickedLabel && (
        <Pressable
          style={[styles.pickedBanner, { backgroundColor: colors.hot }]}
          onPress={clearPick}
        >
          <Text style={styles.pickedText}>HOLDING · {pickedLabel.name.toUpperCase()}</Text>
          <Text style={styles.pickedDrop}>{pickedLabel.drop} · Tap to drop · Or drag from walk-in</Text>
        </Pressable>
      )}

      {/* ── MAIN STAGE ────────────────────────────────────── */}
      {isLandscape ? (
        // ─── LANDSCAPE: 3-column ─────────────────────────────────────
        <View style={styles.stage}>
          <ScrollView
            style={[styles.sidebar, { backgroundColor: colors.bg2, borderRightColor: colors.line }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.sidebarContent, { paddingBottom: bottomPad + 20 }]}
          >
            <Text style={[styles.sidebarHead, { color: colors.inkFaint, borderBottomColor: colors.line }]}>PROTEINS</Text>
            {PROTEINS.map(ing => renderIngCard(ing))}
            <Text style={[styles.sidebarHead, { color: colors.inkFaint, borderBottomColor: colors.line, marginTop: 10 }]}>SIDES</Text>
            {FRY_SIDES.map(ing => renderIngCard(ing, true))}
          </ScrollView>

          <ScrollView
            style={[styles.floor, { backgroundColor: colors.background }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.floorContent, { paddingBottom: bottomPad + 20 }]}
          >
            {stationsContent}
          </ScrollView>

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
      ) : (
        // ─── PORTRAIT: stacked vertical ──────────────────────────────
        <View style={styles.stagePortrait}>
          {/* Tickets — horizontal scroll on top */}
          <View style={[styles.ticketsBar, { backgroundColor: "#0e1012", borderBottomColor: colors.line }]}>
            <View style={styles.ticketsBarHead}>
              <Text style={[styles.ticketsTitle, { color: colors.inkFaint }]}>TICKETS</Text>
              <View style={[styles.ticketsBadge, { backgroundColor: colors.hot }]}>
                <Text style={styles.ticketsBadgeText}>{state.orders.length}</Text>
              </View>
            </View>
            {state.orders.length === 0 ? (
              <View style={[styles.noTicketsH, { borderColor: colors.line2 }]}>
                <Text style={[styles.noTicketsText, { color: colors.inkFaint }]}>NO TICKETS WAITING…</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ticketsBarScroll}
              >
                {state.orders.map(ord => (
                  <TicketCard
                    key={ord.id}
                    order={ord}
                    selected={state.selectedTicket === ord.id}
                    shiftSec={state.shiftSec}
                    onSelect={() => selectTicket(ord.id)}
                    onSend={() => sendOrder(ord.id)}
                    compact
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Stations — vertical scroll, takes most space */}
          <ScrollView
            ref={stationsScrollRef}
            style={[styles.floor, { backgroundColor: colors.background }]}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.floorContent}
          >
            {stationsContent}
          </ScrollView>

          {/* Walk-in — horizontal scroll at bottom */}
          <View style={[styles.walkinBar, { backgroundColor: colors.bg2, borderTopColor: colors.line, paddingBottom: bottomPad + 4 }]}>
            <Text style={[styles.walkinHead, { color: colors.inkFaint }]}>WALK-IN · DRAG TO STATION</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.walkinScroll}
            >
              {PROTEINS.map(ing => renderIngCard(ing))}
              <View style={[styles.walkinDivider, { backgroundColor: colors.line2 }]} />
              {FRY_SIDES.map(ing => renderIngCard(ing, true))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── TOAST ZONE ─────────────────────────────────── */}
      <View style={[styles.toastZone, { bottom: bottomPad + 120 }]} pointerEvents="none">
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

function PassDropSlot({
  item, idx, shiftSec, onTap, onDrop, accepts,
}: {
  item: any;
  idx: number;
  shiftSec: number;
  onTap: () => void;
  onDrop: (p: DragPayload) => void;
  accepts: (p: DragPayload) => boolean;
}) {
  const colors = useColors();
  return (
    <DropZone<DragPayload>
      zoneId={`pass-${idx}`}
      accepts={accepts}
      onDrop={onDrop}
      style={styles.slotWrap}
    >
      {({ isOver }) => <PassSlot item={item} idx={idx} shiftSec={shiftSec} onPress={onTap} highlight={isOver} />}
    </DropZone>
  );
}

function PassSlot({ item, idx, shiftSec, onPress, highlight }: { item: any; idx: number; shiftSec: number; onPress: () => void; highlight?: boolean }) {
  const colors = useColors();
  if (!item) {
    return (
      <Pressable
        style={[
          styles.passSlot,
          { backgroundColor: colors.bg2, borderColor: highlight ? colors.hot : colors.line2 },
          highlight && { borderWidth: 2, backgroundColor: "rgba(255,106,31,0.10)" },
        ]}
        onPress={onPress}
      >
        <Text style={[styles.passEmpty, { color: highlight ? colors.hot : colors.inkFaint }]}>Pass {idx + 1}</Text>
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
    { key: "easy" as Difficulty, label: "Stage", sub: "Easy" },
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
            <Pressable key={sp} style={[styles.speedBtnLg, { borderColor: colors.line2, backgroundColor: state.speed === sp ? colors.hot : colors.bg3 }]} onPress={() => setSpeed(sp)}>
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

  // ── TOP BAR ────────────────────────────────────────────
  topbar: {
    borderBottomWidth: 1,
    paddingHorizontal: 10,
    paddingBottom: 5,
    gap: 4,
  },
  topbarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8,
  },
  brandTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 1.2 },
  brandSub: { fontSize: 7, letterSpacing: 2, textTransform: "uppercase" },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statItem: { alignItems: "center", flex: 1 },
  statLabel: { fontSize: 7, letterSpacing: 1.5, textTransform: "uppercase" },
  statVal: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  controls: { flexDirection: "row", gap: 4, alignItems: "center" },
  speedRow: { flexDirection: "row", gap: 0 },
  speedBtn: { paddingHorizontal: 6, paddingVertical: 4, borderWidth: 1, borderRadius: 0 },
  speedBtnLg: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderRadius: 0, flex: 1, alignItems: "center" },
  speedBtnText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  ctrlBtn: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderRadius: 2, minWidth: 30, alignItems: "center" },
  ctrlBtnText: { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },

  // ── HOLDING BANNER ────────────────────────────────────
  pickedBanner: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  pickedText: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, color: "#1a0d04" },
  pickedDrop: { fontSize: 8, color: "#1a0d04", opacity: 0.8, letterSpacing: 0.5, marginTop: 1 },

  // ── LANDSCAPE STAGE ───────────────────────────────────
  stage: { flex: 1, flexDirection: "row" },
  sidebar: { width: 110, borderRightWidth: 1 },
  sidebarContent: { padding: 8 },
  sidebarHead: {
    fontSize: 8, letterSpacing: 2, textTransform: "uppercase",
    fontWeight: "600", marginBottom: 6, borderBottomWidth: 1, paddingBottom: 3,
  },
  ingCard: {
    padding: 7, marginBottom: 4,
    borderWidth: 1, borderLeftWidth: 3, borderRadius: 2,
  },
  ingName: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, lineHeight: 12 },
  ingMeta: { fontSize: 8, letterSpacing: 0.5, marginTop: 2 },

  // ── PORTRAIT STAGE ────────────────────────────────────
  stagePortrait: { flex: 1, flexDirection: "column", minHeight: 0 },

  ticketsBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 5,
    paddingBottom: 6,
    flexShrink: 0,
  },
  ticketsBarHead: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 4,
  },
  ticketsBarScroll: { paddingRight: 8 },

  walkinBar: {
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 5,
    flexShrink: 0,
    minHeight: 78,
  },
  walkinHead: {
    fontSize: 8, letterSpacing: 2, textTransform: "uppercase",
    fontWeight: "600", marginBottom: 4,
  },
  walkinScroll: { paddingRight: 8, gap: 5, alignItems: "stretch" },
  walkinDivider: { width: 1, marginHorizontal: 4 },
  ingCardH: {
    padding: 6,
    borderWidth: 1, borderLeftWidth: 3, borderRadius: 2,
    width: 92, justifyContent: "space-between",
    minHeight: 50,
  },

  // ── STATIONS (shared) ─────────────────────────────────
  floor: { flex: 1, minHeight: 0 },
  floorContent: { padding: 8, gap: 9, paddingBottom: 18 },
  station: {},
  row4: { flexDirection: "row", gap: 5 },
  row3: { flexDirection: "row", gap: 5 },
  row2: { flexDirection: "row", gap: 5 },
  rowWrap: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  instantScroll: { gap: 5, paddingRight: 8 },

  passSlot: {
    flex: 1, minHeight: 56, padding: 6, borderRadius: 2,
    borderWidth: 1, borderStyle: "dashed",
    justifyContent: "space-between",
  },
  passEmpty: { fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", textAlign: "center", marginTop: 12 },
  passItem: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, lineHeight: 11 },
  passAge: { fontSize: 8, fontWeight: "700", letterSpacing: 1 },

  // ── DnD ────────────────────────────────────────────────
  slotWrap: { flex: 1 },
  slotOver: {
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ff6a1f",
    backgroundColor: "rgba(255,106,31,0.08)",
  },
  rowOver: {
    borderRadius: 4,
    paddingVertical: 2,
    backgroundColor: "rgba(255,106,31,0.08)",
  },
  ghostCard: {
    flex: 1,
    width: "100%",
    height: "100%",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  ghostText: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  demandBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    zIndex: 5,
  },
  demandBadgeText: {
    color: "#1a0d04",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // ── LANDSCAPE TICKETS COLUMN ─────────────────────────
  tickets: { width: 200, borderLeftWidth: 1 },
  ticketsContent: { padding: 8 },
  ticketsHead: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 10, borderBottomWidth: 1, paddingBottom: 6,
  },
  ticketsTitle: { fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: "600" },
  ticketsBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2 },
  ticketsBadgeText: { color: "#1a0d04", fontWeight: "700", fontSize: 11 },
  noTickets: {
    borderWidth: 1, borderStyle: "dashed", borderRadius: 4,
    paddingVertical: 20, alignItems: "center",
  },
  noTicketsH: {
    borderWidth: 1, borderStyle: "dashed", borderRadius: 4,
    paddingVertical: 10, paddingHorizontal: 12, alignItems: "center",
  },
  noTicketsText: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", textAlign: "center", lineHeight: 16 },

  // ── TOASTS ───────────────────────────────────────────
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

  // ── MODAL ────────────────────────────────────────────
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" },
  modalScroll: { padding: 16, minHeight: "100%" as any, justifyContent: "center" },
  modal: {
    borderWidth: 1, borderRadius: 2,
    padding: 20, width: "100%", maxWidth: 460,
    alignSelf: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.8, shadowRadius: 40,
  },
  modalAccentBar: { height: 3, borderRadius: 1, marginBottom: 14, marginHorizontal: -20, marginTop: -20, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  modalTitle: { fontSize: 24, fontWeight: "800", letterSpacing: 2, marginBottom: 2 },
  modalSub: { fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 14 },
  bestScore: { padding: 10, borderRadius: 2, borderWidth: 1, alignItems: "center", marginBottom: 14 },
  bestScoreLabel: { fontSize: 8, letterSpacing: 2.5, textTransform: "uppercase" },
  bestScoreVal: { fontSize: 28, fontWeight: "800", letterSpacing: 1 },
  modalSectionHead: { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: "700", marginTop: 14, marginBottom: 6 },
  refGrid: { gap: 0 },
  refRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 5, borderBottomWidth: 1, borderStyle: "dashed",
  },
  refKey: { fontSize: 12, fontWeight: "700", flex: 1 },
  refVal: { fontSize: 12, flex: 1, textAlign: "right" },
  diffRow: { flexDirection: "row", gap: 6 },
  diffBtn: {
    flex: 1, padding: 10, borderRadius: 2, borderWidth: 1,
    alignItems: "center",
  },
  diffBtnText: { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  diffBtnSub: { fontSize: 9, letterSpacing: 0.5, marginTop: 2 },
  startBtn: {
    marginTop: 18, paddingVertical: 16, borderRadius: 2,
    alignItems: "center",
    shadowColor: "#ff6a1f", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 12,
  },
  startBtnText: { fontSize: 16, fontWeight: "800", letterSpacing: 3, color: "#1a0d04" },
});
