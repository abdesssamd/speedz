import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScalePressable } from "./ScalePressable";

type QuantityControlProps = {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  compact?: boolean;
};

export function QuantityControl({ quantity, onDecrease, onIncrease, compact = false }: QuantityControlProps) {
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <ScalePressable containerStyle={[styles.button, compact && styles.buttonCompact]} onPress={onDecrease}>
        <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>-</Text>
      </ScalePressable>
      <Text style={[styles.value, compact && styles.valueCompact]}>{quantity}</Text>
      <ScalePressable
        containerStyle={[styles.button, styles.buttonPrimary, compact && styles.buttonCompact]}
        onPress={onIncrease}
      >
        <Text style={[styles.buttonText, styles.buttonPrimaryText, compact && styles.buttonTextCompact]}>+</Text>
      </ScalePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowCompact: {
    gap: 8,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F2EDE5",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonCompact: {
    width: 28,
    height: 28,
    borderRadius: 10,
  },
  buttonPrimary: {
    backgroundColor: "#111827",
  },
  buttonText: {
    fontWeight: "800",
    color: "#111827",
    fontSize: 18,
  },
  buttonTextCompact: {
    fontSize: 15,
  },
  buttonPrimaryText: {
    color: "#FFFFFF",
  },
  value: {
    minWidth: 22,
    textAlign: "center",
    fontWeight: "800",
    color: "#111827",
  },
  valueCompact: {
    minWidth: 18,
    fontSize: 13,
  },
});
