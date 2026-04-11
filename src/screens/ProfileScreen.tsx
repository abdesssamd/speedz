import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { formatCurrency, formatDateTime } from "../services/format";

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    user,
    favorites,
    orders,
    pointsBalance,
    pointsHistory,
    currentLocation,
    requestLocation,
    logout,
    language,
    t,
    isRTL,
  } = useApp();

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={pointsHistory}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("profile")}</Text>
            <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("profile_subtitle")}</Text>

            <AnimatedCard style={styles.profileCard}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.profileMeta}>{user.email}</Text>
              <Text style={styles.profileMeta}>{user.phone}</Text>
              <Text style={styles.profileMeta}>{user.defaultAddress}</Text>
            </AnimatedCard>

            <View style={styles.quickCardsRow}>
              <AnimatedCard style={styles.quickCard}>
                <Text style={styles.quickCardValue}>0</Text>
                <Text style={styles.quickCardLabel}>{t("my_coupons")}</Text>
              </AnimatedCard>
              <AnimatedCard style={styles.quickCard}>
                <Text style={styles.quickCardValue}>{pointsBalance}</Text>
                <Text style={styles.quickCardLabel}>{t("my_rewards")}</Text>
              </AnimatedCard>
              <AnimatedCard style={styles.quickCard}>
                <Text style={styles.quickCardValue}>{formatCurrency(0)}</Text>
                <Text style={styles.quickCardLabel}>{t("my_wallet")}</Text>
              </AnimatedCard>
            </View>

            <View style={styles.statRow}>
              <AnimatedCard style={styles.statCard}>
                <Text style={styles.statValue}>{pointsBalance}</Text>
                <Text style={styles.statLabel}>{t("points_available")}</Text>
              </AnimatedCard>
              <AnimatedCard style={[styles.statCard, styles.statCardDark]}>
                <Text style={[styles.statValue, styles.statValueDark]}>{favorites.length}</Text>
                <Text style={[styles.statLabel, styles.statLabelDark]}>{t("favorite_restaurants")}</Text>
              </AnimatedCard>
            </View>

            <View style={styles.statRow}>
              <AnimatedCard style={styles.statCardWide}>
                <Text style={styles.statValue}>{orders.length}</Text>
                <Text style={styles.statLabel}>{t("orders_count")}</Text>
              </AnimatedCard>
              <AnimatedCard style={styles.statCardWide}>
                <Text style={styles.locationLabel}>{currentLocation.source === "device" ? t("gps_active") : t("demo_mode")}</Text>
                <Text style={styles.locationValue}>{currentLocation.label}</Text>
                <ScalePressable containerStyle={styles.locationButton} onPress={requestLocation}>
                  <Text style={styles.locationButtonText}>{t("retry_geo")}</Text>
                </ScalePressable>
              </AnimatedCard>
            </View>

            <AnimatedCard style={styles.joinCard}>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left", marginTop: 0 }]}>{t("join_network")}</Text>
              <Text style={[styles.joinText, { textAlign: isRTL ? "right" : "left" }]}>{t("join_network_desc")}</Text>
              <View style={styles.joinActions}>
                <ScalePressable containerStyle={styles.joinButton} onPress={() => navigation.navigate("PartnerApplication", { type: "RESTAURANT" })}>
                  <Text style={styles.joinButtonText}>{t("apply_restaurant")}</Text>
                </ScalePressable>
                <ScalePressable containerStyle={[styles.joinButton, styles.joinButtonDark]} onPress={() => navigation.navigate("PartnerApplication", { type: "COURIER" })}>
                  <Text style={styles.joinButtonText}>{t("apply_courier")}</Text>
                </ScalePressable>
              </View>
              <ScalePressable containerStyle={[styles.joinButton, styles.restaurantHubButton]} onPress={() => navigation.navigate("RestaurantHub")}>
                <Text style={styles.joinButtonText}>{t("open_restaurant_hub")}</Text>
              </ScalePressable>
              <ScalePressable containerStyle={[styles.joinButton, styles.courierHubButton]} onPress={() => navigation.navigate("CourierHub")}>
                <Text style={styles.joinButtonText}>{t("open_courier_hub")}</Text>
              </ScalePressable>
            </AnimatedCard>

            <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("settings")}</Text>
            <AnimatedCard style={styles.listCard}>
              {[
                { label: t("my_addresses"), route: "Addresses" as const },
                { label: t("notifications"), route: "Notifications" as const },
                { label: t("language"), route: "Language" as const },
                { label: t("invite_earn"), route: "Invite" as const },
              ].map((item) => (
                <ScalePressable
                  key={item.label}
                  containerStyle={styles.listRow}
                  onPress={() => navigation.navigate(item.route)}
                >
                  <Text style={styles.listRowText}>{item.label}</Text>
                  <Text style={styles.listRowArrow}>›</Text>
                </ScalePressable>
              ))}
              <ScalePressable containerStyle={styles.listRow} onPress={() => logout()}>
                <Text style={styles.listRowText}>Se deconnecter</Text>
                <Text style={styles.listRowArrow}>›</Text>
              </ScalePressable>
            </AnimatedCard>

            <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("more_info")}</Text>
            <AnimatedCard style={styles.listCard}>
              <ScalePressable containerStyle={styles.listRow} onPress={() => navigation.navigate("Help")}>
                <Text style={styles.listRowText}>{t("need_help")}</Text>
                <Text style={styles.listRowArrow}>›</Text>
              </ScalePressable>
            </AnimatedCard>

            <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("points_history")}</Text>
          </>
        }
        renderItem={({ item, index }) => (
          <AnimatedCard delay={Math.min(index * 70, 200)} style={styles.historyCard}>
            <View style={styles.historyTop}>
              <Text style={styles.historyRestaurant}>{item.restaurantName}</Text>
              <Text style={styles.historyPoints}>+{item.points} pts</Text>
            </View>
            <Text style={styles.historyDescription}>{item.description}</Text>
            <Text style={styles.historyDate}>{formatDateTime(item.createdAt, language)}</Text>
          </AnimatedCard>
        )}
        ListEmptyComponent={<EmptyState title={t("no_points")} message={t("no_points_msg")} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF9F1" },
  content: { padding: 18, gap: 14, paddingBottom: 130 },
  title: { color: "#111827", fontSize: 30, fontWeight: "800" },
  subtitle: { color: "#64748B", lineHeight: 20, marginBottom: 4 },
  profileCard: { backgroundColor: "#111827", borderRadius: 28, padding: 20, gap: 6 },
  name: { color: "#FFFFFF", fontWeight: "800", fontSize: 24 },
  profileMeta: { color: "#D1D5DB", lineHeight: 20 },
  quickCardsRow: { flexDirection: "row", gap: 10 },
  quickCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  quickCardValue: { color: "#16A34A", fontSize: 24, fontWeight: "800" },
  quickCardLabel: { color: "#111827", fontWeight: "700", textAlign: "center" },
  statRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 18,
    gap: 6,
  },
  statCardDark: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  statCardWide: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 18,
    gap: 8,
  },
  statValue: { color: "#111827", fontWeight: "800", fontSize: 28 },
  statValueDark: { color: "#FFFFFF" },
  statLabel: { color: "#64748B", fontWeight: "700" },
  statLabelDark: { color: "#FFEDD5" },
  locationLabel: { color: "#EA580C", fontWeight: "800", textTransform: "uppercase", fontSize: 12 },
  locationValue: { color: "#111827", fontWeight: "700", lineHeight: 20 },
  locationButton: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  joinCard: {
    backgroundColor: "#FFF4E8",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3D7BC",
    padding: 18,
    gap: 10,
  },
  joinText: { color: "#64748B", lineHeight: 20 },
  joinActions: { flexDirection: "row", gap: 10 },
  joinButton: {
    flex: 1,
    backgroundColor: "#EA580C",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  joinButtonDark: { backgroundColor: "#111827" },
  restaurantHubButton: { backgroundColor: "#9A3412" },
  courierHubButton: { backgroundColor: "#0F766E" },
  joinButtonText: { color: "#FFFFFF", fontWeight: "800" },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECE5",
  },
  listRowText: { color: "#111827", fontWeight: "700", fontSize: 16 },
  listRowArrow: { color: "#94A3B8", fontSize: 22, fontWeight: "700" },
  sectionTitle: { color: "#111827", fontSize: 22, fontWeight: "800", marginTop: 2 },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 16,
    gap: 6,
  },
  historyTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  historyRestaurant: { color: "#111827", fontWeight: "800" },
  historyPoints: { color: "#15803D", fontWeight: "800" },
  historyDescription: { color: "#475569", lineHeight: 20 },
  historyDate: { color: "#64748B", fontSize: 12 },
});
