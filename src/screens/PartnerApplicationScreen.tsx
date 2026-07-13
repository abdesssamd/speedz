import React, { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { PartnerApplicationInput, PartnerApplicationType } from "../types";

const vehicleOptions = ["Moto", "Voiture", "Velo electrique"];

type Props = {
  route: {
    params?: {
      type?: PartnerApplicationType;
    };
  };
};

const createInitialForm = (type: PartnerApplicationType): PartnerApplicationInput => ({
  type,
  applicantName: "",
  email: "",
  phone: "",
  city: "",
  businessName: "",
  restaurantCategory: "",
  address: "",
  billingPlanType: "FIXED_PER_ORDER",
  billingFixedFee: "",
  billingPercentage: "",
  monthlySubscriptionFee: "",
  vehicle: "",
  zone: "",
  payPerDelivery: "",
  payPerKm: "",
  notes: "",
});

export function PartnerApplicationScreen({ route }: Props) {
  const initialType = route.params?.type ?? "RESTAURANT";
  const { t, isRTL, pushNotification } = useApp();
  const [form, setForm] = useState<PartnerApplicationInput>(createInitialForm(initialType));
  const [submitting, setSubmitting] = useState(false);

  const isRestaurant = form.type === "RESTAURANT";
  const canSubmit = useMemo(() => {
    const baseValid = form.applicantName.trim() && form.email.trim() && form.phone.trim() && form.city.trim();
    // Le plan de facturation (restaurant) et la rémunération (livreur) sont
    // désormais définis par l'administrateur, pas saisis à l'inscription.
    return Boolean(isRestaurant
      ? baseValid && form.businessName?.trim() && form.address?.trim()
      : baseValid && form.vehicle?.trim());
  }, [form, isRestaurant]);

  const setField = <K extends keyof PartnerApplicationInput>(key: K, value: PartnerApplicationInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const switchType = (type: PartnerApplicationType) => {
    setForm((current) => ({ ...createInitialForm(type), applicantName: current.applicantName, email: current.email, phone: current.phone, city: current.city }));
  };

  const submit = async () => {
    if (!canSubmit || submitting) {
      pushNotification({ title: t("application_error"), message: t("application_error_msg"), tone: "error" });
      return;
    }

    setSubmitting(true);
    try {
      // On n'envoie pas les champs commerciaux gérés par l'admin
      // (plan de facturation restaurant, rémunération livreur).
      const {
        billingPlanType: _bpt,
        billingFixedFee: _bff,
        billingPercentage: _bp,
        monthlySubscriptionFee: _msf,
        payPerDelivery: _ppd,
        payPerKm: _ppk,
        ...payload
      } = form;
      await api.submitPartnerApplication(payload);
      pushNotification({
        title: t("application_success"),
        message: t("application_success_msg"),
        tone: "success",
      });
      setForm(createInitialForm(form.type));
    } catch {
      pushNotification({ title: t("application_error"), message: t("application_error_msg"), tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimatedCard style={styles.hero}>
          <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("application_title")}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("application_subtitle")}</Text>
        </AnimatedCard>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("choose_profile")}</Text>
          <View style={styles.choiceRow}>
            <ScalePressable
              containerStyle={[styles.choiceCard, isRestaurant && styles.choiceCardActive]}
              onPress={() => switchType("RESTAURANT")}
            >
              <Text style={[styles.choiceText, isRestaurant && styles.choiceTextActive]}>{t("restaurant_profile")}</Text>
            </ScalePressable>
            <ScalePressable
              containerStyle={[styles.choiceCard, !isRestaurant && styles.choiceCardActive]}
              onPress={() => switchType("COURIER")}
            >
              <Text style={[styles.choiceText, !isRestaurant && styles.choiceTextActive]}>{t("courier_profile")}</Text>
            </ScalePressable>
          </View>
        </View>

        <AnimatedCard style={styles.formCard}>
          <TextInput value={form.applicantName} onChangeText={(value) => setField("applicantName", value)} placeholder={t("applicant_name")} style={[styles.input, { textAlign: isRTL ? "right" : "left" }]} />
          <TextInput value={form.email} onChangeText={(value) => setField("email", value)} placeholder={t("applicant_email")} keyboardType="email-address" autoCapitalize="none" style={[styles.input, { textAlign: isRTL ? "right" : "left" }]} />
          <TextInput value={form.phone} onChangeText={(value) => setField("phone", value)} placeholder={t("applicant_phone")} keyboardType="phone-pad" style={[styles.input, { textAlign: isRTL ? "right" : "left" }]} />
          <TextInput value={form.city} onChangeText={(value) => setField("city", value)} placeholder={t("applicant_city")} style={[styles.input, { textAlign: isRTL ? "right" : "left" }]} />

          {isRestaurant ? (
            <>
              <TextInput value={form.businessName} onChangeText={(value) => setField("businessName", value)} placeholder={t("business_name")} style={[styles.input, { textAlign: isRTL ? "right" : "left" }]} />
              <TextInput value={form.restaurantCategory} onChangeText={(value) => setField("restaurantCategory", value)} placeholder={t("restaurant_category")} style={[styles.input, { textAlign: isRTL ? "right" : "left" }]} />
              <TextInput value={form.address} onChangeText={(value) => setField("address", value)} placeholder={t("applicant_address")} style={[styles.input, { textAlign: isRTL ? "right" : "left" }]} />
            </>
          ) : (
            <>
              <View style={styles.vehicleSection}>
                <Text style={[styles.vehicleLabel, { textAlign: isRTL ? "right" : "left" }]}>{t("courier_vehicle")}</Text>
                <View style={styles.vehicleRow}>
                  {vehicleOptions.map((vehicle) => {
                    const active = form.vehicle === vehicle;
                    return (
                      <ScalePressable
                        key={vehicle}
                        containerStyle={[styles.vehicleChip, active && styles.vehicleChipActive]}
                        onPress={() => setField("vehicle", vehicle)}
                      >
                        <Text style={[styles.vehicleChipText, active && styles.vehicleChipTextActive]}>
                          {vehicle === "Moto" ? t("scooter") : vehicle === "Voiture" ? t("car") : t("ebike")}
                        </Text>
                      </ScalePressable>
                    );
                  })}
                </View>
              </View>
              <TextInput value={form.zone} onChangeText={(value) => setField("zone", value)} placeholder={t("courier_zone")} style={[styles.input, { textAlign: isRTL ? "right" : "left" }]} />
            </>
          )}

          <TextInput
            value={form.notes}
            onChangeText={(value) => setField("notes", value)}
            placeholder={t("application_notes")}
            multiline
            style={[styles.input, styles.notesInput, { textAlign: isRTL ? "right" : "left" }]}
          />

          <ScalePressable containerStyle={[styles.submitButton, (!canSubmit || submitting) && styles.submitButtonDisabled]} onPress={submit}>
            <Text style={styles.submitText}>{t("submit_application")}</Text>
          </ScalePressable>
        </AnimatedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF9F1" },
  content: { padding: 14, gap: 12, paddingBottom: 28 },
  hero: { backgroundColor: "#111827", borderRadius: 24, padding: 16, gap: 6 },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#D1D5DB", lineHeight: 18, fontSize: 13 },
  section: { gap: 8 },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "800" },
  choiceRow: { flexDirection: "row", gap: 10 },
  choiceCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#ECE7E1", padding: 12 },
  choiceCardActive: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  choiceText: { color: "#111827", fontWeight: "800", textAlign: "center", fontSize: 13 },
  choiceTextActive: { color: "#FFFFFF" },
  formCard: { backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#ECE7E1", padding: 14, gap: 10 },
  input: { backgroundColor: "#FFF9F1", borderRadius: 14, borderWidth: 1, borderColor: "#ECE7E1", paddingHorizontal: 12, paddingVertical: 12, color: "#111827", fontSize: 14 },
  vehicleSection: { gap: 6 },
  vehicleLabel: { color: "#111827", fontWeight: "800", fontSize: 13 },
  vehicleRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  vehicleChip: { backgroundColor: "#FFF4E8", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  vehicleChipActive: { backgroundColor: "#EA580C" },
  vehicleChipText: { color: "#9A3412", fontWeight: "700", fontSize: 12 },
  vehicleChipTextActive: { color: "#FFFFFF" },
  notesInput: { minHeight: 90, textAlignVertical: "top" },
  splitInput: { flex: 1 },
  submitButton: { marginTop: 2, backgroundColor: "#111827", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  submitButtonDisabled: { opacity: 0.45 },
  submitText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
});
