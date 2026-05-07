/**
 * OrdersScreen — Refonte Just Eat Takeaway
 * ─────────────────────────────────────────────────────────────────────────────
 * Changements vs version originale :
 *  1. Tracker de progression horizontal (étapes visuelles JE)
 *  2. Bouton "Recommander" one-tap sur les commandes livrées
 *  3. Carte livreur enrichie avec photo + statut live
 *  4. Section "En cours" séparée visuellement de l'historique
 *  5. Estimation d'arrivée en grand en haut des commandes actives
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { LiveDeliveryMap } from "../components/LiveDeliveryMap";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { translateStatus } from "../i18n/mobile";
import { formatCurrency, formatDateTime } from "../services/format";

const JE = {
  orange: "#F36E26",
  orangeLight: "#FFF0E8",
  dark: "#181C2E",
  grey: "#898989",
  greyLight: "#F5F5F5",
  white: "#FFFFFF",
  green: "#22C55E",
  greenLight: "#F0FFF4",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  border: "#F0F0F0",
};

// ─── Étapes du tracker JE ─────────────────────────────────────────────────────
const STEPS = [
  { key: "Confirmed",    label: "Confirmée",  icon: "checkmark-circle-outline" as const },
  { key: "Preparing",   label: "En prépa",   icon: "restaurant-outline" as const },
  { key: "On the way",  label: "En route",   icon: "bicycle-outline" as const },
  { key: "Delivered",   label: "Livrée",     icon: "home-outline" as const },
];

const STEP_ORDER = ["Confirmed", "Preparing", "On the way", "Delivered"];

function stepIndex(status: string) {
  return STEP_ORDER.indexOf(status);
}

// ─── Tracker horizontal (signature JE) ───────────────────────────────────────
function JETracker({ status }: { status: string }) {
  const currentIdx = stepIndex(status);
  return (
    <View style={t.wrap}>
      {STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={step.key}>
            {/* Étape */}
            <View style={t.step}>
              <View style={[t.circle, done && t.circleDone, active && t.circleActive]}>
                <Ionicons
                  name={step.icon}
                  size={14}
                  color={done ? JE.white : "#C4C4C4"}
                />
              </View>
              <Text style={[t.label, done && t.labelDone]} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
            {/* Connecteur */}
            {i < STEPS.length - 1 && (
              <View style={[t.line, i < currentIdx && t.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const t = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", paddingVertical: 8,
  },
  step: { alignItems: "center", gap: 5, flex: 0, width: 52 },
  circle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#E8E8E8", alignItems: "center", justifyContent: "center",
  },
  circleDone: { backgroundColor: JE.orange },
  circleActive: {
    backgroundColor: JE.orange,
    shadowColor: JE.orange, shadowOpacity: 0.4,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  label: { fontSize: 9, fontWeight: "600", color: "#C4C4C4", textAlign: "center" },
  labelDone: { color: JE.orange },
  line: { flex: 1, height: 2, backgroundColor: "#E8E8E8", marginTop: 14 },
  lineDone: { backgroundColor: JE.orange },
});

// ─── Carte commande active ────────────────────────────────────────────────────
function ActiveOrderCard({ item, index, restaurants, currentLocation, language }: any) {
  const restaurant = restaurants.find((r: any) => r.id === item.restaurantId);
  const courierCoords =
    item.courier?.currentLat != null && item.courier?.currentLng != null
      ? { latitude: item.courier.currentLat, longitude: item.courier.currentLng }
      : null;

  return (
    <AnimatedCard delay={Math.min(index * 60, 200)} style={s.activeCard}>
      {/* Bandeau ETA orange */}
      <View style={s.etaBanner}>
        <View>
          <Text style={s.etaLabel}>Livraison estimée</Text>
          <Text style={s.etaTime}>{item.estimatedDeliveryLabel}</Text>
        </View>
        <View style={s.etaRight}>
          <Ionicons name="bicycle" size={28} color={JE.white} />
        </View>
      </View>

      {/* En-tête */}
      <View style={s.cardHeader}>
        <View style={s.orderIdWrap}>
          <Text style={s.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
          <Text style={s.restaurantName}>{item.restaurantName}</Text>
        </View>
        <View style={s.statusBadge}>
          <Text style={s.statusTxt}>{translateStatus(language, item.status)}</Text>
        </View>
      </View>

      {/* Tracker JE */}
      <JETracker status={item.status} />

      {/* Carte livreur */}
      {item.courier && (
        <View style={s.courierCard}>
          <View style={s.courierAvatar}>
            <Ionicons name="person" size={18} color={JE.orange} />
          </View>
          <View style={s.courierInfo}>
            <Text style={s.courierName}>{item.courier.name}</Text>
            <Text style={s.courierVehicle}>{item.courier.vehicle}</Text>
          </View>
          <TouchableOpacity style={s.callBtn}>
            <Ionicons name="call-outline" size={16} color={JE.orange} />
          </TouchableOpacity>
          <TouchableOpacity style={s.chatBtn}>
            <Ionicons name="chatbubble-outline" size={16} color={JE.blue} />
          </TouchableOpacity>
        </View>
      )}

      {/* Chips méta */}
      <View style={s.chips}>
        <View style={s.chip}>
          <Ionicons name="receipt-outline" size={11} color={JE.orange} />
          <Text style={s.chipTxt}>{item.items.length} article{item.items.length > 1 ? "s" : ""}</Text>
        </View>
        <View style={s.chip}>
          <Ionicons name="cash-outline" size={11} color={JE.orange} />
          <Text style={s.chipTxt}>{formatCurrency(item.total)}</Text>
        </View>
        <View style={s.chip}>
          <Ionicons name="location-outline" size={11} color={JE.orange} />
          <Text style={s.chipTxt} numberOfLines={1}>{item.address}</Text>
        </View>
      </View>

      {/* Carte live */}
      {restaurant && (
        <LiveDeliveryMap
          pickup={restaurant.coordinates}
          destination={currentLocation.coordinates}
          courier={courierCoords}
          title={item.courier ? "Suivi en direct 🛵" : "En attente de livreur"}
          subtitle={
            item.courier
              ? `${item.courier.name} est en route vers vous.`
              : "Le suivi s'active dès qu'un livreur est assigné."
          }
        />
      )}
    </AnimatedCard>
  );
}

// ─── Carte commande livrée ────────────────────────────────────────────────────
function DeliveredOrderCard({
  item, index, language, onReorder,
}: {
  item: any; index: number; language: string; onReorder: () => void;
}) {
  return (
    <AnimatedCard delay={Math.min(index * 50, 180)} style={s.deliveredCard}>
      <View style={s.deliveredHeader}>
        <View style={s.orderIdWrap}>
          <Text style={s.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
          <Text style={s.restaurantName}>{item.restaurantName}</Text>
        </View>
        {/* Badge livré */}
        <View style={s.deliveredBadge}>
          <Ionicons name="checkmark-circle" size={13} color={JE.green} />
          <Text style={s.deliveredBadgeTxt}>Livrée</Text>
        </View>
      </View>

      {/* Méta */}
      <View style={s.deliveredMeta}>
        <Text style={s.deliveredDate}>
          {formatDateTime(item.createdAt, language)} · {item.deliveryDistanceKm} km
        </Text>
        <Text style={s.deliveredItems}>
          {item.items.length} article{item.items.length > 1 ? "s" : ""} · {formatCurrency(item.total)}
        </Text>
        <View style={s.pointsRow}>
          <Ionicons name="star" size={12} color={JE.green} />
          <Text style={s.pointsTxt}>+{item.pointsEarned} pts gagnés</Text>
        </View>
      </View>

      {/* Bouton Recommander — CTA JE signature */}
      <TouchableOpacity style={s.reorderBtn} onPress={onReorder} activeOpacity={0.82}>
        <Ionicons name="refresh" size={15} color={JE.white} />
        <Text style={s.reorderTxt}>Recommander</Text>
        <Text style={s.reorderPrice}>{formatCurrency(item.total)}</Text>
      </TouchableOpacity>
    </AnimatedCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function OrdersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { orders, restaurants, currentLocation, reorder, t, language, isRTL } = useApp();

  const activeOrders = orders.filter((o) => o.status !== "Delivered");
  const deliveredOrders = orders.filter((o) => o.status === "Delivered");

  // Construit la liste aplatie : actives d'abord, séparateur, puis livrées
  type Row =
    | { type: "header_active" }
    | { type: "active"; data: any; idx: number }
    | { type: "header_history" }
    | { type: "delivered"; data: any; idx: number }
    | { type: "stats" };

  const rows: Row[] = [
    { type: "stats" },
    ...(activeOrders.length > 0
      ? [
          { type: "header_active" as const },
          ...activeOrders.map((o, i) => ({ type: "active" as const, data: o, idx: i })),
        ]
      : []),
    ...(deliveredOrders.length > 0
      ? [
          { type: "header_history" as const },
          ...deliveredOrders.map((o, i) => ({
            type: "delivered" as const,
            data: o,
            idx: i,
          })),
        ]
      : []),
  ];

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={rows}
        keyExtractor={(item, i) =>
          item.type === "active" || item.type === "delivered"
            ? item.data.id
            : `${item.type}-${i}`
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}

        ListHeaderComponent={
          <View style={s.pageHeader}>
            <Text style={[s.pageTitle, { textAlign: isRTL ? "right" : "left" }]}>
              {t("my_orders")}
            </Text>
            <Text style={[s.pageSubtitle, { textAlign: isRTL ? "right" : "left" }]}>
              {t("orders_subtitle")}
            </Text>
          </View>
        }

        renderItem={({ item }) => {
          if (item.type === "stats") {
            return (
              <View style={s.statsRow}>
                {[
                  { val: orders.length,          lbl: "Total",    icon: "receipt-outline" as const,          color: JE.orange, bg: JE.orangeLight },
                  { val: activeOrders.length,    lbl: "En cours", icon: "bicycle-outline" as const,          color: JE.blue,   bg: JE.blueLight },
                  { val: deliveredOrders.length, lbl: "Livrées",  icon: "checkmark-circle-outline" as const, color: JE.green,  bg: JE.greenLight },
                ].map((stat) => (
                  <View key={stat.lbl} style={s.statCard}>
                    <View style={[s.statIcon, { backgroundColor: stat.bg }]}>
                      <Ionicons name={stat.icon} size={18} color={stat.color} />
                    </View>
                    <Text style={s.statVal}>{stat.val}</Text>
                    <Text style={s.statLbl}>{stat.lbl}</Text>
                  </View>
                ))}
              </View>
            );
          }

          if (item.type === "header_active") {
            return (
              <View style={s.sectionHeader}>
                <View style={s.sectionDot} />
                <Text style={s.sectionTitle}>En cours · {activeOrders.length}</Text>
              </View>
            );
          }

          if (item.type === "header_history") {
            return (
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Historique</Text>
              </View>
            );
          }

          if (item.type === "active") {
            return (
              <ActiveOrderCard
                item={item.data}
                index={item.idx}
                restaurants={restaurants}
                currentLocation={currentLocation}
                language={language}
              />
            );
          }

          if (item.type === "delivered") {
            return (
              <DeliveredOrderCard
                item={item.data}
                index={item.idx}
                language={language}
                onReorder={() => reorder?.(item.data)}
              />
            );
          }

          return null;
        }}

        ListEmptyComponent={
          <EmptyState title={t("delivered_orders")} message={t("delivered_orders_msg")} />
        }
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: JE.greyLight },
  listContent: { paddingBottom: 32 },

  pageHeader: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, gap: 3 },
  pageTitle: { color: JE.dark, fontSize: 28, fontWeight: "900" },
  pageSubtitle: { color: JE.grey, fontSize: 14 },

  // Stats
  statsRow: { flexDirection: "row", gap: 12, marginHorizontal: 20, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: JE.white, borderRadius: 20,
    padding: 14, gap: 6, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  statVal: { color: JE.dark, fontWeight: "900", fontSize: 22 },
  statLbl: { color: JE.grey, fontSize: 11, fontWeight: "700", textAlign: "center" },

  // Section headers
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 20, marginTop: 18, marginBottom: 8,
  },
  sectionDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: JE.orange,
  },
  sectionTitle: { color: JE.dark, fontSize: 18, fontWeight: "900" },

  // Carte active
  activeCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: JE.white,
    borderRadius: 24, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  etaBanner: {
    backgroundColor: JE.orange, paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  etaLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  etaTime: { color: JE.white, fontSize: 22, fontWeight: "900", marginTop: 2 },
  etaRight: { opacity: 0.6 },

  cardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 16, paddingTop: 14, gap: 10,
  },
  orderIdWrap: { flex: 1, gap: 3 },
  orderId: { color: "#C4C4C4", fontWeight: "700", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  restaurantName: { color: JE.dark, fontWeight: "900", fontSize: 17 },
  statusBadge: {
    backgroundColor: JE.orangeLight, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  statusTxt: { color: JE.orange, fontWeight: "800", fontSize: 12 },

  // Tracker (styles dans const t ci-dessus)

  // Livreur
  courierCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: JE.greyLight, borderRadius: 14, padding: 12,
  },
  courierAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: JE.orangeLight, alignItems: "center", justifyContent: "center",
  },
  courierInfo: { flex: 1 },
  courierName: { color: JE.dark, fontWeight: "800", fontSize: 14 },
  courierVehicle: { color: JE.grey, fontSize: 12, marginTop: 1 },
  callBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: JE.orangeLight, alignItems: "center", justifyContent: "center",
  },
  chatBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: JE.blueLight, alignItems: "center", justifyContent: "center",
  },

  // Chips
  chips: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
    paddingHorizontal: 16, paddingBottom: 14,
  },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: JE.orangeLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
  },
  chipTxt: { color: JE.orange, fontWeight: "700", fontSize: 11, maxWidth: 120 },

  // Carte livrée
  deliveredCard: {
    marginHorizontal: 16, marginBottom: 10, backgroundColor: JE.white,
    borderRadius: 18, padding: 16, gap: 12,
    borderWidth: 1, borderColor: JE.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  deliveredHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  deliveredBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: JE.greenLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4,
  },
  deliveredBadgeTxt: { color: JE.green, fontWeight: "700", fontSize: 11 },
  deliveredMeta: { gap: 4 },
  deliveredDate: { color: JE.grey, fontSize: 12 },
  deliveredItems: { color: JE.dark, fontWeight: "700", fontSize: 13 },
  pointsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  pointsTxt: { color: JE.green, fontWeight: "600", fontSize: 12 },

  // Bouton Recommander
  reorderBtn: {
    backgroundColor: JE.orange, borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center", gap: 8,
    shadowColor: JE.orange, shadowOpacity: 0.35,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  reorderTxt: { flex: 1, color: JE.white, fontWeight: "800", fontSize: 14 },
  reorderPrice: { color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 13 },
});
