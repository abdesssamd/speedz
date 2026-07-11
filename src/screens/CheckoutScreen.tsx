import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
  Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { translatePayment } from "../i18n/mobile";
import { RootStackParamList } from "../navigation/AppNavigator";
import { formatCurrency } from "../services/format";
import { ThemeColors } from "../theme/mobile";
import { useTheme } from "../theme/ThemeProvider";
import { PaymentMethod } from "../types";

export function CheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    cart, currentLocation, getCartSummary, createCheckoutDraft, placeOrder,
    pushNotification, promoCode, savedAddresses, t, isRTL,
  } = useApp();
  const { colors: c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const summary = getCartSummary();
  const [address, setAddress] = useState(currentLocation.label);
  const [paymentMethod] = useState<PaymentMethod>("Cash");
  const [notes, setNotes] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!cart.length) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        <EmptyState title={t("empty_cart")} message={t("empty_cart_back")} />
      </View>
    </SafeAreaView>
  );

  const onConfirm = async () => {
    if (!address.trim()) { pushNotification({ title: t("address_required"), message: t("address_required_msg"), tone: "error" }); return; }
    setIsSubmitting(true);
    try {
      const draft = createCheckoutDraft({ address, paymentMethod, notes });
      const result = await placeOrder(draft);
      setIsSubmitting(false);
      if (!result.order) {
        Alert.alert(
          t("impossible_order"),
          result.error ?? t("check_cart"),
          [{ text: "OK" }],
        );
        return;
      }
      Alert.alert(
        "✅ " + t("order_confirmed"),
        `${result.order.id} ${t("order_created")} ${result.order.pointsEarned ?? 0} ${t("points")}`,
        [{ text: t("see_orders"), onPress: () => navigation.navigate("MainTabs") }],
      );
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert("Erreur technique", "Impossible de contacter le serveur. Verifie ta connexion.");
    }
  };

  const selectAddress = (addr: string) => {
    setAddress(addr);
    setAddressPickerVisible(false);
  };

  // ── Modal adresses sauvegardées ───────────────────────────────────────────
  const AddressPickerModal = (
    <Modal visible={addressPickerVisible} transparent animationType="slide" onRequestClose={() => setAddressPickerVisible(false)}>
      <Pressable style={s.modalOverlay} onPress={() => setAddressPickerVisible(false)}>
        <Pressable style={s.modalSheet} onPress={() => null}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Adresses sauvegardées</Text>
          {savedAddresses.length === 0 ? (
            <Text style={s.noAddresses}>Aucune adresse sauvegardée</Text>
          ) : (
            savedAddresses.map((sa) => (
              <TouchableOpacity key={sa.id} style={s.addressRow} onPress={() => selectAddress(sa.address)}>
                <Ionicons name="location-outline" size={18} color="#FF7622" />
                <View style={{ flex: 1 }}>
                  <Text style={s.addressLabel}>{sa.label}</Text>
                  <Text style={s.addressDetail}>{sa.address}</Text>
                </View>
                {address === sa.address && <Ionicons name="checkmark-circle" size={20} color="#22C55E" />}
              </TouchableOpacity>
            ))
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <SafeAreaView style={s.safe}>
      {AddressPickerModal}
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
          {savedAddresses.length > 0 && (
            <TouchableOpacity style={s.savedAddressesBtn} onPress={() => setAddressPickerVisible(true)}>
              <Ionicons name="bookmark-outline" size={16} color="#FF7622" />
              <Text style={s.savedAddressesTxt}>Choisir une adresse sauvegardée</Text>
              <Ionicons name="chevron-forward" size={16} color="#FF7622" />
            </TouchableOpacity>
          )}
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

        <ScalePressable containerStyle={s.ctaBtn} onPress={() => void onConfirm()} disabled={isSubmitting}>
          <Text style={s.ctaText}>{isSubmitting ? "En cours…" : "Confirmer la commande"}</Text>
          <View style={s.ctaArrow}><Ionicons name="arrow-forward" size={18} color="#FF7622" /></View>
        </ScalePressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, gap: 16, paddingBottom: 36 },
  pageTitle: { color: c.text, fontSize: 28, fontWeight: "900" },

  infoBar: { flexDirection: "row", gap: 12 },
  infoChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surface, borderRadius: 16, padding: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  infoChipIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  infoChipText: { color: c.text, fontWeight: "700", fontSize: 13 },

  section: { backgroundColor: c.surface, borderRadius: 24, padding: 18, gap: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: c.text, fontWeight: "900", fontSize: 16 },
  locationHint: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationHintText: { flex: 1, color: c.textMuted, fontSize: 13 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: c.borderSoft, backgroundColor: c.surfaceMuted, paddingHorizontal: 14 },
  inputWrapMulti: { alignItems: "flex-start", paddingVertical: 12 },
  inputFocused: { borderColor: "#FF7622", backgroundColor: c.brandSurface },
  input: { flex: 1, color: c.text, fontSize: 14, paddingVertical: 4 },
  inputMulti: { minHeight: 72, textAlignVertical: "top" },

  paymentCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.successSoft, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: c.successDark },
  paymentIconLarge: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.successSoft, alignItems: "center", justifyContent: "center" },
  paymentName: { color: c.text, fontWeight: "800", fontSize: 15 },
  paymentNote: { color: c.textMuted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  paymentCheck: {},

  summaryCard: { backgroundColor: c.surface, borderRadius: 24, padding: 20, gap: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  summaryTitle: { color: c.text, fontWeight: "900", fontSize: 18 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLbl: { color: c.textMuted, fontSize: 14, fontWeight: "600" },
  summaryVal: { color: c.text, fontSize: 14, fontWeight: "700" },
  discountVal: { color: c.success, fontWeight: "800" },
  divider: { height: 1, backgroundColor: c.borderSoft, marginVertical: 4 },
  totalLbl: { color: c.text, fontWeight: "900", fontSize: 18 },
  totalVal: { color: "#FF7622", fontWeight: "900", fontSize: 22 },
  pointsRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.brandSoft, borderRadius: 12, padding: 10 },
  pointsText: { color: c.textMuted, fontSize: 13 },

  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.ink, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 22, shadowColor: "#181C2E", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  ctaText: { color: c.white, fontWeight: "900", fontSize: 16 },
  ctaArrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FF7622", alignItems: "center", justifyContent: "center" },

  savedAddressesBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, marginTop: 4 },
  savedAddressesTxt: { flex: 1, color: "#FF7622", fontWeight: "700", fontSize: 13 },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: 4 },
  modalTitle: { color: c.text, fontSize: 20, fontWeight: "900" },
  noAddresses: { color: c.textMuted, fontSize: 14, textAlign: "center", paddingVertical: 20 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.borderSoft },
  addressLabel: { color: c.text, fontWeight: "800", fontSize: 14 },
  addressDetail: { color: c.textMuted, fontSize: 12, marginTop: 2 },
  });
}
