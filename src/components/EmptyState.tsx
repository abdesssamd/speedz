import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { alignStart, radius } from "../theme/mobile";
import { useThemeColors } from "../theme/ThemeProvider";
import { ScalePressable } from "./ScalePressable";

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  const { isRTL } = useApp();
  const c = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.xl },
      ]}
    >
      <Text style={[styles.title, { color: c.text }, alignStart(isRTL)]}>{title}</Text>
      <Text style={[styles.message, { color: c.textMuted }, alignStart(isRTL)]}>{message}</Text>
      {actionLabel && onAction ? (
        <ScalePressable containerStyle={[styles.button, { backgroundColor: c.ink }]} onPress={onAction}>
          <Text style={[styles.buttonText, { color: c.white }]}>{actionLabel}</Text>
        </ScalePressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: "800" },
  message: { lineHeight: 20 },
  button: {
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: { fontWeight: "800" },
});
