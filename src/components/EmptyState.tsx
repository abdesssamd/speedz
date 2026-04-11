import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScalePressable } from "./ScalePressable";

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
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
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EAE7E1",
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  message: { textAlign: "center", color: "#64748B", lineHeight: 20 },
  button: {
    marginTop: 6,
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
});
