import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { LiveDeliveryMap } from "../components/LiveDeliveryMap";
import { OrderStatusTimeline } from "../components/OrderStatusTimeline";
import { useApp } from "../context/AppContext";
import { translateStatus } from "../i18n/mobile";
import { formatCurrency, formatDateTime } from "../services/format";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Confirmed:    { label: "Confirmée",   color: "#FF7622", bg: "#FFF3EC", icon: "checkmark-circle-outline" },
  Preparing:    { label: "En prépa",    color: "#F59E0B", bg: "#FFFBEB", icon: "restaurant-outline" },
  "On the way": { label: "En route",   color: "#3B82F6", bg: "#EFF6FF", icon: "bicycle-outline" },
  Delivered:    { label: "Livrée",      color: "#22C55E", bg: "#F0FFF4", icon: "checkmark-done-circle-outline" },
};

export function OrdersScreen() {
  const { orders, restaurants, currentLocation, t, language, isRTL } = useApp();
  const activeOrders = orders.filter((o) => o.status !== "Delivered");
  const deliveredOrders = orders.filter((o) => o.status === "Delivered");

  const ListHeader = () => (
    <View style={s.headerBlock}>
      {/* Page title */}
      <View>
        <Text style={[s.pageTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("my_orders")}</Text>
        <Text style={[s.pageSubtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("orders_subtitle")}</Text>
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        {[
          { val: orders.length,          lbl: "Total",     icon: "receipt-outline" as const,           color: "#FF7622", bg: "#FFF3EC" },
          { val: activeOrders.length,    lbl: "En cours",  icon: "bicycle-outline" as const,           color: "#3B82F6", bg: "#EFF6FF" },
          { val: deliveredOrders.length, lbl: "Livrées",   icon: "checkmark-circle-outline" as const,  color: "#22C55E", bg: "#F0FFF4" },
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
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={<ListHeader />}
        renderItem={({ item, index }) => {
          const restaurant = restaurants.find((r) => r.id === item.restaurantId);
          const courierCoords =
            item.courier?.currentLat != null && item.courier?.currentLng != null
              ? { latitude: item.courier.currentLat, longitude: item.courier.currentLng }
              : null;
          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.Confirmed;

          return (
            <AnimatedCard delay={Math.min(index * 70, 280)} style={s.orderCard}>
              {/* Card header */}
              <View style={s.cardHeader}>
                <View style={s.orderIdWrap}>
                  <Text style={s.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
                  <Text style={s.restaurantName}>{item.restaurantName}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={13} color={cfg.color} />
                  <Text style={[s.statusText, { color: cfg.color }]}>{translateStatus(language, item.status)}</Text>
                </View>
              </View>

              {/* Timeline */}
              <OrderStatusTimeline status={item.status} />

              {/* Metric chips */}
              <View style={s.chips}>
                {[
                  { icon: "receipt-outline" as const, val: `${item.items.length} article${item.items.length > 1 ? "s" : ""}` },
                  { icon: "cash-outline" as const,    val: formatCurrency(item.total) },
                  { icon: "time-outline" as const,    val: item.estimatedDeliveryLabel },
                ].map((chip) => (
                  <View key={chip.val} style={s.chip}>
                    <Ionicons name={chip.icon} size={12} color="#FF7622" />
                    <Text style={s.chipText}>{chip.val}</Text>
                  </View>
                ))}
              </View>

              {/* Detail block */}
              <View style={s.detailBlock}>
                <View style={s.detailRow}>
                  <Ionicons name="location-outline" size={14} color="#C4C4C4" />
                  <Text style={s.detailText} numberOfLines={1}>{item.address}</Text>
                </View>
                <View style={s.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color="#C4C4C4" />
                  <Text style={s.detailText}>{item.deliveryDistanceKm} km · {formatDateTime(item.createdAt, language)}</Text>
                </View>
                <View style={s.detailRow}>
                  <Ionicons name="star" size={14} color="#FF7622" />
                  <Text style={[s.detailText, { color: "#FF7622", fontWeight: "800" }]}>+{item.pointsEarned} pts gagnés</Text>
                </View>
                {item.courier && (
                  <View style={s.courierRow}>
                    <View style={s.courierAvatar}>
                      <Ionicons name="bicycle" size={14} color="#FF7622" />
                    </View>
                    <View>
                      <Text style={s.courierName}>{item.courier.name}</Text>
                      <Text style={s.courierVehicle}>{item.courier.vehicle} · {translateStatus(language, item.status)}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Live map */}
              {restaurant && (
                <LiveDeliveryMap
                  pickup={restaurant.coordinates}
                  destination={currentLocation.coordinates}
                  courier={courierCoords}
                  title={item.courier ? "Suivi en direct 🛵" : "En attente de livreur"}
                  subtitle={
                    item.courier
                      ? `${item.courier.name} est en route vers vous.`
                      : "Le suivi s'active automatiquement dès qu'un livreur est assigné."
                  }
                />
              )}
            </AnimatedCard>
          );
        }}
        ListEmptyComponent={
          <EmptyState title={t("delivered_orders")} message={t("delivered_orders_msg")} />
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  listContent: { paddingBottom: 32 },

  headerBlock: { padding: 20, gap: 18, paddingBottom: 8 },
  pageTitle: { color: "#181C2E", fontSize: 28, fontWeight: "900" },
  pageSubtitle: { color: "#898989", fontSize: 14, marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1, backgroundColor: "#FFF", borderRadius: 20, padding: 14, gap: 8, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  statVal: { color: "#181C2E", fontWeight: "900", fontSize: 22 },
  statLbl: { color: "#898989", fontSize: 11, fontWeight: "700", textAlign: "center" },

  orderCard: {
    marginHorizontal: 20, marginBottom: 16, backgroundColor: "#FFF", borderRadius: 24, padding: 18, gap: 14,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  orderIdWrap: { flex: 1, gap: 3 },
  orderId: { color: "#C4C4C4", fontWeight: "700", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  restaurantName: { color: "#181C2E", fontWeight: "900", fontSize: 18 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontWeight: "800", fontSize: 12 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FFF3EC", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
  },
  chipText: { color: "#FF7622", fontWeight: "700", fontSize: 12 },

  detailBlock: { backgroundColor: "#FAFAFA", borderRadius: 16, padding: 14, gap: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { flex: 1, color: "#898989", fontSize: 13, fontWeight: "600", lineHeight: 18 },
  courierRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: "#F0F0F0",
  },
  courierAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFF3EC",
    alignItems: "center", justifyContent: "center",
  },
  courierName: { color: "#181C2E", fontWeight: "800", fontSize: 13 },
  courierVehicle: { color: "#898989", fontSize: 12, marginTop: 1 },
});
