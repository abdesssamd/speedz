import React, { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";

export function AddressesScreen() {
  const { savedAddresses, addSavedAddress, t, isRTL } = useApp();
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");

  const onSave = () => {
    if (!label.trim() || !address.trim()) {
      return;
    }

    addSavedAddress({ label, address });
    setLabel("");
    setAddress("");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("saved_addresses")}</Text>

        {savedAddresses.map((item, index) => (
          <AnimatedCard key={item.id} delay={Math.min(index * 70, 180)} style={styles.addressCard}>
            <View style={styles.addressTop}>
              <Text style={styles.addressLabel}>{item.label}</Text>
              {item.isDefault ? <Text style={styles.badge}>{t("default_address_badge")}</Text> : null}
            </View>
            <Text style={[styles.addressText, { textAlign: isRTL ? "right" : "left" }]}>{item.address}</Text>
          </AnimatedCard>
        ))}

        <AnimatedCard style={styles.formCard}>
          <Text style={styles.formTitle}>{t("add_address")}</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder={t("address_placeholder")}
            style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
          />
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder={t("full_address")}
            style={[styles.input, styles.multiline, { textAlign: isRTL ? "right" : "left" }]}
            multiline
          />
          <ScalePressable containerStyle={styles.button} onPress={onSave}>
            <Text style={styles.buttonText}>{t("save_address")}</Text>
          </ScalePressable>
        </AnimatedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF9F1" },
  content: { padding: 18, gap: 14, paddingBottom: 32 },
  title: { color: "#111827", fontSize: 28, fontWeight: "800" },
  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 16,
    gap: 8,
  },
  addressTop: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" },
  addressLabel: { color: "#111827", fontWeight: "800", fontSize: 17 },
  badge: { color: "#7C2D12", backgroundColor: "#FED7AA", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontWeight: "800", fontSize: 12 },
  addressText: { color: "#475569", lineHeight: 20 },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 18,
    gap: 12,
  },
  formTitle: { color: "#111827", fontWeight: "800", fontSize: 18 },
  input: {
    backgroundColor: "#FFF9F1",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5DED3",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  button: { backgroundColor: "#EA580C", borderRadius: 18, alignItems: "center", paddingVertical: 14 },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
});
