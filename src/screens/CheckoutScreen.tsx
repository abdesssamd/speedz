import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { translatePayment } from "../i18n/mobile";
import { RootStackParamList } from "../navigation/AppNavigator";
import { formatCurrency } from "../services/format";
import { PaymentMethod } from "../types";

export function CheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    cart,
    user,
    savedAddresses,
    currentLocation,
    getCartSummary,
    createCheckoutDraft,
    pushNotification,
    promoCode,
    requestLocation,
    t,
    isRTL,
  } = useApp();
  const summary = getCartSummary();
  const paymentMethod: PaymentMethod = "Cash";
  const resolvedAddress = useMemo(() => {
    const defaultSavedAddress = savedAddresses.find((item) => item.isDefault)?.address?.trim();
    return (
      defaultSavedAddress ||
      user.defaultAddress?.trim() ||
      (currentLocation.source === "device" ? currentLocation.label.trim() : "") ||
      ""
    );
  }, [currentLocation.label, currentLocation.source, savedAddresses, user.defaultAddress]);
  const [address, setAddress] = useState(resolvedAddress);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!address.trim() || address === user.defaultAddress || address === currentLocation.label) {
      setAddress(resolvedAddress);
    }
  }, [address, currentLocation.label, resolvedAddress, user.defaultAddress]);

  if (!cart.length) return (
    <SafeAreaView style={s.safe}>
      <View style={s.emptyWrap}><EmptyState title={t("empty_cart")} message={t("empty_cart_back")}/></View>
    </SafeAreaView>
  );

  const onContinue = () => {
    const draft = createCheckoutDraft({ address, paymentMethod, notes });
    if (!draft.address.trim()) {
      pushNotification({title:t("address_required"),message:t("address_required_msg"),tone:"error"});
      return;
    }
    navigation.navigate("ConfirmOrder",{draft});
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#0A0A0F","#1a1207","#92400E"]} style={s.hero}>
          <Text style={s.heroEyebrow}>Finalisation</Text>
          <Text style={[s.heroTitle,{textAlign:isRTL?"right":"left"}]}>{t("checkout_title")}</Text>
          <View style={s.heroChips}>
            <View style={s.heroChip}>
              <Ionicons name="location-outline" size={13} color="#F59E0B"/>
              <Text style={s.heroChipText}>{currentLocation.source==="fallback"?t("demo_mode"):"GPS actif"}</Text>
            </View>
            <View style={s.heroChip}>
              <Ionicons name="time-outline" size={13} color="#F59E0B"/>
              <Text style={s.heroChipText}>{summary.estimatedDeliveryLabel}</Text>
            </View>
          </View>
        </LinearGradient>

        <AnimatedCard style={s.card}>
          <Text style={s.sectionLabel}>{t("delivery_address")}</Text>
          <View style={s.locationRow}>
            <View style={s.locationIcon}><Ionicons name="navigate" size={14} color="#F59E0B"/></View>
            <Text style={s.locationHint} numberOfLines={1}>{currentLocation.label}</Text>
          </View>
          <View style={s.addressInfoCard}>
            <View style={{flex:1,gap:4}}>
              <Text style={s.addressInfoTitle}>Adresse utilisee automatiquement</Text>
              <Text style={[s.addressInfoValue,{textAlign:isRTL?"right":"left"}]}>
                {address || "Touchez actualiser GPS ou ajoutez une adresse."}
              </Text>
            </View>
            <ScalePressable containerStyle={s.gpsButton} onPress={() => requestLocation()}>
              <Ionicons name="refresh-outline" size={16} color="#F59E0B"/>
            </ScalePressable>
          </View>
          <View style={s.inputWrap}>
            <Ionicons name="home-outline" size={16} color="#5C5C70"/>
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={[s.input,{textAlign:isRTL?"right":"left"}]}
              placeholder={t("delivery_address")}
              placeholderTextColor="#3A3A50"
            />
          </View>

          <Text style={s.sectionLabel}>{t("payment_method")}</Text>
          <View style={s.paymentCard}>
            <View style={s.paymentIconWrap}><Ionicons name="cash-outline" size={18} color="#F59E0B"/></View>
            <View style={{flex:1,gap:3}}>
              <Text style={s.paymentValue}>{translatePayment(isRTL?"ar":"fr",paymentMethod)}</Text>
              <Text style={[s.paymentHint,{textAlign:isRTL?"right":"left"}]}>{t("payment_step_notice")}</Text>
            </View>
          </View>

          <Text style={s.sectionLabel}>{t("delivery_instructions")}</Text>
          <View style={[s.inputWrap,{alignItems:"flex-start"}]}>
            <Ionicons name="create-outline" size={16} color="#5C5C70" style={{marginTop:2}}/>
            <TextInput value={notes} onChangeText={setNotes} style={[s.input,s.multiline,{textAlign:isRTL?"right":"left"}]} placeholder={t("access_hint")} placeholderTextColor="#3A3A50" multiline/>
          </View>
        </AnimatedCard>

        <AnimatedCard style={s.summaryCard}>
          <Text style={s.summaryTitle}>{t("summary")}</Text>
          {[{l:t("subtotal"),v:formatCurrency(summary.subtotal)},{l:t("delivery"),v:formatCurrency(summary.deliveryFee)},{l:t("distance"),v:`${summary.deliveryDistanceKm} km`},{l:t("service_fee"),v:formatCurrency(summary.serviceFee)}].map(r=>(
            <View key={r.l} style={s.summaryRow}><Text style={s.summaryLbl}>{r.l}</Text><Text style={s.summaryVal}>{r.v}</Text></View>
          ))}
          {summary.discountAmount?(<View style={s.summaryRow}><Text style={s.summaryLbl}>{t("discount")} {promoCode?`(${promoCode})`:""}</Text><Text style={s.discountVal}>- {formatCurrency(summary.discountAmount)}</Text></View>):null}
          <View style={s.divider}/>
          <View style={s.summaryRow}><Text style={s.totalLbl}>{t("total_to_pay")}</Text><Text style={s.totalVal}>{formatCurrency(summary.total)}</Text></View>
          <View style={s.pointsRow}>
            <Ionicons name="star" size={13} color="#F59E0B"/>
            <Text style={s.pointsText}><Text style={{color:"#F59E0B",fontWeight:"800"}}>{summary.pointsToEarn} pts</Text> {t("points_after_payment")}</Text>
          </View>
        </AnimatedCard>

        <ScalePressable containerStyle={s.primaryBtn} onPress={onContinue}>
          <LinearGradient colors={["#D97706","#F59E0B"]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.btnGradient}>
            <Text style={s.btnText}>{t("continue_confirmation")}</Text>
            <Ionicons name="arrow-forward" size={16} color="#0A0A0F"/>
          </LinearGradient>
        </ScalePressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#0A0A0F"},
  emptyWrap:{flex:1,justifyContent:"center",padding:18},
  content:{padding:14,gap:16,paddingBottom:32},
  hero:{borderRadius:26,padding:18,gap:12,borderWidth:1,borderColor:"#2A2A3A"},
  heroEyebrow:{color:"#F59E0B",fontSize:10,fontWeight:"900",textTransform:"uppercase",letterSpacing:1.5},
  heroTitle:{color:"#F5F0E8",fontSize:26,fontWeight:"900"},
  heroChips:{flexDirection:"row",flexWrap:"wrap",gap:8},
  heroChip:{flexDirection:"row",alignItems:"center",gap:5,backgroundColor:"rgba(245,158,11,0.1)",borderRadius:999,paddingHorizontal:12,paddingVertical:7,borderWidth:1,borderColor:"rgba(245,158,11,0.2)"},
  heroChipText:{color:"#F59E0B",fontWeight:"800",fontSize:12},
  card:{backgroundColor:"#12121A",borderRadius:24,borderWidth:1,borderColor:"#2A2A3A",padding:18,gap:14},
  sectionLabel:{color:"#9B9BB0",fontSize:11,fontWeight:"700",textTransform:"uppercase",letterSpacing:0.8},
  locationRow:{flexDirection:"row",alignItems:"center",gap:8},
  locationIcon:{width:28,height:28,borderRadius:14,backgroundColor:"rgba(245,158,11,0.12)",alignItems:"center",justifyContent:"center"},
  locationHint:{flex:1,color:"#5C5C70",fontWeight:"600",fontSize:13},
  addressInfoCard:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#16161F",borderRadius:18,borderWidth:1,borderColor:"rgba(245,158,11,0.18)",padding:14},
  addressInfoTitle:{color:"#F59E0B",fontSize:12,fontWeight:"800"},
  addressInfoValue:{color:"#F5F0E8",fontWeight:"700",fontSize:14,lineHeight:20},
  gpsButton:{width:44,height:44,borderRadius:16,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(245,158,11,0.08)",borderWidth:1,borderColor:"rgba(245,158,11,0.2)"},
  inputWrap:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#16161F",borderRadius:16,borderWidth:1,borderColor:"#2A2A3A",paddingHorizontal:14,paddingVertical:4},
  input:{flex:1,color:"#F5F0E8",paddingVertical:12,fontSize:14},
  multiline:{minHeight:80,textAlignVertical:"top",paddingTop:12},
  paymentCard:{flexDirection:"row",alignItems:"flex-start",gap:12,backgroundColor:"#16161F",borderRadius:18,borderWidth:1,borderColor:"rgba(245,158,11,0.2)",padding:14},
  paymentIconWrap:{width:36,height:36,borderRadius:18,backgroundColor:"rgba(245,158,11,0.12)",alignItems:"center",justifyContent:"center"},
  paymentValue:{color:"#F5F0E8",fontWeight:"900",fontSize:15},
  paymentHint:{color:"#9B9BB0",fontSize:12,lineHeight:18,fontWeight:"600"},
  summaryCard:{backgroundColor:"#12121A",borderRadius:24,padding:18,gap:12,borderWidth:1,borderColor:"#2A2A3A"},
  summaryTitle:{color:"#F5F0E8",fontWeight:"900",fontSize:18},
  summaryRow:{flexDirection:"row",justifyContent:"space-between"},
  summaryLbl:{color:"#9B9BB0",fontWeight:"600",fontSize:13},
  summaryVal:{color:"#F5F0E8",fontWeight:"800",fontSize:13},
  discountVal:{color:"#34D399",fontWeight:"900"},
  divider:{height:1,backgroundColor:"#1E1E2C",marginVertical:4},
  totalLbl:{color:"#F5F0E8",fontWeight:"900",fontSize:18},
  totalVal:{color:"#F59E0B",fontWeight:"900",fontSize:22},
  pointsRow:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"rgba(245,158,11,0.07)",borderRadius:12,padding:10,borderWidth:1,borderColor:"rgba(245,158,11,0.15)"},
  pointsText:{color:"#9B9BB0",fontSize:13,fontWeight:"600"},
  primaryBtn:{borderRadius:20,overflow:"hidden"},
  btnGradient:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingVertical:16},
  btnText:{color:"#0A0A0F",fontWeight:"900",fontSize:16},
});
