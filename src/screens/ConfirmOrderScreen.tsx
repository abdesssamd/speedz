import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useRef, useState } from "react";
import { Animated, FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { translatePayment } from "../i18n/mobile";
import { RootStackParamList } from "../navigation/AppNavigator";
import { formatCurrency } from "../services/format";

type ConfirmRoute = RouteProp<RootStackParamList, "ConfirmOrder">;

type SuccessInfo = { id: string; points: number };

export function ConfirmOrderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ConfirmRoute>();
  const { cartRestaurant, cart, getCartSummary, placeOrder, promoCode, pushNotification, t, isRTL } = useApp();
  const summary = getCartSummary();
  const draft = route.params.draft;

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  const onPay = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await placeOrder(draft);
      if (!result.order) {
        pushNotification({
          title: t("impossible_order"),
          message: result.error ?? t("check_cart"),
          tone: "error",
        });
        return;
      }
      setSuccess({ id: result.order.id, points: result.order.pointsEarned });
    } finally {
      setSubmitting(false);
    }
  };

  const goToOrders = () => {
    setSuccess(null);
    navigation.navigate("MainTabs", { screen: "Orders" });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerIcon}><Ionicons name="shield-checkmark" size={26} color="#FF7622" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.pageTitle}>{t("final_confirmation")}</Text>
            <Text style={s.pageSubtitle}>{t("final_confirmation_msg")}</Text>
          </View>
        </View>

        {/* Restaurant / delivery summary */}
        <AnimatedCard style={s.deliveryCard}>
          <Text style={s.restaurantName}>{cartRestaurant?.name}</Text>
          <View style={s.divider} />
          {[
            { icon: "location-outline" as const, label: "Adresse", val: draft.address },
            { icon: "cash-outline" as const, label: "Paiement", val: translatePayment(isRTL ? "ar" : "fr", draft.paymentMethod) },
            ...(draft.notes ? [{ icon: "create-outline" as const, label: "Note", val: draft.notes }] : []),
          ].map((row, i) => (
            <View key={i} style={s.infoRow}>
              <View style={s.infoIconWrap}><Ionicons name={row.icon} size={15} color="#FF7622" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>{row.label}</Text>
                <Text style={s.infoVal}>{row.val}</Text>
              </View>
            </View>
          ))}
        </AnimatedCard>

        <FlatList
          data={cart} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => (
            <View style={s.lineItem}>
              <View style={s.lineQtyBadge}><Text style={s.lineQtyText}>{item.quantity}×</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.lineTitle}>{item.name}</Text>
                {item.selectedOptions.length > 0 && (
                  <Text style={s.lineMeta}>{item.selectedOptions.map((o) => o.choiceName).join(", ")}</Text>
                )}
              </View>
              <Text style={s.linePrice}>
                {formatCurrency((item.basePrice + item.selectedOptions.reduce((sum, o) => sum + o.priceDelta, 0)) * item.quantity)}
              </Text>
            </View>
          )}
          ListFooterComponent={(
            <View style={s.summaryCard}>
              {[
                { l: t("subtotal"), v: formatCurrency(summary.subtotal) },
                { l: t("delivery"), v: formatCurrency(summary.deliveryFee) },
                { l: t("service_fee"), v: formatCurrency(summary.serviceFee) },
              ].map((r) => (
                <View key={r.l} style={s.summaryRow}><Text style={s.summaryLbl}>{r.l}</Text><Text style={s.summaryVal}>{r.v}</Text></View>
              ))}
              {summary.discountAmount ? (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLbl}>{t("discount")} {promoCode ? `(${promoCode})` : ""}</Text>
                  <Text style={s.discountVal}>- {formatCurrency(summary.discountAmount)}</Text>
                </View>
              ) : null}
              <View style={s.summaryDivider} />
              <View style={s.summaryRow}>
                <Text style={s.totalLbl}>{t("total")}</Text>
                <Text style={s.totalVal}>{formatCurrency(summary.total)}</Text>
              </View>
            </View>
          )}
        />

        <ScalePressable containerStyle={[s.payBtn, submitting && s.payBtnDisabled]} onPress={onPay}>
          <View style={s.payBtnLeft}>
            <Ionicons name="checkmark-circle" size={20} color="#FF7622" />
            <Text style={s.payBtnText}>{submitting ? t("payment") + "…" : `${t("payment")} & ${t("order_confirmed")}`}</Text>
          </View>
          <Text style={s.payBtnTotal}>{formatCurrency(summary.total)}</Text>
        </ScalePressable>
      </View>

      {success ? <SuccessOverlay info={success} onSeeOrders={goToOrders} t={t} /> : null}
    </SafeAreaView>
  );
}

