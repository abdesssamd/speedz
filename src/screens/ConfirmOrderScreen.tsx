import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { translatePayment } from "../i18n/mobile";
import { RootStackParamList } from "../navigation/AppNavigator";
import { formatCurrency } from "../services/format";

type ConfirmRoute = RouteProp<RootStackParamList,"ConfirmOrder">;

export function ConfirmOrderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ConfirmRoute>();
  const { cartRestaurant, cart, getCartSummary, placeOrder, promoCode, t, isRTL } = useApp();
  const summary = getCartSummary();
  const draft = route.params.draft;

  const onPay = async () => {
    const result = await placeOrder(draft);
    if (!result.order) { Alert.alert(t("impossible_order"),result.error??t("check_cart")); return; }
    Alert.alert(t("order_confirmed"),`${result.order.id} ${t("order_created")} ${result.order.pointsEarned} ${t("points")}`,[{text:t("see_orders"),onPress:()=>navigation.navigate("MainTabs")}]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <LinearGradient colors={["#0A0A0F","#1a1207","#92400E"]} style={s.hero}>
          <Text style={s.heroEyebrow}>Dernière étape</Text>
          <Text style={[s.heroTitle,{textAlign:isRTL?"right":"left"}]}>{t("final_confirmation")}</Text>
          <Text style={[s.heroSub,{textAlign:isRTL?"right":"left"}]}>{t("final_confirmation_msg")}</Text>
        </LinearGradient>

        <AnimatedCard style={s.card}>
          <Text style={s.cardTitle}>{cartRestaurant?.name}</Text>
          {[
            {icon:"location-outline" as const,val:draft.address},
            {icon:"cash-outline" as const,val:translatePayment(isRTL?"ar":"fr",draft.paymentMethod)},
            ...(draft.notes?[{icon:"create-outline" as const,val:draft.notes}]:[]),
          ].map((row,i)=>(
            <View key={i} style={s.infoRow}>
              <View style={s.infoIconWrap}><Ionicons name={row.icon} size={14} color="#F59E0B"/></View>
              <Text style={s.infoText}>{row.val}</Text>
            </View>
          ))}
        </AnimatedCard>

        <FlatList
          data={cart} keyExtractor={(item)=>item.id} showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          renderItem={({item})=>(
            <View style={s.lineItem}>
              <View style={s.lineLeft}>
                <Text style={s.lineQtyBadge}>{item.quantity}×</Text>
                <View style={{flex:1}}>
                  <Text style={s.lineTitle}>{item.name}</Text>
                  <Text style={s.lineMeta}>{item.selectedOptions.length?item.selectedOptions.map(o=>o.choiceName).join(", "):t("no_option")}</Text>
                </View>
              </View>
              <Text style={s.linePrice}>{formatCurrency((item.basePrice+item.selectedOptions.reduce((sum,o)=>sum+o.priceDelta,0))*item.quantity)}</Text>
            </View>
          )}
          ListFooterComponent={
            <AnimatedCard style={s.summaryCard}>
              {[{l:t("subtotal"),v:formatCurrency(summary.subtotal)},{l:t("delivery"),v:formatCurrency(summary.deliveryFee)},{l:t("service_fee"),v:formatCurrency(summary.serviceFee)}].map(r=>(
                <View key={r.l} style={s.summaryRow}><Text style={s.summaryLbl}>{r.l}</Text><Text style={s.summaryVal}>{r.v}</Text></View>
              ))}
              {summary.discountAmount?(<View style={s.summaryRow}><Text style={s.summaryLbl}>{t("discount")} {promoCode?`(${promoCode})`:""}</Text><Text style={s.discountVal}>- {formatCurrency(summary.discountAmount)}</Text></View>):null}
              <View style={s.divider}/>
              <View style={s.summaryRow}><Text style={s.totalLbl}>{t("total")}</Text><Text style={s.totalVal}>{formatCurrency(summary.total)}</Text></View>
            </AnimatedCard>
          }
        />

        <ScalePressable containerStyle={s.payBtn} onPress={onPay}>
          <LinearGradient colors={["#D97706","#F59E0B"]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.payGradient}>
            <Ionicons name="checkmark-circle" size={18} color="#0A0A0F"/>
            <Text style={s.payText}>{t("payment")} & {t("order_confirmed")}</Text>
          </LinearGradient>
        </ScalePressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#0A0A0F"},
  content:{flex:1,paddingHorizontal:14,paddingTop:12,gap:14},
  hero:{borderRadius:26,padding:18,gap:8,borderWidth:1,borderColor:"#2A2A3A"},
  heroEyebrow:{color:"#F59E0B",fontSize:10,fontWeight:"900",textTransform:"uppercase",letterSpacing:1.5},
  heroTitle:{color:"#F5F0E8",fontSize:26,fontWeight:"900"},
  heroSub:{color:"#9B9BB0",fontWeight:"600",lineHeight:20,fontSize:13},
  card:{backgroundColor:"#12121A",borderRadius:22,borderWidth:1,borderColor:"#2A2A3A",padding:16,gap:12},
  cardTitle:{color:"#F5F0E8",fontWeight:"900",fontSize:18},
  infoRow:{flexDirection:"row",alignItems:"center",gap:10},
  infoIconWrap:{width:28,height:28,borderRadius:14,backgroundColor:"rgba(245,158,11,0.1)",alignItems:"center",justifyContent:"center"},
  infoText:{flex:1,color:"#9B9BB0",lineHeight:20,fontWeight:"600",fontSize:13},
  listContent:{gap:10,paddingBottom:110},
  lineItem:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:12,backgroundColor:"#12121A",borderRadius:18,borderWidth:1,borderColor:"#2A2A3A",padding:14},
  lineLeft:{flex:1,flexDirection:"row",alignItems:"flex-start",gap:10},
  lineQtyBadge:{color:"#F59E0B",fontWeight:"900",fontSize:14,minWidth:22},
  lineTitle:{color:"#F5F0E8",fontWeight:"800",fontSize:14},
  lineMeta:{color:"#9B9BB0",marginTop:3,lineHeight:17,fontSize:12},
  linePrice:{color:"#F5F0E8",fontWeight:"900"},
  summaryCard:{backgroundColor:"#12121A",borderRadius:22,padding:18,gap:10,borderWidth:1,borderColor:"#2A2A3A"},
  summaryRow:{flexDirection:"row",justifyContent:"space-between"},
  summaryLbl:{color:"#9B9BB0",fontWeight:"600",fontSize:13},
  summaryVal:{color:"#F5F0E8",fontWeight:"800",fontSize:13},
  discountVal:{color:"#34D399",fontWeight:"900"},
  divider:{height:1,backgroundColor:"#1E1E2C",marginVertical:4},
  totalLbl:{color:"#F5F0E8",fontWeight:"900",fontSize:18},
  totalVal:{color:"#F59E0B",fontWeight:"900",fontSize:22},
  payBtn:{position:"absolute",left:14,right:14,bottom:14,borderRadius:20,overflow:"hidden"},
  payGradient:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingVertical:16},
  payText:{color:"#0A0A0F",fontWeight:"900",fontSize:16},
});
