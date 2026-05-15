/**
 * RestaurantScreen — Refonte Just Eat Takeaway
 * ─────────────────────────────────────────────────────────────────────────────
 * Changements vs version originale :
 *  1. Onglets catégories sticky style JE (souligné orange, scroll horizontal)
 *  2. Chips d'info restaurant sous le hero (halal, paiement, fidélité, horaires)
 *  3. Badge "Best Seller" calculé sur les 3 plats les plus commandés
 *  4. Bouton "+" direct sur la carte item (sans modale si pas d'options requises)
 *  5. Barre panier sticky en bas identique au CartScreen
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { ProductModal } from "../components/ProductModal";
import { QuantityControl } from "../components/QuantityControl";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getDeliveryQuote } from "../services/delivery";
import { formatCurrency } from "../services/format";
import { MenuItem, Restaurant, SelectedOption } from "../types";

type RestaurantRoute = RouteProp<RootStackParamList, "Restaurant">;

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

// ─── Helpers (repris de l'original) ──────────────────────────────────────────
function buildDefaultOptions(item: MenuItem): SelectedOption[] {
  return item.options.flatMap((group) =>
    group.required && group.choices[0]
      ? [
          {
            groupId: group.id,
            groupName: group.name,
            choiceId: group.choices[0].id,
            choiceName: group.choices[0].name,
            priceDelta: group.choices[0].priceDelta,
          },
        ]
      : []
  );
}

function sameOptionSet(left: SelectedOption[], right: SelectedOption[]) {
  const normalize = (items: SelectedOption[]) =>
    [...items]
      .map((i) => `${i.groupId}:${i.choiceId}:${i.priceDelta}`)
      .sort()
      .join("|");
  return left.length === right.length && normalize(left) === normalize(right);
}

// ─── Chips d'information restaurant ──────────────────────────────────────────
function InfoChip({
  icon,
  label,
  color = JE.grey,
  bg = JE.greyLight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  bg?: string;
}) {
  return (
    <View style={[s.infoChip, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[s.infoChipTxt, { color }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function RestaurantScreen() {
  const route = useRoute<RestaurantRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    restaurants, favorites, cart, currentLocation,
    toggleFavorite, addToCart, updateCartItemQuantity, removeCartItem,
    t, isRTL,
  } = useApp();

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("popular");
  const catScrollRef = useRef<ScrollView>(null);

  const restaurant = restaurants.find((r) => r.id === route.params.restaurantId);
  const delivery = useMemo(() => {
    if (!restaurant) return null;
    return getDeliveryQuote(currentLocation.coordinates, restaurant.coordinates);
  }, [currentLocation.coordinates, restaurant]);

  // Catégories extraites du menu + "Populaires" en tête
  const restaurantCategories = useMemo(() => {
    if (!restaurant) return [];
    const cats = Array.from(new Set(restaurant.menu.map((i) => i.category)));
    return ["popular", ...cats];
  }, [restaurant]);

  // Les 3 plats "Best Seller" (supposément les premiers, ou ceux avec badge)
  const bestSellerIds = useMemo(() => {
    if (!restaurant) return new Set<string>();
    const withBadge = restaurant.menu.filter((i) => i.badge);
    const top = withBadge.length >= 3 ? withBadge : restaurant.menu.slice(0, 3);
    return new Set(top.map((i) => i.id));
  }, [restaurant]);

  const filteredMenu = useMemo(() => {
    if (!restaurant) return [];
    if (activeCategory === "popular") {
      return restaurant.menu.filter((i) => bestSellerIds.has(i.id));
    }
    return restaurant.menu.filter((i) => i.category === activeCategory);
  }, [activeCategory, restaurant, bestSellerIds]);

  const cartItemsForRestaurant = useMemo(
    () => cart.filter((e) => e.restaurantId === restaurant?.id),
    [cart, restaurant]
  );
  const cartCount = cartItemsForRestaurant.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cartItemsForRestaurant.reduce(
    (s, i) =>
      s + (i.basePrice + i.selectedOptions.reduce((a, o) => a + o.priceDelta, 0)) * i.quantity,
    0
  );

  const isFav = favorites.includes(restaurant?.id ?? "");
  const minOrderAmount =
    typeof (restaurant as Restaurant & { minOrderAmount?: number }).minOrderAmount === "number"
      ? (restaurant as Restaurant & { minOrderAmount?: number }).minOrderAmount
      : null;

  if (!restaurant || !delivery) {
    return (
      <SafeAreaView style={s.safe}>
        <EmptyState title={t("restaurant_not_found")} message={t("restaurant_not_found_msg")} />
      </SafeAreaView>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddToCart = (
    item: MenuItem,
    selectedOptions: SelectedOption[],
    quantity: number,
    specialInstructions?: string,
    forceReplace?: boolean
  ) => {
    const result = addToCart(restaurant, item, selectedOptions, quantity, specialInstructions, forceReplace);
    if (!result.ok && result.reason === "DIFFERENT_RESTAURANT") {
      Alert.alert(
        t("replace_cart_title"),
        `${t("replace_cart_message")} ${result.restaurantName}. ${t("replace_cart_message_2")} ${restaurant.name} ?`,
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("replace"),
            style: "destructive",
            onPress: () => handleAddToCart(item, selectedOptions, quantity, specialInstructions, true),
          },
        ]
      );
      return false;
    }
    setSelectedItem(null);
    return true;
  };

  const getQuickEntry = (item: MenuItem) => {
    const defaults = buildDefaultOptions(item);
    return cart.find(
      (e) =>
        e.restaurantId === restaurant.id &&
        e.menuItemId === item.id &&
        !e.specialInstructions &&
        sameOptionSet(e.selectedOptions, defaults)
    );
  };

  const quickIncrease = (item: MenuItem) => handleAddToCart(item, buildDefaultOptions(item), 1);
  const quickDecrease = (item: MenuItem) => {
    const entry = getQuickEntry(item);
    if (!entry) return;
    entry.quantity <= 1 ? removeCartItem(entry.id) : updateCartItemQuantity(entry.id, entry.quantity - 1);
  };

  // ── Item de menu ──────────────────────────────────────────────────────────
  const renderMenuItem = ({ item, index }: { item: MenuItem; index: number }) => {
    const quickEntry = getQuickEntry(item);
    const quickQty = quickEntry?.quantity ?? 0;
    const hasRequiredOptions = item.options.some((g) => g.required);
    const isBestSeller = bestSellerIds.has(item.id);

    return (
      <AnimatedCard delay={Math.min(index * 40, 180)}>
        <TouchableOpacity
          style={s.menuItem}
          activeOpacity={0.88}
          onPress={() => setSelectedItem(item)}
        >
          {/* Image */}
          <Image source={{ uri: item.image }} style={s.menuItemImg} />

          {/* Corps */}
          <View style={s.menuItemBody}>
            {/* Badges */}
            <View style={s.badgeRow}>
              {isBestSeller && (
                <View style={s.bestSellerBadge}>
                  <Ionicons name="star" size={9} color={JE.green} />
                  <Text style={s.bestSellerTxt}>Best Seller</Text>
                </View>
              )}
              {item.badge ? (
                <View style={s.customBadge}>
                  <Text style={s.customBadgeTxt}>{item.badge}</Text>
                </View>
              ) : null}
            </View>

            <Text style={s.menuItemName} numberOfLines={2}>{item.name}</Text>
            <Text style={s.menuItemDesc} numberOfLines={2}>{item.description}</Text>

            {/* Prix + contrôle qty */}
            <View style={s.menuItemFooter}>
              <Text style={s.menuItemPrice}>{formatCurrency(item.price)}</Text>

              {quickQty > 0 ? (
                // Déjà dans le panier → contrôle −/+
                <View style={s.qtyRow}>
                  <TouchableOpacity
                    style={s.qtyBtnSm}
                    onPress={() => quickDecrease(item)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name={quickQty <= 1 ? "trash-outline" : "remove"} size={13} color={JE.orange} />
                  </TouchableOpacity>
                  <Text style={s.qtyVal}>{quickQty}</Text>
                  <TouchableOpacity
                    style={[s.qtyBtnSm, s.qtyBtnSmActive]}
                    onPress={() =>
                      hasRequiredOptions ? setSelectedItem(item) : quickIncrease(item)
                    }
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="add" size={13} color={JE.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                // Pas encore dans le panier → bouton "+"
                <TouchableOpacity
                  style={s.addBtn}
                  onPress={() =>
                    hasRequiredOptions ? setSelectedItem(item) : quickIncrease(item)
                  }
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="add" size={18} color={JE.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </AnimatedCard>
    );
  };

  // ── Header de la FlatList ──────────────────────────────────────────────────
  const Header = (
    <View>
      {/* Hero avec gradient */}
      <View style={s.hero}>
        <Image source={{ uri: restaurant.image }} style={s.heroImg} />
        <LinearGradient
          colors={["transparent", "rgba(24,28,46,0.85)"]}
          style={s.heroGradient}
        >
          {/* Boutons haut */}
          <View style={s.heroTopBar}>
            <TouchableOpacity style={s.heroBackBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={JE.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.heroFavBtn}
              onPress={() => toggleFavorite(restaurant.id)}
            >
              <Ionicons
                name={isFav ? "heart" : "heart-outline"}
                size={20}
                color={isFav ? "#FF4D4D" : JE.white}
              />
            </TouchableOpacity>
          </View>

          {/* Infos restaurant */}
          <View style={s.heroBottom}>
            <Text style={s.heroName}>{restaurant.name}</Text>
            {/* Métriques en pills */}
            <View style={s.heroPills}>
              <View style={s.heroPill}>
                <Ionicons name="star" size={11} color="#FFD234" />
                <Text style={s.heroPillTxt}>{restaurant.rating.toFixed(1)} ({restaurant.reviewCount ?? 0} avis)</Text>
              </View>
              <View style={s.heroPill}>
                <Ionicons name="time-outline" size={11} color={JE.white} />
                <Text style={s.heroPillTxt}>{delivery.estimatedLabel}</Text>
              </View>
              <View style={s.heroPill}>
                <Ionicons name="bicycle-outline" size={11} color={JE.white} />
                <Text style={s.heroPillTxt}>{formatCurrency(delivery.fee)}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Chips d'info sous le hero */}
      <View style={s.infoBar}>
        <Text style={s.infoSub}>
          {restaurant.category} · {delivery.distanceKm.toFixed(1)} km
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.infoChips}>
          <InfoChip icon="checkmark-circle-outline" label="HALAL" color={JE.green} bg={JE.greenLight} />
          <InfoChip icon="card-outline" label="Carte acceptée" />
          <InfoChip icon="star-outline" label="Points fidélité" color="#F59E0B" bg="#FFFBEB" />
          <InfoChip icon="time-outline" label={`Ouvert · Ferme à 23h`} />
          {minOrderAmount ? (
            <InfoChip
              icon="cart-outline"
              label={`Min. ${formatCurrency(minOrderAmount)}`}
            />
          ) : null}
        </ScrollView>
      </View>

      {/* Onglets catégories sticky JE (souligné) */}
      <View style={s.catTabsWrap}>
        <ScrollView
          ref={catScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catTabsRow}
        >
          {restaurantCategories.map((cat) => {
            const active = activeCategory === cat;
            const label = cat === "popular" ? "⭐ Populaires" : cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[s.catTab, active && s.catTabActive]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.75}
              >
                <Text style={[s.catTabTxt, active && s.catTabTxtActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={filteredMenu}
        keyExtractor={(item) => item.id}
        renderItem={renderMenuItem}
        ListHeaderComponent={Header}
        contentContainerStyle={{ paddingBottom: cartCount > 0 ? 100 : 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <EmptyState
              title="Aucun plat"
              message="Aucun plat disponible dans cette catégorie."
            />
          </View>
        }
      />

      {/* ── Barre panier sticky ─────────────────────────────────────────── */}
      {cartCount > 0 && (
        <View style={s.cartBar}>
          <View style={s.cartCount}>
            <Text style={s.cartCountTxt}>{cartCount}</Text>
          </View>
          <TouchableOpacity
            style={s.cartBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("MainTabs", { screen: "Cart" })}
          >
            <Text style={s.cartBtnLabel}>Voir mon panier</Text>
            <Text style={s.cartBtnPrice}>{formatCurrency(cartTotal)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Modale produit ──────────────────────────────────────────────── */}
      {selectedItem && (
        <ProductModal
          visible={Boolean(selectedItem)}
          item={selectedItem}
          restaurant={restaurant}
          onClose={() => setSelectedItem(null)}
          onSubmit={(item, opts, qty, notes) =>
            handleAddToCart(item, opts, qty, notes)
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: JE.greyLight },

  // Hero
  hero: { height: 220, position: "relative" },
  heroImg: { width: "100%", height: "100%", resizeMode: "cover" },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between", padding: 16,
    paddingTop: Platform.OS === "android" ? 32 : 16,
  },
  heroTopBar: { flexDirection: "row", justifyContent: "space-between" },
  heroBackBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center",
  },
  heroFavBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center",
  },
  heroBottom: { gap: 8 },
  heroName: { color: JE.white, fontSize: 22, fontWeight: "900" },
  heroPills: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  heroPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  heroPillTxt: { color: JE.white, fontSize: 11, fontWeight: "600" },

  // Info bar
  infoBar: {
    backgroundColor: JE.white, paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: JE.border,
    gap: 8,
  },
  infoSub: { color: JE.grey, fontSize: 12 },
  infoChips: { gap: 8, paddingBottom: 10 },
  infoChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  infoChipTxt: { fontSize: 11, fontWeight: "600" },

  // Onglets catégories style JE
  catTabsWrap: {
    backgroundColor: JE.white,
    borderBottomWidth: 1, borderBottomColor: JE.border,
  },
  catTabsRow: { paddingHorizontal: 16, gap: 0 },
  catTab: {
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  catTabActive: { borderBottomColor: JE.orange },
  catTabTxt: { fontSize: 13, fontWeight: "600", color: JE.grey },
  catTabTxtActive: { color: JE.orange, fontWeight: "800" },

  // Item menu
  menuItem: {
    flexDirection: "row", gap: 12,
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: JE.white, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: JE.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  menuItemImg: { width: 80, height: 80, borderRadius: 12, resizeMode: "cover" },
  menuItemBody: { flex: 1, gap: 4, justifyContent: "space-between" },
  badgeRow: { flexDirection: "row", gap: 5 },
  bestSellerBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: JE.greenLight, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  bestSellerTxt: { fontSize: 9, fontWeight: "700", color: JE.green },
  customBadge: {
    backgroundColor: JE.orangeLight, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  customBadgeTxt: { fontSize: 9, fontWeight: "700", color: JE.orange },
  menuItemName: { color: JE.dark, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  menuItemDesc: { color: JE.grey, fontSize: 11, lineHeight: 16 },
  menuItemFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  menuItemPrice: { color: JE.orange, fontSize: 15, fontWeight: "900" },

  // Bouton + direct
  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: JE.orange, alignItems: "center", justifyContent: "center",
    shadowColor: JE.orange, shadowOpacity: 0.4,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },

  // Contrôle quantité inline
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtnSm: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: JE.greyLight, alignItems: "center", justifyContent: "center",
  },
  qtyBtnSmActive: { backgroundColor: JE.orange },
  qtyVal: { color: JE.dark, fontWeight: "800", fontSize: 13, minWidth: 16, textAlign: "center" },

  // Barre panier sticky
  cartBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: JE.white,
    paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: JE.border,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOpacity: 0.1,
    shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  cartCount: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: JE.orangeLight, alignItems: "center", justifyContent: "center",
  },
  cartCountTxt: { color: JE.orange, fontWeight: "900", fontSize: 15 },
  cartBtn: {
    flex: 1, backgroundColor: JE.orange, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: JE.orange, shadowOpacity: 0.4,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  cartBtnLabel: { color: JE.white, fontWeight: "800", fontSize: 15 },
  cartBtnPrice: { color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 14 },
});
