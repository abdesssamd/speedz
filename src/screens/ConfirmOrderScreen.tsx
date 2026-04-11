import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { translatePayment } from "../i18n/mobile";
import { RootStackParamList } from "../navigation/AppNavigator";
import { formatCurrency } from "../services/format";

type ConfirmRoute = RouteProp<RootStackParamList, "ConfirmOrder">;

export function ConfirmOrderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ConfirmRoute>();
  const { cartRestaurant, cart, getCartSummary, placeOrder, promoCode, t, isRTL } = useApp();
  const summary = getCartSummary();
  const draft = route.params.draft;

  const onPay = async () => {
    const result = await placeOrder(draft);
    if (!result.order) {
      Alert.alert(t("impossible_order"), result.error ?? t("check_cart"));
      return;
    }

    Alert.alert(
      t("order_confirmed"),
      `${result.order.id} ${t("order_created")} ${result.order.pointsEarned} ${t("points")}`,
      [{ text: t("see_orders"), onPress: () => navigation.navigate("MainTabs") }]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <LinearGradient colors={["#111827", "#1F2937", "#EA580C"]} style={styles.heroCard}>
          <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("final_confirmation")}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("final_confirmation_msg")}</Text>
        </LinearGradient>

        <AnimatedCard style={styles.card}>
          <Text style={styles.cardTitle}>{cartRestaurant?.name}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#EA580C" />
            <Text style={styles.cardMeta}>{draft.address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color="#EA580C" />
            <Text style={styles.cardMeta}>{translatePayment(isRTL ? "ar" : "fr", draft.paymentMethod)}</Text>
          </View>
          {draft.notes ? (
            <View style={styles.infoRow}>
              <Ionicons name="create-outline" size={16} color="#EA580C" />
              <Text style={styles.cardMeta}>{draft.notes}</Text>
            </View>
          ) : null}
        </AnimatedCard>

        <FlatList
          data={cart}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.lineItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineTitle}>
                  {item.quantity} x {item.name}
                </Text>
                <Text style={styles.lineMeta}>
                  {item.selectedOptions.length ? item.selectedOptions.map((option) => option.choiceName).join(", ") : t("no_option")}
                </Text>
              </View>
              <Text style={styles.linePrice}>
                {formatCurrency(
                  (item.basePrice + item.selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0)) * item.quantity
                )}
              </Text>
            </View>
          )}
          ListFooterComponent={
            <AnimatedCard style={styles.summaryCard}>
              <View style={styles.row}>
                <Text style={styles.summaryLabel}>{t("subtotal")}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(summary.subtotal)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.summaryLabel}>{t("delivery")}</Text>
                <Text style={styles.summaryValue}>{formatCurrency(summary.deliveryFee)}</Text>
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
                <Text style={styles.totalLabel}>{t("total")}</Text>
                <Text style={styles.totalValue}>{formatCurrency(summary.total)}</Text>
              </View>
            </AnimatedCard>
          }
        />

        <ScalePressable containerStyle={styles.primaryButton} onPress={onPay}>
          <Text style={styles.primaryText}>{t("payment")} & {t("order_confirmed")}</Text>
          <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
        </ScalePressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F3EE" },
  content: { flex: 1, paddingHorizontal: 14, paddingTop: 12, gap: 14 },
  heroCard: { borderRadius: 28, padding: 18, gap: 10 },
  title: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#E5E7EB", lineHeight: 20, fontWeight: "600" },
  card: {
    backgroundColor: "#FFFCF8",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    padding: 16,
    gap: 10,
  },
  cardTitle: { color: "#111827", fontWeight: "900", fontSize: 19 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardMeta: { flex: 1, color: "#64748B", lineHeight: 20, fontWeight: "600" },
  listContent: { gap: 10, paddingBottom: 110 },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#FFFCF8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    padding: 14,
  },
  lineTitle: { color: "#111827", fontWeight: "900" },
  lineMeta: { color: "#64748B", marginTop: 4, lineHeight: 18 },
  linePrice: { color: "#111827", fontWeight: "900" },
  summaryCard: { backgroundColor: "#111827", borderRadius: 26, padding: 18, gap: 10, marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  summaryLabel: { color: "#CBD5E1", fontWeight: "600" },
  summaryValue: { color: "#FFF9F1", fontWeight: "800" },
  discountValue: { color: "#86EFAC", fontWeight: "900" },
  divider: { height: 1, backgroundColor: "#374151", marginVertical: 4 },
  totalLabel: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },
  totalValue: { color: "#FDBA74", fontWeight: "900", fontSize: 22 },
  primaryButton: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
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
