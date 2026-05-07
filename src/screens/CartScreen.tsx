import { Ionicons } from "@expo/vector-icons";
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
  const { cart, cartRestaurant, getCartSummary, updateCartItemQuantity, removeCartItem, promoCode, setPromoCode, applyPromoCode, t, isRTL } = useApp();
  const summary = getCartSummary();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.pageTitle}>{t("cart_title")}</Text>
            {cartRestaurant && <Text style={s.pageSubtitle}>{t("current_order_at")} {cartRestaurant.name}</Text>}
          </View>
          {cart.length > 0 && (
            <View style={s.countBadge}><Text style={s.countBadgeText}>{cart.length}</Text></View>
          )}
        </View>

        <FlatList
          data={cart} keyExtractor={(i) => i.id} showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          renderItem={({ item, index }) => (
            <AnimatedCard delay={Math.min(index * 60, 220)} style={s.itemCard}>
              <Image source={{ uri: item.image }} style={s.itemImg} />
              <View style={s.itemBody}>
                <View style={s.itemTop}>
                  <Text style={[s.itemName, { flex: 1, textAlign: isRTL ? "right" : "left" }]}>{item.name}</Text>
                  <ScalePressable containerStyle={s.deleteBtn}
                    onPress={() => Alert.alert(t("delete_item_title"), t("delete_item_message"), [
                      { text: t("cancel"), style: "cancel" },
                      { text: t("delete"), style: "destructive", onPress: () => removeCartItem(item.id) },
                    ])}>
                    <Ionicons name="trash-outline" size={16} color="#FF7622" />
                  </ScalePressable>
                </View>
                {item.selectedOptions.length > 0 && (
                  <Text style={s.itemOptions} numberOfLines={1}>
                    {item.selectedOptions.map((o) => o.choiceName).join(", ")}
                  </Text>
                )}
                {item.specialInstructions ? (
                  <Text style={s.itemNote}>📝 {item.specialInstructions}</Text>
                ) : null}
                <View style={s.itemBottom}>
                  <Text style={s.itemPrice}>
                    {formatCurrency((item.basePrice + item.selectedOptions.reduce((sum, o) => sum + o.priceDelta, 0)) * item.quantity)}
                  </Text>
                  <QuantityControl quantity={item.quantity}
                    onDecrease={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                    onIncrease={() => updateCartItemQuantity(item.id, item.quantity + 1)} />
                </View>
              </View>
            </AnimatedCard>
          )}
          ListEmptyComponent={<EmptyState title={t("empty_cart")} message={t("empty_cart_msg")} />}
          ListFooterComponent={cart.length ? (
            <View style={s.summarySection}>
              {/* Promo */}
              <View style={s.promoCard}>
                <View style={s.promoInputWrap}>
                  <Ionicons name="pricetag-outline" size={16} color="#FF7622" />
                  <TextInput value={promoCode} onChangeText={setPromoCode} placeholder={t("promo_placeholder")}
                    placeholderTextColor="#C4C4C4" style={[s.promoInput, { textAlign: isRTL ? "right" : "left" }]} />
                </View>
                <ScalePressable containerStyle={s.promoBtn} onPress={() => applyPromoCode(promoCode)}>
                  <Text style={s.promoBtnText}>{t("apply_promo")}</Text>
                </ScalePressable>
              </View>

              {/* Order summary */}
              <View style={s.summaryCard}>
                <Text style={s.summaryTitle}>Récapitulatif</Text>
                {[
                  { label: t("subtotal"), value: formatCurrency(summary.subtotal) },
                  { label: t("delivery"), value: `${formatCurrency(summary.deliveryFee)} · ${summary.deliveryDistanceKm} km` },
                  { label: t("service_fee"), value: formatCurrency(summary.serviceFee) },
                ].map((row) => (
                  <View key={row.label} style={s.summaryRow}>
                    <Text style={s.summaryLabel}>{row.label}</Text>
                    <Text style={s.summaryValue}>{row.value}</Text>
                  </View>
                ))}
                {summary.discountAmount ? (
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>{t("discount")}</Text>
                    <Text style={s.discountValue}>- {formatCurrency(summary.discountAmount)}</Text>
                  </View>
                ) : null}
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                  <Text style={s.totalLabel}>{t("total")}</Text>
                  <Text style={s.totalValue}>{formatCurrency(summary.total)}</Text>
                </View>
                <View style={s.pointsRow}>
                  <Ionicons name="star" size={14} color="#FF7622" />
                  <Text style={s.pointsText}>{t("order_points")} <Text style={s.pointsHighlight}>{summary.pointsToEarn} pts</Text></Text>
                </View>
              </View>
            </View>
          ) : <View />}
        />

        {cart.length > 0 && (
          <ScalePressable containerStyle={s.checkoutBtn} onPress={() => navigation.navigate("Checkout")}>
            <Text style={s.checkoutText}>{t("checkout")}</Text>
            <View style={s.checkoutArrow}><Ionicons name="arrow-forward" size={18} color="#FF7622" /></View>
          </ScalePressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { flex: 1, paddingTop: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 16 },
  pageTitle: { color: "#181C2E", fontSize: 28, fontWeight: "900" },
  pageSubtitle: { color: "#898989", fontSize: 13, marginTop: 2 },
  countBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FF7622", alignItems: "center", justifyContent: "center" },
  countBadgeText: { color: "#FFF", fontWeight: "900", fontSize: 15 },

  listContent: { paddingHorizontal: 20, gap: 12, paddingBottom: 110 },
  itemCard: { flexDirection: "row", gap: 14, backgroundColor: "#FFF", borderRadius: 22, padding: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  itemImg: { width: 84, height: 84, borderRadius: 18 },
  itemBody: { flex: 1, gap: 6 },
  itemTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  itemName: { color: "#181C2E", fontWeight: "800", fontSize: 16, lineHeight: 21 },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" },
  itemOptions: { color: "#898989", fontSize: 12, lineHeight: 17 },
  itemNote: { color: "#FF7622", fontSize: 12, fontStyle: "italic" },
  itemBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemPrice: { color: "#FF7622", fontWeight: "900", fontSize: 18 },

  summarySection: { gap: 14, paddingTop: 4 },
  promoCard: { flexDirection: "row", gap: 10, backgroundColor: "#FFF", borderRadius: 18, padding: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  promoInputWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F5F5F5", borderRadius: 14, paddingHorizontal: 12 },
  promoInput: { flex: 1, color: "#181C2E", paddingVertical: 12, fontSize: 14 },
  promoBtn: { backgroundColor: "#FF7622", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  promoBtnText: { color: "#FFF", fontWeight: "900", fontSize: 13 },

  summaryCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 20, gap: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  summaryTitle: { color: "#181C2E", fontWeight: "900", fontSize: 18, marginBottom: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: "#898989", fontSize: 14, fontWeight: "600" },
  summaryValue: { color: "#181C2E", fontSize: 14, fontWeight: "700" },
  discountValue: { color: "#22C55E", fontWeight: "800" },
  summaryDivider: { height: 1, backgroundColor: "#F5F5F5", marginVertical: 4 },
  totalLabel: { color: "#181C2E", fontWeight: "900", fontSize: 18 },
  totalValue: { color: "#FF7622", fontWeight: "900", fontSize: 22 },
  pointsRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF3EC", borderRadius: 12, padding: 10 },
  pointsText: { color: "#898989", fontSize: 13 },
  pointsHighlight: { color: "#FF7622", fontWeight: "800" },

  checkoutBtn: { position: "absolute", left: 20, right: 20, bottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#181C2E", borderRadius: 22, paddingVertical: 18, paddingHorizontal: 22, shadowColor: "#181C2E", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  checkoutText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
  checkoutArrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FF7622", alignItems: "center", justifyContent: "center" },
});
