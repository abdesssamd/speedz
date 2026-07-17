import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "./api";
import { theme } from "./theme";
import { Ad } from "./types";

// Bannière publicitaire affichée en haut de la liste des courses (placement COURIER_BANNER).
export function CourierAdBanner() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .getAds("COURIER_BANNER")
      .then((list) => {
        if (!cancelled) setAds(Array.isArray(list) ? list : []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Rotation simple si plusieurs bannières.
  useEffect(() => {
    if (ads.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(timer);
  }, [ads.length]);

  if (ads.length === 0) return null;
  const ad = ads[index % ads.length];

  return (
    <View style={styles.bannerWrap}>
      <Image source={{ uri: ad.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
      {ads.length > 1 ? (
        <View style={styles.dots}>
          {ads.map((_, i) => (
            <View key={i} style={[styles.dot, i === index % ads.length && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// Affiche publicitaire plein écran à l'ouverture de l'app (placement COURIER_SPLASH),
// une seule fois par session, refermable.
export function CourierAdSplash() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    api
      .getAds("COURIER_SPLASH")
      .then((list) => {
        if (cancelled || !Array.isArray(list) || list.length === 0) return;
        setAd(list[0]);
        setVisible(true);
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [opacity]);

  if (!ad) return null;

  const close = () => {
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
      setVisible(false)
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <Animated.View style={[styles.splashOverlay, { opacity }]}>
        <View style={styles.splashCard}>
          <Image source={{ uri: ad.imageUrl }} style={styles.splashImage} resizeMode="cover" />
          <Pressable style={styles.splashClose} onPress={close} hitSlop={10}>
            <Text style={styles.splashCloseText}>✕</Text>
          </Pressable>
          {ad.title ? <Text style={styles.splashTitle}>{ad.title}</Text> : null}
          <Pressable style={styles.splashBtn} onPress={close}>
            <Text style={styles.splashBtnText}>Continuer</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bannerWrap: { borderRadius: theme.radius.lg, overflow: "hidden", backgroundColor: theme.colors.surface },
  bannerImage: { width: "100%", aspectRatio: 21 / 9 },
  dots: { position: "absolute", bottom: 8, alignSelf: "center", flexDirection: "row", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { backgroundColor: "#fff", width: 16 },

  splashOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.85)", alignItems: "center", justifyContent: "center", padding: 24 },
  splashCard: { width: "100%", maxWidth: 380, backgroundColor: theme.colors.card, borderRadius: 24, overflow: "hidden", alignItems: "center", paddingBottom: 18 },
  splashImage: { width: "100%", aspectRatio: 4 / 5 },
  splashClose: { position: "absolute", top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  splashCloseText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  splashTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "800", paddingHorizontal: 18, paddingTop: 14, textAlign: "center" },
  splashBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 40 },
  splashBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
