import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { RestaurantCard } from "../components/RestaurantCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getCategoryEmoji(label: string) {
  const normalized = normalizeText(label);
  if (normalized.includes("burger")) return "🍔";
  if (normalized.includes("pizza")) return "🍕";
  if (normalized.includes("sushi")) return "🍣";
  if (normalized.includes("healthy")) return "🥗";
  if (normalized.includes("dessert")) return "🍰";
  if (normalized.includes("drink")) return "🥤";
  if (normalized.includes("all")) return "✨";
  return "🍽️";
}

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { restaurants, favorites, currentLocation, toggleFavorite, t, isRTL, menuCategories, refreshRemoteData } = useApp();
  const [query, setQuery] = useState("");
  const categoryOptions = useMemo(() => [t("all"), ...menuCategories], [menuCategories, t]);
  const [category, setCategory] = useState(t("all"));
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  React.useEffect(() => {
    setCategory((current) => (categoryOptions.includes(current) ? current : t("all")));
  }, [categoryOptions, t]);

  useFocusEffect(
    useCallback(() => {
      refreshRemoteData().catch(() => undefined);
    }, [refreshRemoteData])
  );

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    return restaurants.filter((restaurant) => {
      const categoryMatch = category === t("all") || restaurant.category === category;
      const textMatch = normalizeText(`${restaurant.name} ${restaurant.shortDescription} ${restaurant.address}`).includes(normalizedQuery);
      const favoriteMatch = !favoriteOnly || favorites.includes(restaurant.id);
      return categoryMatch && textMatch && favoriteMatch;
    });
  }, [category, favoriteOnly, favorites, query, restaurants, t]);

  const resetFilters = () => {
    setQuery("");
    setCategory(t("all"));
    setFavoriteOnly(false);
  };

  const categoryStats = useMemo(
    () =>
      categoryOptions.map((item) => ({
        id: item,
        label: item,
        emoji: getCategoryEmoji(item),
        count: item === t("all") ? restaurants.length : restaurants.filter((restaurant) => restaurant.category === item).length,
      })),
    [categoryOptions, restaurants, t]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <LinearGradient colors={["#111827", "#1F2937", "#EA580C"]} style={styles.heroCard}>
          <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("restaurants")}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("search_subtitle")}</Text>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#64748B" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("search_placeholder")}
              placeholderTextColor="#94A3B8"
              style={[styles.searchInput, { textAlign: isRTL ? "right" : "left" }]}
            />
          </View>
        </LinearGradient>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoryScroller, { flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          {categoryStats.map((item) => {
            const active = category === item.label;
            return (
              <ScalePressable
                key={item.id}
                containerStyle={[styles.categoryCard, active && styles.categoryCardActive]}
                onPress={() => setCategory(item.label)}
              >
                <View style={[styles.categoryEmojiWrap, active && styles.categoryEmojiWrapActive]}>
                  <Text style={styles.categoryEmoji}>{item.emoji}</Text>
                </View>
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{item.label}</Text>
                <Text style={[styles.categoryCount, active && styles.categoryCountActive]}>{item.count} restos</Text>
              </ScalePressable>
            );
          })}

          <ScalePressable
            containerStyle={[styles.categoryCard, favoriteOnly && styles.favoriteCardActive]}
            onPress={() => setFavoriteOnly((prev) => !prev)}
          >
            <View style={[styles.categoryEmojiWrap, favoriteOnly && styles.favoriteEmojiWrap]}>
              <Ionicons name="heart" size={16} color={favoriteOnly ? "#FFFFFF" : "#DC2626"} />
            </View>
            <Text style={[styles.categoryLabel, favoriteOnly && styles.categoryLabelActive]}>{t("favorites")}</Text>
            <Text style={[styles.categoryCount, favoriteOnly && styles.categoryCountActive]}>
              {favorites.length} saved
            </Text>
          </ScalePressable>
        </ScrollView>

        {(query.trim() || favoriteOnly || category !== t("all")) ? (
          <View style={styles.activeFiltersRow}>
            <Text style={styles.activeFiltersText}>
              {favoriteOnly ? `${t("favorites")} · ` : ""}
              {category !== t("all") ? `${category} · ` : ""}
              {query.trim() || t("restaurants")}
            </Text>
            <ScalePressable containerStyle={styles.clearButton} onPress={resetFilters}>
              <Text style={styles.clearButtonText}>{t("clear_filters")}</Text>
            </ScalePressable>
          </View>
        ) : null}

        <FlatList
          data={filteredRestaurants}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item, index }) => (
            <AnimatedCard delay={Math.min(index * 70, 280)}>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F3EE" },
  content: { flex: 1, paddingHorizontal: 14, paddingTop: 12, gap: 14 },
  heroCard: { borderRadius: 28, padding: 18, gap: 12 },
  title: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#E5E7EB", lineHeight: 20, fontWeight: "600" },
  searchBox: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { flex: 1, height: 46, color: "#111827" },
  categoryScroller: { gap: 10, paddingBottom: 2, paddingHorizontal: 2 },
  categoryCard: {
    width: 116,
    backgroundColor: "#FFFCF8",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 6,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  categoryCardActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  favoriteCardActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  categoryEmojiWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F6EFE5",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmojiWrapActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  favoriteEmojiWrap: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  categoryEmoji: {
    fontSize: 15,
  },
  categoryLabel: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 14,
  },
  categoryLabelActive: {
    color: "#FFFFFF",
  },
  categoryCount: {
    color: "#7C6F64",
    fontWeight: "700",
    fontSize: 11,
  },
  categoryCountActive: {
    color: "#FED7AA",
  },
  activeFiltersRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  activeFiltersText: { flex: 1, color: "#64748B", fontWeight: "700" },
  clearButton: { backgroundColor: "#111827", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  clearButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  resultsList: { gap: 14, paddingBottom: 140 },
});
