import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { useApp } from "../context/AppContext";
import { Ionicons } from "@expo/vector-icons";

export function HelpScreen() {
  const { t, isRTL } = useApp();
  const faqs = [
    { q: t("faq_delivery"), a: t("faq_delivery_answer") },
    { q: t("faq_payment"), a: t("faq_payment_answer") },
    { q: t("faq_support"), a: t("faq_support_answer") },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.eyebrow}>Centre d'aide</Text>
        <Text style={[s.title,{textAlign:isRTL?"right":"left"}]}>{t("help_title")}</Text>
        <Text style={[s.subtitle,{textAlign:isRTL?"right":"left"}]}>{t("help_subtitle")}</Text>

        {faqs.map((item,index)=>(
          <AnimatedCard key={item.q} delay={Math.min(index*70,180)} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.qIconWrap}><Ionicons name="help-circle-outline" size={16} color="#F59E0B"/></View>
              <Text style={[s.question,{textAlign:isRTL?"right":"left",flex:1}]}>{item.q}</Text>
            </View>
            <Text style={[s.answer,{textAlign:isRTL?"right":"left"}]}>{item.a}</Text>
          </AnimatedCard>
        ))}

        <AnimatedCard style={s.contactCard}>
          <View style={s.contactIconWrap}><Ionicons name="mail" size={20} color="#F59E0B"/></View>
          <View style={{flex:1}}>
            <Text style={s.contactLabel}>Support direct</Text>
            <Text style={s.contactEmail}>support@fooddelyvry.app</Text>
          </View>
          <View style={s.contactArrow}><Ionicons name="arrow-forward" size={16} color="#F59E0B"/></View>
        </AnimatedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#0A0A0F"},
  content:{padding:18,gap:14,paddingBottom:32},
  eyebrow:{color:"#F59E0B",fontSize:10,fontWeight:"900",textTransform:"uppercase",letterSpacing:1.5},
  title:{color:"#F5F0E8",fontSize:28,fontWeight:"900"},
  subtitle:{color:"#9B9BB0",lineHeight:20,fontSize:13},
  card:{backgroundColor:"#12121A",borderRadius:20,borderWidth:1,borderColor:"#2A2A3A",padding:16,gap:12},
  cardHeader:{flexDirection:"row",alignItems:"flex-start",gap:10},
  qIconWrap:{width:30,height:30,borderRadius:15,backgroundColor:"rgba(245,158,11,0.1)",alignItems:"center",justifyContent:"center",marginTop:1},
  question:{color:"#F5F0E8",fontWeight:"800",fontSize:16,lineHeight:22},
  answer:{color:"#9B9BB0",lineHeight:21,fontSize:13,paddingLeft:40},
  contactCard:{flexDirection:"row",alignItems:"center",gap:14,backgroundColor:"#12121A",borderRadius:20,borderWidth:1,borderColor:"rgba(245,158,11,0.2)",padding:18},
  contactIconWrap:{width:44,height:44,borderRadius:22,backgroundColor:"rgba(245,158,11,0.12)",alignItems:"center",justifyContent:"center"},
  contactLabel:{color:"#9B9BB0",fontSize:11,fontWeight:"700",textTransform:"uppercase",letterSpacing:0.8},
  contactEmail:{color:"#F5F0E8",fontWeight:"800",fontSize:15,marginTop:2},
  contactArrow:{width:32,height:32,borderRadius:16,backgroundColor:"rgba(245,158,11,0.1)",alignItems:"center",justifyContent:"center"},
});
