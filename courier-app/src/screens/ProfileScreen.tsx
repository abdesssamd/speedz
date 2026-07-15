import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { api } from "../api";
import { Card, PrimaryButton } from "../components";
import { useCourier } from "../CourierContext";
import { theme } from "../theme";
import { Courier, CourierJob, CourierStats } from "../types";

export function ProfileScreen({
  courier,
  stats,
  history,
  onChanged,
}: {
  courier: Courier | null;
  stats?: CourierStats;
  history: CourierJob[];
  onChanged: () => void;
}) {
  const { logout, setCourier } = useCourier();
  const [toggling, setToggling] = useState(false);
  if (!courier) return null;

  const isOnline = courier.status !== "OFFLINE";
  const onDelivery = courier.status === "ON_DELIVERY";

  const toggleOnline = async (value: boolean) => {
    setToggling(true);
    try {
      const payload = await api.setAvailability(value);
      setCourier(payload.courier);
      onChanged();
    } catch {
      // en course : le backend refuse la mise hors ligne
    } finally {
      setToggling(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mon profil</Text>

      {/* Statut en ligne / hors ligne */}
      <Card style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <View style={[styles.dot, { backgroundColor: isOnline ? theme.colors.success : theme.colors.textMuted }]} />
            <View>
              <Text style={styles.statusLabel}>{statusLabel(courier.status)}</Text>
              <Text style={styles.statusHint}>
                {onDelivery
                  ? "Terminez votre course pour changer de statut."
                  : isOnline
                  ? "Vous recevez de nouvelles courses."
                  : "Vous ne recevez pas de courses."}
              </Text>
            </View>
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            disabled={toggling || onDelivery}
            trackColor={{ true: theme.colors.success, false: "#94A3B8" }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      {/* KPI du jour */}
      <View style={styles.kpiRow}>
        <Kpi label="Gains du jour" value={`${(stats?.todayEarnings ?? 0).toFixed(2)} €`} accent={theme.colors.success} />
        <Kpi label="Livraisons du jour" value={String(stats?.todayDeliveries ?? 0)} accent={theme.colors.primary} />
      </View>
      <View style={styles.kpiRow}>
        <Kpi label="Total livraisons" value={String(stats?.totalDeliveries ?? 0)} accent={theme.colors.info} />
        <Kpi label="Gains cumulés" value={`${(stats?.totalEarnings ?? 0).toFixed(2)} €`} accent={theme.colors.text} />
      </View>

      {/* Identité + code livreur */}
      <Card style={styles.card}>
        <Text style={styles.name}>{courier.name}</Text>
        <Text style={styles.vehicle}>{courier.vehicle}{courier.zoneLabel ? ` • ${courier.zoneLabel}` : ""}</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Votre code livreur</Text>
          <Text style={styles.code}>{courier.code}</Text>
          <Text style={styles.codeHint}>
            Partagez ce code à vos clients : ils pourront vous ajouter en favori et vous serez
            prioritaire sur leurs commandes.
          </Text>
        </View>
      </Card>

      {/* Historique des livraisons */}
      <Text style={styles.section}>Commandes livrées</Text>
      {history.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>Aucune livraison pour le moment.</Text>
        </Card>
      ) : (
        history.map((job) => (
          <Card key={job.id} style={styles.deliveryCard}>
            <View style={styles.deliveryTop}>
              <Text style={styles.deliveryResto}>{job.restaurantName}</Text>
              <Text style={styles.deliveryPay}>+{(job.compensation?.total ?? 0).toFixed(2)} €</Text>
            </View>
            <Text style={styles.deliveryAddr} numberOfLines={1}>{job.destinationAddress}</Text>
            <Text style={styles.deliveryDate}>{formatDate(job.createdAt)}</Text>
          </Card>
        ))
      )}

      <PrimaryButton label="Se déconnecter" onPress={logout} tone="danger" />
    </ScrollView>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiValue, { color: accent }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function statusLabel(status: string) {
  return { AVAILABLE: "En ligne (en travail)", ON_DELIVERY: "En course", OFFLINE: "Hors ligne" }[status] || status;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: theme.colors.textLight },
  statusCard: { padding: 14 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusLabel: { fontSize: 15, fontWeight: "800", color: theme.colors.text },
  statusHint: { fontSize: 12, color: theme.colors.textMuted, maxWidth: 220 },
  kpiRow: { flexDirection: "row", gap: 12 },
  kpi: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  kpiValue: { fontSize: 20, fontWeight: "900" },
  kpiLabel: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  card: { gap: 10 },
  name: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
  vehicle: { color: theme.colors.textMuted, fontSize: 14 },
  codeBox: { backgroundColor: theme.colors.background, borderRadius: theme.radius.md, padding: 16, gap: 6 },
  codeLabel: { color: "#CBD5E1", fontSize: 12, fontWeight: "600" },
  code: { color: theme.colors.primary, fontSize: 36, fontWeight: "900", letterSpacing: 6 },
  codeHint: { color: "#94A3B8", fontSize: 12 },
  section: { fontSize: 16, fontWeight: "800", color: theme.colors.textLight, marginTop: 4 },
  deliveryCard: { gap: 4 },
  deliveryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  deliveryResto: { fontSize: 15, fontWeight: "700", color: theme.colors.text, flex: 1 },
  deliveryPay: { fontSize: 15, fontWeight: "800", color: theme.colors.success },
  deliveryAddr: { color: theme.colors.textMuted, fontSize: 13 },
  deliveryDate: { color: theme.colors.textMuted, fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 20 },
  emptyText: { color: theme.colors.textMuted, fontSize: 13 },
});
