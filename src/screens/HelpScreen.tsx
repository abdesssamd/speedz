// HelpScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { LayoutAnimation, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { useApp } from "../context/AppContext";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function HelpScreen() {
  const { t, isRTL } = useApp();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { q: t("faq_delivery"), a: t("faq_delivery_answer") },
    { q: t("faq_payment"), a: t("faq_payment_answer") },
    { q: t("faq_support"), a: t("faq_support_answer") },
  ];

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.heroWrap}>
          <View style={s.heroIcon}><Ionicons name="help-buoy" size={30} color="#FF7622" /></View>
          <Text style={s.pageTitle}>{t("help_title")}</Text>
          <Text style={s.pageSubtitle}>{t("help_subtitle")}</Text>
        </View>

        {faqs.map((item, index) => {
          const open = openIndex === index;
          return (
            <AnimatedCard key={item.q} delay={Math.min(index * 70, 180)} style={s.faqCard}>
              <TouchableOpacity style={s.faqHeader} onPress={() => toggle(index)} activeOpacity={0.7}>
                <View style={[s.faqNum, open && s.faqNumActive]}><Text style={[s.faqNumText, open && s.faqNumTextActive]}>{index + 1}</Text></View>
                <Text style={[s.question, { flex: 1, textAlign: isRTL ? "right" : "left" }]}>{item.q}</Text>
                <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={open ? "#FF7622" : "#898989"} />
              </TouchableOpacity>
              {open && <Text style={[s.answer, { textAlign: isRTL ? "right" : "left" }]}>{item.a}</Text>}
            </AnimatedCard>
          );
        })}

        <View style={s.contactCard}>
          <View style={s.contactLeft}>
            <View style={s.contactIcon}><Ionicons name="mail" size={22} color="#FF7622" /></View>
            <View>
              <Text style={s.contactLabel}>Support direct</Text>
              <Text style={s.contactEmail}>admin@microtechdz13.com</Text>
            </View>
          </View>
          <View style={s.contactArrow}><Ionicons name="arrow-forward" size={16} color="#FF7622" /></View>
        </View>

        <View style={s.hoursCard}>
          <Ionicons name="time-outline" size={18} color="#898989" />
          <Text style={s.hoursText}>Disponible 7j/7 de 8h à 23h</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 20, gap: 14, paddingBottom: 36 },
  heroWrap: { alignItems: "center", gap: 10, paddingVertical: 20 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center", shadowColor: "#FF7622", shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  pageTitle: { color: "#181C2E", fontSize: 26, fontWeight: "900", textAlign: "center" },
  pageSubtitle: { color: "#898989", fontSize: 14, textAlign: "center", lineHeight: 20 },
  faqCard: { backgroundColor: "#FFF", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  faqHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  faqNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" },
  faqNumActive: { backgroundColor: "#FF7622" },
  faqNumText: { color: "#898989", fontWeight: "900", fontSize: 13 },
  faqNumTextActive: { color: "#FFF" },
  question: { color: "#181C2E", fontWeight: "800", fontSize: 15, lineHeight: 21 },
  answer: { color: "#898989", lineHeight: 22, fontSize: 14, paddingHorizontal: 16, paddingBottom: 18, paddingTop: 4 },
  contactCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderRadius: 22, padding: 18, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  contactLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  contactIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" },
  contactLabel: { color: "#898989", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  contactEmail: { color: "#181C2E", fontWeight: "800", fontSize: 14, marginTop: 2 },
  contactArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" },
  hoursCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF", borderRadius: 16, padding: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  hoursText: { color: "#898989", fontSize: 13, fontWeight: "600" },
});
