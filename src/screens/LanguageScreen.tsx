import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";

export function LanguageScreen() {
  const { language, setLanguage, t, isRTL } = useApp();

  const options = [
    { id: "fr", label: t("french"), sublabel: "Français", flag: "🇫🇷", desc: "Interface en français" },
    { id: "ar", label: t("arabic"), sublabel: "العربية", flag: "🇩🇿", desc: "واجهة باللغة العربية" },
  ] as const;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        {/* Header */}
        <View style={s.heroWrap}>
          <View style={s.heroIcon}><Ionicons name="globe" size={28} color="#FF7622" /></View>
          <Text style={[s.pageTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("language")}</Text>
          <Text style={[s.pageSubtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("language_subtitle")}</Text>
        </View>

        {/* Options */}
        <AnimatedCard style={s.card}>
          {options.map((opt, index) => {
            const active = language === opt.id;
            return (
              <ScalePressable
                key={opt.id}
                containerStyle={[s.langRow, active && s.langRowActive, index < options.length - 1 && s.langRowBorder]}
                onPress={() => setLanguage(opt.id)}
              >
                <Text style={s.langFlag}>{opt.flag}</Text>
                <View style={s.langBody}>
                  <Text style={[s.langLabel, active && s.langLabelActive]}>{opt.label}</Text>
                  <Text style={s.langSublabel}>{opt.desc}</Text>
                </View>
                <View style={[s.checkWrap, active && s.checkWrapActive]}>
                  {active
                    ? <Ionicons name="checkmark" size={15} color="#FFF" />
                    : <View style={s.checkInner} />}
                </View>
              </ScalePressable>
            );
          })}
        </AnimatedCard>

        {/* Info note */}
        <View style={s.noteCard}>
          <Ionicons name="information-circle-outline" size={18} color="#898989" />
          <Text style={s.noteText}>Le changement de langue s'applique immédiatement à toute l'application.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { flex: 1, padding: 20, gap: 20 },

  heroWrap: { alignItems: "center", gap: 10, paddingVertical: 16 },
  heroIcon: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: "#FFF3EC",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#FF7622", shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  pageTitle: { color: "#181C2E", fontSize: 26, fontWeight: "900", textAlign: "center" },
  pageSubtitle: { color: "#898989", fontSize: 14, textAlign: "center", lineHeight: 20 },

  card: {
    backgroundColor: "#FFF", borderRadius: 24, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  langRow: {
    flexDirection: "row", alignItems: "center", gap: 16, padding: 20,
  },
  langRowActive: { backgroundColor: "#FFF9F5" },
  langRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  langFlag: { fontSize: 34 },
  langBody: { flex: 1, gap: 3 },
  langLabel: { color: "#898989", fontWeight: "800", fontSize: 17 },
  langLabelActive: { color: "#181C2E" },
  langSublabel: { color: "#C4C4C4", fontSize: 13 },
  checkWrap: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "#E5E5E5",
    alignItems: "center", justifyContent: "center",
  },
  checkWrapActive: { backgroundColor: "#FF7622", borderColor: "#FF7622" },
  checkInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#E5E5E5" },

  noteCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFF", borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  noteText: { flex: 1, color: "#898989", fontSize: 13, lineHeight: 20 },
});
