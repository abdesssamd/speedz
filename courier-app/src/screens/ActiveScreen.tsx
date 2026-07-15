import React, { useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { Badge, Card, PrimaryButton } from "../components";
import { STATUS_LABELS, theme } from "../theme";
import { CourierJob } from "../types";

export function ActiveScreen({
  jobs,
  refreshing,
  onRefresh,
  onChanged,
}: {
  jobs: CourierJob[];
  refreshing: boolean;
  onRefresh: () => void;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (id: string, action: () => Promise<unknown>) => {
    setError(null);
    setBusyId(id);
    try {
      await action();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusyId(null);
    }
  };

  const callCustomer = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`).catch(() => undefined);
  };

  const activeJobs = jobs.filter((job) => job.status !== "Delivered" && job.status !== "Cancelled");

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <Text style={styles.title}>Mes courses en cours</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {activeJobs.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>Aucune course en cours. Prenez une course dans l'onglet « Courses ».</Text>
        </Card>
      ) : (
        activeJobs.map((job) => (
          <Card key={job.id} style={styles.job}>
            <View style={styles.jobHeader}>
              <Text style={styles.restaurant}>{job.restaurantName}</Text>
              <Badge label={STATUS_LABELS[job.status] || job.status} color={statusColor(job.status)} />
            </View>
            <Row icon="🏬" text={`Retrait : ${job.pickupAddress}`} />
            <Row icon="📍" text={`Livraison : ${job.destinationAddress}`} />
            {job.customer?.name ? <Row icon="👤" text={job.customer.name} /> : null}

            {/* Étape 1 : confirmer la course prise → déclenche l'impression au restaurant */}
            {job.status === "Accepted" ? (
              <>
                <Text style={styles.note}>
                  Confirmez la commande : le ticket s'imprimera au restaurant. Appelez ensuite le client.
                </Text>
                <PrimaryButton
                  label="Confirmer la commande"
                  onPress={() => run(job.id, () => api.confirmJob(job.id))}
                  loading={busyId === job.id}
                  tone="primary"
                />
              </>
            ) : null}

            {/* Étape 2+ : appeler le client + progression du statut */}
            {job.status !== "Accepted" ? (
              <>
                {job.customer?.phone ? (
                  <PrimaryButton
                    label={`Appeler le client${job.customer?.name ? ` (${job.customer.name})` : ""}`}
                    onPress={() => callCustomer(job.customer?.phone)}
                    tone="neutral"
                  />
                ) : null}
                {job.status === "Confirmed" ? (
                  <PrimaryButton
                    label="Je pars en livraison"
                    onPress={() => run(job.id, () => api.updateJobStatus(job.id, "OnTheWay"))}
                    loading={busyId === job.id}
                    tone="primary"
                  />
                ) : null}
                {job.status === "OnTheWay" ? (
                  <PrimaryButton
                    label="Marquer comme livrée"
                    onPress={() => run(job.id, () => api.updateJobStatus(job.id, "Delivered"))}
                    loading={busyId === job.id}
                    tone="success"
                  />
                ) : null}
              </>
            ) : null}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "Accepted":
      return theme.colors.warning;
    case "Confirmed":
      return theme.colors.info;
    case "OnTheWay":
      return theme.colors.primary;
    default:
      return theme.colors.textMuted;
  }
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
  note: { color: theme.colors.text, fontSize: 13, backgroundColor: theme.colors.cardMuted, padding: 10, borderRadius: 10 },
  empty: { alignItems: "center", paddingVertical: 28 },
  emptyText: { color: theme.colors.textMuted, textAlign: "center", fontSize: 13 },
  error: { color: theme.colors.danger, backgroundColor: "#FEE2E2", padding: 10, borderRadius: 10 },
});
