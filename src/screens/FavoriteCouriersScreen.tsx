import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { PublicCourier } from "../types";

export function FavoriteCouriersScreen() {
  const { t, isRTL, pushNotification } = useApp();
  const [code, setCode] = useState("");
  const [favorites, setFavorites] = useState<PublicCourier[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [results, setResults] = useState<PublicCourier[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const loadFavorites = async () => {
    try {
      const payload = await api.getFavoriteCouriers();
      setFavorites(payload.couriers);
      setFavoriteIds(payload.favoriteCourierIds);
    } catch (error) {
      pushNotification({
        title: t("application_error"),
        message: error instanceof Error ? error.message : t("application_error_msg"),
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async () => {
    const digits = code.replace(/\D/g, "");
    if (digits.length < 4) {
      pushNotification({ title: t("application_error"), message: t("favorite_couriers_code_hint"), tone: "error" });
      return;
    }
    setSearching(true);
    try {
      const payload = await api.searchCouriers(digits);
      setResults(payload.couriers);
    } catch (error) {
      pushNotification({
        title: t("application_error"),
        message: error instanceof Error ? error.message : t("application_error_msg"),
        tone: "error",
      });
    } finally {
      setSearching(false);
    }
  };

  const toggle = async (courier: PublicCourier) => {
    try {
      const payload = await api.toggleFavoriteCourier(courier.id);
      setFavoriteIds(payload.favoriteCourierIds);
      pushNotification({
        title: payload.isFavorite ? t("favorite_courier_added") : t("favorite_courier_removed"),
        message: courier.name,
        tone: payload.isFavorite ? "success" : "info",
      });
      await loadFavorites();
    } catch (error) {
      pushNotification({
        title: t("application_error"),
        message: error instanceof Error ? error.message : t("application_error_msg"),
        tone: "error",
      });
    }
  };

  const renderCourier = (courier: PublicCourier, index: number) => {
    const isFav = favoriteIds.includes(courier.id);
    return (
      <AnimatedCard key={courier.id} delay={Math.min(index * 70, 180)} style={s.courierCard}>
        <View style={s.courierIcon}>
          <Ionicons name="bicycle" size={20} color="#0F766E" />
        </View>
        <View style={s.courierBody}>
          <Text style={[s.courierName, { textAlign: isRTL ? "right" : "left" }]}>{courier.name}</Text>
          <Text style={[s.courierMeta, { textAlign: isRTL ? "right" : "left" }]}>
            #{courier.code} • {courier.vehicle}{courier.zoneLabel ? ` • ${courier.zoneLabel}` : ""}
          </Text>
        </View>
        <ScalePressable containerStyle={[s.favBtn, isFav && s.favBtnActive]} onPress={() => toggle(courier)}>
          <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? "#FFF" : "#EF4444"} />
        </ScalePressable>
      </AnimatedCard>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.pageTitle}>{t("favorite_couriers")}</Text>
        <Text style={s.pageSubtitle}>{t("favorite_couriers_subtitle")}</Text>

        <View style={s.searchRow}>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder={t("favorite_couriers_search_placeholder")}
            keyboardType="number-pad"
            maxLength={10}
            style={[s.input, { textAlign: isRTL ? "right" : "left" }]}
          />
          <ScalePressable containerStyle={s.searchBtn} onPress={search}>
            {searching ? <ActivityIndicator color="#FFF" /> : <Ionicons name="search" size={18} color="#FFF" />}
          </ScalePressable>
        </View>

        {results !== null && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t("favorite_couriers_results")}</Text>
            {results.length === 0 ? (
              <Text style={s.emptyText}>{t("favorite_couriers_no_result")}</Text>
            ) : (
              results.map(renderCourier)
            )}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("favorite_couriers_mine")}</Text>
          {loading ? (
            <ActivityIndicator color="#FF7622" style={{ marginTop: 12 }} />
          ) : favorites.length === 0 ? (
            <View style={s.emptyCard}>
              <View style={s.emptyIcon}><Ionicons name="heart-outline" size={30} color="#FF7622" /></View>
              <Text style={s.emptyTitle}>{t("favorite_couriers_empty_title")}</Text>
              <Text style={s.emptyText}>{t("favorite_couriers_empty_text")}</Text>
            </View>
          ) : (
            favorites.map(renderCourier)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF9F1" },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: "800", color: "#111827" },
  pageSubtitle: { fontSize: 13, color: "#6B7280", marginTop: -6 },
  searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#111827",
    fontSize: 15,
  },
  searchBtn: { backgroundColor: "#0F766E", borderRadius: 14, width: 50, height: 48, alignItems: "center", justifyContent: "center" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  courierCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#ECE7E1", padding: 12 },
  courierIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#CCFBF1", alignItems: "center", justifyContent: "center" },
  courierBody: { flex: 1, gap: 2 },
  courierName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  courierMeta: { fontSize: 12, color: "#6B7280" },
  favBtn: { width: 40, height: 40, borderRadius: 999, borderWidth: 1, borderColor: "#FECACA", alignItems: "center", justifyContent: "center" },
  favBtnActive: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
  emptyCard: { alignItems: "center", gap: 6, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#ECE7E1", padding: 22 },
  emptyIcon: { width: 56, height: 56, borderRadius: 999, backgroundColor: "#FFF1E8", alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  emptyText: { fontSize: 13, color: "#6B7280", textAlign: "center" },
});
