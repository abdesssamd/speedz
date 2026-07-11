import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConnectivity } from "../services/connectivity";

/**
 * Bannière globale affichée en haut de l'écran quand le serveur est injoignable.
 * S'anime en entrée/sortie et se cache automatiquement dès le retour en ligne.
 */
export function OfflineBanner() {
  const online = useConnectivity();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: online ? -80 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [online, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { paddingTop: insets.top + 8, transform: [{ translateY }] }]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
      <Text style={styles.text}>Pas de connexion — reconnexion…</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 10,
    backgroundColor: "#EF4444",
  },
  text: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
});
