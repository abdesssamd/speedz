import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { alignStart, mobileTheme } from "../theme/mobile";
import { ScalePressable } from "./ScalePressable";

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  const { isRTL } = useApp();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, alignStart(isRTL)]}>{title}</Text>
      <Text style={[styles.message, alignStart(isRTL)]}>{message}</Text>
      {actionLabel && onAction ? (
        <ScalePressable containerStyle={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </ScalePressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: mobileTheme.radius.xl,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: "800", color: mobileTheme.colors.text },
  message: { color: mobileTheme.colors.textMuted, lineHeight: 20 },
  button: {
    marginTop: 6,
    backgroundColor: mobileTheme.colors.ink,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: { color: mobileTheme.colors.white, fontWeight: "800" },
});
