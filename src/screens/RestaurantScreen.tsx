import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { Alert, FlatList, Image, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { ProductModal } from "../components/ProductModal";
import { QuantityControl } from "../components/QuantityControl";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getDeliveryQuote } from "../services/delivery";
import { formatCurrency } from "../services/format";
import { MenuItem, SelectedOption } from "../types";

type RestaurantRoute = RouteProp<RootStackParamList, "Restaurant">;

const CATEGORY_STYLES: Array<{ match: RegExp; icon: keyof typeof Ionicons.glyphMap; emoji: string; accent: string }> = [
  { match: /chaud|hot|grill|plat/i, icon: "flame-outline", emoji: "🍲", accent: "#F97316" },
  { match: /froid|cold|salad/i, icon: "snow-outline", emoji: "🥗", accent: "#0EA5E9" },
  { match: /pizza/i, icon: "pizza-outline", emoji: "🍕", accent: "#F59E0B" },
  { match: /burger|sandwich/i, icon: "fast-food-outline", emoji: "🍔", accent: "#FB7185" },
  { match: /drink|juice|boisson/i, icon: "wine-outline", emoji: "🥤", accent: "#8B5CF6" },
  { match: /dessert|sweet|cake/i, icon: "ice-cream-outline", emoji: "🍰", accent: "#EC4899" },
];

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
  if (left.length !== right.length) {
    return false;
  }

  const normalize = (items: SelectedOption[]) =>
    [...items]
      .map((item) => `${item.groupId}:${item.choiceId}:${item.priceDelta}`)
      .sort()
      .join("|");

  return normalize(left) === normalize(right);
}

function getCategoryPresentation(category: string) {
  const match = CATEGORY_STYLES.find((entry) => entry.match.test(category));
  return match ?? { icon: "restaurant-outline" as const, emoji: "🍽️", accent: "#EA580C" };
}

