import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { LiveDeliveryMap } from "../components/LiveDeliveryMap";
import { OrderStatusTimeline } from "../components/OrderStatusTimeline";
import { useApp } from "../context/AppContext";
import { translateStatus } from "../i18n/mobile";
import { formatCurrency, formatDateTime } from "../services/format";

const statusColors = {
  Confirmed: "#EA580C",
  Preparing: "#D97706",
  "On the way": "#2563EB",
  Delivered: "#16A34A",
};

export function OrdersScreen() {
  const { orders, restaurants, currentLocation, t, language, isRTL } = useApp();

  const activeOrders = orders.filter((order) => order.status !== "Delivered");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <LinearGradient colors={["#111827", "#1F2937", "#EA580C"]} style={styles.heroCard}>
          <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("my_orders")}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("orders_subtitle")}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{orders.length}</Text>
              <Text style={styles.heroStatLabel}>Historique</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{activeOrders.length}</Text>
              <Text style={styles.heroStatLabel}>En cours</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{orders.filter((order) => order.status === "Delivered").length}</Text>
              <Text style={styles.heroStatLabel}>Livrees</Text>
            </View>
          </View>
        </LinearGradient>

        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const restaurant = restaurants.find((entry) => entry.id === item.restaurantId);
            const courierCoords =
              item.courier?.currentLat !== undefined &&
              item.courier?.currentLng !== undefined &&
              item.courier?.currentLat !== null &&
              item.courier?.currentLng !== null
                ? { latitude: item.courier.currentLat, longitude: item.courier.currentLng }
                : null;

            return (
              <AnimatedCard delay={Math.min(index * 80, 240)} style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.orderHead}>
                    <Text style={styles.orderId}>{item.id}</Text>
                    <Text style={styles.restaurantName}>{item.restaurantName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
                    <Text style={styles.statusText}>{translateStatus(language, item.status)}</Text>
                  </View>
                </View>

                <OrderStatusTimeline status={item.status} />

                <View style={styles.metricsRow}>
                  <View style={styles.metricChip}>
                    <Ionicons name="receipt-outline" size={14} color="#111827" />
                    <Text style={styles.metricChipText}>
                      {item.items.length} {t("articles")}
                    </Text>
                  </View>
                  <View style={styles.metricChip}>
                    <Ionicons name="cash-outline" size={14} color="#111827" />
                    <Text style={styles.metricChipText}>{formatCurrency(item.total)}</Text>
                  </View>
                  <View style={styles.metricChip}>
                    <Ionicons name="time-outline" size={14} color="#111827" />
                    <Text style={styles.metricChipText}>{item.estimatedDeliveryLabel}</Text>
                  </View>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.meta}>
                    {t("delivery")} {item.deliveryDistanceKm} km • {formatDateTime(item.createdAt, language)}
                  </Text>
                  <Text style={styles.address}>{item.address}</Text>
                  <Text style={styles.points}>+{item.pointsEarned} points</Text>
                  {item.courier ? (
                    <Text style={styles.courierLine}>
                      {item.courier.name} • {item.courier.vehicle} • {translateStatus(language, item.status)}
                    </Text>
                  ) : null}
                </View>

                {restaurant ? (
                  <LiveDeliveryMap
                    pickup={restaurant.coordinates}
                    destination={currentLocation.coordinates}
                    courier={courierCoords}
                    title={item.courier ? "Suivi moto en direct" : "Course en attente de dispatch"}
                    subtitle={
                      item.courier
                        ? `${item.courier.name} avance en temps reel sur la livraison.`
                        : "Le tracking live s'affiche automatiquement des qu'un livreur est assigne."
                    }
                  />
                ) : null}
              </AnimatedCard>
            );
          }}
          ListEmptyComponent={<EmptyState title={t("delivered_orders")} message={t("delivered_orders_msg")} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F3EE" },
  content: { flex: 1, paddingHorizontal: 14, paddingTop: 12, gap: 14 },
  heroCard: { borderRadius: 28, padding: 18, gap: 10 },
  title: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#E5E7EB", lineHeight: 20, fontWeight: "600" },
  heroStats: { flexDirection: "row", gap: 10 },
  heroStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  heroStatValue: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  heroStatLabel: { color: "#D1D5DB", fontSize: 11, fontWeight: "700" },
  listContent: { gap: 12, paddingBottom: 120 },
  card: {
    backgroundColor: "#FFFCF8",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  orderHead: { flex: 1, gap: 4 },
  orderId: { color: "#111827", fontWeight: "900" },
  restaurantName: { color: "#EA580C", fontWeight: "800", fontSize: 16 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F6EFE5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metricChipText: { color: "#111827", fontWeight: "800", fontSize: 12 },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0E7DB",
    padding: 14,
    gap: 8,
  },
  meta: { color: "#475569", lineHeight: 20, fontWeight: "600" },
  address: { color: "#64748B", lineHeight: 20, fontWeight: "600" },
  points: { color: "#15803D", fontWeight: "900" },
  courierLine: { color: "#111827", fontWeight: "700" },
});
