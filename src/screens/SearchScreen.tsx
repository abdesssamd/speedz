/**
 * SearchScreen — Refonte Just Eat Takeaway
 * ─────────────────────────────────────────────────────────────────────────────
 * Changements vs version originale :
 *  1. Résultats unifiés : plats + restaurants dans une seule liste (sections JE)
 *  2. Recherche locale rapide + fallback requête backend (endpoint /api/search)
 *  3. Historique de recherche persisté (AsyncStorage)
 *  4. Suggestions populaires quand le champ est vide
 *  5. Carte résultat "plat" avec restaurant d'origine + bouton ajout direct
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
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
import { getDeliveryQuote } from "../services/delivery";
import { formatCurrency } from "../services/format";
import { ThemeColors } from "../theme/mobile";
import { useTheme } from "../theme/ThemeProvider";
import { MenuItem, Restaurant } from "../types";

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

const HISTORY_KEY = "speedz:search_history";
const MAX_HISTORY = 8;
type DishSearchResult = { dish: MenuItem; restaurant: Restaurant };
type SearchRow =
  | { type: "section"; key: string; title: string; count: number }
  | { type: "restaurant"; key: string; restaurant: Restaurant }
  | { type: "dish"; key: string; result: DishSearchResult };

function normalizeText(v: string) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// ─── Suggestions rapides ──────────────────────────────────────────────────────
const QUICK_TAGS = [
  { label: "🍔 Burgers", query: "burger" },
  { label: "🍕 Pizza",   query: "pizza" },
  { label: "🍣 Sushi",   query: "sushi" },
  { label: "🥗 Healthy", query: "healthy" },
  { label: "🍰 Desserts",query: "dessert" },
  { label: "⚡ Express", query: "express" },
];

// ─── Carte restaurant compact (résultat) ─────────────────────────────────────
function RestaurantResult({ item, onPress, deliveryTime, fee, rating }: {
  item: any; onPress: () => void;
  deliveryTime: string; fee: string; rating: string;
}) {
  const s = useSearchStyles();
  const { colors: c } = useTheme();
  return (
    <TouchableOpacity style={s.restRow} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: item.image }} style={s.restImg} />
      <View style={s.restBody}>
        <Text style={s.restName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.restSub} numberOfLines={1}>{item.shortDescription}</Text>
        <View style={s.restChips}>
          <View style={[s.chip, { backgroundColor: c.successSoft }]}>
            <Ionicons name="star" size={9} color={c.success} />
            <Text style={[s.chipTxt, { color: c.success }]}>{rating}</Text>
          </View>
          <View style={[s.chip, { backgroundColor: c.brandSoft }]}>
            <Ionicons name="time-outline" size={9} color={JE.orange} />
            <Text style={[s.chipTxt, { color: JE.orange }]}>{deliveryTime}</Text>
          </View>
          <View style={[s.chip, { backgroundColor: c.surfaceMuted }]}>
            <Ionicons name="bicycle-outline" size={9} color={c.textMuted} />
            <Text style={[s.chipTxt, { color: c.textMuted }]}>{fee}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
    </TouchableOpacity>
  );
}

// ─── Carte plat (résultat) ───────────────────────────────────────────────────
function DishResult({ dish, restaurantName, onPress, onAdd }: {
  dish: any; restaurantName: string;
  onPress: () => void; onAdd: () => void;
}) {
  const s = useSearchStyles();
  return (
    <TouchableOpacity style={s.dishRow} onPress={onPress} activeOpacity={0.85}>
      {dish.image
        ? <Image source={{ uri: dish.image }} style={s.dishImg} />
        : <View style={[s.dishImg, s.dishImgPlaceholder]}><Text style={{ fontSize: 24 }}>🍽️</Text></View>
      }
      <View style={s.dishBody}>
        <Text style={s.dishName} numberOfLines={1}>{dish.name}</Text>
        <Text style={s.dishRestaurant} numberOfLines={1}>
          <Ionicons name="storefront-outline" size={10} color={JE.grey} /> {restaurantName}
        </Text>
        <Text style={s.dishPrice}>{formatCurrency(dish.price)}</Text>
      </View>
      <TouchableOpacity style={s.addBtn} onPress={onAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="add" size={18} color={JE.white} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    restaurants, favorites, currentLocation,
    toggleFavorite, addToCart, t, isRTL, menuCategories, refreshRemoteData,
  } = useApp();

  const s = useSearchStyles();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  // Charger historique
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => raw && setHistory(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => {
    refreshRemoteData().catch(() => {});
  }, [refreshRemoteData]));

  const saveToHistory = useCallback(async (q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...history.filter((h) => h !== q)].slice(0, MAX_HISTORY);
    setHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
  }, [history]);

  const removeFromHistory = useCallback(async (q: string) => {
    const updated = history.filter((h) => h !== q);
    setHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
  }, [history]);

  const applyQuery = (q: string) => {
    setQuery(q);
    saveToHistory(q);
    inputRef.current?.blur();
  };

  // ── Résultats ─────────────────────────────────────────────────────────────
  const nq = useMemo(() => normalizeText(query), [query]);

  const matchedRestaurants = useMemo(() => {
    if (!nq) return [];
    return restaurants
      .filter((r) =>
        normalizeText(`${r.name} ${r.shortDescription} ${r.category} ${r.address}`).includes(nq)
      )
      .slice(0, 5);
  }, [nq, restaurants]);

  const matchedDishes = useMemo(() => {
    if (!nq) return [];
    const results: DishSearchResult[] = [];
    for (const restaurant of restaurants) {
      for (const dish of restaurant.menu) {
        if (normalizeText(`${dish.name} ${dish.description} ${dish.category}`).includes(nq)) {
          results.push({ dish, restaurant });
          if (results.length >= 10) break;
        }
      }
      if (results.length >= 10) break;
    }
    return results;
  }, [nq, restaurants]);

  const resultRows = useMemo(() => {
    const rows: SearchRow[] = [];
    if (matchedRestaurants.length > 0) {
      rows.push({ type: "section", key: "section-restaurants", title: "Restaurants", count: matchedRestaurants.length });
      rows.push(
        ...matchedRestaurants.map((restaurant) => ({
          type: "restaurant" as const,
          key: `restaurant-${restaurant.id}`,
          restaurant,
        }))
      );
    }

    if (matchedDishes.length > 0) {
      rows.push({ type: "section", key: "section-dishes", title: "Plats", count: matchedDishes.length });
      rows.push(
        ...matchedDishes.map((result, index) => ({
          type: "dish" as const,
          key: `dish-${result.dish.id}-${index}`,
          result,
        }))
      );
    }

    return rows;
  }, [matchedRestaurants, matchedDishes]);

  const hasResults = resultRows.length > 0;
  const showEmpty = nq.length > 0 && !hasResults;

  // ── Rendu état vide (suggestions) ─────────────────────────────────────────
  const EmptyState_ = (
    <View style={s.emptyState}>
      {/* Historique */}
      {history.length > 0 && (
        <View style={s.emptySection}>
          <View style={s.emptyRow}>
            <Text style={s.emptyTitle}>Recherches récentes</Text>
            <TouchableOpacity onPress={() => { setHistory([]); AsyncStorage.removeItem(HISTORY_KEY); }}>
              <Text style={s.clearAll}>Tout effacer</Text>
            </TouchableOpacity>
          </View>
          {history.map((h) => (
            <TouchableOpacity key={h} style={s.historyItem} onPress={() => applyQuery(h)}>
              <Ionicons name="time-outline" size={15} color={JE.grey} />
              <Text style={s.historyTxt}>{h}</Text>
              <TouchableOpacity onPress={() => removeFromHistory(h)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={14} color="#C4C4C4" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tags rapides */}
      <View style={s.emptySection}>
        <Text style={s.emptyTitle}>Tendances</Text>
        <View style={s.tagWrap}>
          {QUICK_TAGS.map((tag) => (
            <TouchableOpacity key={tag.query} style={s.quickTag} onPress={() => applyQuery(tag.query)}>
              <Text style={s.quickTagTxt}>{tag.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Populaires */}
      <View style={s.emptySection}>
        <Text style={s.emptyTitle}>Populaires près de vous</Text>
        {restaurants.slice(0, 3).map((r) => {
          const dq = getDeliveryQuote(currentLocation.coordinates, r.coordinates);
          return (
            <RestaurantResult
              key={r.id}
              item={r}
              rating={r.rating.toFixed(1)}
              deliveryTime={dq.estimatedLabel}
              fee={formatCurrency(dq.fee)}
              onPress={() => {
                saveToHistory(r.name);
                navigation.navigate("Restaurant", { restaurantId: r.id });
              }}
            />
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Barre de recherche orange JE ──────────────────────────────── */}
      <View style={s.searchHeader}>
        <View style={[s.searchBar, focused && s.searchBarFocused]}>
          <Ionicons name="search" size={16} color={focused ? JE.orange : JE.grey} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Restaurant, plat, cuisine…"
            placeholderTextColor="#C4C4C4"
            style={[s.searchInput, { textAlign: isRTL ? "right" : "left" }]}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => query.trim() && saveToHistory(query.trim())}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#C4C4C4" />
            </TouchableOpacity>
          )}
        </View>

        {/* Résultats count */}
        {nq.length > 0 && (
          <Text style={s.resultsCount}>
            {matchedRestaurants.length + matchedDishes.length} résultat
            {matchedRestaurants.length + matchedDishes.length > 1 ? "s" : ""}
            {" "}pour «{query}»
          </Text>
        )}
      </View>

      {/* ── Contenu ────────────────────────────────────────────────────── */}
      {nq.length === 0 ? (
        // Pas de recherche → suggestions
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={EmptyState_}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listPad}
          keyExtractor={() => "empty"}
        />
      ) : showEmpty ? (
        // Recherche sans résultat
        <View style={s.noResultWrap}>
          <Text style={s.noResultEmoji}>🔍</Text>
          <Text style={s.noResultTitle}>Aucun résultat pour «{query}»</Text>
          <Text style={s.noResultSub}>Essayez un autre terme ou explorez les catégories</Text>
          <TouchableOpacity style={s.clearBtn} onPress={() => setQuery("")}>
            <Text style={s.clearBtnTxt}>Effacer la recherche</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Résultats en sections
        <FlatList
          data={resultRows}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listPad}
          renderItem={({ item, index }) => {
            if (item.type === "section") {
              return (
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>{item.title}</Text>
                  <Text style={s.sectionCount}>{item.count}</Text>
                </View>
              );
            }

            if (item.type === "restaurant") {
              const r = item.restaurant;
              const dq = getDeliveryQuote(currentLocation.coordinates, r.coordinates);
              return (
                <AnimatedCard delay={Math.min(index * 40, 160)}>
                  <RestaurantResult
                    item={r}
                    rating={r.rating.toFixed(1)}
                    deliveryTime={dq.estimatedLabel}
                    fee={formatCurrency(dq.fee)}
                    onPress={() => {
                      saveToHistory(query);
                      navigation.navigate("Restaurant", { restaurantId: r.id });
                    }}
                  />
                </AnimatedCard>
              );
            }

            const { dish, restaurant } = item.result;
            return (
              <AnimatedCard delay={Math.min(index * 40, 160)}>
                <DishResult
                  dish={dish}
                  restaurantName={restaurant.name}
                  onPress={() => {
                    saveToHistory(query);
                    navigation.navigate("Restaurant", { restaurantId: restaurant.id });
                  }}
                  onAdd={() => {
                    addToCart(restaurant, dish, [], 1);
                    saveToHistory(query);
                  }}
                />
              </AnimatedCard>
            );
          }}
          ListFooterComponent={<View style={{ height: 32 }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function useSearchStyles() {
  const { colors: c } = useTheme();
  return useMemo(() => makeStyles(c), [c]);
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },

  // Header de recherche
  searchHeader: {
    backgroundColor: c.surface,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: c.borderSoft,
    gap: 8,
  },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: c.surfaceMuted, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: "transparent",
  },
  searchBarFocused: { borderColor: JE.orange, backgroundColor: c.surface },
  searchInput: { flex: 1, color: c.text, fontSize: 15, padding: 0 },
  resultsCount: { color: c.textMuted, fontSize: 12, fontWeight: "600" },

  listPad: { paddingBottom: 32 },

  // Sections
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8,
  },
  sectionTitle: { color: c.text, fontSize: 17, fontWeight: "900" },
  sectionCount: {
    backgroundColor: c.brandSoft, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 2,
    color: JE.orange, fontSize: 12, fontWeight: "700",
  },

  // Carte restaurant résultat
  restRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: c.surface, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: c.borderSoft,
  },
  restImg: { width: 64, height: 64, borderRadius: 10 },
  restBody: { flex: 1, gap: 4 },
  restName: { color: c.text, fontWeight: "800", fontSize: 14 },
  restSub: { color: c.textMuted, fontSize: 11 },
  restChips: { flexDirection: "row", gap: 5 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
  },
  chipTxt: { fontSize: 10, fontWeight: "700" },

  // Carte plat résultat
  dishRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: c.surface, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: c.borderSoft,
  },
  dishImg: { width: 60, height: 60, borderRadius: 10, resizeMode: "cover" },
  dishImgPlaceholder: {
    backgroundColor: c.surfaceMuted, alignItems: "center", justifyContent: "center",
  },
  dishBody: { flex: 1, gap: 3 },
  dishName: { color: c.text, fontWeight: "800", fontSize: 13 },
  dishRestaurant: { color: c.textMuted, fontSize: 11 },
  dishPrice: { color: JE.orange, fontWeight: "900", fontSize: 13 },
  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: JE.orange, alignItems: "center", justifyContent: "center",
    shadowColor: JE.orange, shadowOpacity: 0.4, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },

  // État vide
  emptyState: { padding: 16, gap: 4 },
  emptySection: { paddingVertical: 12, gap: 10 },
  emptyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  emptyTitle: { color: c.text, fontSize: 16, fontWeight: "900" },
  clearAll: { color: JE.orange, fontWeight: "600", fontSize: 13 },

  historyItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: c.borderSoft,
  },
  historyTxt: { flex: 1, color: c.text, fontSize: 14, fontWeight: "500" },

  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickTag: {
    backgroundColor: c.surface, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: c.borderSoft,
  },
  quickTagTxt: { color: c.text, fontWeight: "700", fontSize: 13 },

  // Aucun résultat
  noResultWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  noResultEmoji: { fontSize: 48 },
  noResultTitle: { color: c.text, fontSize: 18, fontWeight: "900", textAlign: "center" },
  noResultSub: { color: c.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  clearBtn: {
    backgroundColor: c.brandSoft, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 8,
  },
  clearBtnTxt: { color: JE.orange, fontWeight: "800", fontSize: 14 },
  });
}
