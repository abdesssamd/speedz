import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getDeliveryQuote } from "../services/delivery";
import { formatCurrency } from "../services/format";

const PAGE_SIZE = 4;
const SPEEDZ_ORANGE = "#FF8C00";
const PROMO_BANNERS = [
  {
    id: "promo-1",
    title: "Livraison rapide en ville",
    text: "Des restos populaires, un suivi simple et une commande plus fluide.",
    colors: ["#0A0A0F", "#1a1207", "#92400E"] as const,
    icon: "flash-outline" as const,
  },
  {
    id: "promo-2",
    title: "Promos du moment",
    text: "Activez les notifications pour debloquer les alertes promo et les bons plans.",
    colors: ["#0A0A0F", "#1a0a0a", "#7C2D12"] as const,
    icon: "pricetags-outline" as const,
  },
  {
    id: "promo-3",
    title: "Commande express",
    text: "Retrouvez burgers, sushi, pizza et commerces dans un seul flux.",
    colors: ["#0A0A0F", "#0a0f1a", "#0C4A6E"] as const,
    icon: "bicycle-outline" as const,
  },
];

const SERVICE_CATEGORIES = [
  { id: "all", label: "Tous", icon: "apps-outline" as const },
  { id: "Burgers", label: "Burgers", icon: "fast-food-outline" as const },
  { id: "Pizza", label: "Pizza", icon: "pizza-outline" as const },
  { id: "Sushi", label: "Sushi", icon: "fish-outline" as const },
  { id: "Pharmacie", label: "Pharmacie", icon: "medkit-outline" as const },
  { id: "Healthy", label: "Healthy", icon: "leaf-outline" as const },
];

function sanitizeDeliveryLabel(rawLabel: string, fallbackLabel: string) {
  const matches = rawLabel.match(/\d+/g);
  if (!matches?.length) return fallbackLabel;
  const values = matches.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  if (!values.length || values.some((v) => v >= 180)) return "Bientot disponible";
  if (values.length >= 2) return `${values[0]}-${values[1]} min`;
  return `${values[0]} min`;
}