export function RestaurantScreen() {
  const route = useRoute<RestaurantRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    restaurants,
    favorites,
    cart,
    currentLocation,
    toggleFavorite,
    addToCart,
    updateCartItemQuantity,
    removeCartItem,
    t,
    isRTL,
  } = useApp();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const restaurant = restaurants.find((entry) => entry.id === route.params.restaurantId);

  const delivery = useMemo(() => {
    if (!restaurant) {
      return null;
    }
    return getDeliveryQuote(currentLocation.coordinates, restaurant.coordinates);
  }, [currentLocation.coordinates, restaurant]);

  const restaurantCategories = useMemo(() => {
    if (!restaurant) {
      return [];
    }
    return Array.from(new Set(restaurant.menu.map((item) => item.category)));
  }, [restaurant]);

  const filteredMenu = useMemo(() => {
    if (!restaurant) {
      return [];
    }
    if (activeCategory === "all") {
      return restaurant.menu;
    }
    return restaurant.menu.filter((item) => item.category === activeCategory);
  }, [activeCategory, restaurant]);

  const cartItemsForRestaurant = useMemo(() => {
    if (!restaurant) {
      return [];
    }
    return cart.filter((entry) => entry.restaurantId === restaurant.id);
  }, [cart, restaurant]);

  const cartCount = useMemo(
    () => cartItemsForRestaurant.reduce((sum, item) => sum + item.quantity, 0),
    [cartItemsForRestaurant]
  );

  const cartTotal = useMemo(
    () =>
      cartItemsForRestaurant.reduce(
        (sum, item) => sum + (item.basePrice + item.selectedOptions.reduce((acc, option) => acc + option.priceDelta, 0)) * item.quantity,
        0
      ),
    [cartItemsForRestaurant]
  );

  const currentSectionTitle = activeCategory === "all" ? restaurantCategories[0] || t("restaurants") : activeCategory;
  const currentCategoryMeta = getCategoryPresentation(currentSectionTitle);

  if (!restaurant || !delivery) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.fallback}>
          <EmptyState title={t("restaurant_not_found")} message={t("restaurant_not_found_msg")} />
        </View>
      </SafeAreaView>
    );
  }

  const metrics = [
    { id: "rating", label: "Note", value: restaurant.rating.toFixed(1), icon: "star" as const },
    { id: "eta", label: "ETA", value: delivery.estimatedLabel, icon: "time-outline" as const },
    { id: "fee", label: "Livraison", value: formatCurrency(delivery.fee), icon: "bicycle-outline" as const },
  ];

  const handleAddToCart = (
    item: MenuItem,
    selectedOptions: SelectedOption[],
    quantity: number,
    specialInstructions?: string,
    forceReplaceCart?: boolean
  ) => {
    const result = addToCart(restaurant, item, selectedOptions, quantity, specialInstructions, forceReplaceCart);

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

  const getQuickCartEntry = (item: MenuItem) => {
    const defaults = buildDefaultOptions(item);
    return cart.find(
      (entry) =>
        entry.restaurantId === restaurant.id &&
        entry.menuItemId === item.id &&
        !entry.specialInstructions &&
        sameOptionSet(entry.selectedOptions, defaults)
    );
  };

  const increaseQuickQuantity = (item: MenuItem) => {
    const defaults = buildDefaultOptions(item);
    handleAddToCart(item, defaults, 1);
  };

  const decreaseQuickQuantity = (item: MenuItem) => {
    const entry = getQuickCartEntry(item);
    if (!entry) {
      return;
    }

    if (entry.quantity <= 1) {
      removeCartItem(entry.id);
      return;
    }

    updateCartItemQuantity(entry.id, entry.quantity - 1);
  };

  const renderMenuItem = ({ item, index }: { item: MenuItem; index: number }) => {
    const quickEntry = getQuickCartEntry(item);
    const quickQuantity = quickEntry?.quantity ?? 0;
    const hasOptions = item.options.length > 0;
    const categoryMeta = getCategoryPresentation(item.category);

    return (
      <AnimatedCard delay={Math.min(index * 50, 220)} style={styles.menuCard}>
        <View style={styles.menuCopy}>
          <View style={styles.menuTagRow}>
            <View style={[styles.inlineCategoryBadge, { backgroundColor: `${categoryMeta.accent}18` }]}>
              <Text style={styles.inlineCategoryEmoji}>{categoryMeta.emoji}</Text>
            </View>
            <Text style={styles.inlineCategoryText}>{item.category}</Text>
            {item.badge ? <Text style={styles.badge}>{item.badge}</Text> : null}
          </View>

          <Text style={[styles.menuName, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.menuDescription, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={3}>
            {item.description}
          </Text>

          <View style={styles.menuMetaRow}>
            <Text style={styles.menuMetaChip}>{item.calories ? `${item.calories} kcal` : "Signature"}</Text>
            <Text style={styles.menuMetaChip}>{hasOptions ? "Options" : "Simple"}</Text>
          </View>

          <View style={styles.menuFooter}>
            <Text style={styles.menuPrice}>{formatCurrency(item.price)}</Text>
            <View style={styles.actionStack}>
              <QuantityControl
                quantity={quickQuantity}
                onDecrease={() => decreaseQuickQuantity(item)}
                onIncrease={() => increaseQuickQuantity(item)}
                compact
              />
              {hasOptions ? (
                <ScalePressable containerStyle={styles.optionButton} onPress={() => setSelectedItem(item)}>
                  <Ionicons name="options-outline" size={16} color="#111827" />
                  <Text style={styles.optionButtonText}>Custom</Text>
                </ScalePressable>
              ) : null}
            </View>
          </View>
        </View>

        <Image source={{ uri: item.image }} style={styles.menuImage} />
      </AnimatedCard>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={filteredMenu}
        keyExtractor={(item) => item.id}
        renderItem={renderMenuItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.heroWrap}>
              <Image source={{ uri: restaurant.image }} style={styles.heroImage} />
              <LinearGradient colors={["rgba(17,24,39,0.08)", "rgba(17,24,39,0.75)"]} style={styles.heroOverlay} />

              <View style={styles.heroTopActions}>
                <ScalePressable containerStyle={styles.roundAction} onPress={() => navigation.goBack()}>
                  <Ionicons name="chevron-back" size={20} color="#111827" />
                </ScalePressable>
                <ScalePressable containerStyle={styles.roundAction} onPress={() => toggleFavorite(restaurant.id)}>
                  <Ionicons
                    name={favorites.includes(restaurant.id) ? "heart" : "heart-outline"}
                    size={20}
                    color={favorites.includes(restaurant.id) ? "#DC2626" : "#111827"}
                  />
                </ScalePressable>
              </View>

              <View style={styles.heroBottom}>
                <Text style={styles.heroEyebrow}>{restaurant.category}</Text>
                <Text style={styles.heroName}>{restaurant.name}</Text>
                <Text style={styles.heroSubtitle}>{restaurant.shortDescription}</Text>
              </View>
            </View>

            <View style={styles.identityCard}>
              <View style={styles.metricGrid}>
                {metrics.map((metric) => (
                  <View key={metric.id} style={styles.metricCard}>
                    <Ionicons name={metric.icon} size={18} color="#EA580C" />
                    <Text style={styles.metricValue}>{metric.value}</Text>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.restaurantInfoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#9A3412" />
                  <Text style={styles.infoText}>{restaurant.address}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={16} color="#9A3412" />
                  <Text style={styles.infoText}>{restaurant.openingHours}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="pricetag-outline" size={16} color="#9A3412" />
                  <Text style={styles.infoText}>{restaurant.tags.slice(0, 3).join(" • ")}</Text>
                </View>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.categoryTabs, { flexDirection: isRTL ? "row-reverse" : "row" }]}
            >
              {["all", ...restaurantCategories].map((category) => {
                const active = activeCategory === category;
                const meta = getCategoryPresentation(category === "all" ? currentSectionTitle : category);
                return (
                  <ScalePressable
                    key={category}
                    containerStyle={[styles.categoryTab, active && styles.categoryTabActive]}
                    onPress={() => setActiveCategory(category)}
                  >
                    <Text style={styles.categoryEmoji}>{category === "all" ? "✨" : meta.emoji}</Text>
                    <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>
                      {category === "all" ? "Tout" : category}
                    </Text>
                  </ScalePressable>
                );
              })}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <View style={[styles.sectionEmojiWrap, { backgroundColor: `${currentCategoryMeta.accent}16` }]}>
                <Text style={styles.sectionEmoji}>{currentCategoryMeta.emoji}</Text>
              </View>
              <View style={styles.sectionTitleWrap}>
                <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>{currentSectionTitle}</Text>
                <Text style={[styles.sectionCaption, { textAlign: isRTL ? "right" : "left" }]}>
                  {filteredMenu.length} plat{filteredMenu.length > 1 ? "s" : ""} selectionnes pour toi
                </Text>
              </View>
            </View>
          </View>
        }
        ListFooterComponent={<View style={styles.footerSpacer} />}
      />

      <ProductModal
        visible={Boolean(selectedItem)}
        restaurant={restaurant}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSubmit={handleAddToCart}
      />

      {cartCount ? (
        <ScalePressable containerStyle={styles.cartBar} onPress={() => navigation.navigate("Checkout")}>
          <View>
            <Text style={styles.cartBarCaption}>Panier en cours</Text>
            <Text style={styles.cartBarAmount}>{formatCurrency(cartTotal)}</Text>
          </View>
          <Text style={styles.cartBarText}>{t("see_cart")}</Text>
          <View style={styles.cartCounter}>
            <Text style={styles.cartCounterText}>{cartCount}</Text>
          </View>
        </ScalePressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F3EE" },
  fallback: { flex: 1, justifyContent: "center", padding: 18 },
  list: { paddingBottom: 120 },
  headerBlock: { gap: 16, marginBottom: 12 },
  heroWrap: { position: "relative" },
  heroImage: { width: "100%", height: 310 },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroTopActions: {
    position: "absolute",
    top: 18,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roundAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    gap: 8,
  },
  heroEyebrow: {
    alignSelf: "flex-start",
    color: "#9A3412",
    backgroundColor: "#FFF4E8",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontWeight: "800",
    fontSize: 12,
  },
  heroName: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: "#E5E7EB",
    lineHeight: 20,
    fontWeight: "600",
  },
  identityCard: {
    marginHorizontal: 14,
    marginTop: -26,
    backgroundColor: "#FFFCF8",
    borderRadius: 28,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  metricGrid: { flexDirection: "row", gap: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: "#F7EFE4",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 4,
  },
  metricValue: { color: "#111827", fontSize: 15, fontWeight: "800", textAlign: "center" },
  metricLabel: { color: "#7C6F64", fontSize: 11, fontWeight: "700", textAlign: "center" },
  restaurantInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F0E7DB",
    padding: 14,
    gap: 10,
  },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoText: { flex: 1, color: "#475569", lineHeight: 19, fontWeight: "600" },
  categoryTabs: { gap: 10, paddingHorizontal: 14, alignItems: "center" },
  categoryTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFCF8",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  categoryTabActive: { backgroundColor: "#111827", borderColor: "#111827" },
  categoryEmoji: { fontSize: 14 },
  categoryTabText: { color: "#111827", fontWeight: "800", fontSize: 13 },
  categoryTabTextActive: { color: "#FFFFFF" },
  sectionHeader: {
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionEmoji: { fontSize: 18 },
  sectionTitleWrap: { flex: 1, gap: 2 },
  sectionTitle: { color: "#111827", fontWeight: "900", fontSize: 22 },
  sectionCaption: { color: "#7C6F64", fontSize: 13, fontWeight: "600" },
  menuCard: {
    marginHorizontal: 14,
    backgroundColor: "#FFFCF8",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    padding: 14,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  menuCopy: { gap: 10 },
  menuTagRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  inlineCategoryBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineCategoryEmoji: { fontSize: 11 },
  inlineCategoryText: { color: "#7C6F64", fontWeight: "700", fontSize: 12 },
  badge: {
    color: "#FFFFFF",
    backgroundColor: "#2563EB",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontWeight: "800",
    fontSize: 11,
  },
  menuName: { color: "#111827", fontSize: 20, lineHeight: 24, fontWeight: "900" },
  menuDescription: { color: "#64748B", lineHeight: 20, fontSize: 14 },
  menuMetaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  menuMetaChip: {
    color: "#7C6F64",
    backgroundColor: "#F6EFE5",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontWeight: "700",
    fontSize: 12,
  },
  menuFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 14 },
  menuPrice: { color: "#166534", fontWeight: "900", fontSize: 22 },
  actionStack: { alignItems: "flex-end", gap: 8 },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F6EFE5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  optionButtonText: { color: "#111827", fontWeight: "800", fontSize: 12 },
  menuImage: { width: "100%", height: 210, borderRadius: 22 },
  cartBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 18,
    backgroundColor: "#111827",
    borderRadius: 24,
    minHeight: 72,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cartBarCaption: { color: "#D1D5DB", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  cartBarAmount: { color: "#FFFFFF", fontWeight: "900", fontSize: 20 },
  cartBarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 17 },
  cartCounter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
  },
  cartCounterText: { color: "#FFFFFF", fontWeight: "900" },
  footerSpacer: { height: 40 },
});
