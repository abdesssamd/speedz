import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useApp } from "../context/AppContext";

export function AppNotification() {
  const { notification, dismissNotification, t, isRTL } = useApp();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: notification ? 0 : -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: notification ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [notification, opacity, translateY]);

  if (!notification) {
    return null;
  }

  const accent =
    notification.tone === "success"
      ? "#15803D"
      : notification.tone === "error"
        ? "#B91C1C"
        : "#0F766E";

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable onPress={dismissNotification} style={[styles.card, { borderLeftColor: accent }]}>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{notification.title}</Text>
          <Text style={[styles.message, { textAlign: isRTL ? "right" : "left" }]}>{notification.message}</Text>
        </View>
        <Text style={[styles.close, { color: accent }]}>{t("close")}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    zIndex: 40,
  },
  card: {
    backgroundColor: "#FFFBF5",
    borderRadius: 18,
    borderLeftWidth: 5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#111827",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  textBlock: { flex: 1, gap: 2 },
  title: { color: "#111827", fontSize: 15, fontWeight: "800" },
  message: { color: "#475569", fontSize: 13, lineHeight: 18 },
  close: { fontWeight: "700", fontSize: 12 },
});
