import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getDeliveryQuote } from "../services/delivery";
import { formatCurrency } from "../services/format";

const SERVICE_ITEMS = [
  {
    id: "restaurants",
    label: "Restaurants",
    icon: "restaurant",
    tint: "#F97316",
    subtitle: "Repas",
  },
  {
    id: "fresh",
    label: "Fresh",
    icon: "leaf",
    tint: "#F59E0B",
    subtitle: "Healthy",
  },
  {
    id: "stores",
    label: "Magasin",
    icon: "basket",
    tint: "#EF4444",
    subtitle: "Courses",
  },
  {
    id: "travel",
    label: "Voyages",
    icon: "airplane",
    tint: "#94A3B8",
    subtitle: "Soon",
  },
  {
    id: "mobile",
    label: "Recharge",
    icon: "phone-portrait",
    tint: "#EAB308",
    subtitle: "Top-up",
  },
  {
    id: "delivery",
    label: "Livraison",
    icon: "bicycle",
    tint: "#FB923C",
    subtitle: "Moto",
  },
] as const;

export function HomeScreen() {
  const PAGE_SIZE = 4;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    user,
    favorites,
    restaurants,
    favoriteRestaurants,
    currentLocation,
    notificationPreferences,
    pointsBalance,
    requestLocation,
    pushNotification,
    toggleFavorite,
    t,
    isRTL,
    refreshRemoteData,
    menuCategories,
  } = useApp();

  const freeDeliveryUnlocked = notificationPreferences.promotions;
  const [activeFeed, setActiveFeed] = useState<"restaurants" | "favorites">("restaurants");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useFocusEffect(
    useCallback(() => {
      refreshRemoteData().catch(() => undefined);
    }, [refreshRemoteData])
  );

  const sortedRestaurants = useMemo(
    () => [...restaurants].sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)),
    [restaurants]
  );

  const feedSource = activeFeed === "favorites" ? favoriteRestaurants : sortedRestaurants;
  const filteredRestaurants = useMemo(() => {
    if (selectedCategory === "all") {
      return feedSource;
    }
    return feedSource.filter((restaurant) => restaurant.category === selectedCategory);
  }, [feedSource, selectedCategory]);

  const featuredRestaurant = filteredRestaurants[0] ?? sortedRestaurants[0] ?? null;
  const visibleRestaurants = filteredRestaurants.slice(0, visibleCount);
  const categoryChips = useMemo(() => ["all", ...menuCategories], [menuCategories]);
  const categoryStats = useMemo(() => {
    return categoryChips.map((category) => ({
      id: category,
      label: category === "all" ? t("all") : category,
      count: category === "all" ? sortedRestaurants.length : sortedRestaurants.filter((restaurant) => restaurant.category === category).length,
    }));
  }, [categoryChips, sortedRestaurants, t]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFeed, selectedCategory, filteredRestaurants.length]);

  const loadMore = useCallback(() => {
    if (visibleCount >= filteredRestaurants.length) {
      return;
    }
    setVisibleCount((current) => Math.min(current + PAGE_SIZE, filteredRestaurants.length));
  }, [filteredRestaurants.length, visibleCount]);

  const renderRestaurantCard = useCallback(
    ({ item, index }: { item: (typeof visibleRestaurants)[number]; index: number }) => {
      const delivery = getDeliveryQuote(currentLocation.coordinates, item.coordinates);
      return (
        <AnimatedCard delay={Math.min(index * 70, 250)}>
          <ScalePressable
            containerStyle={styles.restaurantCard}
            onPress={() => navigation.navigate("Restaurant", { restaurantId: item.id })}
          >
            <View>
              <Image source={{ uri: item.image }} style={styles.restaurantImage} />
              <ScalePressable containerStyle={styles.favoriteButton} onPress={() => toggleFavorite(item.id)}>
                <Ionicons
                  name={favorites.includes(item.id) ? "heart" : "heart-outline"}
                  size={18}
                  color={favorites.includes(item.id) ? "#DC2626" : "#111827"}
                />
              </ScalePressable>
              <View style={[styles.freeDeliveryBadge, !freeDeliveryUnlocked && styles.lockedDeliveryBadge]}>
                <Ionicons name={freeDeliveryUnlocked ? "bicycle" : "notifications-outline"} size={12} color="#FFFFFF" />
                <Text style={styles.freeDeliveryText}>{freeDeliveryUnlocked ? "Livraison offerte" : "Activer notifications"}</Text>
              </View>
            </View>

            <View style={styles.restaurantBody}>
              <View style={[styles.restaurantTopRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={styles.ratingInline}>
                  <Text style={styles.ratingValue}>{item.rating.toFixed(1)}</Text>
                  <Ionicons name="star" size={14} color="#111827" />
                </View>
                <Text style={[styles.restaurantName, { textAlign: isRTL ? "right" : "left" }]}>{item.name}</Text>
              </View>
              <Text numberOfLines={2} style={[styles.restaurantDescription, { textAlign: isRTL ? "right" : "left" }]}>
                {item.shortDescription}
              </Text>
              <View style={[styles.restaurantMetaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Text style={styles.restaurantMeta}>{delivery.estimatedLabel}</Text>
                <Text style={styles.restaurantMeta}>{delivery.distanceKm} km</Text>
                <Text style={styles.restaurantMeta}>{freeDeliveryUnlocked ? "0 €" : formatCurrency(delivery.fee)}</Text>
              </View>
            </View>
          </ScalePressable>
        </AnimatedCard>
      );
    },
    [currentLocation.coordinates, favorites, freeDeliveryUnlocked, isRTL, navigation, t, toggleFavorite]
  );

  const handleServicePress = useCallback(
    (serviceId: (typeof SERVICE_ITEMS)[number]["id"]) => {
      if (serviceId === "restaurants") {
        setActiveFeed("restaurants");
        setSelectedCategory("all");
        return;
      }

      if (serviceId === "fresh") {
        setSelectedCategory("Healthy");
        return;
      }

      if (serviceId === "stores") {
        setSelectedCategory("Drinks");
        return;
      }

      if (serviceId === "delivery") {
        navigation.navigate("MainTabs");
        return;
      }

      if (serviceId === "mobile") {
        navigation.navigate("Notifications");
        return;
      }

      pushNotification({
        title: "Bientot disponible",
        message: "Ce service sera active dans une prochaine mise a jour.",
        tone: "info",
      });
    },
    [navigation, pushNotification]
  );

  const firstName = user.firstName?.trim() || user.name?.split(" ")[0] || "Nina";
  const spotlightStats = [
    { id: "eta", label: "Moyenne", value: "22 min" },
    { id: "live", label: "Suivi", value: "Temps reel" },
    { id: "city", label: "Zone", value: "Paris 9" },
  ];

  const listHeader = (
    <View style={styles.headerBlock}>
      <LinearGradient colors={["#111827", "#1F2937", "#EA580C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroShell}>
        <View style={styles.heroTopBar}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.heroTopCopy}>
            <Text style={styles.heroEyebrow}>Food delivery premium</Text>
            <Text style={styles.heroHeadline}>Bonsoir {firstName}, on livre vite et propre.</Text>
          </View>
          <ScalePressable containerStyle={styles.heroBell} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </ScalePressable>
        </View>

        <View style={styles.heroBanner}>
          <View style={styles.heroBannerCopy}>
            <Text style={styles.heroBannerTitle}>
              {freeDeliveryUnlocked ? "Livraison offerte active" : "Active les promos et debloque la livraison offerte"}
            </Text>
            <Text style={styles.heroBannerText}>
              {freeDeliveryUnlocked
                ? "Vos commandes gardent le suivi live et le tarif livraison reste a 0."
                : "Notifications promo + suivi moto en direct pour une experience plus fluide."}
            </Text>
          </View>
          <View style={styles.heroBannerBadge}>
            <Ionicons name={freeDeliveryUnlocked ? "rocket-outline" : "sparkles-outline"} size={18} color="#111827" />
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          {spotlightStats.map((item) => (
            <View key={item.id} style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{item.value}</Text>
              <Text style={styles.heroStatLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScalePressable containerStyle={[styles.locationCard, { flexDirection: isRTL ? "row-reverse" : "row" }]} onPress={() => requestLocation()}>
        <View style={styles.locationRoundButton}>
          <Ionicons name="navigate" size={18} color="#FFFFFF" />
        </View>
        <View style={styles.locationBody}>
          <View style={[styles.locationTopRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text numberOfLines={1} style={[styles.locationTitle, { textAlign: isRTL ? "right" : "left" }]}>
              Ma position actuelle
            </Text>
            <View style={styles.locationStatusPill}>
              <Text style={styles.locationStatusText}>{currentLocation.source === "device" ? "GPS" : "Demo"}</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.locationLabel, { textAlign: isRTL ? "right" : "left" }]}>
            {currentLocation.label}
          </Text>
          <Text style={[styles.locationHint, { textAlign: isRTL ? "right" : "left" }]}>
            {currentLocation.source === "device" ? "Position GPS detectee" : "Touchez pour recuperer votre position"}
          </Text>
        </View>
      </ScalePressable>

      <View style={styles.servicesGrid}>
        {SERVICE_ITEMS.map((item) => (
          <ScalePressable
            key={item.id}
            containerStyle={styles.serviceTile}
            onPress={() => handleServicePress(item.id)}
          >
            <View style={[styles.serviceIconWrap, { backgroundColor: `${item.tint}18` }]}>
              <View style={[styles.serviceIconCore, { backgroundColor: item.tint }]}>
                <Ionicons name={item.icon} size={24} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.serviceText}>{item.label}</Text>
            <Text style={styles.serviceSubtext}>{item.subtitle}</Text>
          </ScalePressable>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.categoryRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
      >
        {categoryStats.map((category) => {
          const active = selectedCategory === category.id;
          return (
            <ScalePressable
              key={category.id}
              containerStyle={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{category.label}</Text>
              <Text style={[styles.categoryChipCount, active && styles.categoryChipCountActive]}>{category.count}</Text>
            </ScalePressable>
          );
        })}
        <ScalePressable containerStyle={styles.filterIconChip} onPress={() => navigation.navigate("MainTabs")}>
          <Ionicons name="options-outline" size={18} color="#111827" />
        </ScalePressable>
      </ScrollView>

      {featuredRestaurant ? (
        <AnimatedCard>
          <ScalePressable
            containerStyle={styles.heroRestaurantCard}
            onPress={() => navigation.navigate("Restaurant", { restaurantId: featuredRestaurant.id })}
          >
            <Image source={{ uri: featuredRestaurant.image }} style={styles.heroRestaurantImage} />
            <View style={styles.heroRestaurantOverlay} />
            <View style={styles.heroRestaurantContent}>
              <View style={styles.heroBadge}>
                <Ionicons name={freeDeliveryUnlocked ? "bicycle" : "notifications-outline"} size={12} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>{freeDeliveryUnlocked ? "توصيل مجاني" : "فعّل الإشعارات"}</Text>
              </View>
              <Text style={[styles.heroRestaurantName, { textAlign: isRTL ? "right" : "left" }]}>
                {featuredRestaurant.name}
              </Text>
              <View style={[styles.heroRestaurantFooter, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={styles.heroRatingRow}>
                  <Text style={styles.heroRatingValue}>{featuredRestaurant.rating.toFixed(1)}</Text>
                  <Ionicons name="star" size={15} color="#111827" />
                </View>
                <Text style={styles.heroRestaurantMeta}>{featuredRestaurant.category}</Text>
              </View>
            </View>
          </ScalePressable>
        </AnimatedCard>
      ) : null}

      <View style={styles.feedHeader}>
        <View>
          <Text style={[styles.feedTitle, { textAlign: isRTL ? "right" : "left" }]}>
            {activeFeed === "favorites" ? t("available_favorites") : t("available_restaurants")}
          </Text>
          <Text style={[styles.feedSubtitle, { textAlign: isRTL ? "right" : "left" }]}>
            {filteredRestaurants.length} {t("showing_restaurants")} • {pointsBalance} pts
          </Text>
        </View>
        <ScalePressable containerStyle={styles.refreshButton} onPress={() => refreshRemoteData().catch(() => undefined)}>
          <Ionicons name="refresh" size={18} color="#111827" />
        </ScalePressable>
      </View>

      <View style={[styles.feedSwitcher, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <ScalePressable
          containerStyle={[styles.feedButton, activeFeed === "restaurants" && styles.feedButtonActive]}
          onPress={() => setActiveFeed("restaurants")}
        >
          <Text style={[styles.feedButtonText, activeFeed === "restaurants" && styles.feedButtonTextActive]}>
            {t("restaurants")}
          </Text>
        </ScalePressable>
        <ScalePressable
          containerStyle={[styles.feedButton, activeFeed === "favorites" && styles.feedButtonActive]}
          onPress={() => setActiveFeed("favorites")}
        >
          <Text style={[styles.feedButtonText, activeFeed === "favorites" && styles.feedButtonTextActive]}>
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
  safe: { flex: 1, backgroundColor: "#F6F3EE" },
  content: { padding: 14, paddingBottom: 32, gap: 18 },
  headerBlock: { gap: 14, marginBottom: 4 },
  heroShell: {
    borderRadius: 28,
    padding: 18,
    gap: 16,
    overflow: "hidden",
  },
  heroTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
  },
  heroTopCopy: { flex: 1, gap: 4 },
  heroEyebrow: {
    color: "#FED7AA",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroHeadline: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  heroBell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBanner: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroBannerCopy: { flex: 1, gap: 6 },
  heroBannerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  heroBannerText: {
    color: "#E5E7EB",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  heroBannerBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  heroStatValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  heroStatLabel: {
    color: "#D1D5DB",
    fontSize: 11,
    fontWeight: "700",
  },
  locationCard: {
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFCF8",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    padding: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  locationRoundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  locationBody: {
    flex: 1,
    gap: 6,
  },
  locationTopRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  locationTitle: {
    flex: 1,
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
  locationStatusPill: {
    backgroundColor: "#F3E8D8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  locationStatusText: {
    color: "#9A3412",
    fontSize: 11,
    fontWeight: "800",
  },
  locationLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  locationHint: {
    color: "#F97316",
    fontSize: 12,
    fontWeight: "700",
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  serviceTile: {
    width: "31.5%",
    backgroundColor: "#FFFCF8",
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  serviceIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceIconCore: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceText: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 14,
    textAlign: "center",
  },
  serviceSubtext: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  categoryRow: {
    gap: 8,
    paddingRight: 4,
  },
  categoryChip: {
    backgroundColor: "#FFFCF8",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    gap: 2,
    minWidth: 84,
  },
  categoryChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  categoryChipText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 14,
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  categoryChipCount: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  categoryChipCountActive: {
    color: "#FED7AA",
  },
  filterIconChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFCF8",
    borderWidth: 1,
    borderColor: "#EEE4D8",
    alignItems: "center",
    justifyContent: "center",
  },
  heroRestaurantCard: {
    minHeight: 258,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  heroRestaurantImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroRestaurantOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.24)",
  },
  heroRestaurantContent: {
    minHeight: 258,
    justifyContent: "flex-end",
    padding: 18,
    gap: 12,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF4E8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: "#9A3412",
    fontWeight: "800",
    fontSize: 12,
  },
  heroRestaurantName: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
  },
  heroRestaurantFooter: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  heroRatingValue: {
    color: "#111827",
    fontWeight: "800",
  },
  heroRestaurantMeta: {
    color: "#111827",
    fontWeight: "800",
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  feedTitle: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "900",
  },
  feedSubtitle: {
    color: "#64748B",
    marginTop: 3,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFCF8",
    borderWidth: 1,
    borderColor: "#EEE4D8",
    alignItems: "center",
    justifyContent: "center",
  },
  feedSwitcher: {
    backgroundColor: "#EDE6DB",
    borderRadius: 999,
    padding: 5,
    gap: 8,
  },
  feedButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 10,
  },
  feedButtonActive: {
    backgroundColor: "#F97316",
  },
  feedButtonText: {
    color: "#6B7280",
    fontWeight: "800",
  },
  feedButtonTextActive: {
    color: "#FFFFFF",
  },
  restaurantCard: {
    backgroundColor: "#FFFCF8",
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEE4D8",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  restaurantImage: {
    width: "100%",
    height: 220,
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
  },
  freeDeliveryBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  lockedDeliveryBadge: {
    backgroundColor: "#7C2D12",
  },
  freeDeliveryText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  restaurantBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  restaurantTopRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  ratingInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3E8D8",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  ratingValue: {
    color: "#111827",
    fontWeight: "800",
  },
  restaurantName: {
    flex: 1,
    color: "#111827",
    fontSize: 19,
    fontWeight: "900",
  },
  restaurantDescription: {
    color: "#64748B",
    lineHeight: 21,
  },
  restaurantMetaRow: {
    gap: 10,
    flexWrap: "wrap",
  },
  restaurantMeta: {
    color: "#334155",
    fontWeight: "800",
    backgroundColor: "#F6EFE5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  footerSpacer: {
    height: 10,
  },
});
