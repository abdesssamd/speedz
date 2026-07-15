import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { formatCurrency, formatDateTime } from "../services/format";
import { alignStart, rowDirection, ThemeColors } from "../theme/mobile";
import { ThemeMode, useTheme } from "../theme/ThemeProvider";

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    user, favorites, orders, pointsBalance, pointsHistory,
    currentLocation, requestLocation, logout, language, t, isRTL,
  } = useApp();
  const { mode, setMode, colors: tc } = useTheme();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const appearanceOptions: Array<{ value: ThemeMode; label: string; icon: "phone-portrait-outline" | "sunny-outline" | "moon-outline" }> = [
    { value: "system", label: "Système", icon: "phone-portrait-outline" },
    { value: "light", label: "Clair", icon: "sunny-outline" },
    { value: "dark", label: "Sombre", icon: "moon-outline" },
  ];

  const settingsItems = [
    { label: t("my_addresses"),  route: "Addresses" as const,     icon: "location-outline" as const },
    { label: t("notifications"), route: "Notifications" as const,  icon: "notifications-outline" as const },
    { label: t("language"),      route: "Language" as const,       icon: "globe-outline" as const },
    { label: t("invite_earn"),   route: "Invite" as const,         icon: "gift-outline" as const },
  ];

  const ListHeader = () => (
    <View style={s.headerBlock}>
      {/* Profile card */}
      <View style={s.profileCard}>
        <View style={s.profileTop}>
          <View style={s.avatarWrap}>
            <Text style={s.avatarLetter}>{(user.name || "U")[0].toUpperCase()}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user.name}</Text>
            <Text style={s.profileEmail}>{user.email}</Text>
            {user.phone ? <Text style={s.profilePhone}>{user.phone}</Text> : null}
          </View>
          <ScalePressable containerStyle={s.editBtn}>
            <Ionicons name="create-outline" size={16} color="#FF7622" />
          </ScalePressable>
        </View>
        {user.defaultAddress ? (
          <View style={s.addressRow}>
            <Ionicons name="location-outline" size={14} color="#FF7622" />
            <Text style={s.addressText} numberOfLines={1}>{user.defaultAddress}</Text>
          </View>
        ) : null}
      </View>

      {/* Stats */}
      <View style={s.statsGrid}>
        {[
          { val: pointsBalance,     lbl: t("my_rewards"),             icon: "star" as const,            color: "#FF7622", bg: "#FFF3EC" },
          { val: favorites.length,  lbl: t("favorite_restaurants"),   icon: "heart" as const,           color: "#EF4444", bg: "#FEF2F2" },
          { val: orders.length,     lbl: t("orders_count"),           icon: "bag-outline" as const,     color: "#3B82F6", bg: "#EFF6FF" },
          { val: formatCurrency(0), lbl: t("my_wallet"),              icon: "wallet-outline" as const,  color: "#22C55E", bg: "#F0FFF4" },
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

      {/* GPS card */}
      <View style={s.gpsCard}>
        <View style={s.gpsLeft}>
          <View style={[s.gpsDot, currentLocation.source === "device" && s.gpsDotActive]} />
          <View style={{ flex: 1 }}>
            <Text style={s.gpsStatus}>
              {currentLocation.source === "device" ? t("gps_active") : t("demo_mode")}
            </Text>
            <Text style={s.gpsLabel} numberOfLines={1}>{currentLocation.label}</Text>
          </View>
        </View>
        <ScalePressable containerStyle={s.gpsRefreshBtn} onPress={requestLocation}>
          <Ionicons name="refresh-outline" size={14} color="#FF7622" />
          <Text style={s.gpsRefreshText}>{t("retry_geo")}</Text>
        </ScalePressable>
      </View>

      {/* Partner section */}
      <View style={s.partnerCard}>
        <View style={s.partnerHeader}>
          <View style={s.partnerIconWrap}>
            <Ionicons name="rocket-outline" size={20} color="#FF7622" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.partnerTitle}>{t("join_network")}</Text>
            <Text style={s.partnerSub}>{t("join_network_desc")}</Text>
          </View>
        </View>
        <View style={s.partnerGrid}>
          {[
            { label: t("apply_restaurant"), route: "PartnerApplication" as const, params: { type: "RESTAURANT" as const }, color: "#FF7622", icon: "storefront-outline" as const },
            { label: t("favorite_couriers"), route: "FavoriteCouriers" as const, params: undefined, color: "#0F766E", icon: "bicycle-outline" as const },
          ].map((btn) => (
            <ScalePressable
              key={btn.label}
              containerStyle={[s.partnerBtn, { backgroundColor: btn.color }]}
              onPress={() => navigation.navigate(btn.route as any, btn.params as any)}
            >
              <Ionicons name={btn.icon} size={15} color="#FFF" />
              <Text style={s.partnerBtnText}>{btn.label}</Text>
            </ScalePressable>
          ))}
        </View>
      </View>

      {/* Appearance */}
      <Text style={s.sectionTitle}>Apparence</Text>
      <View style={[s.segmentRow, { backgroundColor: tc.surfaceMuted, borderColor: tc.borderSoft }]}>
        {appearanceOptions.map((opt) => {
          const active = mode === opt.value;
          return (
            <ScalePressable
              key={opt.value}
              containerStyle={[s.segmentBtn, active && { backgroundColor: "#FF7622" }]}
              onPress={() => setMode(opt.value)}
            >
              <Ionicons name={opt.icon} size={16} color={active ? "#FFF" : tc.textMuted} />
              <Text style={[s.segmentLabel, { color: active ? "#FFF" : tc.textMuted }]}>{opt.label}</Text>
            </ScalePressable>
          );
        })}
      </View>

      {/* Settings */}
      <Text style={s.sectionTitle}>{t("settings")}</Text>
      <View style={s.menuCard}>
        {settingsItems.map((item, index) => (
          <ScalePressable
            key={item.label}
            containerStyle={[s.menuRow, index < settingsItems.length - 1 && s.menuRowBorder]}
            onPress={() => navigation.navigate(item.route)}
          >
            <View style={s.menuIconWrap}>
              <Ionicons name={item.icon} size={18} color="#FF7622" />
            </View>
            <Text style={s.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
          </ScalePressable>
        ))}
          <ScalePressable containerStyle={s.menuRow} onPress={() => logout()}>
          <View style={[s.menuIconWrap, { backgroundColor: "#FEF2F2" }]}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          </View>
          <Text style={[s.menuLabel, { color: "#EF4444" }]}>{t("profile_logout")}</Text>
          <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
        </ScalePressable>
      </View>

      {/* Help */}
      <Text style={s.sectionTitle}>{t("more_info")}</Text>
      <View style={s.menuCard}>
        <ScalePressable containerStyle={s.menuRow} onPress={() => navigation.navigate("Help")}>
          <View style={s.menuIconWrap}>
            <Ionicons name="help-circle-outline" size={18} color="#FF7622" />
          </View>
          <Text style={s.menuLabel}>{t("need_help")}</Text>
          <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
        </ScalePressable>
      </View>

      {/* Points history title */}
      <Text style={s.sectionTitle}>{t("points_history")}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={pointsHistory}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        ListHeaderComponent={<ListHeader />}
        renderItem={({ item, index }) => (
          <AnimatedCard delay={Math.min(index * 70, 220)} style={s.histCard}>
            <View style={s.histIconWrap}>
              <Ionicons name="star" size={16} color="#FF7622" />
            </View>
            <View style={s.histBody}>
              <View style={s.histTop}>
                <Text style={s.histRestaurant}>{item.restaurantName}</Text>
                <Text style={s.histPoints}>+{item.points} pts</Text>
              </View>
              <Text style={s.histDesc}>{item.description}</Text>
              <Text style={s.histDate}>{formatDateTime(item.createdAt, language)}</Text>
            </View>
          </AnimatedCard>
        )}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 20 }}>
            <EmptyState title={t("no_points")} message={t("no_points_msg")} />
          </View>
        }
        ListFooterComponent={<View style={{ height: 120 }} />}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { paddingBottom: 32 },
  headerBlock: { padding: 20, gap: 18, paddingBottom: 8 },

  segmentRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, gap: 4 },
  segmentBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 11,
  },
  segmentLabel: { fontSize: 13, fontWeight: "700" },

  profileCard: {
    backgroundColor: c.surface, borderRadius: 24, padding: 18, gap: 14,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: "#FF7622",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#FF7622", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  avatarLetter: { color: "#FFF", fontSize: 26, fontWeight: "900" },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { color: c.text, fontWeight: "900", fontSize: 20 },
  profileEmail: { color: c.textMuted, fontSize: 13 },
  profilePhone: { color: c.textMuted, fontSize: 13 },
  editBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: c.brandSoft,
    alignItems: "center", justifyContent: "center",
  },
  addressRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: c.brandSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  addressText: { flex: 1, color: c.textMuted, fontSize: 13, fontWeight: "600" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    width: "47%", backgroundColor: c.surface, borderRadius: 20, padding: 16, gap: 8, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  statVal: { color: c.text, fontWeight: "900", fontSize: 22 },
  statLbl: { color: c.textMuted, fontSize: 12, fontWeight: "700", textAlign: "center" },

  gpsCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
    backgroundColor: c.surface, borderRadius: 18, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  gpsLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  gpsDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.border },
  gpsDotActive: { backgroundColor: "#22C55E" },
  gpsStatus: { color: "#FF7622", fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  gpsLabel: { color: c.textMuted, fontSize: 13, fontWeight: "600", marginTop: 2 },
  gpsRefreshBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: c.brandSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  gpsRefreshText: { color: "#FF7622", fontWeight: "800", fontSize: 12 },

  partnerCard: {
    backgroundColor: c.surface, borderRadius: 24, padding: 18, gap: 14,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  partnerHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  partnerIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" },
  partnerTitle: { color: c.text, fontWeight: "900", fontSize: 16 },
  partnerSub: { color: c.textMuted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  partnerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  partnerBtn: {
    width: "47%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    borderRadius: 16, paddingVertical: 13,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  partnerBtnText: { color: "#FFF", fontWeight: "800", fontSize: 12 },

  sectionTitle: { color: c.text, fontSize: 20, fontWeight: "900" },

  menuCard: {
    backgroundColor: c.surface, borderRadius: 22, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: c.borderSoft },
  menuIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, color: c.text, fontWeight: "700", fontSize: 15 },

  histCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    marginHorizontal: 20, marginBottom: 12, backgroundColor: c.surface, borderRadius: 20, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  histIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center", marginTop: 2 },
  histBody: { flex: 1, gap: 4 },
  histTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  histRestaurant: { color: c.text, fontWeight: "800", fontSize: 14, flex: 1 },
  histPoints: { color: "#22C55E", fontWeight: "900", fontSize: 16 },
  histDesc: { color: c.textMuted, lineHeight: 19, fontSize: 13 },
  histDate: { color: c.textFaint, fontSize: 11 },
  });
}
