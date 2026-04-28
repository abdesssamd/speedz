import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "AuthOnboarding">;
type CountryOption = { code: string; flag: string; label: string };

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
  const [focusedField, setFocusedField] = useState<"fullName"|"phoneNumber"|"email"|"otpCode"|null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(countryOptions[0]);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [otpVisible, setOtpVisible] = useState(false);
  const [errors, setErrors] = useState<{fullName?:string;phoneNumber?:string;email?:string;otpCode?:string}>({});

  const otpDigits = useMemo(() => otpCode.padEnd(6, " ").slice(0, 6).split(""), [otpCode]);

  const validateForm = () => {
    const e: typeof errors = {};
    if (fullName.trim().length < 4 || !fullName.trim().includes(" ")) e.fullName = "Entrez votre nom et prénom.";
    if (phoneNumber.replace(/\D/g, "").length < 9) e.phoneNumber = "Entrez un numéro valide.";
    if (!/^[^\s@]+@gmail\.com$/i.test(email.trim())) e.email = "Utilisez une adresse Gmail valide.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    const result = await requestEmailAuthCode({ email, fullName });
    setIsSubmitting(false);
    if (!result.ok) { setErrors((c) => ({ ...c, email: result.error || "Envoi impossible." })); return; }
    setErrors((c) => ({ ...c, otpCode: undefined }));
    setOtpCode("");
    setOtpVisible(true);
  };

  const handleOtpSubmit = async () => {
    if (otpCode.length !== 6) { setErrors((c) => ({ ...c, otpCode: "Code OTP à 6 chiffres requis." })); return; }
    if (!authFlow.challengeId) { setErrors((c) => ({ ...c, otpCode: "Aucune demande active. Recommencez." })); return; }
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

          <LinearGradient colors={["#0A0A0F", "#1a1207", "#92400E"]} style={s.heroStrip}>
            <View style={s.heroRow}>
              <View style={s.logoOrb}><Ionicons name="flash" size={20} color="#F59E0B" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.brandName}>Speedz</Text>
                <Text style={s.brandCaption}>Express delivery · Algérie</Text>
              </View>
              <View style={s.fastBadge}>
                <Ionicons name="flash-outline" size={11} color="#0A0A0F" />
                <Text style={s.fastBadgeText}>Fast</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={s.titleBlock}>
            <Text style={s.eyebrow}>Inscription rapide</Text>
            <Text style={s.heroTitle}>Créer votre compte</Text>
            <Text style={s.heroSub}>Quelques secondes pour commander partout.</Text>
          </View>

          <View style={s.formCard}>
            {/* Full name */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Nom et prénom</Text>
              <View style={[s.inputShell, focusedField==="fullName"&&s.inputFocused, errors.fullName?s.inputError:null]}>
                <View style={[s.iconWrap, focusedField==="fullName"&&s.iconFocused]}>
                  <Ionicons name="person-outline" size={16} color={focusedField==="fullName"?"#F59E0B":"#5C5C70"} />
                </View>
                <TextInput value={fullName} onChangeText={setFullName} placeholder="Ex: Lina Benali"
                  placeholderTextColor="#3A3A50" autoCapitalize="words"
                  onFocus={()=>setFocusedField("fullName")} onBlur={()=>setFocusedField(c=>c==="fullName"?null:c)}
                  style={s.input} />
              </View>
              {errors.fullName?<Text style={s.errorText}>{errors.fullName}</Text>:null}
            </View>

            {/* Phone */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Téléphone</Text>
              <View style={[s.inputShell, focusedField==="phoneNumber"&&s.inputFocused, errors.phoneNumber?s.inputError:null]}>
                <View style={[s.iconWrap, focusedField==="phoneNumber"&&s.iconFocused]}>
                  <Ionicons name="call-outline" size={16} color={focusedField==="phoneNumber"?"#F59E0B":"#5C5C70"} />
                </View>
                <Pressable style={s.countrySelector} onPress={()=>setCountryPickerVisible(true)}>
                  <Text style={s.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={s.countryCode}>{selectedCountry.code}</Text>
                  <Ionicons name="chevron-down" size={12} color="#5C5C70" />
                </Pressable>
                <TextInput value={phoneNumber} onChangeText={(v)=>setPhoneNumber(v.replace(/[^\d\s-]/g,""))}
                  placeholder="0555 12 34 56" placeholderTextColor="#3A3A50" keyboardType="phone-pad"
                  onFocus={()=>setFocusedField("phoneNumber")} onBlur={()=>setFocusedField(c=>c==="phoneNumber"?null:c)}
                  style={s.input} />
              </View>
              {errors.phoneNumber?<Text style={s.errorText}>{errors.phoneNumber}</Text>:null}
            </View>

            {/* Email */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Email Gmail</Text>
              <View style={[s.inputShell, focusedField==="email"&&s.inputFocused, errors.email?s.inputError:null]}>
                <View style={[s.iconWrap, focusedField==="email"&&s.iconFocused]}>
                  <Ionicons name="mail-outline" size={16} color={focusedField==="email"?"#F59E0B":"#5C5C70"} />
                </View>
                <TextInput value={email} onChangeText={setEmail} placeholder="exemple@gmail.com"
                  placeholderTextColor="#3A3A50" keyboardType="email-address" autoCapitalize="none"
                  onFocus={()=>setFocusedField("email")} onBlur={()=>setFocusedField(c=>c==="email"?null:c)}
                  style={s.input} />
              </View>
              {errors.email?<Text style={s.errorText}>{errors.email}</Text>:null}
            </View>

            <Pressable style={[s.primaryBtn, isSubmitting&&s.btnDisabled]} onPress={()=>void handleNext()} disabled={isSubmitting}>
              <LinearGradient colors={["#D97706","#F59E0B"]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.btnGradient}>
                {isSubmitting
                  ? <ActivityIndicator color="#0A0A0F" />
                  : <><Text style={s.btnText}>Continuer</Text><Ionicons name="arrow-forward" size={16} color="#0A0A0F" /></>}
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>

        {/* Country Modal */}
        <Modal animationType="slide" transparent visible={countryPickerVisible} onRequestClose={()=>setCountryPickerVisible(false)}>
          <Pressable style={s.overlay} onPress={()=>setCountryPickerVisible(false)}>
            <Pressable style={s.sheet} onPress={()=>null}>
              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>Choisir un pays</Text>
              {countryOptions.map((c)=>(
                <Pressable key={c.code} style={s.countryRow} onPress={()=>{setSelectedCountry(c);setCountryPickerVisible(false);}}>
                  <Text style={s.countryName}>{c.label}</Text>
                  <Text style={s.countryMeta}>{c.flag} {c.code}</Text>
                  {selectedCountry.code===c.code?<Ionicons name="checkmark-circle" size={20} color="#F59E0B"/>:<View style={{width:20}}/>}
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        {/* OTP Modal */}
        <Modal animationType="slide" transparent visible={otpVisible} onRequestClose={()=>setOtpVisible(false)}>
          <Pressable style={s.overlay} onPress={()=>setOtpVisible(false)}>
            <Pressable style={s.sheet} onPress={()=>null}>
              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>Code OTP</Text>
              <Text style={s.sheetSub}>Envoyé à <Text style={{color:"#F59E0B"}}>{email.trim()||"votre Gmail"}</Text></Text>
              <View style={s.otpRow}>
                {otpDigits.map((d,i)=>(
                  <View key={i} style={[s.otpBox, d.trim()&&s.otpBoxFilled]}>
                    <Text style={s.otpDigit}>{d.trim()}</Text>
                  </View>
                ))}
              </View>
              <TextInput value={otpCode}
                onChangeText={(v)=>{setOtpCode(v.replace(/\D/g,"").slice(0,6));setErrors(c=>({...c,otpCode:undefined}));}}
                placeholder="000000" placeholderTextColor="#3A3A50" keyboardType="number-pad" maxLength={6}
                style={[s.otpInput, focusedField==="otpCode"&&s.inputFocused, errors.otpCode?s.inputError:null]}
                onFocus={()=>setFocusedField("otpCode")} onBlur={()=>setFocusedField(c=>c==="otpCode"?null:c)} />
              {errors.otpCode?<Text style={s.errorText}>{errors.otpCode}</Text>:null}
              <Text style={s.otpNote}>Code envoyé par Email (gratuit), pas SMS.</Text>
              <Pressable style={[s.primaryBtn, isVerifying&&s.btnDisabled]} onPress={()=>void handleOtpSubmit()} disabled={isVerifying}>
                <LinearGradient colors={["#D97706","#F59E0B"]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.btnGradient}>
                  {isVerifying?<ActivityIndicator color="#0A0A0F"/>:<Text style={s.btnText}>Valider</Text>}
                </LinearGradient>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#0A0A0F"},
  content:{flexGrow:1,paddingHorizontal:18,paddingVertical:20,gap:20},
  heroStrip:{borderRadius:24,padding:16,borderWidth:1,borderColor:"#2A2A3A"},
  heroRow:{flexDirection:"row",alignItems:"center",gap:12},
  logoOrb:{width:44,height:44,borderRadius:22,backgroundColor:"rgba(245,158,11,0.15)",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"rgba(245,158,11,0.3)"},
  brandName:{color:"#F5F0E8",fontSize:20,fontWeight:"900"},
  brandCaption:{color:"#9B9BB0",fontSize:11,fontWeight:"600"},
  fastBadge:{flexDirection:"row",alignItems:"center",gap:4,backgroundColor:"#F59E0B",borderRadius:999,paddingHorizontal:10,paddingVertical:5},
  fastBadgeText:{color:"#0A0A0F",fontSize:11,fontWeight:"900"},
  titleBlock:{gap:8,paddingHorizontal:2},
  eyebrow:{color:"#F59E0B",fontSize:10,fontWeight:"900",textTransform:"uppercase",letterSpacing:1.5},
  heroTitle:{color:"#F5F0E8",fontSize:28,fontWeight:"900",lineHeight:32},
  heroSub:{color:"#9B9BB0",fontSize:13,lineHeight:20,fontWeight:"500"},
  formCard:{backgroundColor:"#12121A",borderRadius:26,padding:20,gap:16,borderWidth:1,borderColor:"#2A2A3A"},
  fieldGroup:{gap:8},
  fieldLabel:{color:"#9B9BB0",fontWeight:"700",fontSize:11,textTransform:"uppercase",letterSpacing:0.8},
  inputShell:{flexDirection:"row",alignItems:"center",minHeight:52,borderRadius:16,borderWidth:1,borderColor:"#2A2A3A",backgroundColor:"#16161F",paddingHorizontal:12,gap:10},
  inputFocused:{borderColor:"#F59E0B",backgroundColor:"#1a1510"},
  inputError:{borderColor:"#F87171"},
  iconWrap:{width:30,height:30,borderRadius:15,backgroundColor:"#1E1E2C",alignItems:"center",justifyContent:"center"},
  iconFocused:{backgroundColor:"rgba(245,158,11,0.15)"},
  input:{flex:1,color:"#F5F0E8",fontSize:15,paddingVertical:10},
  countrySelector:{flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:8,paddingVertical:6,borderRadius:10,backgroundColor:"#1E1E2C"},
  countryFlag:{color:"#F5F0E8",fontWeight:"700",fontSize:11},
  countryCode:{color:"#9B9BB0",fontWeight:"700",fontSize:12},
  errorText:{color:"#F87171",fontSize:12},
  primaryBtn:{borderRadius:18,overflow:"hidden",marginTop:4},
  btnDisabled:{opacity:0.6},
  btnGradient:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:16},
  btnText:{color:"#0A0A0F",fontSize:15,fontWeight:"900"},
  overlay:{flex:1,justifyContent:"flex-end",backgroundColor:"rgba(0,0,0,0.75)"},
  sheet:{backgroundColor:"#12121A",borderTopLeftRadius:28,borderTopRightRadius:28,paddingHorizontal:20,paddingTop:16,paddingBottom:32,gap:16,borderTopWidth:1,borderColor:"#2A2A3A"},
  sheetHandle:{width:40,height:4,borderRadius:2,backgroundColor:"#2A2A3A",alignSelf:"center",marginBottom:4},
  sheetTitle:{color:"#F5F0E8",fontSize:22,fontWeight:"900"},
  sheetSub:{color:"#9B9BB0",fontSize:13,lineHeight:20},
  countryRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:14,borderBottomWidth:1,borderBottomColor:"#1E1E2C"},
  countryName:{color:"#F5F0E8",fontWeight:"700",flex:1},
  countryMeta:{color:"#9B9BB0",marginRight:12},
  otpRow:{flexDirection:"row",justifyContent:"space-between",gap:8},
  otpBox:{flex:1,height:52,borderRadius:14,borderWidth:1,borderColor:"#2A2A3A",backgroundColor:"#16161F",alignItems:"center",justifyContent:"center"},
  otpBoxFilled:{borderColor:"#F59E0B",backgroundColor:"rgba(245,158,11,0.08)"},
  otpDigit:{color:"#F5F0E8",fontSize:22,fontWeight:"900"},
  otpInput:{minHeight:52,borderRadius:16,borderWidth:1,borderColor:"#2A2A3A",backgroundColor:"#16161F",paddingHorizontal:14,color:"#F5F0E8",fontSize:20,letterSpacing:8,textAlign:"center"},
  otpNote:{color:"#5C5C70",fontSize:12,lineHeight:18},
});