function shortenAddress(address: string) {
  return address.length > 30 ? `${address.slice(0, 30)}...` : address;
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    user, favorites, restaurants, favoriteRestaurants, currentLocation,
    notificationPreferences, pointsBalance, requestLocation, toggleFavorite,
    t, isRTL, refreshRemoteData,
  } = useApp();

  const [activeFeed, setActiveFeed] = useState<"restaurants" | "favorites">("restaurants");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [promoWidth, setPromoWidth] = useState(1);
  const [activePromo, setActivePromo] = useState(0);

  const openMainTab = useCallback((screen: "Explore" | "Profile") => {
    (navigation as any).navigate("MainTabs", { screen });
  }, [navigation]);

  useFocusEffect(useCallback(() => {
    refreshRemoteData().catch(() => undefined);
  }, [refreshRemoteData]));

  const sortedRestaurants = useMemo(
    () => [...restaurants].sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)),
    [restaurants]
  );
  const feedSource = activeFeed === "favorites" ? favoriteRestaurants : sortedRestaurants;
  const filteredRestaurants = useMemo(() => {
    if (selectedCategory === "all" || selectedCategory === "Pharmacie") return feedSource;
    return feedSource.filter((r) => r.category === selectedCategory);
  }, [feedSource, selectedCategory]);
  const visibleRestaurants = filteredRestaurants.slice(0, visibleCount);
  const featuredRestaurant = filteredRestaurants[0] ?? sortedRestaurants[0] ?? null;
  const firstName = user.firstName?.trim() || user.name?.split(" ")[0] || "Nina";

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeFeed, selectedCategory, filteredRestaurants.length]);

  const loadMore = useCallback(() => {
    if (visibleCount >= filteredRestaurants.length) return;
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredRestaurants.length));
  }, [filteredRestaurants.length, visibleCount]);

  const handlePromoScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(promoWidth, 1));
    setActivePromo(Math.max(0, Math.min(next, PROMO_BANNERS.length - 1)));
  }, [promoWidth]);

  const renderRestaurantCard = useCallback(
    ({ item, index }: { item: (typeof visibleRestaurants)[number]; index: number }) => {
      const delivery = getDeliveryQuote(currentLocation.coordinates, item.coordinates);
      const deliveryLabel = sanitizeDeliveryLabel(item.deliveryTime, delivery.estimatedLabel);
      const feeLabel = notificationPreferences.promotions ? "0.00 DA" : formatCurrency(delivery.fee);
      return (
        <AnimatedCard delay={Math.min(index * 70, 250)}>
          <ScalePressable
            containerStyle={styles.restaurantCard}
            onPress={() => navigation.navigate("Restaurant", { restaurantId: item.id })}
          >
            <View>
              <Image source={{ uri: item.image }} style={styles.restaurantImage} />
              <LinearGradient colors={["transparent", "rgba(10,10,15,0.85)"]} style={styles.restaurantImageOverlay} />
              <ScalePressable containerStyle={styles.favoriteButton} onPress={() => toggleFavorite(item.id)}>
                <Ionicons
                  name={favorites.includes(item.id) ? "heart" : "heart-outline"}
                  size={16}
                  color={favorites.includes(item.id) ? "#F87171" : "#9B9BB0"}
                />
              </ScalePressable>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            </View>
            <View style={styles.restaurantBody}>
              <Text style={[styles.restaurantName, { textAlign: isRTL ? "right" : "left" }]}>{item.name}</Text>
              <Text numberOfLines={2} style={[styles.restaurantDescription, { textAlign: isRTL ? "right" : "left" }]}>
                {item.shortDescription}
              </Text>
              <View style={styles.restaurantMeta}>
                <View style={styles.metaChip}>
                  <Ionicons name="time-outline" size={12} color="#F59E0B" />
                  <Text style={styles.metaChipText}>{deliveryLabel}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Ionicons name="bicycle-outline" size={12} color="#9B9BB0" />
                  <Text style={styles.metaChipText}>{feeLabel}</Text>
                </View>
              </View>
            </View>
          </ScalePressable>
        </AnimatedCard>
      );
    },
    [currentLocation.coordinates, favorites, isRTL, navigation, notificationPreferences.promotions, toggleFavorite]
  );

  const listHeader = (
    <View style={styles.headerBlock}>
      {/* Top bar */}
      <View style={[styles.topBar, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={styles.topLeft}>
          <Text style={styles.greeting}>Bonsoir, {firstName} 👋</Text>
          <ScalePressable containerStyle={styles.locationPill} onPress={() => navigation.navigate("Addresses")}>
            <Ionicons name="location" size={12} color="#F59E0B" />
            <Text numberOfLines={1} style={styles.locationText}>{shortenAddress(currentLocation.label)}</Text>
            <Ionicons name="chevron-down" size={12} color="#5C5C70" />
          </ScalePressable>
        </View>
        <View style={styles.topActions}>
          <ScalePressable containerStyle={styles.iconBtn} onPress={() => requestLocation()}>
            <Ionicons name="refresh-outline" size={17} color="#9B9BB0" />
          </ScalePressable>
          <ScalePressable containerStyle={styles.iconBtn} onPress={() => openMainTab("Profile")}>
            <Ionicons name="person-outline" size={17} color="#9B9BB0" />
          </ScalePressable>
        </View>
      </View>

      {/* Search bar */}
      <ScalePressable containerStyle={styles.searchBar} onPress={() => openMainTab("Explore")}>
        <Ionicons name="search" size={16} color="#5C5C70" />
        <Text style={styles.searchPlaceholder}>Rechercher un plat ou un commerce...</Text>
        <View style={styles.searchKbd}><Text style={styles.searchKbdText}>⌘K</Text></View>
      </ScalePressable>

      {/* Promo carousel */}
      <View onLayout={(e) => setPromoWidth(e.nativeEvent.layout.width)} style={styles.promoViewport}>
        <ScrollView
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handlePromoScroll} scrollEventThrottle={16}
        >
          {PROMO_BANNERS.map((banner) => (
            <View key={banner.id} style={[styles.promoSlide, { width: promoWidth }]}>
              <LinearGradient colors={banner.colors} style={styles.promoCard}>
                <View style={styles.promoIconWrap}>
                  <Ionicons name={banner.icon} size={20} color="#F59E0B" />
                </View>
                <View style={styles.promoCopy}>
                  <Text style={styles.promoTitle}>{banner.title}</Text>
                  <Text style={styles.promoText}>{banner.text}</Text>
                </View>
                <View style={styles.promoArrow}>
                  <Ionicons name="arrow-forward" size={14} color="#F59E0B" />
                </View>
              </LinearGradient>
            </View>
          ))}
        </ScrollView>
        <View style={styles.promoDots}>
          {PROMO_BANNERS.map((b, i) => (
            <View key={b.id} style={[styles.promoDot, i === activePromo && styles.promoDotActive]} />
          ))}
        </View>
      </View>

      {/* Category bubbles */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.categoryRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {SERVICE_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <ScalePressable key={cat.id} containerStyle={styles.catWrap} onPress={() => setSelectedCategory(cat.id)}>
              <View style={[styles.catBubble, active && styles.catBubbleActive]}>
                <Ionicons name={cat.icon} size={18} color={active ? "#0A0A0F" : "#5C5C70"} />
              </View>
              <Text style={[styles.catLabel, active && styles.catLabelActive]}>{cat.label}</Text>
            </ScalePressable>
          );
        })}
      </ScrollView>

      {/* Featured hero card */}
      {featuredRestaurant ? (
        <AnimatedCard>
          <ScalePressable
            containerStyle={styles.heroCard}
            onPress={() => navigation.navigate("Restaurant", { restaurantId: featuredRestaurant.id })}
          >
            <Image source={{ uri: featuredRestaurant.image }} style={styles.heroImage} />
            <LinearGradient colors={["transparent", "rgba(10,10,15,0.95)"]} style={styles.heroGradient} />
            <View style={styles.heroContent}>
              <View style={styles.heroTagRow}>
                <View style={styles.heroTag}>
                  <Ionicons name="flame" size={11} color="#F59E0B" />
                  <Text style={styles.heroTagText}>
                    {notificationPreferences.promotions ? "Livraison offerte" : "Sélection du jour"}
                  </Text>
                </View>
              </View>
              <Text style={[styles.heroName, { textAlign: isRTL ? "right" : "left" }]}>{featuredRestaurant.name}</Text>
              <Text style={[styles.heroSub, { textAlign: isRTL ? "right" : "left" }]}>{featuredRestaurant.shortDescription}</Text>
            </View>
          </ScalePressable>
        </AnimatedCard>
      ) : null}

      {/* Feed header & switcher */}
      <View style={styles.feedHeader}>
        <View>
          <Text style={[styles.feedTitle, { textAlign: isRTL ? "right" : "left" }]}>
            {activeFeed === "favorites" ? t("available_favorites") : t("available_restaurants")}
          </Text>
          <Text style={[styles.feedSub, { textAlign: isRTL ? "right" : "left" }]}>
            {filteredRestaurants.length} disponibles • {pointsBalance} pts
          </Text>
        </View>
        <ScalePressable containerStyle={styles.iconBtn} onPress={() => refreshRemoteData().catch(() => undefined)}>
          <Ionicons name="refresh-outline" size={17} color="#9B9BB0" />
        </ScalePressable>
      </View>

      <View style={styles.feedSwitcher}>
        <ScalePressable
          containerStyle={[styles.feedBtn, activeFeed === "restaurants" && styles.feedBtnActive]}
          onPress={() => setActiveFeed("restaurants")}
        >
          <Text style={[styles.feedBtnText, activeFeed === "restaurants" && styles.feedBtnTextActive]}>
            {t("restaurants")}
          </Text>
        </ScalePressable>
        <ScalePressable
          containerStyle={[styles.feedBtn, activeFeed === "favorites" && styles.feedBtnFavActive]}
          onPress={() => setActiveFeed("favorites")}
        >
          <Ionicons name="heart" size={13} color={activeFeed === "favorites" ? "#F87171" : "#5C5C70"} />
          <Text style={[styles.feedBtnText, activeFeed === "favorites" && styles.feedBtnTextFav]}>
            {t("favorites")}
          </Text>
        </ScalePressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={visibleRestaurants}
        keyExtractor={(item) => item.id}
        renderItem={renderRestaurantCard}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            title={activeFeed === "favorites" ? t("no_favorite") : t("no_restaurant")}
            message={activeFeed === "favorites" ? t("no_favorite_msg") : t("backend_offline_msg")}
            actionLabel={t("refresh")}
            onAction={() => refreshRemoteData().catch(() => undefined)}
          />
        }
        ListFooterComponent={<View style={styles.footerSpacer} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0A0A0F" },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 14 },
  headerBlock: { gap: 16, marginBottom: 8 },

  // Top bar
  topBar: { alignItems: "center", justifyContent: "space-between", gap: 12 },
  topLeft: { flex: 1, gap: 6 },
  greeting: { color: "#F5F0E8", fontSize: 22, fontWeight: "800" },
  locationPill: {
    flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start",
    backgroundColor: "#16161F", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  locationText: { color: "#9B9BB0", fontSize: 12, fontWeight: "600", maxWidth: 180 },
  topActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#16161F",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#2A2A3A",
  },

  // Search bar
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#12121A", borderRadius: 18, borderWidth: 1, borderColor: "#2A2A3A",
    paddingHorizontal: 14, paddingVertical: 14,
  },
  searchPlaceholder: { flex: 1, color: "#5C5C70", fontSize: 14, fontWeight: "500" },
  searchKbd: {
    backgroundColor: "#1E1E2C", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4,
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  searchKbdText: { color: "#5C5C70", fontSize: 11, fontWeight: "700" },

  // Promo
  promoViewport: { gap: 10 },
  promoSlide: { paddingRight: 8 },
  promoCard: {
    borderRadius: 22, padding: 16, flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: "#2A2A3A", minHeight: 100,
  },
  promoIconWrap: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(245,158,11,0.12)",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
  },
  promoCopy: { flex: 1, gap: 5 },
  promoTitle: { color: "#F5F0E8", fontSize: 16, fontWeight: "800" },
  promoText: { color: "#9B9BB0", fontSize: 12, lineHeight: 17, fontWeight: "500" },
  promoArrow: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(245,158,11,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  promoDots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  promoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2A2A3A" },
  promoDotActive: { width: 18, backgroundColor: "#F59E0B" },

  // Categories
  categoryRow: { gap: 14, paddingHorizontal: 2 },
  catWrap: { alignItems: "center", gap: 6, minWidth: 56 },
  catBubble: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: "#12121A",
    borderWidth: 1, borderColor: "#2A2A3A", alignItems: "center", justifyContent: "center",
  },
  catBubbleActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  catLabel: { color: "#5C5C70", fontSize: 11, fontWeight: "700" },
  catLabelActive: { color: "#F59E0B", fontWeight: "800" },

  // Hero featured card
  heroCard: { borderRadius: 24, overflow: "hidden", minHeight: 200, backgroundColor: "#12121A" },
  heroImage: { width: "100%", height: 220 },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 18, gap: 8 },
  heroTagRow: { flexDirection: "row" },
  heroTag: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.3)",
  },
  heroTagText: { color: "#F59E0B", fontWeight: "800", fontSize: 11 },
  heroName: { color: "#F5F0E8", fontSize: 24, fontWeight: "900" },
  heroSub: { color: "#9B9BB0", fontSize: 13, lineHeight: 18, fontWeight: "600" },

  // Feed header
  feedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  feedTitle: { color: "#F5F0E8", fontSize: 20, fontWeight: "900" },
  feedSub: { color: "#5C5C70", marginTop: 3, fontSize: 13 },
  feedSwitcher: { flexDirection: "row", gap: 10 },
  feedBtn: {
    flex: 1, minHeight: 44, borderRadius: 14, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 6, backgroundColor: "#12121A", borderWidth: 1, borderColor: "#2A2A3A",
  },
  feedBtnActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  feedBtnFavActive: { backgroundColor: "#1A0F0F", borderColor: "#7C2D12" },
  feedBtnText: { color: "#5C5C70", fontWeight: "800", fontSize: 14 },
  feedBtnTextActive: { color: "#0A0A0F" },
  feedBtnTextFav: { color: "#F87171" },

  // Restaurant cards
  restaurantCard: {
    backgroundColor: "#12121A", borderRadius: 22, overflow: "hidden",
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  restaurantImage: { width: "100%", height: 175 },
  restaurantImageOverlay: { ...StyleSheet.absoluteFillObject },
  favoriteButton: {
    position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(10,10,15,0.75)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  ratingBadge: {
    position: "absolute", bottom: 10, left: 12, flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(10,10,15,0.85)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5,
  },
  ratingText: { color: "#F59E0B", fontSize: 12, fontWeight: "800" },
  restaurantBody: { padding: 14, gap: 10 },
  restaurantName: { color: "#F5F0E8", fontSize: 18, fontWeight: "900" },
  restaurantDescription: { color: "#9B9BB0", lineHeight: 19, fontWeight: "500", fontSize: 13 },
  restaurantMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#1E1E2C", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  metaChipText: { color: "#9B9BB0", fontSize: 12, fontWeight: "700" },

  footerSpacer: { height: 24 },
});
