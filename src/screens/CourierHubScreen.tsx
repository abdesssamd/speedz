import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { LiveDeliveryMap } from "../components/LiveDeliveryMap";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { formatCurrency, formatDateTime } from "../services/format";
import { CourierDashboard } from "../types";

export function CourierHubScreen() {
  const { currentLocation, language, t, isRTL, pushNotification } = useApp();
  const [courierId, setCourierId] = useState("");
  const [dashboard, setDashboard] = useState<CourierDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const loadJobs = async () => {
    if (!courierId.trim()) { pushNotification({ title: t("application_error"), message: t("courier_id"), tone: "error" }); return; }
    setLoading(true);
    try {
      const payload = await api.getCourierJobs({ courierId: courierId.trim(), lat: currentLocation.coordinates.latitude, lng: currentLocation.coordinates.longitude });
      setDashboard(payload);
    } catch (error) {
      pushNotification({ title: t("application_error"), message: error instanceof Error ? error.message : t("application_error_msg"), tone: "error" });
    } finally { setLoading(false); }
  };

  const acceptJob = async (orderId: string) => {
    try {
      await api.acceptCourierJob(orderId, courierId.trim());
      pushNotification({ title: t("courier_accept"), message: "Course affectée avec succès.", tone: "success" });
      await loadJobs();
    } catch (error) {
      pushNotification({ title: t("application_error"), message: error instanceof Error ? error.message : t("application_error_msg"), tone: "error" });
    }
  };

  useEffect(() => {
    if (!courierId.trim()) return;
    const id = setInterval(() => {
      loadJobs().catch(() => {});
      api.updateCourierLocation({ courierId: courierId.trim(), latitude: currentLocation.coordinates.latitude, longitude: currentLocation.coordinates.longitude }).catch(() => {});
    }, 6000);
    return () => clearInterval(id);
  }, [courierId, currentLocation.coordinates.latitude, currentLocation.coordinates.longitude]);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerIconWrap}><Ionicons name="bicycle" size={26} color="#FF7622" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.pageTitle}>{t("courier_hub")}</Text>
            <Text style={s.pageSubtitle}>{t("courier_hub_subtitle")}</Text>
          </View>
        </View>

        {/* Login card */}
        <View style={s.loginCard}>
          <Text style={s.loginLabel}>Identifiant livreur</Text>
          <View style={[s.inputWrap, focused && s.inputFocused]}>
            <Ionicons name="id-card-outline" size={18} color={focused ? "#FF7622" : "#A0A5BA"} />
            <TextInput value={courierId} onChangeText={setCourierId} placeholder={t("courier_id")}
              placeholderTextColor="#C4C4C4" style={[s.input, { textAlign: isRTL ? "right" : "left" }]}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
          </View>
          <ScalePressable containerStyle={[s.refreshBtn, loading && s.btnDisabled]} onPress={loadJobs} disabled={loading}>
            <Ionicons name={loading ? "hourglass-outline" : "refresh-outline"} size={16} color="#FFF" />
            <Text style={s.refreshBtnText}>{loading ? "Chargement…" : t("courier_refresh")}</Text>
          </ScalePressable>
        </View>

        {/* Available jobs */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{t("courier_available_jobs")}</Text>
          {dashboard?.availableJobs.length ? (
            <View style={s.countPill}><Text style={s.countPillText}>{dashboard.availableJobs.length}</Text></View>
          ) : null}
        </View>
        {dashboard?.availableJobs.length ? dashboard.availableJobs.map((job, index) => (
          <AnimatedCard key={job.id} delay={Math.min(index * 60, 240)} style={s.jobCard}>
            <View style={s.jobCardHeader}>
              <View style={s.jobAvailableBadge}><Text style={s.jobAvailableText}>Disponible</Text></View>
              <Text style={s.jobRestaurant}>{job.restaurantName}</Text>
            </View>
            {[
              { icon: "storefront-outline" as const, label: t("courier_pickup"), val: job.pickupAddress },
              { icon: "flag-outline" as const, label: t("courier_destination"), val: job.destinationAddress },
              { icon: "map-outline" as const, label: t("distance"), val: `${job.deliveryDistanceKm.toFixed(1)} km` },
            ].map((row) => (
              <View key={row.label} style={s.jobInfoRow}>
                <Ionicons name={row.icon} size={13} color="#898989" />
                <Text style={s.jobInfoLabel}>{row.label}:</Text>
                <Text style={s.jobInfoVal} numberOfLines={1}>{row.val}</Text>
              </View>
            ))}
            <View style={s.jobFooter}>
              <View>
                <Text style={s.gainLabel}>Gain estimé</Text>
                <Text style={s.gainVal}>{formatCurrency(job.compensation.estimatedTotal)}</Text>
              </View>
              <ScalePressable containerStyle={s.acceptBtn} onPress={() => acceptJob(job.id)}>
                <Text style={s.acceptBtnText}>{t("courier_accept")}</Text>
                <Ionicons name="checkmark" size={14} color="#FFF" />
              </ScalePressable>
            </View>
          </AnimatedCard>
        )) : <EmptyState title={t("courier_no_jobs")} message={t("courier_no_jobs_msg")} />}

        {/* Active jobs */}
        {(dashboard?.activeJobs || []).length > 0 && (
          <>
            <Text style={s.sectionTitle}>{t("courier_active_jobs")}</Text>
            {(dashboard?.activeJobs || []).map((job, index) => (
              <AnimatedCard key={job.id} delay={Math.min(index * 60, 240)} style={s.jobCard}>
                <View style={s.jobActiveBadge}><Text style={s.jobActiveText}>En cours</Text></View>
                <Text style={s.jobRestaurant}>{job.restaurantName}</Text>
                <Text style={s.jobInfoVal}>{job.customer?.name} · {job.customer?.phone}</Text>
                <Text style={s.gainVal}>{formatCurrency(job.compensation.estimatedTotal)}</Text>
                {dashboard?.courier.currentLat != null && dashboard?.courier.currentLng != null && job.pickupCoordinates && job.destinationCoordinates && (
                  <LiveDeliveryMap pickup={job.pickupCoordinates} destination={job.destinationCoordinates}
                    courier={{ latitude: dashboard.courier.currentLat, longitude: dashboard.courier.currentLng }}
                    title="Position live" subtitle="Synchronisée en temps réel." />
                )}
              </AnimatedCard>
            ))}
          </>
        )}

        {/* History */}
        {(dashboard?.history || []).length > 0 && (
          <>
            <Text style={s.sectionTitle}>{t("courier_history")}</Text>
            {(dashboard?.history || []).map((job, index) => (
              <AnimatedCard key={job.id} delay={Math.min(index * 50, 200)} style={s.histCard}>
                <View style={s.histLeft}>
                  <Text style={s.histName}>{job.restaurantName}</Text>
                  <Text style={s.histDate}>{formatDateTime(job.createdAt, language)}</Text>
                </View>
                <Text style={s.histGain}>{formatCurrency(job.compensation.estimatedTotal)}</Text>
              </AnimatedCard>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 16, gap: 14, paddingBottom: 44 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center", shadowColor: "#FF7622", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  pageTitle: { color: "#181C2E", fontSize: 22, fontWeight: "900" },
  pageSubtitle: { color: "#898989", fontSize: 12, lineHeight: 18 },

  loginCard: { backgroundColor: "#FFF", borderRadius: 22, padding: 16, gap: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  loginLabel: { color: "#181C2E", fontWeight: "800", fontSize: 13 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#EFEFEF", backgroundColor: "#FAFAFA", paddingHorizontal: 12 },
  inputFocused: { borderColor: "#FF7622", backgroundColor: "#FFF9F5" },
  input: { flex: 1, color: "#181C2E", fontSize: 13, paddingVertical: 3 },
  refreshBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FF7622", borderRadius: 14, paddingVertical: 13, shadowColor: "#FF7622", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  btnDisabled: { opacity: 0.6 },
  refreshBtnText: { color: "#FFF", fontWeight: "900", fontSize: 13 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { color: "#181C2E", fontSize: 18, fontWeight: "900", flex: 1 },
  countPill: { backgroundColor: "#FF7622", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  countPillText: { color: "#FFF", fontWeight: "900", fontSize: 12 },

  jobCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 14, gap: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  jobCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  jobAvailableBadge: { backgroundColor: "#DCFCE7", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#BBF7D0" },
  jobAvailableText: { color: "#16A34A", fontWeight: "800", fontSize: 10 },
  jobActiveBadge: { alignSelf: "flex-start", backgroundColor: "#FFF3EC", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#FFD5B8" },
  jobActiveText: { color: "#FF7622", fontWeight: "800", fontSize: 10 },
  jobRestaurant: { color: "#181C2E", fontSize: 15, fontWeight: "900", flex: 1 },
  jobInfoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  jobInfoLabel: { color: "#898989", fontSize: 11, fontWeight: "700" },
  jobInfoVal: { flex: 1, color: "#181C2E", fontSize: 12, fontWeight: "600" },
  jobFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  gainLabel: { color: "#898989", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  gainVal: { color: "#22C55E", fontWeight: "900", fontSize: 18, marginTop: 2 },
  acceptBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#181C2E", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, minWidth: 100 },
  acceptBtnText: { color: "#FFF", fontWeight: "800", fontSize: 12 },

  histCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFF", borderRadius: 16, padding: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  histLeft: { gap: 3 },
  histName: { color: "#181C2E", fontWeight: "800", fontSize: 13 },
  histDate: { color: "#898989", fontSize: 11 },
  histGain: { color: "#22C55E", fontWeight: "900", fontSize: 15 },
});
