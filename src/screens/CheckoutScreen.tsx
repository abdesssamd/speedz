import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { translatePayment } from "../i18n/mobile";
import { RootStackParamList } from "../navigation/AppNavigator";
import { formatCurrency } from "../services/format";
import { PaymentMethod } from "../types";

export function CheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cart, user, currentLocation, getCartSummary, createCheckoutDraft, pushNotification, promoCode, t, isRTL } = useApp();
  const summary = getCartSummary();
  const [address, setAddress] = useState(user.defaultAddress);
  const paymentMethod: PaymentMethod = "Cash";
  const [notes, setNotes] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  if (!cart.length) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        <EmptyState title={t("empty_cart")} message={t("empty_cart_back")} />
      </View>
    </SafeAreaView>
  );

  const onContinue = () => {
    if (!address.trim()) { pushNotification({ title: t("address_required"), message: t("address_required_msg"), tone: "error" }); return; }
    navigation.navigate("ConfirmOrder", { draft: createCheckoutDraft({ address, paymentMethod, notes }) });
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>{t("checkout_title")}</Text>

        {/* Delivery info bar */}
        <View style={s.infoBar}>
          <View style={s.infoChip}>
            <View style={[s.infoChipIcon, { backgroundColor: "#FFF3EC" }]}><Ionicons name="location" size={14} color="#FF7622" /></View>
            <Text style={s.infoChipText}>{currentLocation.source === "fallback" ? t("demo_mode") : "GPS actif"}</Text>
          </View>
          <View style={s.infoChip}>
            <View style={[s.infoChipIcon, { backgroundColor: "#F0FFF4" }]}><Ionicons name="time" size={14} color="#22C55E" /></View>
            <Text style={s.infoChipText}>{summary.estimatedDeliveryLabel}</Text>
          </View>
        </View>

        {/* Address */}
        <AnimatedCard style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}><Ionicons name="location-outline" size={18} color="#FF7622" /></View>
            <Text style={s.sectionTitle}>{t("delivery_address")}</Text>
          </View>
          <View style={s.locationHint}>
            <Ionicons name="navigate-circle-outline" size={14} color="#898989" />
            <Text style={s.locationHintText} numberOfLines={1}>{currentLocation.label}</Text>
          </View>
          <View style={[s.inputWrap, focusedField === "address" && s.inputFocused]}>
            <Ionicons name="home-outline" size={16} color={focusedField === "address" ? "#FF7622" : "#A0A5BA"} />
            <TextInput value={address} onChangeText={setAddress} style={[s.input, { textAlign: isRTL ? "right" : "left" }]}
              placeholderTextColor="#C4C4C4"
              onFocus={() => setFocusedField("address")} onBlur={() => setFocusedField(null)} />
          </View>
        </AnimatedCard>

        {/* Payment */}
        <AnimatedCard style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}><Ionicons name="card-outline" size={18} color="#FF7622" /></View>
            <Text style={s.sectionTitle}>{t("payment_method")}</Text>
          </View>
          <View style={s.paymentCard}>
            <View style={s.paymentIconLarge}><Ionicons name="cash" size={22} color="#22C55E" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.paymentName}>{translatePayment(isRTL ? "ar" : "fr", paymentMethod)}</Text>
              <Text style={s.paymentNote}>{t("payment_step_notice")}</Text>
            </View>
            <View style={s.paymentCheck}><Ionicons name="checkmark-circle" size={22} color="#22C55E" /></View>
          </View>
        </AnimatedCard>

        {/* Notes */}
        <AnimatedCard style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}><Ionicons name="create-outline" size={18} color="#FF7622" /></View>
            <Text style={s.sectionTitle}>{t("delivery_instructions")}</Text>
          </View>
          <View style={[s.inputWrap, s.inputWrapMulti, focusedField === "notes" && s.inputFocused]}>
            <Ionicons name="chatbubble-outline" size={16} color={focusedField === "notes" ? "#FF7622" : "#A0A5BA"} style={{ marginTop: 2 }} />
            <TextInput value={notes} onChangeText={setNotes} placeholder={t("access_hint")} placeholderTextColor="#C4C4C4"
              multiline style={[s.input, s.inputMulti, { textAlign: isRTL ? "right" : "left" }]}
              onFocus={() => setFocusedField("notes")} onBlur={() => setFocusedField(null)} />
          </View>
        </AnimatedCard>

        {/* Summary */}
        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>{t("summary")}</Text>
          {[
            { l: t("subtotal"), v: formatCurrency(summary.subtotal) },
            { l: t("delivery"), v: formatCurrency(summary.deliveryFee) },
            { l: t("distance"), v: `${summary.deliveryDistanceKm} km` },
            { l: t("service_fee"), v: formatCurrency(summary.serviceFee) },
          ].map((r) => (
            <View key={r.l} style={s.summaryRow}>
              <Text style={s.summaryLbl}>{r.l}</Text>
              <Text style={s.summaryVal}>{r.v}</Text>
            </View>
          ))}
          {summary.discountAmount ? (
            <View style={s.summaryRow}>
              <Text style={s.summaryLbl}>{t("discount")} {promoCode ? `(${promoCode})` : ""}</Text>
              <Text style={s.discountVal}>- {formatCurrency(summary.discountAmount)}</Text>
            </View>
          ) : null}
          <View style={s.divider} />
          <View style={s.summaryRow}>
            <Text style={s.totalLbl}>{t("total_to_pay")}</Text>
            <Text style={s.totalVal}>{formatCurrency(summary.total)}</Text>
          </View>
          <View style={s.pointsRow}>
            <Ionicons name="star" size={14} color="#FF7622" />
            <Text style={s.pointsText}><Text style={{ color: "#FF7622", fontWeight: "800" }}>{summary.pointsToEarn} pts</Text> {t("points_after_payment")}</Text>
          </View>
        </View>

        <ScalePressable containerStyle={s.ctaBtn} onPress={onContinue}>
          <Text style={s.ctaText}>{t("continue_confirmation")}</Text>
          <View style={s.ctaArrow}><Ionicons name="arrow-forward" size={18} color="#FF7622" /></View>
        </ScalePressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 20, gap: 16, paddingBottom: 36 },
  pageTitle: { color: "#181C2E", fontSize: 28, fontWeight: "900" },

  infoBar: { flexDirection: "row", gap: 12 },
  infoChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF", borderRadius: 16, padding: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  infoChipIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  infoChipText: { color: "#181C2E", fontWeight: "700", fontSize: 13 },

  section: { backgroundColor: "#FFF", borderRadius: 24, padding: 18, gap: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: "#181C2E", fontWeight: "900", fontSize: 16 },
  locationHint: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationHintText: { flex: 1, color: "#898989", fontSize: 13 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: "#EFEFEF", backgroundColor: "#FAFAFA", paddingHorizontal: 14 },
  inputWrapMulti: { alignItems: "flex-start", paddingVertical: 12 },
  inputFocused: { borderColor: "#FF7622", backgroundColor: "#FFF9F5" },
  input: { flex: 1, color: "#181C2E", fontSize: 14, paddingVertical: 4 },
  inputMulti: { minHeight: 72, textAlignVertical: "top" },

  paymentCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#F0FFF4", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#BBF7D0" },
  paymentIconLarge: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  paymentName: { color: "#181C2E", fontWeight: "800", fontSize: 15 },
  paymentNote: { color: "#898989", fontSize: 12, lineHeight: 18, marginTop: 2 },
  paymentCheck: {},

  summaryCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 20, gap: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  summaryTitle: { color: "#181C2E", fontWeight: "900", fontSize: 18 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLbl: { color: "#898989", fontSize: 14, fontWeight: "600" },
  summaryVal: { color: "#181C2E", fontSize: 14, fontWeight: "700" },
  discountVal: { color: "#22C55E", fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#F5F5F5", marginVertical: 4 },
  totalLbl: { color: "#181C2E", fontWeight: "900", fontSize: 18 },
  totalVal: { color: "#FF7622", fontWeight: "900", fontSize: 22 },
  pointsRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF3EC", borderRadius: 12, padding: 10 },
  pointsText: { color: "#898989", fontSize: 13 },

  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#181C2E", borderRadius: 22, paddingVertical: 18, paddingHorizontal: 22, shadowColor: "#181C2E", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  ctaText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
  ctaArrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FF7622", alignItems: "center", justifyContent: "center" },
});
