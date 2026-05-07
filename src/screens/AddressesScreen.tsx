import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";

export function AddressesScreen() {
  const { savedAddresses, addSavedAddress, t, isRTL } = useApp();
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const onSave = () => {
    if (!label.trim() || !address.trim()) return;
    addSavedAddress({ label, address });
    setLabel(""); setAddress("");
  };

  const getAddressIcon = (lbl: string) => {
    const l = lbl.toLowerCase();
    if (l.includes("maison") || l.includes("home")) return "home";
    if (l.includes("bureau") || l.includes("travail") || l.includes("work")) return "briefcase";
    return "location";
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>{t("saved_addresses")}</Text>
        <Text style={s.pageSubtitle}>Gérez vos adresses de livraison</Text>

        {savedAddresses.length === 0 && (
          <View style={s.emptyCard}>
            <View style={s.emptyIcon}><Ionicons name="location-outline" size={32} color="#FF7622" /></View>
            <Text style={s.emptyTitle}>Aucune adresse enregistrée</Text>
            <Text style={s.emptyText}>Ajoutez votre première adresse ci-dessous</Text>
          </View>
        )}

        {savedAddresses.map((item, index) => (
          <AnimatedCard key={item.id} delay={Math.min(index * 70, 180)} style={s.addressCard}>
            <View style={[s.addressIconWrap, item.isDefault && s.addressIconWrapActive]}>
              <Ionicons name={getAddressIcon(item.label) as any} size={20} color={item.isDefault ? "#FF7622" : "#898989"} />
            </View>
            <View style={s.addressBody}>
              <View style={s.addressTop}>
                <Text style={s.addressLabel}>{item.label}</Text>
                {item.isDefault && (
                  <View style={s.defaultBadge}><Text style={s.defaultBadgeText}>{t("default_address_badge")}</Text></View>
                )}
              </View>
              <Text style={[s.addressText, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>{item.address}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </AnimatedCard>
        ))}

        {/* Add new address */}
        <View style={s.formCard}>
          <View style={s.formHeader}>
            <View style={s.formIconWrap}><Ionicons name="add-circle" size={22} color="#FF7622" /></View>
            <Text style={s.formTitle}>{t("add_address")}</Text>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Étiquette</Text>
            <View style={[s.inputWrap, focusedField === "label" && s.inputFocused]}>
              <Ionicons name="bookmark-outline" size={16} color={focusedField === "label" ? "#FF7622" : "#A0A5BA"} />
              <TextInput value={label} onChangeText={setLabel} placeholder={t("address_placeholder")}
                placeholderTextColor="#C4C4C4" style={[s.input, { textAlign: isRTL ? "right" : "left" }]}
                onFocus={() => setFocusedField("label")} onBlur={() => setFocusedField(null)} />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Adresse complète</Text>
            <View style={[s.inputWrap, s.inputWrapMulti, focusedField === "address" && s.inputFocused]}>
              <Ionicons name="map-outline" size={16} color={focusedField === "address" ? "#FF7622" : "#A0A5BA"} style={{ marginTop: 2 }} />
              <TextInput value={address} onChangeText={setAddress} placeholder={t("full_address")}
                placeholderTextColor="#C4C4C4" multiline
                style={[s.input, s.inputMulti, { textAlign: isRTL ? "right" : "left" }]}
                onFocus={() => setFocusedField("address")} onBlur={() => setFocusedField(null)} />
            </View>
          </View>

          <ScalePressable containerStyle={s.saveBtn} onPress={onSave}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
            <Text style={s.saveBtnText}>{t("save_address")}</Text>
          </ScalePressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  pageTitle: { color: "#181C2E", fontSize: 28, fontWeight: "900" },
  pageSubtitle: { color: "#898989", fontSize: 14, marginTop: -8 },

  emptyCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 32, alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: "#181C2E", fontWeight: "800", fontSize: 16 },
  emptyText: { color: "#898989", fontSize: 13, textAlign: "center" },

  addressCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#FFF", borderRadius: 20, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  addressIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" },
  addressIconWrapActive: { backgroundColor: "#FFF3EC" },
  addressBody: { flex: 1, gap: 4 },
  addressTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  addressLabel: { color: "#181C2E", fontWeight: "800", fontSize: 16 },
  defaultBadge: { backgroundColor: "#FFF3EC", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#FFD5B8" },
  defaultBadgeText: { color: "#FF7622", fontWeight: "800", fontSize: 10 },
  addressText: { color: "#898989", lineHeight: 19, fontSize: 13 },

  formCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 20, gap: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  formHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  formIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" },
  formTitle: { color: "#181C2E", fontWeight: "900", fontSize: 18 },
  fieldGroup: { gap: 8 },
  fieldLabel: { color: "#181C2E", fontSize: 13, fontWeight: "700" },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: "#EFEFEF", backgroundColor: "#FAFAFA", paddingHorizontal: 14 },
  inputWrapMulti: { alignItems: "flex-start", paddingVertical: 12 },
  inputFocused: { borderColor: "#FF7622", backgroundColor: "#FFF9F5" },
  input: { flex: 1, color: "#181C2E", fontSize: 14, paddingVertical: 4 },
  inputMulti: { minHeight: 72, textAlignVertical: "top" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FF7622", borderRadius: 18, paddingVertical: 16, shadowColor: "#FF7622", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  saveBtnText: { color: "#FFF", fontWeight: "900", fontSize: 15 },
});
