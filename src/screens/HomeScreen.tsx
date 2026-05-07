/**
 * HomeScreen — Refonte Just Eat Takeaway
 * ─────────────────────────────────────────────────────────────────────────────
 * Changements vs version originale :
 *  1. Header plein orange signé (#F36E26) avec localisation + search intégrés
 *  2. Bannières promo en scroll horizontal (2 cartes, pas d'auto-défilement)
 *  3. Catégories en icônes circulaires (emoji + label 2 lignes)
 *  4. Cartes restaurant horizontales compactes (80×80 px, chips méta colorées)
 *  5. Section "Recommandés pour vous" basée sur les favoris
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getDeliveryQuote } from "../services/delivery";
import { formatCurrency } from "../services/format";

// ─── Palette Just Eat ────────────────────────────────────────────────────────
const JE = {
  orange: "#F36E26",
  orangeLight: "#FFF0E8",
  dark: "#181C2E",
  grey: "#898989",
  greyLight: "#F5F5F5",
  white: "#FFFFFF",
  green: "#22C55E",
  greenLight: "#F0FFF4",
};

const PAGE_SIZE = 6;

const CATEGORIES = [
  { id: "all",      label: "Tous",     emoji: "✨" },
  { id: "Burgers",  label: "Burgers",  emoji: "🍔" },
  { id: "Pizza",    label: "Pizza",    emoji: "🍕" },
  { id: "Sushi",    label: "Sushi",    emoji: "🍣" },
  { id: "Healthy",  label: "Healthy",  emoji: "🥗" },
  { id: "Desserts", label: "Desserts", emoji: "🍰" },
  { id: "Drinks",   label: "Boissons", emoji: "🥤" },
];

function shortenAddress(addr: string) {
  return addr.length > 26 ? addr.slice(0, 26) + "…" : addr;
}

function sanitizeDelivery(raw: string, fallback: string) {
  const nums = raw.match(/\d+/g);
  if (!nums?.length) return fallback;
  const vals = nums.map(Number).filter((v) => v < 180);
  if (!vals.length) return "Bientôt";
  return vals.length >= 2 ? `${vals[0]}-${vals[1]} min` : `${vals[0]} min`;
}

// ─── Composant carte restaurant horizontale ──────────────────────────────────
function RestaurantRowCard({
  item,
  isFav,
  onPress,
  onFav,
  deliveryFee,
  deliveryTime,
}: {
  item: any;
  isFav: boolean;
  onPress: () => void;
  onFav: () => void;
  deliveryFee: string;
  deliveryTime: string;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={s.rowCard}>
      <Image source={{ uri: item.image }} style={s.rowImg} />
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity onPress={onFav} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={18}
              color={isFav ? JE.orange : "#C4C4C4"}
            />
          </TouchableOpacity>
        </View>
        <Text style={s.rowDesc} numberOfLines={1}>{item.shortDescription}</Text>
        <View style={s.rowChips}>
          <View style={[s.chip, { backgroundColor: JE.greenLight }]}>
            <Ionicons name="star" size={10} color={JE.green} />
            <Text style={[s.chipTxt, { color: JE.green }]}>{item.rating.toFixed(1)}</Text>
          </View>
          <View style={[s.chip, { backgroundColor: JE.orangeLight }]}>
            <Ionicons name="time-outline" size={10} color={JE.orange} />
            <Text style={[s.chipTxt, { color: JE.orange }]}>{deliveryTime}</Text>
          </View>
          <View style={[s.chip, { backgroundColor: JE.greyLight }]}>
            <Ionicons name="bicycle-outline" size={10} color={JE.grey} />
            <Text style={[s.chipTxt, { color: JE.grey }]}>{deliveryFee}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Composant catégorie circulaire ─────────────────────────────────────────
function CatBubble({
  cat,
  active,
  onPress,
}: {
  cat: (typeof CATEGORIES)[number];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={s.catWrap} activeOpacity={0.75}>
      <View style={[s.catCircle, active && s.catCircleActive]}>
        <Text style={s.catEmoji}>{cat.emoji}</Text>
      </View>
      <Text style={[s.catLabel, active && s.catLabelActive]} numberOfLines={1}>
        {cat.label}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    user, favorites, restaurants, favoriteRestaurants,
    currentLocation, toggleFavorite, t, isRTL, refreshRemoteData,
  } = useApp();

  const [selectedCat, setSelectedCat] = useState("all");
  const [activeFeed, setActiveFeed] = useState<"all" | "favorites">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useFocusEffect(useCallback(() => { refreshRemoteData().catch(() => {}); }, [refreshRemoteData]));
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [selectedCat, activeFeed]);

  const sorted = useMemo(() => [...restaurants].sort((a, b) => b.rating - a.rating), [restaurants]);
  const feedSource = activeFeed === "favorites" ? favoriteRestaurants : sorted;
  const filtered = useMemo(() => {
    if (selectedCat === "all") return feedSource;
    return feedSource.filter((r) => r.category === selectedCat);
  }, [feedSource, selectedCat]);
  const visible = filtered.slice(0, visibleCount);

  const firstName = user.firstName?.trim() || user.name?.split(" ")[0] || "vous";

  // Promos — scroll horizontal statique (style JE)
  const PROMOS = [
    {
      id: "p1",
      title: "Livraison gratuite",
      sub: "1ère commande dès 800 DA",
      emoji: "🎁",
      color: JE.orange,
      bg: JE.orangeLight,
    },
    {
      id: "p2",
      title: "Les mieux notés ⭐",
      sub: "Découvrez les tops restos",
      emoji: "🏆",
      color: "#3B82F6",
      bg: "#EFF6FF",
    },
    {
      id: "p3",
      title: "Express 20 min ⚡",
      sub: "Disponibles maintenant",
      emoji: "🛵",
      color: JE.green,
      bg: JE.greenLight,
    },
  ];

  const renderRestaurant = useCallback(
    ({ item, index }: { item: typeof visible[number]; index: number }) => {
      const dq = getDeliveryQuote(currentLocation.coordinates, item.coordinates);
      const time = sanitizeDelivery(item.deliveryTime, dq.estimatedLabel);
      const fee = formatCurrency(dq.fee);
      const isFav = favorites.includes(item.id);
      return (
        <AnimatedCard delay={Math.min(index * 50, 200)}>
          <RestaurantRowCard
            item={item}
            isFav={isFav}
            deliveryFee={fee}
            deliveryTime={time}
            onPress={() => navigation.navigate("Restaurant", { restaurantId: item.id })}
            onFav={() => toggleFavorite(item.id)}
          />
        </AnimatedCard>
      );
    },
    [currentLocation.coordinates, favorites, navigation, toggleFavorite]
  );

  // ── Header complet ──────────────────────────────────────────────────────────
  const Header = (
    <View>
      {/* ── Zone orange signée Just Eat ── */}
      <View style={s.jeHeader}>
        <StatusBar barStyle="light-content" backgroundColor={JE.orange} />

        {/* Ligne 1 : localisation + notif */}
        <View style={s.jeTopRow}>
          <ScalePressable
            containerStyle={s.locPill}
            onPress={() => navigation.navigate("Addresses")}
          >
            <Ionicons name="location" size={13} color={JE.white} />
            <Text style={s.locText} numberOfLines={1}>
              {shortenAddress(currentLocation.label)}
            </Text>
            <Ionicons name="chevron-down" size={13} color={JE.white} />
          </ScalePressable>

          <ScalePressable
            containerStyle={s.notifBtn}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Ionicons name="notifications-outline" size={20} color={JE.white} />
          </ScalePressable>
        </View>

        {/* Ligne 2 : salutation */}
        <Text style={s.greeting}>Bonjour, {firstName} 👋</Text>

        {/* Barre de recherche dans le header */}
        <ScalePressable
          containerStyle={s.searchBar}
          onPress={() => (navigation as any).navigate("MainTabs", { screen: "Explore" })}
        >
          <Ionicons name="search" size={16} color={JE.grey} />
          <Text style={s.searchPlaceholder}>
            Restaurant, plat, cuisine…
          </Text>
          <View style={s.searchFilter}>
            <Ionicons name="options-outline" size={16} color={JE.orange} />
          </View>
        </ScalePressable>
      </View>

      {/* ── Corps blanc ── */}
      <View style={s.body}>

        {/* Promos horizontales scrollables */}
        <Text style={s.sectionTitle}>🔥 Offres du moment</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.promoRow}
        >
          {PROMOS.map((p) => (
            <TouchableOpacity key={p.id} style={[s.promoCard, { backgroundColor: p.bg }]} activeOpacity={0.85}>
              <Text style={s.promoEmoji}>{p.emoji}</Text>
              <Text style={[s.promoTitle, { color: p.color }]}>{p.title}</Text>
              <Text style={s.promoSub}>{p.sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Catégories en bulles */}
        <Text style={s.sectionTitle}>Catégories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catRow}
        >
          {CATEGORIES.map((cat) => (
            <CatBubble
              key={cat.id}
              cat={cat}
              active={selectedCat === cat.id}
              onPress={() => setSelectedCat(cat.id)}
            />
          ))}
        </ScrollView>

        {/* Switch Tous / Favoris */}
        <View style={s.feedSwitchRow}>
          <Text style={s.sectionTitle}>
            {activeFeed === "favorites" ? "Mes favoris" : "Restaurants"}
          </Text>
          <View style={s.feedSwitch}>
            {(["all", "favorites"] as const).map((f) => (
              <ScalePressable
                key={f}
                containerStyle={[s.feedBtn, activeFeed === f && s.feedBtnActive]}
                onPress={() => setActiveFeed(f)}
              >
                {f === "favorites" && (
                  <Ionicons
                    name="heart"
                    size={12}
                    color={activeFeed === f ? JE.white : JE.grey}
                  />
                )}
                <Text style={[s.feedBtnTxt, activeFeed === f && s.feedBtnTxtActive]}>
                  {f === "all" ? "Tous" : "Favoris"}
                </Text>
              </ScalePressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderRestaurant}
        ListHeaderComponent={Header}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length))}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <EmptyState
              title={t("no_restaurant")}
              message={t("no_restaurant_msg")}
              actionLabel="Actualiser"
              onAction={() => refreshRemoteData().catch(() => {})}
            />
          </View>
        }
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: JE.greyLight },
  listContent: { paddingBottom: 24 },

  // ── Header orange ────────────────────────────────────────────────────────
  jeHeader: {
    backgroundColor: JE.orange,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 12 : 16,
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 12,
  },
  jeTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  locPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  locText: { color: JE.white, fontSize: 13, fontWeight: "600", maxWidth: 180 },
  notifBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  greeting: { color: JE.white, fontSize: 22, fontWeight: "900" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: JE.white, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  searchPlaceholder: { flex: 1, color: "#A0A5BA", fontSize: 14, fontWeight: "500" },
  searchFilter: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: JE.orangeLight, alignItems: "center", justifyContent: "center",
  },

  // ── Corps ────────────────────────────────────────────────────────────────
  body: { paddingHorizontal: 18, paddingTop: 18, gap: 14 },
  sectionTitle: { color: JE.dark, fontSize: 18, fontWeight: "900" },

  // Promos
  promoRow: { gap: 12, paddingBottom: 2 },
  promoCard: {
    width: 168, borderRadius: 16, padding: 14, gap: 6,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  promoEmoji: { fontSize: 26 },
  promoTitle: { fontSize: 14, fontWeight: "900" },
  promoSub: { fontSize: 11, color: JE.grey, lineHeight: 16 },

  // Catégories
  catRow: { gap: 14, paddingBottom: 2 },
  catWrap: { alignItems: "center", gap: 6, width: 60 },
  catCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: JE.white, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2, borderWidth: 1.5, borderColor: "#F0F0F0",
  },
  catCircleActive: {
    backgroundColor: JE.orange, borderColor: JE.orange,
    shadowColor: JE.orange, shadowOpacity: 0.4,
  },
  catEmoji: { fontSize: 22 },
  catLabel: { fontSize: 10, fontWeight: "700", color: JE.grey, textAlign: "center" },
  catLabelActive: { color: JE.orange },

  // Feed switch
  feedSwitchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  feedSwitch: {
    flexDirection: "row", backgroundColor: "#EBEBEB",
    borderRadius: 14, padding: 3, gap: 2,
  },
  feedBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 11,
  },
  feedBtnActive: {
    backgroundColor: JE.orange,
    shadowColor: JE.orange, shadowOpacity: 0.35,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  feedBtnTxt: { color: JE.grey, fontWeight: "700", fontSize: 12 },
  feedBtnTxtActive: { color: JE.white },

  // Carte restaurant horizontale
  rowCard: {
    flexDirection: "row", gap: 12,
    marginHorizontal: 18, marginBottom: 10,
    backgroundColor: JE.white, borderRadius: 16,
    padding: 12, borderWidth: 1, borderColor: "#F0F0F0",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  rowImg: { width: 80, height: 80, borderRadius: 12 },
  rowBody: { flex: 1, gap: 5, justifyContent: "center" },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  rowName: { flex: 1, color: JE.dark, fontSize: 14, fontWeight: "800" },
  rowDesc: { color: JE.grey, fontSize: 11 },
  rowChips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  chipTxt: { fontSize: 10, fontWeight: "700" },

  emptyWrap: { paddingHorizontal: 18, marginTop: 24 },
});
