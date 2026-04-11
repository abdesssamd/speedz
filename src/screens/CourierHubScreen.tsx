import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { LiveDeliveryMap } from "../components/LiveDeliveryMap";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatDateTime } from "../services/format";
import { api } from "../services/api";
import { CourierDashboard } from "../types";

export function CourierHubScreen() {
  const { currentLocation, language, t, isRTL, pushNotification } = useApp();
  const [courierId, setCourierId] = useState("");
  const [dashboard, setDashboard] = useState<CourierDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const loadJobs = async () => {
    if (!courierId.trim()) {
      pushNotification({ title: t("application_error"), message: t("courier_id"), tone: "error" });
      return;
    }

    setLoading(true);
    try {
      const payload = await api.getCourierJobs({
        courierId: courierId.trim(),
        lat: currentLocation.coordinates.latitude,
        lng: currentLocation.coordinates.longitude,
      });
      setDashboard(payload);
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

  const acceptJob = async (orderId: string) => {
    try {
      await api.acceptCourierJob(orderId, courierId.trim());
      pushNotification({
        title: t("courier_accept"),
        message: "La course a ete affectee au livreur.",
        tone: "success",
      });
      await loadJobs();
    } catch (error) {
      pushNotification({
        title: t("application_error"),
        message: error instanceof Error ? error.message : t("application_error_msg"),
        tone: "error",
      });
    }
  };

  useEffect(() => {
    if (!courierId.trim()) {
      return;
    }

    const intervalId = setInterval(() => {
      loadJobs().catch(() => undefined);

      api
        .updateCourierLocation({
          courierId: courierId.trim(),
          latitude: currentLocation.coordinates.latitude,
          longitude: currentLocation.coordinates.longitude,
        })
        .catch(() => undefined);
    }, 6000);

    return () => clearInterval(intervalId);
  }, [courierId, currentLocation.coordinates.latitude, currentLocation.coordinates.longitude]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimatedCard style={styles.hero}>
          <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>{t("courier_hub")}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>{t("courier_hub_subtitle")}</Text>
        </AnimatedCard>

        <AnimatedCard style={styles.filterCard}>
          <TextInput
            value={courierId}
            onChangeText={setCourierId}
            placeholder={t("courier_id")}
            style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
          />
          <ScalePressable containerStyle={styles.refreshButton} onPress={loadJobs}>
            <Text style={styles.refreshText}>{loading ? "..." : t("courier_refresh")}</Text>
          </ScalePressable>
        </AnimatedCard>

        <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("courier_available_jobs")}</Text>
        {dashboard?.availableJobs.length ? (
          dashboard.availableJobs.map((job, index) => (
            <AnimatedCard key={job.id} delay={Math.min(index * 60, 240)} style={styles.jobCard}>
              <Text style={styles.jobTitle}>{job.restaurantName}</Text>
              <Text style={styles.jobMeta}>{t("courier_pickup")}: {job.pickupAddress}</Text>
              <Text style={styles.jobMeta}>{t("courier_destination")}: {job.destinationAddress}</Text>
              <Text style={styles.jobMeta}>{t("distance")}: {job.deliveryDistanceKm.toFixed(1)} km</Text>
              <Text style={styles.jobGain}>{t("courier_gain")}: {formatCurrency(job.compensation.estimatedTotal)}</Text>
              <ScalePressable containerStyle={styles.acceptButton} onPress={() => acceptJob(job.id)}>
                <Text style={styles.acceptText}>{t("courier_accept")}</Text>
              </ScalePressable>
            </AnimatedCard>
          ))
        ) : (
          <EmptyState title={t("courier_no_jobs")} message={t("courier_no_jobs_msg")} />
        )}

        <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("courier_active_jobs")}</Text>
        {(dashboard?.activeJobs || []).map((job, index) => (
          <AnimatedCard key={job.id} delay={Math.min(index * 60, 240)} style={styles.jobCard}>
            <Text style={styles.jobTitle}>{job.restaurantName}</Text>
            <Text style={styles.jobMeta}>{job.customer?.name} • {job.customer?.phone}</Text>
            <Text style={styles.jobMeta}>{job.customer?.address}</Text>
            <Text style={styles.jobGain}>{t("courier_gain")}: {formatCurrency(job.compensation.estimatedTotal)}</Text>
            {dashboard?.courier.currentLat !== null &&
            dashboard?.courier.currentLat !== undefined &&
            dashboard?.courier.currentLng !== null &&
            dashboard?.courier.currentLng !== undefined &&
            job.pickupCoordinates &&
            job.destinationCoordinates ? (
              <LiveDeliveryMap
                pickup={job.pickupCoordinates}
                destination={job.destinationCoordinates}
                courier={{
                  latitude: dashboard.courier.currentLat,
                  longitude: dashboard.courier.currentLng,
                }}
                title="Position live moto"
                subtitle="La position du livreur est synchronisee avec le back-office et le client."
              />
            ) : null}
          </AnimatedCard>
        ))}

        <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>{t("courier_history")}</Text>
        {(dashboard?.history || []).map((job, index) => (
          <AnimatedCard key={job.id} delay={Math.min(index * 50, 200)} style={styles.jobCard}>
            <Text style={styles.jobTitle}>{job.restaurantName}</Text>
            <Text style={styles.jobMeta}>{formatDateTime(job.createdAt, language)}</Text>
            <Text style={styles.jobGain}>{formatCurrency(job.compensation.estimatedTotal)}</Text>
          </AnimatedCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF9F1" },
  content: { padding: 18, gap: 16, paddingBottom: 48 },
  hero: { backgroundColor: "#111827", borderRadius: 28, padding: 20, gap: 8 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#D1D5DB", lineHeight: 20 },
  filterCard: { backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#ECE7E1", padding: 16, gap: 12 },
  input: { backgroundColor: "#FFF9F1", borderRadius: 16, borderWidth: 1, borderColor: "#ECE7E1", paddingHorizontal: 14, paddingVertical: 14, color: "#111827" },
  refreshButton: { backgroundColor: "#EA580C", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  refreshText: { color: "#FFFFFF", fontWeight: "800" },
  sectionTitle: { color: "#111827", fontSize: 22, fontWeight: "800" },
  jobCard: { backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#ECE7E1", padding: 16, gap: 8 },
  jobTitle: { color: "#111827", fontSize: 18, fontWeight: "800" },
  jobMeta: { color: "#475569", lineHeight: 20 },
  jobGain: { color: "#15803D", fontWeight: "800" },
  acceptButton: { marginTop: 4, backgroundColor: "#111827", borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  acceptText: { color: "#FFFFFF", fontWeight: "800" },
});
