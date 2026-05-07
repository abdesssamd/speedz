import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList, Image, NativeScrollEvent, NativeSyntheticEvent,
  SafeAreaView, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getDeliveryQuote } from "../services/delivery";
import { formatCurrency } from "../services/format";

const PAGE_SIZE = 4;

const CATEGORIES = [
  { id: "all",       label: "Tous",      emoji: "🍽️" },
  { id: "Burgers",   label: "Burgers",   emoji: "🍔" },
  { id: "Pizza",     label: "Pizza",     emoji: "🍕" },
  { id: "Sushi",     label: "Sushi",     emoji: "🍣" },
  { id: "Healthy",   label: "Healthy",   emoji: "🥗" },
  { id: "Desserts",  label: "Desserts",  emoji: "🍰" },
];

function shortenAddress(addr: string) {
  return addr.length > 28 ? addr.slice(0, 28) + "…" : addr;
}

function sanitizeDelivery(raw: string, fallback: string) {
  const nums = raw.match(/\d+/g);
  if (!nums?.length) return fallback;
  const vals = nums.map(Number).filter((v) => v < 180);
  if (!vals.length) return "Bientôt dispo";
  return vals.length >= 2 ? `${vals[0]}-${vals[1]} min` : `${vals[0]} min`;
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    user, favorites, restaurants, favoriteRestaurants, currentLocation,
    notificationPreferences, pointsBalance, requestLocation, toggleFavorite,
    t, isRTL, refreshRemoteData,
  } = useApp();

  const [activeFeed, setActiveFeed] = useState<"all" | "favorites">("all");
  const [selectedCat, setSelectedCat] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [promoIndex, setPromoIndex] = useState(0);

  useFocusEffect(useCallback(() => { refreshRemoteData().catch(() => {}); }, [refreshRemoteData]));

  const sorted = useMemo(() => [...restaurants].sort((a, b) => b.rating - a.rating), [restaurants]);
  const feedSource = activeFeed === "favorites" ? favoriteRestaurants : sorted;
  const filtered = useMemo(() => {
    if (selectedCat === "all") return feedSource;
    return feedSource.filter((r) => r.category === selectedCat);
  }, [feedSource, selectedCat]);
  const visible = filtered.slice(0, visibleCount);
  const featured = filtered[0] ?? sorted[0] ?? null;
  const firstName = user.firstName?.trim() || user.name?.split(" ")[0] || "vous";

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeFeed, selectedCat]);

  const PROMOS = [
    { id: "1", tag: "🔥 Offre du jour", title: "Livraison gratuite", sub: "Sur votre 1ère commande du jour dès 800 DA", bg: "#FFF3EC" },
    { id: "2", tag: "⭐ Populaire", title: "Les mieux notés", sub: "Découvrez les restaurants les plus appréciés près de vous", bg: "#F0FFF4" },
    { id: "3", tag: "⚡ Express", title: "Livraison en 20 min", sub: "Restaurants express disponibles maintenant", bg: "#EEF2FF" },
  ];

  const renderRestaurant = useCallback(({ item, index }: { item: typeof visible[number]; index: number }) => {
    const dq = getDeliveryQuote(currentLocation.coordinates, item.coordinates);
    const time = sanitizeDelivery(item.deliveryTime, dq.estimatedLabel);
    const fee = formatCurrency(dq.fee);
    const isFav = favorites.includes(item.id);
    return (
      <AnimatedCard delay={Math.min(index * 60, 240)}>
        <ScalePressable containerStyle={s.restCard} onPress={() => navigation.navigate("Restaurant", { restaurantId: item.id })}>
          <View>
            <Image source={{ uri: item.image }} style={s.restImg} />
            <ScalePressable containerStyle={s.favBtn} onPress={() => toggleFavorite(item.id)}>
              <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? "#FF7622" : "#898989"} />
            </ScalePressable>
            <View style={s.ratingPill}>
              <Ionicons name="star" size={11} color="#FF7622" />
              <Text style={s.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
            {notificationPreferences.promotions && (
              <View style={s.promoBadge}><Text style={s.promoBadgeText}>Livraison offerte</Text></View>
            )}
          </View>
          <View style={s.restBody}>
            <Text style={s.restName}>{item.name}</Text>
            <Text style={s.restDesc} numberOfLines={1}>{item.shortDescription}</Text>
            <View style={s.restMeta}>
              <View style={s.metaPill}>
                <Ionicons name="time-outline" size={12} color="#FF7622" />
                <Text style={s.metaText}>{time}</Text>
              </View>
              <View style={s.metaDot} />
              <View style={s.metaPill}>
                <Ionicons name="bicycle-outline" size={12} color="#898989" />
                <Text style={[s.metaText, { color: "#898989" }]}>{fee}</Text>
              </View>
              <View style={s.metaDot} />
              <Text style={s.restCat}>{item.category}</Text>
            </View>
          </View>
        </ScalePressable>
      </AnimatedCard>
    );
  }, [currentLocation.coordinates, favorites, navigation, notificationPreferences.promotions, toggleFavorite]);

  const header = (
    <View style={s.headerBlock}>
      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.topLeft}>
          <ScalePressable containerStyle={s.locationRow} onPress={() => navigation.navigate("Addresses")}>
            <View style={s.locationIconWrap}><Ionicons name="location" size={14} color="#FF7622" /></View>
            <Text style={s.locationText} numberOfLines={1}>{shortenAddress(currentLocation.label)}</Text>
            <Ionicons name="chevron-down" size={14} color="#FF7622" />
          </ScalePressable>
          <Text style={s.greeting}>Bonjour, {firstName} 👋</Text>
        </View>
        <ScalePressable containerStyle={s.avatarBtn} onPress={() => (navigation as any).navigate("MainTabs", { screen: "Profile" })}>
          <Text style={s.avatarText}>{(user.name || "U")[0].toUpperCase()}</Text>
        </ScalePressable>
      </View>

      {/* Search bar */}
      <ScalePressable containerStyle={s.searchBar} onPress={() => (navigation as any).navigate("MainTabs", { screen: "Explore" })}>
        <View style={s.searchIconWrap}><Ionicons name="search" size={18} color="#FF7622" /></View>
        <Text style={s.searchPlaceholder}>Rechercher un plat ou restaurant…</Text>
        <View style={s.filterBtn}><Ionicons name="options-outline" size={16} color="#FF7622" /></View>
      </ScalePressable>

      {/* Promo banner */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const w = e.nativeEvent.layoutMeasurement.width;
          setPromoIndex(Math.round(e.nativeEvent.contentOffset.x / w));
        }}>
        {PROMOS.map((p) => (
          <View key={p.id} style={[s.promoSlide, { backgroundColor: p.bg }]}>
            <Text style={s.promoTag}>{p.tag}</Text>
            <Text style={s.promoTitle}>{p.title}</Text>
            <Text style={s.promoSub}>{p.sub}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={s.promoDots}>
        {PROMOS.map((p, i) => <View key={p.id} style={[s.promoDot, i === promoIndex && s.promoDotActive]} />)}
      </View>

      {/* Categories */}
      <Text style={s.sectionTitle}>Catégories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
        {CATEGORIES.map((cat) => {
          const active = selectedCat === cat.id;
          return (
            <ScalePressable key={cat.id} containerStyle={[s.catChip, active && s.catChipActive]} onPress={() => setSelectedCat(cat.id)}>
              <Text style={s.catEmoji}>{cat.emoji}</Text>
              <Text style={[s.catLabel, active && s.catLabelActive]}>{cat.label}</Text>
            </ScalePressable>
          );
        })}
      </ScrollView>

      {/* Featured */}
      {featured && (
        <View>
          <Text style={s.sectionTitle}>Sélection du jour</Text>
          <ScalePressable containerStyle={s.featCard} onPress={() => navigation.navigate("Restaurant", { restaurantId: featured.id })}>
            <Image source={{ uri: featured.image }} style={s.featImg} />
            <View style={s.featOverlay}>
              <View style={s.featTag}><Text style={s.featTagText}>⭐ Top choix</Text></View>
              <Text style={s.featName}>{featured.name}</Text>
              <Text style={s.featSub} numberOfLines={2}>{featured.shortDescription}</Text>
              <View style={s.featMeta}>
                <Ionicons name="time-outline" size={13} color="#FFF" />
                <Text style={s.featMetaText}>{featured.deliveryTime}</Text>
                <View style={s.featMetaDot} />
                <Ionicons name="star" size={13} color="#FFD234" />
                <Text style={s.featMetaText}>{featured.rating.toFixed(1)}</Text>
              </View>
            </View>
          </ScalePressable>
        </View>
      )}

      {/* Feed switcher */}
      <View style={s.feedRow}>
        <Text style={s.sectionTitle}>{activeFeed === "favorites" ? "Mes favoris" : "Restaurants"}</Text>
        <View style={s.feedSwitch}>
          <ScalePressable containerStyle={[s.feedBtn, activeFeed === "all" && s.feedBtnActive]} onPress={() => setActiveFeed("all")}>
            <Text style={[s.feedBtnText, activeFeed === "all" && s.feedBtnTextActive]}>Tous</Text>
          </ScalePressable>
          <ScalePressable containerStyle={[s.feedBtn, activeFeed === "favorites" && s.feedBtnActive]} onPress={() => setActiveFeed("favorites")}>
            <Ionicons name="heart" size={12} color={activeFeed === "favorites" ? "#FFF" : "#898989"} />
            <Text style={[s.feedBtnText, activeFeed === "favorites" && s.feedBtnTextActive]}>Favoris</Text>
          </ScalePressable>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={visible} keyExtractor={(item) => item.id}
        renderItem={renderRestaurant}
        ListHeaderComponent={header}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        onEndReached={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length))}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={<EmptyState title={t("no_restaurant")} message={t("no_restaurant_msg")} actionLabel="Actualiser" onAction={() => refreshRemoteData().catch(() => {})} />}
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { paddingBottom: 24 },
  headerBlock: { padding: 20, gap: 18 },

  topBar: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  topLeft: { flex: 1, gap: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  locationIconWrap: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" },
  locationText: { color: "#181C2E", fontSize: 13, fontWeight: "600", maxWidth: 180 },
  greeting: { color: "#181C2E", fontSize: 22, fontWeight: "900" },
  avatarBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FF7622", alignItems: "center", justifyContent: "center", shadowColor: "#FF7622", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  avatarText: { color: "#FFF", fontSize: 18, fontWeight: "900" },

  searchBar: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF", borderRadius: 18, padding: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  searchIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" },
  searchPlaceholder: { flex: 1, color: "#A0A5BA", fontSize: 14, fontWeight: "500" },
  filterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" },

  promoSlide: { width: 320, marginRight: 12, borderRadius: 20, padding: 18, gap: 6, minHeight: 110 },
  promoTag: { fontSize: 12, fontWeight: "700", color: "#FF7622" },
  promoTitle: { color: "#181C2E", fontSize: 18, fontWeight: "900" },
  promoSub: { color: "#6B7280", fontSize: 13, lineHeight: 19 },
  promoDots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  promoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" },
  promoDotActive: { width: 20, backgroundColor: "#FF7622" },

  sectionTitle: { color: "#181C2E", fontSize: 20, fontWeight: "900" },
  catRow: { gap: 10, paddingHorizontal: 2 },
  catChip: { alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#F0F0F0", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  catChipActive: { backgroundColor: "#FF7622", borderColor: "#FF7622", shadowColor: "#FF7622", shadowOpacity: 0.3 },
  catEmoji: { fontSize: 20 },
  catLabel: { color: "#6B7280", fontWeight: "700", fontSize: 12 },
  catLabelActive: { color: "#FFF" },

  featCard: { borderRadius: 24, overflow: "hidden", height: 200 },
  featImg: { width: "100%", height: "100%" },
  featOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(24,28,46,0.6)", padding: 18, justifyContent: "flex-end", gap: 6 },
  featTag: { alignSelf: "flex-start", backgroundColor: "#FF7622", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  featTagText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  featName: { color: "#FFF", fontSize: 22, fontWeight: "900" },
  featSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 18 },
  featMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  featMetaText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  featMetaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.5)" },

  feedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  feedSwitch: { flexDirection: "row", backgroundColor: "#F0F0F0", borderRadius: 12, padding: 3, gap: 2 },
  feedBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  feedBtnActive: { backgroundColor: "#FF7622", shadowColor: "#FF7622", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  feedBtnText: { color: "#898989", fontWeight: "700", fontSize: 13 },
  feedBtnTextActive: { color: "#FFF" },

  restCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: "#FFF", borderRadius: 22, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  restImg: { width: "100%", height: 170 },
  favBtn: { position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  ratingPill: { position: "absolute", bottom: 10, left: 12, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  ratingText: { color: "#181C2E", fontSize: 12, fontWeight: "800" },
  promoBadge: { position: "absolute", top: 12, left: 12, backgroundColor: "#FF7622", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  promoBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "800" },
  restBody: { padding: 14, gap: 8 },
  restName: { color: "#181C2E", fontSize: 18, fontWeight: "900" },
  restDesc: { color: "#898989", fontSize: 13 },
  restMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: "#FF7622", fontSize: 12, fontWeight: "700" },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#D1D5DB" },
  restCat: { color: "#898989", fontSize: 12, fontWeight: "600" },
});
