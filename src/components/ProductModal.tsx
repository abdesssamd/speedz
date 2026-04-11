import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useApp } from "../context/AppContext";
import { MenuItem, Restaurant, SelectedOption } from "../types";
import { formatCurrency } from "../services/format";
import { QuantityControl } from "./QuantityControl";
import { ScalePressable } from "./ScalePressable";

type ProductModalProps = {
  visible: boolean;
  restaurant: Restaurant;
  item: MenuItem | null;
  onClose: () => void;
  onSubmit: (
    item: MenuItem,
    selectedOptions: SelectedOption[],
    quantity: number,
    specialInstructions?: string
  ) => void;
};

export function ProductModal({ visible, restaurant, item, onClose, onSubmit }: ProductModalProps) {
  const { t, isRTL } = useApp();
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");

  useEffect(() => {
    if (!item) {
      return;
    }

    const defaults = item.options.flatMap((group) =>
      group.required && group.choices[0]
        ? [
            {
              groupId: group.id,
              groupName: group.name,
              choiceId: group.choices[0].id,
              choiceName: group.choices[0].name,
              priceDelta: group.choices[0].priceDelta,
            },
          ]
        : []
    );

    setSelectedOptions(defaults);
    setQuantity(1);
    setSpecialInstructions("");
  }, [item]);

  const total = useMemo(() => {
    if (!item) {
      return 0;
    }

    const optionsTotal = selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);
    return (item.price + optionsTotal) * quantity;
  }, [item, quantity, selectedOptions]);

  if (!item) {
    return null;
  }

  const toggleChoice = (
    groupId: string,
    groupName: string,
    multiple: boolean,
    choiceId: string,
    choiceName: string,
    priceDelta: number
  ) => {
    setSelectedOptions((prev) => {
      const nextChoice = { groupId, groupName, choiceId, choiceName, priceDelta };

      if (multiple) {
        const exists = prev.some((entry) => entry.groupId === groupId && entry.choiceId === choiceId);
        return exists
          ? prev.filter((entry) => !(entry.groupId === groupId && entry.choiceId === choiceId))
          : [...prev, nextChoice];
      }

      return [...prev.filter((entry) => entry.groupId !== groupId), nextChoice];
    });
  };

  const isSelected = (groupId: string, choiceId: string) =>
    selectedOptions.some((entry) => entry.groupId === groupId && entry.choiceId === choiceId);

  const selectedOptionsCount = selectedOptions.length;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScalePressable containerStyle={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={20} color="#111827" />
          </ScalePressable>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.heroCard}>
              <Image source={{ uri: item.image }} style={styles.image} />
              <View style={styles.heroContent}>
                <Text style={[styles.restaurantName, { textAlign: isRTL ? "right" : "left" }]}>{restaurant.name}</Text>
                <Text style={[styles.name, { textAlign: isRTL ? "right" : "left" }]}>{item.name}</Text>
                <Text style={[styles.description, { textAlign: isRTL ? "right" : "left" }]}>{item.description}</Text>

                <View style={[styles.metaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={styles.metaPill}>
                    <Ionicons name="restaurant-outline" size={14} color="#EA580C" />
                    <Text style={styles.metaPillText}>{item.category}</Text>
                  </View>
                  {item.calories ? (
                    <View style={styles.metaPill}>
                      <Ionicons name="flash-outline" size={14} color="#EA580C" />
                      <Text style={styles.metaPillText}>{item.calories} kcal</Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.priceRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text style={styles.price}>{formatCurrency(item.price)}</Text>
                  <Text style={styles.priceCaption}>prix de base</Text>
                </View>
              </View>
            </View>

            {item.options.map((group) => (
              <View key={group.id} style={styles.optionCard}>
                <View style={[styles.optionHeading, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View>
                    <Text style={[styles.optionTitle, { textAlign: isRTL ? "right" : "left" }]}>{group.name}</Text>
                    <Text style={[styles.optionCaption, { textAlign: isRTL ? "right" : "left" }]}>
                      {group.required ? "Choix obligatoire" : "Choix facultatif"}
                      {group.multiple ? " • plusieurs selections" : " • une selection"}
                    </Text>
                  </View>
                  {group.required ? <Text style={styles.requiredPill}>Requis</Text> : null}
                </View>

                <View style={styles.choiceWrap}>
                  {group.choices.map((choice) => {
                    const active = isSelected(group.id, choice.id);
                    return (
                      <ScalePressable
                        key={choice.id}
                        containerStyle={[styles.choiceChip, active && styles.choiceChipActive]}
                        onPress={() =>
                          toggleChoice(
                            group.id,
                            group.name,
                            group.multiple,
                            choice.id,
                            choice.name,
                            choice.priceDelta
                          )
                        }
                      >
                        <View style={styles.choiceHeader}>
                          <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{choice.name}</Text>
                          <Ionicons
                            name={active ? "checkmark-circle" : "ellipse-outline"}
                            size={18}
                            color={active ? "#EA580C" : "#CBD5E1"}
                          />
                        </View>
                        <Text style={[styles.choiceDelta, active && styles.choiceDeltaActive]}>
                          {choice.priceDelta > 0 ? `+${formatCurrency(choice.priceDelta)}` : "Inclus"}
                        </Text>
                      </ScalePressable>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={styles.optionCard}>
              <View style={[styles.optionHeading, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View>
                  <Text style={[styles.optionTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("instructions")}</Text>
                  <Text style={[styles.optionCaption, { textAlign: isRTL ? "right" : "left" }]}>
                    Precise ce que la cuisine doit savoir avant preparation
                  </Text>
                </View>
              </View>
              <TextInput
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                placeholder={t("no_onions")}
                style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
                multiline
              />
            </View>

            <View style={styles.summaryCard}>
              <View style={[styles.summaryRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View>
                  <Text style={styles.summaryLabel}>Quantite</Text>
                  <Text style={styles.summaryCaption}>Ajuste sans quitter cette fiche</Text>
                </View>
                <QuantityControl
                  quantity={quantity}
                  onDecrease={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  onIncrease={() => setQuantity((prev) => prev + 1)}
                />
              </View>

              <View style={[styles.summaryRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View>
                  <Text style={styles.summaryLabel}>Options choisies</Text>
                  <Text style={styles.summaryCaption}>{selectedOptionsCount} selection{selectedOptionsCount > 1 ? "s" : ""}</Text>
                </View>
                <Text style={styles.totalText}>{formatCurrency(total)}</Text>
              </View>

              <View style={styles.footerRow}>
                <ScalePressable containerStyle={styles.secondaryButton} onPress={onClose}>
                  <Text style={styles.secondaryText}>{t("close")}</Text>
                </ScalePressable>
                <ScalePressable
                  containerStyle={styles.submitButton}
                  onPress={() => onSubmit(item, selectedOptions, quantity, specialInstructions)}
                >
                  <Text style={styles.submitText}>{t("add")} au panier</Text>
                </ScalePressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "92%",
    backgroundColor: "#FFFCF7",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    position: "relative",
  },
  handle: {
    alignSelf: "center",
    marginTop: 10,
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E5DED4",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 18,
    zIndex: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F2E7DA",
  },
  heroContent: {
    padding: 16,
    gap: 10,
  },
  image: { width: "100%", height: 210 },
  restaurantName: { color: "#EA580C", fontWeight: "800", textTransform: "uppercase", fontSize: 12, letterSpacing: 0.8 },
  name: { color: "#111827", fontSize: 25, fontWeight: "800" },
  description: { color: "#64748B", lineHeight: 20 },
  metaRow: {
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFF4E8",
  },
  metaPillText: {
    color: "#7C2D12",
    fontWeight: "700",
    fontSize: 12,
  },
  priceRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: { color: "#16A34A", fontWeight: "800", fontSize: 22 },
  priceCaption: {
    color: "#94A3B8",
    fontWeight: "600",
    fontSize: 12,
  },
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F2E7DA",
  },
  optionHeading: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  optionTitle: { color: "#111827", fontWeight: "800", fontSize: 15 },
  optionCaption: {
    color: "#94A3B8",
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  requiredPill: {
    color: "#EA580C",
    backgroundColor: "#FFF4E8",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "800",
    fontSize: 11,
  },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  choiceChip: {
    backgroundColor: "#FFFDF9",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F2E7DA",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 136,
    gap: 8,
  },
  choiceChipActive: {
    borderColor: "#FDBA74",
    backgroundColor: "#FFF4E8",
  },
  choiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  choiceText: { color: "#111827", fontWeight: "700" },
  choiceTextActive: { color: "#111827" },
  choiceDelta: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  choiceDeltaActive: {
    color: "#EA580C",
  },
  input: {
    minHeight: 74,
    backgroundColor: "#FFFCF7",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E1D6",
    padding: 14,
    textAlignVertical: "top",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#F2E7DA",
  },
  summaryRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 15,
  },
  summaryCaption: {
    color: "#94A3B8",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 3,
  },
  totalText: {
    color: "#16A34A",
    fontWeight: "800",
    fontSize: 22,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#EA580C",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  secondaryButton: {
    minWidth: 110,
    backgroundColor: "#F8F1E7",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  secondaryText: { color: "#6B7280", fontWeight: "800" },
});
