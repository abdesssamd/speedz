import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Alert, FlatList, Image, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { QuantityControl } from "../components/QuantityControl";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { formatCurrency } from "../services/format";

export function CartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    cart,
    cartRestaurant,
    getCartSummary,
    updateCartItemQuantity,
    removeCartItem,
    promoCode,
    setPromoCode,
    applyPromoCode,
    t,
    isRTL,
  } = useApp();
  const summary = getCartSummary();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <LinearGradient colors={["#111827", "#1F2937", "#EA580C"]} style={styles.heroCard}>
          <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("cart_title")}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>
            {cartRestaurant ? `${t("current_order_at")} ${cartRestaurant.name}` : t("no_item_yet")}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{cart.length}</Text>
              <Text style={styles.heroStatLabel}>Articles</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{summary.estimatedDeliveryLabel}</Text>
              <Text style={styles.heroStatLabel}>ETA</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{formatCurrency(summary.total)}</Text>
              <Text style={styles.heroStatLabel}>Total</Text>
            </View>
          </View>
        </LinearGradient>

        <FlatList
          data={cart}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <AnimatedCard delay={Math.min(index * 60, 220)} style={styles.itemCard}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemBody}>
                <View style={styles.itemTop}>
                  <Text style={[styles.itemName, { textAlign: isRTL ? "right" : "left" }]}>{item.name}</Text>
                  <ScalePressable
                    containerStyle={styles.removeButton}
                    onPress={() =>
                      Alert.alert(t("delete_item_title"), t("delete_item_message"), [
                        { text: t("cancel"), style: "cancel" },
                        { text: t("delete"), style: "destructive", onPress: () => removeCartItem(item.id) },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                  </ScalePressable>
                </View>

                <Text style={[styles.optionsText, { textAlign: isRTL ? "right" : "left" }]}>
                  {item.selectedOptions.length ? item.selectedOptions.map((option) => option.choiceName).join(", ") : t("no_option")}
                </Text>
                {item.specialInstructions ? (
                  <Text style={[styles.instructionsText, { textAlign: isRTL ? "right" : "left" }]}>
                    {t("note")}: {item.specialInstructions}
                  </Text>
                ) : null}

                <View style={styles.itemBottom}>
                  <Text style={styles.price}>
                    {formatCurrency(
                      (item.basePrice + item.selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0)) * item.quantity
                    )}
                  </Text>
                  <QuantityControl
                    quantity={item.quantity}
                    onDecrease={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                    onIncrease={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                  />
                </View>
              </View>
            </AnimatedCard>
          )}
          ListEmptyComponent={<EmptyState title={t("empty_cart")} message={t("empty_cart_msg")} />}
          ListFooterComponent={
            cart.length ? (
              <AnimatedCard style={styles.summaryCard}>
                <Text style={styles.promoLabel}>{t("promo_code")}</Text>
                <View style={styles.promoRow}>
                  <TextInput
                    value={promoCode}
                    onChangeText={setPromoCode}
                    placeholder={t("promo_placeholder")}
                    placeholderTextColor="#9CA3AF"
                    style={[styles.promoInput, { textAlign: isRTL ? "right" : "left" }]}
                  />
                  <ScalePressable containerStyle={styles.promoButton} onPress={() => applyPromoCode(promoCode)}>
                    <Text style={styles.promoButtonText}>{t("apply_promo")}</Text>
                  </ScalePressable>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.label}>{t("subtotal")}</Text>
                  <Text style={styles.value}>{formatCurrency(summary.subtotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>{t("delivery")}</Text>
                  <Text style={styles.value}>
                    {formatCurrency(summary.deliveryFee)} • {summary.deliveryDistanceKm} km
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>{t("applied_rate")}</Text>
                  <Text style={styles.value}>{summary.deliveryTierLabel}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>{t("service_fee")}</Text>
                  <Text style={styles.value}>{formatCurrency(summary.serviceFee)}</Text>
                </View>
                {summary.discountAmount ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.label}>{t("discount")}</Text>
                    <Text style={styles.discountValue}>- {formatCurrency(summary.discountAmount)}</Text>
                  </View>
                ) : null}
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>{t("total")}</Text>
                  <Text style={styles.totalValue}>{formatCurrency(summary.total)}</Text>
                </View>
                <Text style={[styles.pointsHint, { textAlign: isRTL ? "right" : "left" }]}>
                  {t("order_points")} {summary.pointsToEarn} points.
                </Text>
              </AnimatedCard>
            ) : (
              <View />
            )
          }
        />

        <ScalePressable
          containerStyle={[styles.checkoutButton, !cart.length && styles.buttonDisabled]}
          disabled={!cart.length}
          onPress={() => navigation.navigate("Checkout")}
        >
          <Text style={styles.checkoutText}>{t("checkout")}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
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
  heroStats: { flexDirection: "row", gap: 10 },
  heroStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  heroStatValue: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  heroStatLabel: { color: "#D1D5DB", fontSize: 11, fontWeight: "700" },
  listContent: { gap: 12, paddingBottom: 140 },
  itemCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#FFFCF8",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    padding: 12,
  },
  itemImage: { width: 96, height: 96, borderRadius: 20 },
  itemBody: { flex: 1, gap: 8 },
  itemTop: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "flex-start" },
  itemName: { flex: 1, color: "#111827", fontWeight: "900", fontSize: 17, lineHeight: 21 },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  optionsText: { color: "#64748B", lineHeight: 18, fontWeight: "600" },
  instructionsText: { color: "#9A3412", fontSize: 12, lineHeight: 18, fontStyle: "italic" },
  itemBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  price: { color: "#111827", fontWeight: "900", fontSize: 18 },
  summaryCard: {
    backgroundColor: "#111827",
    borderRadius: 28,
    padding: 18,
    gap: 12,
    marginTop: 2,
  },
  promoLabel: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  promoRow: { flexDirection: "row", gap: 10 },
  promoInput: {
    flex: 1,
    backgroundColor: "#1F2937",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#374151",
    color: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  promoButton: {
    backgroundColor: "#FFF4E8",
    borderRadius: 16,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  promoButtonText: { color: "#9A3412", fontWeight: "900" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  label: { color: "#CBD5E1", fontWeight: "600" },
  value: { color: "#FFF9F1", fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#374151", marginVertical: 4 },
  totalLabel: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },
  totalValue: { color: "#FDBA74", fontWeight: "900", fontSize: 22 },
  discountValue: { color: "#86EFAC", fontWeight: "900" },
  pointsHint: { color: "#D1D5DB", lineHeight: 20, fontWeight: "600" },
  checkoutButton: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 18,
    backgroundColor: "#EA580C",
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#9A3412",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  checkoutText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  buttonDisabled: { opacity: 0.45 },
});
