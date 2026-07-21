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
  const parsedMinutes = restaurant.deliveryTime.match(/\d+/g)?.map((value) => Number(value)) ?? [];
  const deliveryLabel =
    parsedMinutes.length && parsedMinutes.every((value) => Number.isFinite(value) && value < 180)
      ? parsedMinutes.length >= 2
        ? `${parsedMinutes[0]}-${parsedMinutes[1]} min`
        : `${parsedMinutes[0]} min`
      : "Bientot disponible";

  // Hors service : l'agent d'impression du restaurant ne répond plus.
  const isOffline = restaurant.isOnline === false;

  return (
    <ScalePressable containerStyle={styles.card} onPress={onPress}>
      <View>
        <Image source={{ uri: restaurant.image }} style={[styles.image, isOffline && styles.imageOffline]} />
        {isOffline ? (
          <View style={styles.offlineOverlay}>
            <View style={styles.offlineBadge}>
              <Ionicons name="moon" size={13} color="#FFFFFF" />
              <Text style={styles.offlineBadgeText}>Hors service</Text>
            </View>
          </View>
        ) : null}
        <ScalePressable containerStyle={styles.favoriteButton} onPress={onToggleFavorite}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={18} color={isFavorite ? "#DC2626" : "#111827"} />
        </ScalePressable>
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { textAlign: isRTL ? "right" : "left" }]}>{restaurant.name}</Text>
        <Text style={[styles.description, { textAlign: isRTL ? "right" : "left" }]}>{restaurant.shortDescription}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={14} color="#FF8C00" />
            <Text style={styles.meta}>{restaurant.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.dot}>•</Text>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.meta}>{deliveryLabel}</Text>
          </View>
          <Text style={styles.dot}>•</Text>
          <View style={styles.metaItem}>
            <Ionicons name="bicycle-outline" size={14} color="#64748B" />
            <Text style={styles.meta}>{formatCurrency(delivery.fee)}</Text>
          </View>
        </View>
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
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
  imageOffline: { opacity: 0.45 },
  offlineOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 186,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(17,24,39,0.88)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  offlineBadgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12.5 },
  favoriteButton: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 16,
    gap: 10,
  },
  name: { flex: 1, color: "#111827", fontSize: 18, fontWeight: "900" },
  description: { color: "#64748B", lineHeight: 20, fontWeight: "500" },
  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { color: "#334155", fontWeight: "700" },
  dot: { color: "#94A3B8", fontWeight: "900" },
});
