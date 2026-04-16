import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "AuthOnboarding">;

type CountryOption = {
  code: string;
  flag: string;
  label: string;
};

const countryOptions: CountryOption[] = [
  { code: "+213", flag: "DZ", label: "Algérie" },
  { code: "+33", flag: "FR", label: "France" },
  { code: "+216", flag: "TN", label: "Tunisie" },
  { code: "+212", flag: "MA", label: "Maroc" },
];

export function AuthOnboardingScreen({ navigation }: Props) {
  const { authFlow, requestEmailAuthCode, verifyEmailAuthCode } = useApp();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [focusedField, setFocusedField] = useState<"fullName" | "phoneNumber" | "email" | "otpCode" | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(countryOptions[0]);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [otpVisible, setOtpVisible] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    otpCode?: string;
  }>({});

  const otpDigits = useMemo(() => otpCode.padEnd(6, " ").slice(0, 6).split(""), [otpCode]);

  const validateForm = () => {
    const nextErrors: typeof errors = {};

    if (fullName.trim().length < 4 || !fullName.trim().includes(" ")) {
      nextErrors.fullName = "Entrez votre nom et prénom.";
    }

    if (phoneNumber.replace(/\D/g, "").length < 9) {
      nextErrors.phoneNumber = "Entrez un numéro de téléphone valide.";
    }

    if (!/^[^\s@]+@gmail\.com$/i.test(email.trim())) {
      nextErrors.email = "Utilisez une adresse Gmail valide.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    const result = await requestEmailAuthCode({
      email,
      fullName,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setErrors((current) => ({ ...current, email: result.error || "Envoi email impossible." }));
      return;
    }

    setErrors((current) => ({ ...current, otpCode: undefined }));
    setOtpCode("");
    setOtpVisible(true);
  };

  const handleOtpSubmit = async () => {
    if (otpCode.length !== 6) {
      setErrors((current) => ({ ...current, otpCode: "Entrez le code OTP à 6 chiffres." }));
      return;
    }

    if (!authFlow.challengeId) {
      setErrors((current) => ({ ...current, otpCode: "Aucune demande OTP active. Recommencez." }));
      return;
    }

    setIsVerifying(true);
    const ok = await verifyEmailAuthCode({
      challengeId: authFlow.challengeId,
      code: otpCode,
      email,
      fullName,
      phone: `${selectedCountry.code}${phoneNumber.replace(/\D/g, "")}`,
    });
    setIsVerifying(false);

    if (ok) {
      setOtpVisible(false);
      navigation.replace("MainTabs");
    }
  };

  const renderInput = ({
    icon,
    label,
    placeholder,
    value,
    onChangeText,
    keyboardType,
    autoCapitalize,
    error,
    leftAccessory,
    fieldName,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (value: string) => void;
    keyboardType?: "default" | "email-address" | "phone-pad";
    autoCapitalize?: "none" | "words";
    error?: string;
    leftAccessory?: React.ReactNode;
    fieldName: "fullName" | "phoneNumber" | "email";
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          focusedField === fieldName ? styles.inputShellFocused : null,
          error ? styles.inputShellError : null,
        ]}
      >
        <View style={[styles.iconWrap, focusedField === fieldName ? styles.iconWrapFocused : null]}>
          <Ionicons name={icon} size={18} color={focusedField === fieldName ? "#F97316" : "#94A3B8"} />
        </View>
        {leftAccessory}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => setFocusedField(fieldName)}
          onBlur={() => setFocusedField((current) => (current === fieldName ? null : current))}
          style={styles.input}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient colors={["#111827", "#1F2937", "#EA580C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.logoOrb}>
                <Ionicons name="flash-outline" size={22} color="#111827" />
              </View>
              <View style={styles.brandBlock}>
                <Text style={styles.heroBadgeText}>Speedz</Text>
                <Text style={styles.brandCaption}>Express delivery</Text>
              </View>
            </View>
            <View style={styles.heroHeadingBlock}>
              <Text style={styles.heroEyebrow}>Livraison fluide, inscription rapide</Text>
              <Text style={styles.heroTitle}>Inscription et connexion</Text>
            </View>
            <Text style={styles.heroSubtitle}>
              Connectez-vous avec le même univers visuel que les écrans commande et dashboard, plus premium et plus cohérent.
            </Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>22 min</Text>
                <Text style={styles.heroStatLabel}>Moyenne</Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>Live</Text>
                <Text style={styles.heroStatLabel}>Tracking</Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatValue}>DZ</Text>
                <Text style={styles.heroStatLabel}>Zone</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.formCard}>
            {renderInput({
              icon: "person-outline",
              label: "Nom et prénom",
              placeholder: "Ex: Lina Benali",
              value: fullName,
              onChangeText: setFullName,
              autoCapitalize: "words",
              error: errors.fullName,
              fieldName: "fullName",
            })}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Numéro de téléphone</Text>
              <View
                style={[
                  styles.inputShell,
                  styles.phoneShell,
                  focusedField === "phoneNumber" ? styles.inputShellFocused : null,
                  errors.phoneNumber ? styles.inputShellError : null,
                ]}
              >
                <View style={[styles.iconWrap, focusedField === "phoneNumber" ? styles.iconWrapFocused : null]}>
                  <Ionicons name="call-outline" size={18} color="#F97316" />
                </View>
                <Pressable style={styles.countrySelector} onPress={() => setCountryPickerVisible(true)}>
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCode}>{selectedCountry.code}</Text>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </Pressable>
                <TextInput
                  value={phoneNumber}
                  onChangeText={(value) => setPhoneNumber(value.replace(/[^\d\s-]/g, ""))}
                  placeholder="0555 12 34 56"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  onFocus={() => setFocusedField("phoneNumber")}
                  onBlur={() => setFocusedField((current) => (current === "phoneNumber" ? null : current))}
                  style={styles.input}
                />
              </View>
              {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}
            </View>

            {renderInput({
              icon: "mail-outline",
              label: "Email Gmail",
              placeholder: "exemple@gmail.com",
              value: email,
              onChangeText: setEmail,
              keyboardType: "email-address",
              autoCapitalize: "none",
              error: errors.email,
              fieldName: "email",
            })}

            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed ? styles.primaryButtonPressed : null, isSubmitting ? styles.buttonDisabled : null]}
              onPress={() => void handleNext()}
              disabled={isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Suivant</Text>}
            </Pressable>
          </View>
        </ScrollView>

        <Modal
          animationType="slide"
          transparent
          visible={countryPickerVisible}
          onRequestClose={() => setCountryPickerVisible(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setCountryPickerVisible(false)}>
            <Pressable style={styles.sheet} onPress={() => null}>
              <Text style={styles.sheetTitle}>Choisir un pays</Text>
              {countryOptions.map((country) => (
                <Pressable
                  key={`${country.flag}-${country.code}`}
                  style={styles.countryRow}
                  onPress={() => {
                    setSelectedCountry(country);
                    setCountryPickerVisible(false);
                  }}
                >
                  <View>
                    <Text style={styles.countryName}>{country.label}</Text>
                    <Text style={styles.countryMeta}>
                      {country.flag} {country.code}
                    </Text>
                  </View>
                  {selectedCountry.code === country.code ? (
                    <Ionicons name="checkmark-circle" size={22} color="#111827" />
                  ) : null}
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        <Modal animationType="slide" transparent visible={otpVisible} onRequestClose={() => setOtpVisible(false)}>
          <Pressable style={styles.overlay} onPress={() => setOtpVisible(false)}>
            <Pressable style={styles.sheet} onPress={() => null}>
              <Text style={styles.sheetTitle}>Code OTP</Text>
              <Text style={styles.sheetSubtitle}>
                Entrez le code à 6 chiffres envoyé à {email.trim() || "votre adresse Gmail"}.
              </Text>

              <View style={styles.otpRow}>
                {otpDigits.map((digit, index) => (
                  <View key={`${digit}-${index}`} style={styles.otpBox}>
                    <Text style={styles.otpDigit}>{digit.trim() || ""}</Text>
                  </View>
                ))}
              </View>

              <TextInput
                value={otpCode}
                onChangeText={(value) => {
                  setOtpCode(value.replace(/\D/g, "").slice(0, 6));
                  setErrors((current) => ({ ...current, otpCode: undefined }));
                }}
                placeholder="000000"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
                onFocus={() => setFocusedField("otpCode")}
                onBlur={() => setFocusedField((current) => (current === "otpCode" ? null : current))}
                style={[
                  styles.otpInput,
                  focusedField === "otpCode" ? styles.inputShellFocused : null,
                  errors.otpCode ? styles.inputShellError : null,
                ]}
              />

              <Text style={styles.otpNote}>
                Pour votre confort, le code a été envoyé par Email (Gratuit) plutôt que par SMS.
              </Text>
              {errors.otpCode ? <Text style={styles.errorText}>{errors.otpCode}</Text> : null}

              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed ? styles.primaryButtonPressed : null, isVerifying ? styles.buttonDisabled : null]}
                onPress={() => void handleOtpSubmit()}
                disabled={isVerifying}
              >
                {isVerifying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Valider</Text>}
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F3EE",
  },
  keyboardArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 18,
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    gap: 16,
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoOrb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
  },
  brandBlock: {
    gap: 2,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  brandCaption: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "700",
  },
  heroHeadingBlock: {
    gap: 8,
  },
  heroEyebrow: {
    color: "#FED7AA",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: "#E5E7EB",
    lineHeight: 21,
    fontSize: 14,
    fontWeight: "600",
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  heroStatValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  heroStatLabel: {
    color: "#D1D5DB",
    fontSize: 11,
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "#FFFCF8",
    borderRadius: 26,
    padding: 18,
    gap: 18,
    borderWidth: 1,
    borderColor: "#EEE4D8",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  fieldGroup: {
    gap: 10,
  },
  label: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 15,
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0E7DB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    gap: 12,
  },
  inputShellFocused: {
    borderColor: "#EA580C",
    backgroundColor: "#FFFFFF",
  },
  phoneShell: {
    paddingRight: 10,
  },
  inputShellError: {
    borderColor: "#DC2626",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF4E8",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapFocused: {
    backgroundColor: "#FED7AA",
  },
  input: {
    flex: 1,
    color: "#111827",
    fontSize: 16,
    paddingVertical: 16,
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F6EFE5",
  },
  countryFlag: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 12,
  },
  countryCode: {
    color: "#111827",
    fontWeight: "700",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    marginTop: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  primaryButtonPressed: {
    backgroundColor: "#EA580C",
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    opacity: 0.82,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(17, 24, 39, 0.35)",
  },
  sheet: {
    backgroundColor: "#FFFCF8",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 18,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  sheetSubtitle: {
    color: "#64748B",
    lineHeight: 22,
    fontWeight: "600",
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E7DB",
  },
  countryName: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 15,
  },
  countryMeta: {
    color: "#64748B",
    marginTop: 4,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0E7DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  otpDigit: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
  },
  otpInput: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0E7DB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    color: "#111827",
    fontSize: 20,
    letterSpacing: 6,
    textAlign: "center",
  },
  otpNote: {
    color: "#64748B",
    lineHeight: 21,
    fontSize: 13,
    fontWeight: "500",
  },
});
