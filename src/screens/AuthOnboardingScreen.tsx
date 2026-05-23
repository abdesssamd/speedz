import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { alignStart, mobileTheme, rowDirection } from "../theme/mobile";

type Props = NativeStackScreenProps<RootStackParamList, "AuthOnboarding">;
type CountryOption = { code: string; flag: string; label: string };

const countryOptions: CountryOption[] = [
  { code: "+213", flag: "🇩🇿", label: "Algérie" },
  { code: "+33",  flag: "🇫🇷", label: "France" },
  { code: "+216", flag: "🇹🇳", label: "Tunisie" },
  { code: "+212", flag: "🇲🇦", label: "Maroc" },
];

export function AuthOnboardingScreen({ navigation }: Props) {
  const { authFlow, requestEmailAuthCode, verifyEmailAuthCode, t, isRTL } = useApp();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(countryOptions[0]);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [otpVisible, setOtpVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const otpDigits = useMemo(() => otpCode.padEnd(6, " ").slice(0, 6).split(""), [otpCode]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 4 || !fullName.trim().includes(" ")) e.fullName = "Entrez votre nom et prénom.";
    if (phoneNumber.replace(/\D/g, "").length < 9) e.phoneNumber = "Numéro invalide.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email.trim())) e.email = "Email invalide (exemple@domaine.com).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    const res = await requestEmailAuthCode({ email, fullName });
    setIsSubmitting(false);
    if (!res.ok) { setErrors((c) => ({ ...c, email: res.error || "Échec d'envoi." })); return; }
    setOtpCode(""); setOtpVisible(true);
  };

  const handleOtpSubmit = async () => {
    if (otpCode.length !== 6) { setErrors((c) => ({ ...c, otp: "Code à 6 chiffres requis." })); return; }
    if (!authFlow.challengeId) { setErrors((c) => ({ ...c, otp: "Session expirée. Recommencez." })); return; }
    setIsVerifying(true);
    const ok = await verifyEmailAuthCode({
      challengeId: authFlow.challengeId, code: otpCode, email, fullName,
      phone: `${selectedCountry.code}${phoneNumber.replace(/\D/g, "")}`,
    });
    setIsVerifying(false);
    if (ok) { setOtpVisible(false); navigation.replace("MainTabs"); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header illustration area */}
          <View style={s.illustrationArea}>
            <View style={s.logoCircle}><Ionicons name="fast-food" size={34} color="#FF7622" /></View>
            <Text style={s.brandName}>Speedz</Text>
            <Text style={s.brandTagline}>{t("auth_brand_tagline")} 🇩🇿</Text>
          </View>

          {/* Title */}
          <View style={s.titleBlock}>
            <Text style={[s.title, alignStart(isRTL)]}>{t("auth_create_account")}</Text>
            <Text style={[s.subtitle, alignStart(isRTL)]}>{t("auth_subtitle")}</Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            {/* Full name */}
            <View style={s.fieldGroup}>
              <Text style={[s.label, alignStart(isRTL)]}>{t("auth_full_name")}</Text>
              <View style={[s.inputWrap, focused === "name" && s.inputFocused, errors.fullName && s.inputError]}>
                <Ionicons name="person-outline" size={18} color={focused === "name" ? "#FF7622" : "#A0A5BA"} />
                <TextInput value={fullName} onChangeText={setFullName} placeholder="Ex: Amira Benali"
                  placeholderTextColor="#C4C4C4" autoCapitalize="words"
                  onFocus={() => setFocused("name")} onBlur={() => setFocused(null)} style={[s.input, alignStart(isRTL)]} />
              </View>
              {errors.fullName && <Text style={s.errorMsg}><Ionicons name="alert-circle-outline" size={12} color="#F44" /> {errors.fullName}</Text>}
            </View>

            {/* Phone */}
            <View style={s.fieldGroup}>
              <Text style={[s.label, alignStart(isRTL)]}>{t("auth_phone")}</Text>
              <View style={[s.inputWrap, rowDirection(isRTL), focused === "phone" && s.inputFocused, errors.phoneNumber && s.inputError]}>
                <Ionicons name="call-outline" size={18} color={focused === "phone" ? "#FF7622" : "#A0A5BA"} />
                <Pressable style={[s.countrySelector, rowDirection(isRTL)]} onPress={() => setCountryPickerVisible(true)}>
                  <Text style={s.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={s.countryCode}>{selectedCountry.code}</Text>
                  <Ionicons name="chevron-down" size={12} color="#A0A5BA" />
                </Pressable>
                <View style={s.inputDivider} />
                <TextInput value={phoneNumber} onChangeText={(v) => setPhoneNumber(v.replace(/[^\d\s-]/g, ""))}
                  placeholder="0555 12 34 56" placeholderTextColor="#C4C4C4" keyboardType="phone-pad"
                  onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)} style={[s.input, alignStart(isRTL)]} />
              </View>
              {errors.phoneNumber && <Text style={s.errorMsg}>{errors.phoneNumber}</Text>}
            </View>

            {/* Email */}
            <View style={s.fieldGroup}>
              <Text style={[s.label, alignStart(isRTL)]}>{t("auth_email")}</Text>
              <View style={[s.inputWrap, focused === "email" && s.inputFocused, errors.email && s.inputError]}>
                <Ionicons name="mail-outline" size={18} color={focused === "email" ? "#FF7622" : "#A0A5BA"} />
                <TextInput value={email} onChangeText={setEmail} placeholder="exemple@domaine.com"
                  placeholderTextColor="#C4C4C4" keyboardType="email-address" autoCapitalize="none"
                  onFocus={() => setFocused("email")} onBlur={() => setFocused(null)} style={[s.input, alignStart(isRTL)]} />
              </View>
              {errors.email && <Text style={s.errorMsg}>{errors.email}</Text>}
            </View>

            <Pressable style={[s.primaryBtn, isSubmitting && s.btnDisabled]} onPress={() => void handleNext()} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={s.primaryBtnText}>{t("auth_continue")} →</Text>}
            </Pressable>

            <Text style={s.termsText}>{t("auth_phone_notice")}</Text>
          </View>
        </ScrollView>

        {/* Country picker */}
        <Modal animationType="slide" transparent visible={countryPickerVisible} onRequestClose={() => setCountryPickerVisible(false)}>
          <Pressable style={s.overlay} onPress={() => setCountryPickerVisible(false)}>
            <Pressable style={s.sheet} onPress={() => null}>
              <View style={s.sheetHandle} />
              <Text style={[s.sheetTitle, alignStart(isRTL)]}>{t("auth_choose_country_code")}</Text>
              {countryOptions.map((c) => (
                <Pressable key={c.code} style={[s.sheetRow, rowDirection(isRTL)]} onPress={() => { setSelectedCountry(c); setCountryPickerVisible(false); }}>
                  <Text style={s.sheetFlag}>{c.flag}</Text>
                  <Text style={[s.sheetCountry, alignStart(isRTL)]}>{c.label}</Text>
                  <Text style={s.sheetCode}>{c.code}</Text>
                  {selectedCountry.code === c.code && <Ionicons name="checkmark-circle" size={20} color="#FF7622" />}
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        {/* OTP modal */}
        <Modal animationType="slide" transparent visible={otpVisible} onRequestClose={() => setOtpVisible(false)}>
          <Pressable style={s.overlay} onPress={() => setOtpVisible(false)}>
            <Pressable style={s.sheet} onPress={() => null}>
              <View style={s.sheetHandle} />
              <View style={s.otpIconWrap}><Ionicons name="shield-checkmark" size={28} color="#FF7622" /></View>
              <Text style={[s.sheetTitle, alignStart(isRTL)]}>{t("auth_email_verification")}</Text>
              <Text style={[s.otpSub, alignStart(isRTL)]}>{t("auth_code_sent_to")} <Text style={{ color: "#FF7622", fontWeight: "700" }}>{email}</Text></Text>
              <View style={s.otpBoxRow}>
                {otpDigits.map((d, i) => (
                  <View key={i} style={[s.otpBox, d.trim() && s.otpBoxFilled]}>
                    <Text style={s.otpDigit}>{d.trim()}</Text>
                  </View>
                ))}
              </View>
              <TextInput value={otpCode} onChangeText={(v) => { setOtpCode(v.replace(/\D/g, "").slice(0, 6)); setErrors((c) => ({ ...c, otp: "" })); }}
                placeholder="000000" placeholderTextColor="#C4C4C4" keyboardType="number-pad" maxLength={6}
                style={[s.otpInput, errors.otp && s.inputError]} />
              {errors.otp ? <Text style={s.errorMsg}>{errors.otp}</Text> : null}
              <Text style={s.otpNote}>📧 {t("auth_email_code_notice")}</Text>
              <Pressable style={[s.primaryBtn, isVerifying && s.btnDisabled]} onPress={() => void handleOtpSubmit()} disabled={isVerifying}>
                {isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={s.primaryBtnText}>{t("auth_validate_account")}</Text>}
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: mobileTheme.colors.background },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32, gap: 24 },

  illustrationArea: { alignItems: "center", gap: 12, paddingVertical: 20 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center", shadowColor: "#FF7622", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  brandName: { color: mobileTheme.colors.ink, fontSize: 28, fontWeight: "900" },
  brandTagline: { color: mobileTheme.colors.textSoft, fontSize: 14, fontWeight: "500" },

  titleBlock: { gap: 6 },
  title: { color: mobileTheme.colors.ink, fontSize: 26, fontWeight: "900" },
  subtitle: { color: mobileTheme.colors.textSoft, fontSize: 14, lineHeight: 20 },

  form: { backgroundColor: mobileTheme.colors.surface, borderRadius: 28, padding: 24, gap: 18, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  fieldGroup: { gap: 8 },
  label: { color: mobileTheme.colors.ink, fontSize: 14, fontWeight: "700" },
  inputWrap: { alignItems: "center", gap: 10, minHeight: 54, borderRadius: 16, borderWidth: 1.5, borderColor: mobileTheme.colors.borderSoft, backgroundColor: mobileTheme.colors.surfaceMuted, paddingHorizontal: 14 },
  inputFocused: { borderColor: "#FF7622", backgroundColor: "#FFF9F5" },
  inputError: { borderColor: "#F44336" },
  input: { flex: 1, color: mobileTheme.colors.ink, fontSize: 15, paddingVertical: 8 },
  inputDivider: { width: 1, height: 22, backgroundColor: mobileTheme.colors.borderSoft, marginHorizontal: 2 },
  countrySelector: { alignItems: "center", gap: 4 },
  countryFlag: { fontSize: 18 },
  countryCode: { color: "#181C2E", fontWeight: "700", fontSize: 13 },
  errorMsg: { color: "#F44336", fontSize: 12, fontWeight: "600" },

  primaryBtn: { backgroundColor: "#FF7622", borderRadius: 18, paddingVertical: 17, alignItems: "center", shadowColor: "#FF7622", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  termsText: { color: "#A0A5BA", fontSize: 12, textAlign: "center", lineHeight: 18 },
  termsLink: { color: "#FF7622", fontWeight: "700" },

  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: mobileTheme.colors.overlay },
  sheet: { backgroundColor: mobileTheme.colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 36, gap: 16 },
  sheetHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: "#E5E5E5", alignSelf: "center", marginBottom: 8 },
  sheetTitle: { color: mobileTheme.colors.ink, fontSize: 22, fontWeight: "900" },
  sheetRow: { alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: mobileTheme.colors.background },
  sheetFlag: { fontSize: 24 },
  sheetCountry: { flex: 1, color: mobileTheme.colors.ink, fontWeight: "700", fontSize: 16 },
  sheetCode: { color: mobileTheme.colors.textSoft, fontWeight: "600" },

  otpIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center", alignSelf: "center" },
  otpSub: { color: mobileTheme.colors.textSoft, fontSize: 14, lineHeight: 20 },
  otpBoxRow: { flexDirection: "row", gap: 10, justifyContent: "center" },
  otpBox: { width: 46, height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: "#EFEFEF", backgroundColor: "#FAFAFA", alignItems: "center", justifyContent: "center" },
  otpBoxFilled: { borderColor: "#FF7622", backgroundColor: "#FFF9F5" },
  otpDigit: { color: "#181C2E", fontSize: 22, fontWeight: "900" },
  otpInput: { minHeight: 54, borderRadius: 16, borderWidth: 1.5, borderColor: "#EFEFEF", backgroundColor: "#FAFAFA", paddingHorizontal: 14, color: "#181C2E", fontSize: 22, letterSpacing: 10, textAlign: "center" },
  otpNote: { color: "#A0A5BA", fontSize: 12, textAlign: "center", lineHeight: 18 },
});
