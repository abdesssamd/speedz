import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

  if (!cart.length) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <EmptyState title={t("empty_cart")} message={t("empty_cart_back")} />
        </View>
      </SafeAreaView>
    );
  }

  const onContinue = () => {
    if (!address.trim()) {
      pushNotification({
        title: t("address_required"),
        message: t("address_required_msg"),
        tone: "error",
      });
      return;
    }

    navigation.navigate("ConfirmOrder", {
      draft: createCheckoutDraft({ address, paymentMethod, notes }),
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={["#111827", "#1F2937", "#EA580C"]} style={styles.heroCard}>
          <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("checkout_title")}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>
            Livraison preparee avec suivi moto live et validation finale juste apres.
          </Text>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Ionicons name="location-outline" size={15} color="#FED7AA" />
              <Text style={styles.heroChipText}>{currentLocation.source === "fallback" ? t("demo_mode") : "GPS actif"}</Text>
            </View>
            <View style={styles.heroChip}>
              <Ionicons name="time-outline" size={15} color="#FED7AA" />
              <Text style={styles.heroChipText}>{summary.estimatedDeliveryLabel}</Text>
            </View>
          </View>
        </LinearGradient>

        <AnimatedCard style={styles.card}>
          <Text style={styles.label}>{t("delivery_address")}</Text>
          <View style={styles.inlineHeader}>
            <Ionicons name="navigate-outline" size={18} color="#EA580C" />
            <Text style={styles.inlineHint}>{currentLocation.label}</Text>
          </View>
          <TextInput value={address} onChangeText={setAddress} style={[styles.input, { textAlign: isRTL ? "right" : "left" }]} />

          <Text style={styles.label}>{t("payment_method")}</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentIcon}>
              <Ionicons name="cash-outline" size={18} color="#111827" />
            </View>
            <View style={styles.paymentCopy}>
              <Text style={styles.paymentValue}>{translatePayment(isRTL ? "ar" : "fr", paymentMethod)}</Text>
              <Text style={[styles.paymentHint, { textAlign: isRTL ? "right" : "left" }]}>{t("payment_step_notice")}</Text>
            </View>
          </View>

          <Text style={styles.label}>{t("delivery_instructions")}</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, styles.multiline, { textAlign: isRTL ? "right" : "left" }]}
            placeholder={t("access_hint")}
            multiline
          />
        </AnimatedCard>

        <AnimatedCard style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t("summary")}</Text>
          <View style={styles.row}>
            <Text style={styles.summaryLabel}>{t("subtotal")}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.subtotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.summaryLabel}>{t("delivery")}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.deliveryFee)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.summaryLabel}>{t("distance")}</Text>
            <Text style={styles.summaryValue}>{summary.deliveryDistanceKm} km</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.summaryLabel}>{t("service_fee")}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.serviceFee)}</Text>
          </View>
          {summary.discountAmount ? (
            <View style={styles.row}>
              <Text style={styles.summaryLabel}>{t("discount")} {promoCode ? `(${promoCode})` : ""}</Text>
              <Text style={styles.discountValue}>- {formatCurrency(summary.discountAmount)}</Text>
            </View>
          ) : null}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>{t("total_to_pay")}</Text>
            <Text style={styles.totalValue}>{formatCurrency(summary.total)}</Text>
          </View>
          <Text style={[styles.pointsHint, { textAlign: isRTL ? "right" : "left" }]}>
            {summary.pointsToEarn} {t("points_after_payment")}
          </Text>
        </AnimatedCard>

        <ScalePressable containerStyle={styles.primaryButton} onPress={onContinue}>
          <Text style={styles.primaryText}>{t("continue_confirmation")}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </ScalePressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F3EE" },
  emptyWrap: { flex: 1, justifyContent: "center", padding: 18 },
  content: { padding: 14, gap: 16, paddingBottom: 32 },
  heroCard: { borderRadius: 28, padding: 18, gap: 10 },
  title: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#E5E7EB", lineHeight: 20, fontWeight: "600" },
  heroChips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroChipText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  card: {
    backgroundColor: "#FFFCF8",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    padding: 18,
    gap: 12,
  },
  label: { color: "#111827", fontWeight: "900", fontSize: 15 },
  inlineHeader: { flexDirection: "row", gap: 8, alignItems: "center" },
  inlineHint: { flex: 1, color: "#7C6F64", fontWeight: "600", lineHeight: 18 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7DED2",
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#111827",
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  paymentCard: {
    backgroundColor: "#FFF4E8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F3D7BC",
    padding: 14,
    gap: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentCopy: { flex: 1, gap: 4 },
  paymentValue: { color: "#111827", fontWeight: "900", fontSize: 15 },
  paymentHint: { color: "#7C2D12", lineHeight: 20, fontWeight: "600" },
  summaryCard: { backgroundColor: "#111827", borderRadius: 26, padding: 18, gap: 10 },
  summaryTitle: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  summaryLabel: { color: "#CBD5E1", fontWeight: "600" },
  summaryValue: { color: "#FFF9F1", fontWeight: "800" },
  discountValue: { color: "#86EFAC", fontWeight: "900" },
  divider: { height: 1, backgroundColor: "#374151", marginVertical: 4 },
  totalLabel: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },
  totalValue: { color: "#FDBA74", fontWeight: "900", fontSize: 22 },
  pointsHint: { color: "#D1D5DB", lineHeight: 20, fontWeight: "600" },
  primaryButton: {
    backgroundColor: "#EA580C",
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
});
