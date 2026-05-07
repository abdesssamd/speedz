/**
 * CartScreen — Refonte Just Eat Takeaway
 * ─────────────────────────────────────────────────────────────────────────────
 * Changements vs version originale :
 *  1. Barre de commande sticky orange en bas (count + label + prix)
 *  2. Items en layout compact : qty boutons à gauche, prix à droite, sans image
 *  3. Code promo affiché comme ligne cliquable discrète (pas TextInput permanent)
 *  4. Ligne points fidélité verte dans le récapitulatif avant le total
 *  5. Bouton "+ Ajouter un article" pour retourner au restaurant
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { formatCurrency } from "../services/format";

const JE = {
  orange: "#F36E26",
  orangeLight: "#FFF0E8",
  dark: "#181C2E",
  grey: "#898989",
  greyLight: "#F5F5F5",
  white: "#FFFFFF",
  green: "#22C55E",
  greenLight: "#F0FFF4",
  border: "#F0F0F0",
};

export function CartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    cart, cartRestaurant, getCartSummary,
    updateCartItemQuantity, removeCartItem,
    promoCode, setPromoCode, applyPromoCode,
    t, isRTL,
  } = useApp();

  const summary = getCartSummary();
  const [promoModalVisible, setPromoModalVisible] = useState(false);
  const [localPromo, setLocalPromo] = useState(promoCode);

  const handleApplyPromo = () => {
    applyPromoCode(localPromo);
    setPromoModalVisible(false);
  };

  const handleRemoveItem = (id: string) => {
    Alert.alert(
      "Supprimer l'article",
      "Retirer cet article du panier ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => removeCartItem(id) },
      ]
    );
  };

  // Estimation points gagnés
  const pointsToEarn = summary.pointsToEarn ?? Math.floor(summary.total * 2);

  // ── Modal code promo ──────────────────────────────────────────────────────
  const PromoModal = (
    <Modal
      visible={promoModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setPromoModalVisible(false)}
    >
      <TouchableOpacity
        style={s.modalOverlay}
        activeOpacity={1}
        onPress={() => setPromoModalVisible(false)}
      >
        <TouchableOpacity style={s.modalSheet} activeOpacity={1}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Code promo</Text>
          <View style={s.promoInputWrap}>
            <Ionicons name="pricetag-outline" size={18} color={JE.orange} />
            <TextInput
              style={s.promoInput}
              value={localPromo}
              onChangeText={setLocalPromo}
              placeholder="Entrez votre code"
              placeholderTextColor="#C4C4C4"
              autoCapitalize="characters"
              autoFocus
            />
            {localPromo.length > 0 && (
              <TouchableOpacity onPress={() => setLocalPromo("")}>
                <Ionicons name="close-circle" size={18} color="#C4C4C4" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[s.promoApplyBtn, !localPromo && s.promoApplyBtnDisabled]}
            onPress={handleApplyPromo}
            disabled={!localPromo}
          >
            <Text style={s.promoApplyTxt}>Appliquer</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  if (cart.length === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.emptyHeader}>
          <Text style={s.pageTitle}>Votre commande</Text>
        </View>
        <EmptyState
          title={t("empty_cart")}
          message={t("empty_cart_msg")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {PromoModal}

      <FlatList
        data={cart}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}

        // ── En-tête ──────────────────────────────────────────────────────
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.pageTitle}>Votre commande</Text>
            {cartRestaurant && (
              <View style={s.headerMeta}>
                <Ionicons name="storefront-outline" size={13} color={JE.orange} />
                <Text style={s.headerRestaurant}>{cartRestaurant.name}</Text>
              </View>
            )}
          </View>
        }

        // ── Item ─────────────────────────────────────────────────────────
        renderItem={({ item, index }) => (
          <AnimatedCard delay={Math.min(index * 50, 150)} style={s.itemCard}>
            {/* Contrôle quantité à gauche */}
            <View style={s.qtyControl}>
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() =>
                  item.quantity <= 1
                    ? handleRemoveItem(item.id)
                    : updateCartItemQuantity(item.id, item.quantity - 1)
                }
              >
                <Ionicons
                  name={item.quantity <= 1 ? "trash-outline" : "remove"}
                  size={14}
                  color={item.quantity <= 1 ? "#EF4444" : JE.orange}
                />
              </TouchableOpacity>
              <Text style={s.qtyVal}>{item.quantity}</Text>
              <TouchableOpacity
                style={[s.qtyBtn, s.qtyBtnActive]}
                onPress={() => updateCartItemQuantity(item.id, item.quantity + 1)}
              >
                <Ionicons name="add" size={14} color={JE.white} />
              </TouchableOpacity>
            </View>

            {/* Nom + options */}
            <View style={s.itemBody}>
              <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
              {item.selectedOptions.length > 0 && (
                <Text style={s.itemOptions} numberOfLines={1}>
                  {item.selectedOptions.map((o) => o.choiceName).join(", ")}
                </Text>
              )}
              {item.specialInstructions ? (
                <Text style={s.itemNote}>📝 {item.specialInstructions}</Text>
              ) : null}
            </View>

            {/* Prix à droite */}
            <Text style={s.itemPrice}>
              {formatCurrency(
                (item.basePrice +
                  item.selectedOptions.reduce((sum, o) => sum + o.priceDelta, 0)) *
                  item.quantity
              )}
            </Text>
          </AnimatedCard>
        )}

        // ── Pied de liste ────────────────────────────────────────────────
        ListFooterComponent={
          <View style={s.footer}>

            {/* Bouton retour restaurant */}
            {cartRestaurant && (
              <TouchableOpacity
                style={s.addMoreBtn}
                onPress={() =>
                  navigation.navigate("Restaurant", {
                    restaurantId: cartRestaurant.id,
                  })
                }
              >
                <Ionicons name="add-circle-outline" size={16} color={JE.orange} />
                <Text style={s.addMoreTxt}>Ajouter un article</Text>
              </TouchableOpacity>
            )}

            {/* Code promo — ligne discrète cliquable */}
            <TouchableOpacity
              style={s.promoBand}
              onPress={() => setPromoModalVisible(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="pricetag-outline" size={16} color={JE.orange} />
              <Text style={s.promoBandTxt}>
                {promoCode ? `Code "${promoCode}" appliqué ✓` : "Avez-vous un code promo ?"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={JE.orange} />
            </TouchableOpacity>

            {/* Récapitulatif */}
            <View style={s.summaryCard}>
              <Text style={s.summaryTitle}>Récapitulatif</Text>

              {[
                { label: t("subtotal"), value: formatCurrency(summary.subtotal) },
                {
                  label: `${t("delivery")} · ${summary.deliveryDistanceKm} km`,
                  value: formatCurrency(summary.deliveryFee),
                },
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
                  <Text style={[s.summaryValue, { color: JE.green }]}>
                    − {formatCurrency(summary.discountAmount)}
                  </Text>
                </View>
              ) : null}

              {/* Points fidélité — ligne verte JE */}
              <View style={[s.summaryRow, s.pointsRow]}>
                <View style={s.pointsLeft}>
                  <Ionicons name="star" size={13} color={JE.green} />
                  <Text style={s.pointsTxt}>Points gagnés</Text>
                </View>
                <Text style={s.pointsVal}>+{pointsToEarn} pts</Text>
              </View>

              <View style={s.divider} />

              <View style={s.summaryRow}>
                <Text style={s.totalLabel}>{t("total")}</Text>
                <Text style={s.totalValue}>{formatCurrency(summary.total)}</Text>
              </View>
            </View>

            {/* Spacer pour la barre sticky */}
            <View style={{ height: 90 }} />
          </View>
        }
      />

      {/* ── Barre sticky de commande — signature Just Eat ─────────────────── */}
      <View style={s.stickyBar}>
        <View style={s.stickyCount}>
          <Text style={s.stickyCountTxt}>{cart.length}</Text>
        </View>
        <TouchableOpacity
          style={s.stickyBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("Checkout")}
        >
          <Text style={s.stickyLabel}>Confirmer la commande</Text>
          <Text style={s.stickyPrice}>{formatCurrency(summary.total)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: JE.greyLight },
  listContent: { paddingBottom: 16 },

  emptyHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  header: {
    backgroundColor: JE.white, paddingHorizontal: 20,
    paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: JE.border,
    gap: 4,
  },
  pageTitle: { color: JE.dark, fontSize: 22, fontWeight: "900" },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  headerRestaurant: { color: JE.orange, fontSize: 13, fontWeight: "600" },

  // Items
  itemCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: JE.white, marginHorizontal: 16, marginTop: 8,
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: JE.border,
  },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: JE.greyLight, alignItems: "center", justifyContent: "center",
  },
  qtyBtnActive: { backgroundColor: JE.orange },
  qtyVal: { color: JE.dark, fontWeight: "800", fontSize: 14, minWidth: 18, textAlign: "center" },
  itemBody: { flex: 1, gap: 3 },
  itemName: { color: JE.dark, fontWeight: "700", fontSize: 13, lineHeight: 18 },
  itemOptions: { color: JE.grey, fontSize: 11 },
  itemNote: { color: JE.orange, fontSize: 11, fontStyle: "italic" },
  itemPrice: { color: JE.dark, fontWeight: "800", fontSize: 13 },

  // Footer
  footer: { paddingHorizontal: 16, gap: 12, paddingTop: 8 },
  addMoreBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: JE.orangeLight, borderRadius: 12,
  },
  addMoreTxt: { color: JE.orange, fontWeight: "700", fontSize: 13 },

  // Promo band
  promoBand: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: JE.white, borderRadius: 14,
    padding: 14, borderWidth: 1.5, borderColor: JE.orange,
    borderStyle: "dashed",
  },
  promoBandTxt: { flex: 1, color: JE.orange, fontWeight: "600", fontSize: 13 },

  // Récap
  summaryCard: {
    backgroundColor: JE.white, borderRadius: 18, padding: 18, gap: 10,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  summaryTitle: { color: JE.dark, fontWeight: "900", fontSize: 16, marginBottom: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: JE.grey, fontSize: 13, fontWeight: "600" },
  summaryValue: { color: JE.dark, fontSize: 13, fontWeight: "700" },
  pointsRow: {
    backgroundColor: JE.greenLight, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  pointsLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  pointsTxt: { color: JE.green, fontSize: 13, fontWeight: "600" },
  pointsVal: { color: JE.green, fontWeight: "800", fontSize: 13 },
  divider: { height: 1, backgroundColor: JE.greyLight, marginVertical: 4 },
  totalLabel: { color: JE.dark, fontWeight: "900", fontSize: 18 },
  totalValue: { color: JE.orange, fontWeight: "900", fontSize: 22 },

  // Barre sticky
  stickyBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: JE.white, paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: JE.border,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  stickyCount: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: JE.orangeLight, alignItems: "center", justifyContent: "center",
  },
  stickyCountTxt: { color: JE.orange, fontWeight: "900", fontSize: 15 },
  stickyBtn: {
    flex: 1, backgroundColor: JE.orange, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: JE.orange, shadowOpacity: 0.4, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  stickyLabel: { color: JE.white, fontWeight: "800", fontSize: 15 },
  stickyPrice: { color: JE.white, fontWeight: "900", fontSize: 15 },

  // Modal promo
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: JE.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 18,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0",
    alignSelf: "center", marginBottom: 4,
  },
  modalTitle: { color: JE.dark, fontSize: 20, fontWeight: "900" },
  promoInputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: JE.greyLight, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1.5, borderColor: JE.border,
  },
  promoInput: {
    flex: 1, color: JE.dark, fontSize: 16, fontWeight: "700",
    paddingVertical: 12, letterSpacing: 1,
  },
  promoApplyBtn: {
    backgroundColor: JE.orange, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  promoApplyBtnDisabled: { backgroundColor: "#E0E0E0" },
  promoApplyTxt: { color: JE.white, fontWeight: "900", fontSize: 16 },
});
