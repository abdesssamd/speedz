import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { getDeliveryQuote } from "../services/delivery";
import { formatCurrency } from "../services/format";
import { Coordinates, Restaurant } from "../types";
import { ScalePressable } from "./ScalePressable";

type RestaurantCardProps = {
  restaurant: Restaurant;
  userCoordinates: Coordinates;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
};

export function RestaurantCard({
  restaurant,
  userCoordinates,
  isFavorite,
  onPress,
  onToggleFavorite,
}: RestaurantCardProps) {
  const { isRTL } = useApp();
  const delivery = getDeliveryQuote(userCoordinates, restaurant.coordinates);

  return (
    <ScalePressable containerStyle={styles.card} onPress={onPress}>
      <View>
        <Image source={{ uri: restaurant.image }} style={styles.image} />
        <ScalePressable containerStyle={styles.favoriteButton} onPress={onToggleFavorite}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={18} color={isFavorite ? "#DC2626" : "#111827"} />
        </ScalePressable>
      </View>

      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={[styles.name, { textAlign: isRTL ? "right" : "left" }]}>{restaurant.name}</Text>
          <Text style={styles.rating}>★ {restaurant.rating}</Text>
        </View>
        <Text style={[styles.description, { textAlign: isRTL ? "right" : "left" }]}>{restaurant.shortDescription}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{delivery.estimatedLabel}</Text>
          <Text style={styles.meta}>{delivery.distanceKm} km</Text>
          <Text style={styles.meta}>{formatCurrency(delivery.fee)}</Text>
        </View>
        <View style={styles.tagsRow}>
          {restaurant.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECE7E1",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  image: {
    width: "100%",
    height: 186,
  },
  favoriteButton: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  name: { flex: 1, color: "#111827", fontSize: 18, fontWeight: "800" },
  rating: { color: "#92400E", fontWeight: "800" },
  description: { color: "#64748B", lineHeight: 20 },
  metaRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  meta: { color: "#334155", fontWeight: "700" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: "#F7F2EB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: { color: "#6B4423", fontSize: 12, fontWeight: "700" },
});
