import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { useApp } from "../context/AppContext";

export function HelpScreen() {
  const { t, isRTL } = useApp();
  const faqs = [
    { q: t("faq_delivery"), a: t("faq_delivery_answer") },
    { q: t("faq_payment"), a: t("faq_payment_answer") },
    { q: t("faq_support"), a: t("faq_support_answer") },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("help_title")}</Text>
        <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("help_subtitle")}</Text>
        {faqs.map((item, index) => (
          <AnimatedCard key={item.q} delay={Math.min(index * 70, 180)} style={styles.card}>
            <Text style={[styles.question, { textAlign: isRTL ? "right" : "left" }]}>{item.q}</Text>
            <Text style={[styles.answer, { textAlign: isRTL ? "right" : "left" }]}>{item.a}</Text>
          </AnimatedCard>
        ))}
        <View style={styles.contactBox}>
          <Text style={styles.contactText}>support@fooddelyvry.app</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF9F1" },
  content: { padding: 18, gap: 14, paddingBottom: 32 },
  title: { color: "#111827", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#64748B", lineHeight: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: "#ECE7E1", padding: 16, gap: 8 },
  question: { color: "#111827", fontWeight: "800", fontSize: 17 },
  answer: { color: "#475569", lineHeight: 21 },
  contactBox: { marginTop: 6, backgroundColor: "#111827", borderRadius: 20, padding: 16, alignItems: "center" },
  contactText: { color: "#FFFFFF", fontWeight: "800" },
});