// Écran de succès animé affiché après le passage de la commande (remplace l'alerte système).
function SuccessOverlay({
  info,
  onSeeOrders,
  t,
}: {
  info: SuccessInfo;
  onSeeOrders: () => void;
  t: (key: any) => string;
}) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
    Animated.spring(check, { toValue: 1, friction: 5, delay: 160, useNativeDriver: true }).start();
  }, [check, opacity, scale]);

  return (
    <Animated.View style={[s.overlay, { opacity }]}>
      <Animated.View style={[s.successCard, { transform: [{ scale }] }]}>
        <Animated.View style={[s.successBadge, { transform: [{ scale: check }] }]}>
          <Ionicons name="checkmark" size={46} color="#FFF" />
        </Animated.View>
        <Text style={s.successTitle}>{t("order_confirmed")}</Text>
        <Text style={s.successSub}>{t("order_success_sub")}</Text>

        <View style={s.pointsPill}>
          <Ionicons name="sparkles" size={15} color="#B45309" />
          <Text style={s.pointsPillText}>+{info.points} {t("points")}</Text>
        </View>

        <Text style={s.orderRef}>#{info.id.slice(-6).toUpperCase()}</Text>

        <ScalePressable containerStyle={s.successBtn} onPress={onSeeOrders}>
          <Text style={s.successBtnText}>{t("see_orders")}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </ScalePressable>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { flex: 1, paddingTop: 20, paddingHorizontal: 20, gap: 14 },

  header: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  headerIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center", shadowColor: "#FF7622", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  pageTitle: { color: "#181C2E", fontSize: 24, fontWeight: "900" },
  pageSubtitle: { color: "#898989", fontSize: 13, lineHeight: 19, marginTop: 3 },

  deliveryCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 18, gap: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  restaurantName: { color: "#FF7622", fontWeight: "900", fontSize: 18 },
  divider: { height: 1, backgroundColor: "#F5F5F5" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center", marginTop: 2 },
  infoLabel: { color: "#898989", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  infoVal: { color: "#181C2E", fontWeight: "700", fontSize: 14, lineHeight: 20 },

  listContent: { gap: 10, paddingBottom: 110 },
  lineItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF", borderRadius: 18, padding: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  lineQtyBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" },
  lineQtyText: { color: "#FF7622", fontWeight: "900", fontSize: 13 },
  lineTitle: { color: "#181C2E", fontWeight: "800", fontSize: 14 },
  lineMeta: { color: "#898989", fontSize: 12, marginTop: 2 },
  linePrice: { color: "#FF7622", fontWeight: "900", fontSize: 15 },

  summaryCard: { backgroundColor: "#FFF", borderRadius: 22, padding: 18, gap: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLbl: { color: "#898989", fontWeight: "600", fontSize: 14 },
  summaryVal: { color: "#181C2E", fontWeight: "700", fontSize: 14 },
  discountVal: { color: "#22C55E", fontWeight: "800" },
  summaryDivider: { height: 1, backgroundColor: "#F5F5F5", marginVertical: 4 },
  totalLbl: { color: "#181C2E", fontWeight: "900", fontSize: 18 },
  totalVal: { color: "#FF7622", fontWeight: "900", fontSize: 22 },

  payBtn: { position: "absolute", left: 20, right: 20, bottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#181C2E", borderRadius: 22, paddingVertical: 18, paddingHorizontal: 22, shadowColor: "#181C2E", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  payBtnLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  payBtnText: { color: "#FFF", fontWeight: "900", fontSize: 15 },
  payBtnTotal: { color: "#FF7622", fontWeight: "900", fontSize: 16 },
  payBtnDisabled: { opacity: 0.6 },

  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(24,28,46,0.55)", alignItems: "center", justifyContent: "center", padding: 28 },
  successCard: { width: "100%", maxWidth: 360, backgroundColor: "#FFF", borderRadius: 28, paddingVertical: 30, paddingHorizontal: 24, alignItems: "center", gap: 10, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 16 },
  successBadge: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center", marginBottom: 6, shadowColor: "#22C55E", shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  successTitle: { color: "#181C2E", fontSize: 22, fontWeight: "900", textAlign: "center" },
  successSub: { color: "#898989", fontSize: 14, textAlign: "center", lineHeight: 20 },
  pointsPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF3C7", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginTop: 6 },
  pointsPillText: { color: "#B45309", fontWeight: "900", fontSize: 14 },
  orderRef: { color: "#C4C4C4", fontWeight: "800", fontSize: 13, letterSpacing: 1, marginTop: 2 },
  successBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FF7622", borderRadius: 18, paddingVertical: 16, paddingHorizontal: 24, marginTop: 14, alignSelf: "stretch", shadowColor: "#FF7622", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  successBtnText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
});
