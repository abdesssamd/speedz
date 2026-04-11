import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { Gender } from "../types";

const brandLogo = require("../../assets/logo.png");

type DraftAddress = {
  id: string;
  label: string;
  address: string;
  coordinates?: { latitude: number; longitude: number };
};

export function AuthOnboardingScreen() {
  const {
    authFlow,
    currentLocation,
    requestLocation,
    beginPhoneAuth,
    verifyPhoneAuth,
    completeRegistration,
    pushNotification,
    isRTL,
  } = useApp();

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<Gender>("UNSPECIFIED");
  const [addressLabel, setAddressLabel] = useState("");
  const [addressValue, setAddressValue] = useState("");
  const [addresses, setAddresses] = useState<DraftAddress[]>([]);

  const canShowProfileStep = authFlow.isVerified;
  const demoCode = authFlow.verificationCode;
  const genderOptions: Array<{ label: string; value: Gender }> = useMemo(
    () => [
      { label: "Femme", value: "FEMALE" },
      { label: "Homme", value: "MALE" },
      { label: "Autre", value: "OTHER" },
    ],
    []
  );

  const otpDigits = useMemo(() => {
    const normalized = verificationCode.padEnd(4, " ").slice(0, 4);
    return normalized.split("");
  }, [verificationCode]);

  const handleStartWhatsapp = () => {
    beginPhoneAuth("WHATSAPP", phoneNumber).then((result) => {
      if (!result.ok && result.error) {
        pushNotification({
          title: "Verification impossible",
          message: result.error,
          tone: "error",
        });
      }
    });
  };

  const handleVerify = () => {
    verifyPhoneAuth(verificationCode);
  };

  const addManualAddress = () => {
    if (!addressLabel.trim() || !addressValue.trim()) {
      pushNotification({
        title: "Adresse incomplete",
        message: "Ajoutez un libelle et une adresse de livraison.",
        tone: "error",
      });
      return;
    }

    setAddresses((current) => [
      ...current,
      {
        id: `draft-address-${Date.now()}`,
        label: addressLabel.trim(),
        address: addressValue.trim(),
      },
    ]);
    setAddressLabel("");
    setAddressValue("");
  };

  const addGpsAddress = async () => {
    await requestLocation();
    setAddresses((current) => [
      ...current,
      {
        id: `draft-address-${Date.now()}`,
        label: "Position GPS",
        address: currentLocation.label,
        coordinates: currentLocation.coordinates,
      },
    ]);
  };

  const submitProfile = async () => {
    const ok = await completeRegistration({
      firstName,
      lastName,
      gender,
      email,
      addresses,
    });

    if (!ok) {
      pushNotification({
        title: "Profil incomplet",
        message: "Renseignez le nom, le prenom et au moins une adresse de livraison.",
        tone: "error",
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={brandLogo} style={styles.brandLogo} resizeMode="contain" />
          <Text style={[styles.heroTitle, { textAlign: isRTL ? "right" : "left" }]}>
            Verification par numero mobile
          </Text>
          <Text style={[styles.heroSubtitle, { textAlign: isRTL ? "right" : "left" }]}>
            Entrez votre numero, recevez un code OTP sur WhatsApp puis finalisez votre profil.
          </Text>
        </View>

        <View style={styles.modeRow}>
          <ScalePressable
            containerStyle={[styles.modeButton, mode === "signup" && styles.modeButtonActive]}
            onPress={() => setMode("signup")}
          >
            <Text style={[styles.modeText, mode === "signup" && styles.modeTextActive]}>Creer un compte</Text>
          </ScalePressable>
          <ScalePressable
            containerStyle={[styles.modeButton, mode === "login" && styles.modeButtonActive]}
            onPress={() => setMode("login")}
          >
            <Text style={[styles.modeText, mode === "login" && styles.modeTextActive]}>Se reconnecter</Text>
          </ScalePressable>
        </View>

        <View style={styles.sheet}>
          <Text style={[styles.stepLabel, { textAlign: isRTL ? "right" : "left" }]}>Etape 1</Text>
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>Numero de telephone</Text>
          <Text style={[styles.sectionSubtitle, { textAlign: isRTL ? "right" : "left" }]}>
            Utilisez un numero WhatsApp actif pour recevoir votre code de verification.
          </Text>

          <View style={styles.phoneInputWrap}>
            <View style={styles.countryChip}>
              <Text style={styles.countryChipText}>+213</Text>
            </View>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="06 00 00 00 00"
              keyboardType="phone-pad"
              style={[styles.phoneInput, { textAlign: isRTL ? "right" : "left" }]}
            />
          </View>

          <ScalePressable containerStyle={styles.primaryButton} onPress={handleStartWhatsapp}>
            <Text style={styles.primaryButtonText}>Envoyer le code WhatsApp</Text>
          </ScalePressable>

          <View style={styles.inlineInfoCard}>
            <Ionicons name="information-circle-outline" size={18} color="#F97316" />
            <Text style={styles.inlineInfoText}>
              {demoCode ? `Code demo: ${demoCode}` : "Le SMS sera ajoute plus tard. WhatsApp reste le canal principal."}
            </Text>
          </View>
        </View>

        <View style={styles.sheet}>
          <Text style={[styles.stepLabel, { textAlign: isRTL ? "right" : "left" }]}>Etape 2</Text>
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>Code OTP</Text>
          <Text style={[styles.sectionSubtitle, { textAlign: isRTL ? "right" : "left" }]}>
            Entrez le code recu sur WhatsApp pour confirmer votre numero.
          </Text>

          <View style={styles.otpRow}>
            {otpDigits.map((digit, index) => (
              <View key={`${digit}-${index}`} style={styles.otpBox}>
                <Text style={styles.otpText}>{digit.trim() || "•"}</Text>
              </View>
            ))}
          </View>

          <TextInput
            value={verificationCode}
            onChangeText={(value) => setVerificationCode(value.replace(/\D/g, "").slice(0, 4))}
            placeholder="0000"
            keyboardType="number-pad"
            style={[styles.hiddenOtpInput, { textAlign: isRTL ? "right" : "left" }]}
            maxLength={4}
          />

          <ScalePressable containerStyle={styles.primaryButton} onPress={handleVerify}>
            <Text style={styles.primaryButtonText}>Verifier mon numero</Text>
          </ScalePressable>
        </View>

        {canShowProfileStep ? (
          <>
            <View style={styles.sheet}>
              <Text style={[styles.stepLabel, { textAlign: isRTL ? "right" : "left" }]}>Etape 3</Text>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>
                {mode === "login" ? "Completer votre profil" : "Informations personnelles"}
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Prenom"
                  style={[styles.textInput, styles.halfInput, { textAlign: isRTL ? "right" : "left" }]}
                />
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Nom"
                  style={[styles.textInput, styles.halfInput, { textAlign: isRTL ? "right" : "left" }]}
                />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email facultatif"
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.textInput, { textAlign: isRTL ? "right" : "left" }]}
              />

              <View style={styles.genderRow}>
                {genderOptions.map((option) => (
                  <ScalePressable
                    key={option.value}
                    containerStyle={[styles.genderChip, gender === option.value && styles.genderChipActive]}
                    onPress={() => setGender(option.value)}
                  >
                    <Text style={[styles.genderChipText, gender === option.value && styles.genderChipTextActive]}>
                      {option.label}
                    </Text>
                  </ScalePressable>
                ))}
              </View>
            </View>

            <View style={styles.sheet}>
              <Text style={[styles.stepLabel, { textAlign: isRTL ? "right" : "left" }]}>Etape 4</Text>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>Adresse de livraison</Text>
              <TextInput
                value={addressLabel}
                onChangeText={setAddressLabel}
                placeholder="Ex: Maison, Travail"
                style={[styles.textInput, { textAlign: isRTL ? "right" : "left" }]}
              />
              <TextInput
                value={addressValue}
                onChangeText={setAddressValue}
                placeholder="Adresse complete"
                style={[styles.textInput, styles.multilineInput, { textAlign: isRTL ? "right" : "left" }]}
                multiline
              />

              <View style={styles.addressActions}>
                <ScalePressable containerStyle={styles.primaryButtonSlim} onPress={addManualAddress}>
                  <Text style={styles.primaryButtonText}>Ajouter l&apos;adresse</Text>
                </ScalePressable>
                <ScalePressable containerStyle={styles.secondaryButtonSlim} onPress={addGpsAddress}>
                  <Ionicons name="locate-outline" size={16} color="#F97316" />
                  <Text style={styles.secondaryButtonText}>Utiliser ma position</Text>
                </ScalePressable>
              </View>

              {addresses.map((item) => (
                <View key={item.id} style={styles.addressCard}>
                  <View style={styles.addressIconWrap}>
                    <Ionicons name="location" size={18} color="#F97316" />
                  </View>
                  <View style={styles.addressBody}>
                    <Text style={styles.addressLabel}>{item.label}</Text>
                    <Text style={styles.addressText}>{item.address}</Text>
                  </View>
                </View>
              ))}
            </View>

            <ScalePressable containerStyle={styles.submitButton} onPress={submitProfile}>
              <Text style={styles.submitButtonText}>Terminer et entrer dans l&apos;app</Text>
            </ScalePressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF8F2" },
  content: { padding: 18, gap: 16, paddingBottom: 38 },
  hero: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F2E8DD",
  },
  brandLogo: {
    width: 96,
    height: 96,
  },
  heroTitle: { color: "#111827", fontSize: 28, fontWeight: "800", lineHeight: 34 },
  heroSubtitle: { color: "#6B7280", lineHeight: 21 },
  modeRow: { flexDirection: "row", gap: 10 },
  modeButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0E4D7",
  },
  modeButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  modeText: { color: "#111827", fontWeight: "800" },
  modeTextActive: { color: "#FFFFFF" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: "#F2E8DD",
  },
  stepLabel: {
    color: "#F97316",
    fontWeight: "800",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1.2,
  },
  sectionTitle: { color: "#111827", fontSize: 24, fontWeight: "800" },
  sectionSubtitle: { color: "#6B7280", lineHeight: 21 },
  phoneInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countryChip: {
    minWidth: 76,
    paddingHorizontal: 14,
    paddingVertical: 17,
    borderRadius: 18,
    backgroundColor: "#FFF4ED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F8D7BE",
  },
  countryChipText: {
    color: "#C2410C",
    fontWeight: "800",
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 17,
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: "#F97316",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  inlineInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF4ED",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inlineInfoText: {
    flex: 1,
    color: "#9A3412",
    lineHeight: 19,
    fontWeight: "600",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  otpBox: {
    flex: 1,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFDFC",
    alignItems: "center",
    justifyContent: "center",
  },
  otpText: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800",
  },
  hiddenOtpInput: {
    backgroundColor: "#FFF4ED",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F8D7BE",
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#111827",
    fontSize: 18,
    letterSpacing: 8,
  },
  inputRow: { flexDirection: "row", gap: 10 },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: "#111827",
  },
  halfInput: { flex: 1 },
  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  genderChip: {
    backgroundColor: "#FFF4ED",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  genderChipActive: {
    backgroundColor: "#F97316",
  },
  genderChipText: {
    color: "#C2410C",
    fontWeight: "800",
  },
  genderChipTextActive: {
    color: "#FFFFFF",
  },
  multilineInput: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  addressActions: {
    gap: 10,
  },
  primaryButtonSlim: {
    backgroundColor: "#F97316",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonSlim: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF4ED",
    borderRadius: 16,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: "#F97316",
    fontWeight: "800",
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: "#F2E8DD",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FFFCF9",
  },
  addressIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  addressBody: { flex: 1, gap: 4 },
  addressLabel: { color: "#111827", fontWeight: "800" },
  addressText: { color: "#6B7280", lineHeight: 19 },
  submitButton: {
    backgroundColor: "#111827",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
});
