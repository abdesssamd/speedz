import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { RestaurantCard } from "../components/RestaurantCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";

function normalizeText(v: string) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getCategoryEmoji(label: string) {
  const n = normalizeText(label);
  if (n.includes("burger")) return "🍔";
  if (n.includes("pizza")) return "🍕";
  if (n.includes("sushi")) return "🍣";
  if (n.includes("healthy")) return "🥗";
  if (n.includes("dessert")) return "🍰";
  if (n.includes("drink")) return "🥤";
  if (n.includes("all") || n.includes("tous")) return "✨";
  return "🍽️";
}

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { restaurants, favorites, currentLocation, toggleFavorite, t, isRTL, menuCategories, refreshRemoteData } = useApp();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const categoryOptions = useMemo(() => [t("all"), ...menuCategories], [menuCategories, t]);
  const [category, setCategory] = useState(t("all"));
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  React.useEffect(() => {
    setCategory((c) => (categoryOptions.includes(c) ? c : t("all")));
  }, [categoryOptions, t]);

  useFocusEffect(useCallback(() => { refreshRemoteData().catch(() => {}); }, [refreshRemoteData]));

  const filtered = useMemo(() => {
    const nq = normalizeText(query);
    return restaurants.filter((r) => {
      const catMatch = category === t("all") || r.category === category;
      const txtMatch = normalizeText(`${r.name} ${r.shortDescription} ${r.address}`).includes(nq);
      const favMatch = !favoriteOnly || favorites.includes(r.id);
      return catMatch && txtMatch && favMatch;
    });
  }, [category, favoriteOnly, favorites, query, restaurants, t]);

  const resetFilters = () => { setQuery(""); setCategory(t("all")); setFavoriteOnly(false); };
  const hasFilters = query.trim() || favoriteOnly || category !== t("all");

  const categoryStats = useMemo(() =>
    categoryOptions.map((item) => ({
      id: item, label: item, emoji: getCategoryEmoji(item),
      count: item === t("all") ? restaurants.length : restaurants.filter((r) => r.category === item).length,
    })), [categoryOptions, restaurants, t]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        {/* Header */}
        <View style={s.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={[s.pageTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("restaurants")}</Text>
            <Text style={[s.pageSubtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("search_subtitle")}</Text>
          </View>
          <ScalePressable containerStyle={s.filterIconBtn}>
            <Ionicons name="options-outline" size={20} color="#FF7622" />
          </ScalePressable>
        </View>

        {/* Search input */}
        <View style={[s.searchBar, focused && s.searchBarFocused]}>
          <View style={s.searchIconWrap}>
            <Ionicons name="search" size={18} color={focused ? "#FF7622" : "#898989"} />
          </View>
          <TextInput
            value={query} onChangeText={setQuery}
            placeholder={t("search_placeholder")} placeholderTextColor="#C4C4C4"
            style={[s.searchInput, { textAlign: isRTL ? "right" : "left" }]}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          />
          {query.length > 0 && (
            <ScalePressable containerStyle={s.clearInput} onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color="#C4C4C4" />
            </ScalePressable>
          )}
        </View>

        {/* Category scroll */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s.catRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          {categoryStats.map((cat) => {
            const active = category === cat.label;
            return (
              <ScalePressable key={cat.id} containerStyle={[s.catChip, active && s.catChipActive]} onPress={() => setCategory(cat.label)}>
                <Text style={s.catEmoji}>{cat.emoji}</Text>
                <View style={s.catText}>
                  <Text style={[s.catLabel, active && s.catLabelActive]}>{cat.label}</Text>
                  <Text style={[s.catCount, active && s.catCountActive]}>{cat.count}</Text>
                </View>
              </ScalePressable>
            );
          })}
          <ScalePressable
            containerStyle={[s.catChip, favoriteOnly && s.catChipFav]}
            onPress={() => setFavoriteOnly((p) => !p)}
          >
            <Ionicons name="heart" size={18} color={favoriteOnly ? "#FFF" : "#EF4444"} />
            <View style={s.catText}>
              <Text style={[s.catLabel, favoriteOnly && s.catLabelActive]}>{t("favorites")}</Text>
              <Text style={[s.catCount, favoriteOnly && s.catCountActive]}>{favorites.length}</Text>
            </View>
          </ScalePressable>
        </ScrollView>

        {/* Active filters bar */}
        {hasFilters && (
          <View style={s.filtersBar}>
            <View style={s.filtersLeft}>
              <Ionicons name="funnel" size={13} color="#FF7622" />
              <Text style={s.filtersText} numberOfLines={1}>
                {[favoriteOnly && t("favorites"), category !== t("all") && category, query.trim()]
                  .filter(Boolean).join(" · ")}
              </Text>
            </View>
            <ScalePressable containerStyle={s.clearFiltersBtn} onPress={resetFilters}>
              <Text style={s.clearFiltersBtnText}>{t("clear_filters")}</Text>
            </ScalePressable>
          </View>
        )}

        {/* Results count */}
        <View style={s.resultsHeader}>
          <Text style={s.resultsCount}>
            {filtered.length} restaurant{filtered.length > 1 ? "s" : ""} trouvé{filtered.length > 1 ? "s" : ""}
          </Text>
        </View>

        {/* Results list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.resultsList}
          renderItem={({ item, index }) => (
            <AnimatedCard delay={Math.min(index * 60, 280)}>
              <RestaurantCard
                restaurant={item}
                userCoordinates={currentLocation.coordinates}
                isFavorite={favorites.includes(item.id)}
                onPress={() => navigation.navigate("Restaurant", { restaurantId: item.id })}
                onToggleFavorite={() => toggleFavorite(item.id)}
              />
            </AnimatedCard>
          )}
          ListEmptyComponent={
            <EmptyState
              title={t("no_restaurant")}
              message={t("no_restaurant_msg")}
              actionLabel={t("clear_filters")}
              onAction={resetFilters}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { flex: 1, paddingTop: 20, gap: 14 },

  topBar: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20 },
  pageTitle: { color: "#181C2E", fontSize: 28, fontWeight: "900" },
  pageSubtitle: { color: "#898989", fontSize: 14, marginTop: 2 },
  filterIconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF3EC",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#FF7622", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20,
    backgroundColor: "#FFF", borderRadius: 18, borderWidth: 1.5, borderColor: "#EFEFEF",
    paddingHorizontal: 14, paddingVertical: 4,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  searchBarFocused: { borderColor: "#FF7622", shadowColor: "#FF7622", shadowOpacity: 0.12 },
  searchIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" },
  searchInput: { flex: 1, color: "#181C2E", fontSize: 15, paddingVertical: 10 },
  clearInput: { padding: 4 },

  catRow: { gap: 10, paddingHorizontal: 20, paddingBottom: 2 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "#FFF", borderRadius: 16, borderWidth: 1.5, borderColor: "#F0F0F0",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  catChipActive: { backgroundColor: "#181C2E", borderColor: "#181C2E" },
  catChipFav: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
  catEmoji: { fontSize: 20 },
  catText: { gap: 1 },
  catLabel: { color: "#181C2E", fontWeight: "800", fontSize: 13 },
  catLabelActive: { color: "#FFF" },
  catCount: { color: "#898989", fontSize: 11, fontWeight: "600" },
  catCountActive: { color: "rgba(255,255,255,0.7)" },

  filtersBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10,
    marginHorizontal: 20, backgroundColor: "#FFF3EC", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "#FFD5B8",
  },
  filtersLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  filtersText: { flex: 1, color: "#FF7622", fontWeight: "700", fontSize: 13 },
  clearFiltersBtn: { backgroundColor: "#FF7622", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  clearFiltersBtnText: { color: "#FFF", fontWeight: "800", fontSize: 12 },

  resultsHeader: { paddingHorizontal: 20 },
  resultsCount: { color: "#898989", fontSize: 13, fontWeight: "600" },

  resultsList: { gap: 14, paddingHorizontal: 20, paddingBottom: 120 },
});
