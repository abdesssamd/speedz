import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { useThemeColors } from "../theme/ThemeProvider";
import { alignStart, rowDirection } from "../theme/mobile";

// Doit rester aligné sur la durée d'auto-fermeture définie dans AppContext (3200 ms).
const AUTO_DISMISS_MS = 3200;

const TONE_META = {
  success: { icon: "checkmark-circle" as const },
  error: { icon: "alert-circle" as const },
  info: { icon: "notifications" as const },
};

export function AppNotification() {
  const { notification, dismissNotification, isRTL } = useApp();
  const c = useThemeColors();
  const translateY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const progress = useRef(new Animated.Value(1)).current;

  const notificationId = notification?.id;

  useEffect(() => {
    if (notification) {
      // Entrée : glisse + fondu + léger zoom.
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 70 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }),
      ]).start();

      // Barre de progression qui se vide jusqu'à l'auto-fermeture.
      progress.setValue(1);
      Animated.timing(progress, {
        toValue: 0,
        duration: AUTO_DISMISS_MS,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -140, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration: 160, useNativeDriver: true }),
      ]).start();
    }
    // On relance l'animation à chaque nouvelle notification (id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationId]);

  if (!notification) {
    return null;
  }

  const tone = notification.tone ?? "info";
  const accent =
    tone === "success" ? c.success : tone === "error" ? c.danger : c.brand;
  const meta = TONE_META[tone] ?? TONE_META.info;

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      <Pressable
        onPress={dismissNotification}
        style={[
          styles.card,
          rowDirection(isRTL),
          { backgroundColor: c.surface, shadowColor: c.ink, borderColor: c.borderSoft },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${accent}1A` }]}>
          <Ionicons name={meta.icon} size={22} color={accent} />
        </View>

        <View style={styles.textBlock}>
          <Text style={[styles.title, alignStart(isRTL), { color: c.text }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[styles.message, alignStart(isRTL), { color: c.textMuted }]} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>

        <Pressable onPress={dismissNotification} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={16} color={c.textMuted} />
        </Pressable>

        {/* Barre d'auto-fermeture */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth, backgroundColor: accent }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 52,
    left: 14,
    right: 14,
    zIndex: 60,
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: "800", letterSpacing: 0.2 },
  message: { fontSize: 13, lineHeight: 18 },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "transparent",
  },
  progressBar: {
    height: 3,
    borderBottomRightRadius: 3,
    opacity: 0.9,
  },
});
