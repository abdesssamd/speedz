import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { SafeAreaView, StyleSheet, Switch, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { useApp } from "../context/AppContext";

export function NotificationsScreen() {
  const { notificationPreferences, updateNotificationPreference, t, isRTL } = useApp();

  const rows = [
    {
      key: "orderUpdates" as const,
      label: t("order_updates"),
      desc: "Statut de livraison en temps réel",
      icon: "bag-outline" as const,
      color: "#FF7622",
      bg: "#FFF3EC",
    },
    {
      key: "promotions" as const,
      label: t("promo_alerts"),
      desc: "Offres spéciales et codes promo",
      icon: "pricetag-outline" as const,
      color: "#8B5CF6",
      bg: "#F5F3FF",
    },
    {
      key: "loyalty" as const,
      label: t("loyalty_alerts"),
      desc: "Points gagnés et récompenses",
      icon: "star-outline" as const,
      color: "#F59E0B",
      bg: "#FFFBEB",
    },
  ];

  const enabledCount = rows.filter((r) => notificationPreferences[r.key]).length;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        {/* Header */}
        <View style={s.heroWrap}>
          <View style={s.heroIcon}>
            <Ionicons name="notifications" size={28} color="#FF7622" />
          </View>
          <Text style={[s.pageTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("notifications")}</Text>
          <Text style={[s.pageSubtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("notifications_subtitle")}</Text>
        </View>

        {/* Status bar */}
        <View style={s.statusBar}>
          <View style={s.statusLeft}>
            <View style={[s.statusDot, enabledCount > 0 && s.statusDotActive]} />
            <Text style={s.statusText}>
              {enabledCount === 0
                ? "Toutes les notifications désactivées"
                : `${enabledCount} notification${enabledCount > 1 ? "s" : ""} activée${enabledCount > 1 ? "s" : ""}`}
            </Text>
          </View>
          <Ionicons name="shield-checkmark-outline" size={18} color={enabledCount > 0 ? "#22C55E" : "#C4C4C4"} />
        </View>

        {/* Toggle rows */}
        <AnimatedCard style={s.card}>
          {rows.map((row, index) => {
            const active = notificationPreferences[row.key];
            return (
              <View key={row.key} style={[s.row, index < rows.length - 1 && s.rowBorder]}>
                <View style={[s.iconWrap, { backgroundColor: active ? row.bg : "#F5F5F5" }]}>
                  <Ionicons name={row.icon} size={20} color={active ? row.color : "#C4C4C4"} />
                </View>
                <View style={s.rowBody}>
                  <Text style={[s.rowLabel, active && s.rowLabelActive]}>{row.label}</Text>
                  <Text style={s.rowDesc}>{row.desc}</Text>
                </View>
                <Switch
                  value={active}
                  onValueChange={(val) => updateNotificationPreference(row.key, val)}
                  trackColor={{ false: "#E5E5E5", true: "#FFD5B8" }}
                  thumbColor={active ? "#FF7622" : "#FFF"}
                  ios_backgroundColor="#E5E5E5"
                />
              </View>
            );
          })}
        </AnimatedCard>

        {/* Info note */}
        <View style={s.noteCard}>
          <Ionicons name="information-circle-outline" size={18} color="#898989" />
          <Text style={s.noteText}>
            Vous pouvez aussi gérer les notifications depuis les paramètres de votre téléphone.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { flex: 1, padding: 20, gap: 18 },

  heroWrap: { alignItems: "center", gap: 10, paddingVertical: 10 },
  heroIcon: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: "#FFF3EC",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#FF7622", shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  pageTitle: { color: "#181C2E", fontSize: 26, fontWeight: "900", textAlign: "center" },
  pageSubtitle: { color: "#898989", fontSize: 14, textAlign: "center", lineHeight: 20 },

  statusBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFF", borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#C4C4C4" },
  statusDotActive: { backgroundColor: "#22C55E" },
  statusText: { color: "#181C2E", fontWeight: "700", fontSize: 13 },

  card: {
    backgroundColor: "#FFF", borderRadius: 24, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  iconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, gap: 3 },
  rowLabel: { color: "#C4C4C4", fontWeight: "700", fontSize: 15 },
  rowLabelActive: { color: "#181C2E" },
  rowDesc: { color: "#C4C4C4", fontSize: 12, lineHeight: 17 },

  noteCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFF", borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  noteText: { flex: 1, color: "#898989", fontSize: 13, lineHeight: 20 },
});
