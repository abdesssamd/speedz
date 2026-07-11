import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Dimensions, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ad, api } from "../services/api";

/**
 * Affiche publicitaire plein écran à l'ouverture de l'application.
 * - Charge les publicités SPLASH actives ; n'affiche que la plus récente.
 * - Une seule fois par session (variable module, remise à zéro au redémarrage).
 * - Best-effort : toute erreur réseau est ignorée silencieusement.
 */

let hasShownThisSession = false;

const { width: SCREEN_W } = Dimensions.get("window");

export function AdSplashModal({
  onNavigateToRestaurant,
}: {
  onNavigateToRestaurant?: (restaurantId: string) => void;
}) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasShownThisSession) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const ads = await api.getAds("SPLASH");
        if (cancelled || !ads.length) {
          return;
        }
        hasShownThisSession = true;
        setAd(ads[0]);
        setVisible(true);
      } catch {
        // pas de publicité si le réseau échoue — jamais bloquant
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ad) {
    return null;
  }

  const close = () => setVisible(false);

  const handlePress = () => {
    close();
    if (ad.restaurantId && onNavigateToRestaurant) {
      onNavigateToRestaurant(ad.restaurantId);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Pressable onPress={handlePress}>
            <Image source={{ uri: ad.imageUrl }} style={s.image} resizeMode="cover" />
          </Pressable>
          {ad.title ? <Text style={s.title}>{ad.title}</Text> : null}
          {ad.restaurantId ? (
            <Pressable style={s.ctaBtn} onPress={handlePress}>
              <Text style={s.ctaTxt}>Découvrir</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </Pressable>
          ) : null}
        </View>
        <Pressable style={s.closeBtn} onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color="#FFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: Math.min(SCREEN_W - 48, 400),
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#1A1A20",
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  title: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF7622",
    borderRadius: 16,
    margin: 16,
    paddingVertical: 14,
  },
  ctaTxt: { color: "#FFF", fontWeight: "900", fontSize: 15 },
  closeBtn: {
    position: "absolute",
    top: 52,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});
