import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { CourierAdBanner } from "../AdViews";
import { api } from "../api";
import { Badge, Card, PrimaryButton } from "../components";
import { formatCurrency } from "../format";
import { stopRingtone } from "../ringtone";
import { theme } from "../theme";
import { CourierJob } from "../types";

export function JobsScreen({
  jobs,
  refreshing,
  onRefresh,
  onChanged,
  offline = false,
}: {
  jobs: CourierJob[];
  refreshing: boolean;
  onRefresh: () => void;
  onChanged: () => void;
  offline?: boolean;
}) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [goingOnline, setGoingOnline] = useState(false);

  const goOnline = async () => {
    setError(null);
    setGoingOnline(true);
    try {
      await api.setAvailability(true);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de passer en ligne.");
    } finally {
      setGoingOnline(false);
    }
  };

  const accept = async (job: CourierJob) => {
    stopRingtone(); // le livreur a réagi : plus besoin de sonner
    setError(null);
    setAcceptingId(job.id);
    try {
      await api.acceptJob(job.id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de prendre la course.");
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <CourierAdBanner />
      <Text style={styles.title}>Courses disponibles</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {offline ? (
        /* Hors ligne : c'est la raison n°1 de ne voir aucune course — on le dit
           clairement au lieu d'afficher « aucune course ». */
        <Card style={styles.empty}>
          <Text style={styles.offlineIcon}>🌙</Text>
          <Text style={styles.emptyTitle}>Vous êtes hors ligne</Text>
          <Text style={styles.emptyText}>
            Passez en ligne pour recevoir les nouvelles courses près de vous.
          </Text>
          <View style={{ alignSelf: "stretch", marginTop: 12 }}>
            <PrimaryButton label="Passer en ligne" onPress={goOnline} loading={goingOnline} tone="success" />
          </View>
        </Card>
      ) : jobs.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucune course pour le moment</Text>
          <Text style={styles.emptyText}>
            Tirez vers le bas pour rafraîchir. Vous serez notifié dès qu'une commande arrive.
          </Text>
        </Card>
      ) : (
        jobs.map((job) => (
          <Card key={job.id} style={styles.job}>
            <View style={styles.jobHeader}>
              <Text style={styles.restaurant}>{job.restaurantName}</Text>
              {/* Champs défensifs : un backend plus ancien peut ne pas renvoyer compensation. */}
              {job.compensation?.total != null ? (
                <Badge label={formatCurrency(job.compensation.total)} color={theme.colors.success} />
              ) : null}
            </View>
            <Row icon="📦" text={`${job.itemsCount ?? 0} article(s) • ${formatCurrency(job.total)}`} />
            <Row icon="🏬" text={`Retrait : ${job.pickupAddress ?? "—"}`} />
            <Row icon="📍" text={`Livraison : ${job.destinationAddress ?? "—"}`} />
            <Row
              icon="🛵"
              text={`${(job.deliveryDistanceKm ?? 0).toFixed(1)} km${
                job.pickupDistanceKm != null ? ` • ${job.pickupDistanceKm.toFixed(1)} km de vous` : ""
              }`}
            />
            <PrimaryButton
              label="Prendre la course"
              onPress={() => accept(job)}
              loading={acceptingId === job.id}
            />
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function Row({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: theme.colors.textLight, marginBottom: 2 },
  job: { gap: 8 },
  jobHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  restaurant: { fontSize: 17, fontWeight: "800", color: theme.colors.text, flex: 1 },
  row: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  rowIcon: { fontSize: 15 },
  rowText: { flex: 1, color: theme.colors.textMuted, fontSize: 14 },
  empty: { alignItems: "center", gap: 6, paddingVertical: 28 },
  offlineIcon: { fontSize: 34, marginBottom: 2 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.text },
  emptyText: { color: theme.colors.textMuted, textAlign: "center", fontSize: 13 },
  error: { color: theme.colors.danger, backgroundColor: "#FEE2E2", padding: 10, borderRadius: 10 },
});
