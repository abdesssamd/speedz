import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

/**
 * Bloc de chargement animé (shimmer) réutilisable.
 * Utilise `useNativeDriver` pour rester fluide même pendant le fetch.
 */
export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, style, { opacity }]} />;
}

/** Carte restaurant fantôme, alignée sur le layout des vraies cartes. */
export function RestaurantCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton style={styles.thumb} />
      <View style={styles.body}>
        <Skeleton style={styles.lineWide} />
        <Skeleton style={styles.lineNarrow} />
        <View style={styles.chipsRow}>
          <Skeleton style={styles.chip} />
          <Skeleton style={styles.chip} />
          <Skeleton style={styles.chip} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: "#E7E7E7", borderRadius: 8 },
  card: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 18,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  thumb: { width: 80, height: 80, borderRadius: 12 },
  body: { flex: 1, gap: 8, justifyContent: "center" },
  lineWide: { width: "70%", height: 14, borderRadius: 7 },
  lineNarrow: { width: "45%", height: 11, borderRadius: 6 },
  chipsRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  chip: { width: 48, height: 18, borderRadius: 8 },
});
