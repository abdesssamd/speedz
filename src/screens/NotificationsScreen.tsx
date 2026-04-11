import React from "react";
import { SafeAreaView, StyleSheet, Switch, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { useApp } from "../context/AppContext";

export function NotificationsScreen() {
  const { notificationPreferences, updateNotificationPreference, t, isRTL } = useApp();

  const rows = [
    { key: "orderUpdates" as const, label: t("order_updates") },
    { key: "promotions" as const, label: t("promo_alerts") },
    { key: "loyalty" as const, label: t("loyalty_alerts") },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("notifications")}</Text>
        <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("notifications_subtitle")}</Text>
        <AnimatedCard style={styles.card}>
          {rows.map((row, index) => (
            <View key={row.key} style={[styles.row, index === rows.length - 1 && styles.rowLast]}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Switch
                value={notificationPreferences[row.key]}
                onValueChange={(value) => updateNotificationPreference(row.key, value)}
                trackColor={{ false: "#D6D3D1", true: "#FDBA74" }}
                thumbColor={notificationPreferences[row.key] ? "#EA580C" : "#FFFFFF"}
              />
            </View>
          ))}
        </AnimatedCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF9F1" },
  content: { padding: 18, gap: 14 },
  title: { color: "#111827", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#64748B", lineHeight: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#ECE7E1", overflow: "hidden" },
  row: { paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F1ECE5", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { color: "#111827", fontWeight: "700", fontSize: 16 },
});
