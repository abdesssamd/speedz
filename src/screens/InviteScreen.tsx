import React from "react";
import { Clipboard, SafeAreaView, Share, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";

const INVITE_CODE = "FOOD-2026";

export function InviteScreen() {
  const { t, isRTL, pushNotification } = useApp();

  const copyCode = async () => {
    await Clipboard.setString(INVITE_CODE);
    pushNotification({ title: t("code_copied"), message: t("code_copied_msg"), tone: "success" });
  };

  const shareCode = async () => {
    await Share.share({ message: `${t("invite_code")}: ${INVITE_CODE}` });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("invite_title")}</Text>
        <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("invite_subtitle")}</Text>
        <AnimatedCard style={styles.card}>
          <Text style={styles.caption}>{t("invite_code")}</Text>
          <Text style={styles.code}>{INVITE_CODE}</Text>
          <View style={styles.actions}>
            <ScalePressable containerStyle={styles.primaryButton} onPress={copyCode}>
              <Text style={styles.primaryText}>{t("copy_code")}</Text>
            </ScalePressable>
            <ScalePressable containerStyle={styles.secondaryButton} onPress={shareCode}>
              <Text style={styles.secondaryText}>{t("share_code")}</Text>
            </ScalePressable>
          </View>
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
  card: { backgroundColor: "#111827", borderRadius: 28, padding: 22, gap: 14 },
  caption: { color: "#FDBA74", textTransform: "uppercase", fontWeight: "800", fontSize: 12 },
  code: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", letterSpacing: 1.5 },
  actions: { flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, backgroundColor: "#EA580C", borderRadius: 18, alignItems: "center", paddingVertical: 14 },
  secondaryButton: { flex: 1, backgroundColor: "#FFF7ED", borderRadius: 18, alignItems: "center", paddingVertical: 14 },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryText: { color: "#111827", fontWeight: "800" },
});
