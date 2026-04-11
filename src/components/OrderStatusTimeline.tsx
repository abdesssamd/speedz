import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { OrderStatus } from "../types";

const STEPS: OrderStatus[] = ["Confirmed", "Preparing", "On the way", "Delivered"];

type OrderStatusTimelineProps = {
  status: OrderStatus;
};

export function OrderStatusTimeline({ status }: OrderStatusTimelineProps) {
  const activeIndex = Math.max(STEPS.indexOf(status), 0);

  return (
    <View style={styles.row}>
      {STEPS.map((step, index) => {
        const active = index <= activeIndex;
        return (
          <View key={step} style={styles.step}>
            <View style={[styles.dot, active && styles.dotActive]} />
            <Text style={[styles.label, active && styles.labelActive]}>{step}</Text>
            {index < STEPS.length - 1 ? <View style={[styles.line, index < activeIndex && styles.lineActive]} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  step: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#CBD5E1",
  },
  dotActive: {
    backgroundColor: "#F97316",
  },
  label: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  labelActive: {
    color: "#111827",
  },
  line: {
    position: "absolute",
    top: 5,
    right: "-50%",
    width: "100%",
    height: 2,
    backgroundColor: "#E2E8F0",
    zIndex: -1,
  },
  lineActive: {
    backgroundColor: "#FDBA74",
  },
});
