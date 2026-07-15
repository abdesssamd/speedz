import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../api";
import { PrimaryButton } from "../components";
import { useCourier } from "../CourierContext";
import { theme } from "../theme";

type Mode = "login" | "register";

export function AuthScreen() {
  const { login } = useCourier();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Connexion
  const [phone, setPhone] = useState("");

  // Inscription
  const [form, setForm] = useState({
    applicantName: "",
    email: "",
    phone: "",
    city: "",
    vehicle: "",
    zone: "",
  });
  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleLogin = async () => {
    setError(null);
    setNotice(null);
    if (!phone.trim()) {
      setError("Saisissez votre numéro de téléphone.");
      return;
    }
    setLoading(true);
    try {
      await login(phone.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    setNotice(null);
    if (!form.applicantName || !form.email || !form.phone || !form.city || !form.vehicle) {
      setError("Nom, email, téléphone, ville et véhicule sont obligatoires.");
      return;
    }
    setLoading(true);
    try {
      await api.register(form);
      setNotice(
        "Demande envoyée ✅. Un administrateur doit valider votre compte. Vous pourrez vous connecter avec votre téléphone une fois validé."
      );
      setMode("login");
      setPhone(form.phone);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inscription impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>SpeedZ</Text>
        <Text style={styles.subtitle}>Espace Livreur</Text>

        <View style={styles.tabs}>
          <Tab label="Connexion" active={mode === "login"} onPress={() => setMode("login")} />
          <Tab label="Inscription" active={mode === "register"} onPress={() => setMode("register")} />
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {mode === "login" ? (
          <View style={styles.card}>
            <Field
              label="Téléphone"
              value={phone}
              onChangeText={setPhone}
              placeholder="+33 6 12 34 56 78"
              keyboardType="phone-pad"
            />
            <PrimaryButton label="Se connecter" onPress={handleLogin} loading={loading} />
            <Text style={styles.hint}>
              Connectez-vous avec le numéro de téléphone enregistré par l'administrateur.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Field label="Nom complet" value={form.applicantName} onChangeText={(v) => setField("applicantName", v)} placeholder="Prénom Nom" />
            <Field label="Email" value={form.email} onChangeText={(v) => setField("email", v)} placeholder="vous@email.com" keyboardType="email-address" />
            <Field label="Téléphone" value={form.phone} onChangeText={(v) => setField("phone", v)} placeholder="+33 6 12 34 56 78" keyboardType="phone-pad" />
            <Field label="Ville" value={form.city} onChangeText={(v) => setField("city", v)} placeholder="Paris" />
            <Field label="Véhicule" value={form.vehicle} onChangeText={(v) => setField("vehicle", v)} placeholder="Scooter, Vélo, Voiture…" />
            <Field label="Zone (optionnel)" value={form.zone} onChangeText={(v) => setField("zone", v)} placeholder="Paris 9" />
            <PrimaryButton label="Envoyer ma demande" onPress={handleRegister} loading={loading} />
            <Text style={styles.hint}>
              Votre code livreur sera les 6 derniers chiffres de votre téléphone.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      {label}
    </Text>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#94A3B8"
        autoCapitalize="none"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: 24, paddingTop: 72, flexGrow: 1 },
  brand: { color: theme.colors.primary, fontSize: 40, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#CBD5E1", fontSize: 16, textAlign: "center", marginBottom: 24 },
  tabs: { flexDirection: "row", backgroundColor: "#1E293B", borderRadius: 999, padding: 4, marginBottom: 16 },
  tab: { flex: 1, textAlign: "center", color: "#94A3B8", paddingVertical: 10, borderRadius: 999, fontWeight: "700", overflow: "hidden" },
  tabActive: { backgroundColor: theme.colors.primary, color: "#fff" },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 18, gap: 12 },
  field: { gap: 6 },
  fieldLabel: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: "#fff",
  },
  hint: { color: theme.colors.textMuted, fontSize: 12, textAlign: "center" },
  notice: { color: theme.colors.success, backgroundColor: "#DCFCE7", padding: 12, borderRadius: 12, marginBottom: 12 },
  error: { color: theme.colors.danger, backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12, marginBottom: 12 },
});
