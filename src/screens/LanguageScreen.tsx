import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";

export function LanguageScreen() {
  const { language, setLanguage, t, isRTL } = useApp();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("language")}</Text>
        <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("language_subtitle")}</Text>
        <AnimatedCard style={styles.card}>
          <ScalePressable
            containerStyle={[styles.languageButton, language === "fr" && styles.languageButtonActive]}
            onPress={() => setLanguage("fr")}
          >
            <Text style={[styles.languageText, language === "fr" && styles.languageTextActive]}>{t("french")}</Text>
          </ScalePressable>
          <ScalePressable
            containerStyle={[styles.languageButton, language === "ar" && styles.languageButtonActive]}
            onPress={() => setLanguage("ar")}
          >
            <Text style={[styles.languageText, language === "ar" && styles.languageTextActive]}>{t("arabic")}</Text>
          </ScalePressable>
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
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#ECE7E1", padding: 18, gap: 12 },
  languageButton: { backgroundColor: "#F3EDE5", borderRadius: 18, paddingVertical: 16, alignItems: "center" },
  languageButtonActive: { backgroundColor: "#111827" },
  languageText: { color: "#4B5563", fontWeight: "800", fontSize: 16 },
  languageTextActive: { color: "#FFFFFF" },
});
