import React from "react";
import { Clipboard, SafeAreaView, Share, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const INVITE_CODE = "FOOD-2026";

export function InviteScreen() {
  const { t, isRTL, pushNotification } = useApp();

  const copyCode = async () => {
    await Clipboard.setString(INVITE_CODE);
    pushNotification({ title: t("code_copied"), message: t("code_copied_msg"), tone: "success" });
  };

  const shareCode = async () => {
    await Share.share({ message: `${t("invite_code")}: ${INVITE_CODE}` });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.eyebrow}>Programme de parrainage</Text>
        <Text style={[s.title,{textAlign:isRTL?"right":"left"}]}>{t("invite_title")}</Text>
        <Text style={[s.subtitle,{textAlign:isRTL?"right":"left"}]}>{t("invite_subtitle")}</Text>

        <AnimatedCard style={s.card}>
          <LinearGradient colors={["#0A0A0F","#1a1207","#92400E"]} style={s.cardGradient}>
            <View style={s.codeSection}>
              <View style={s.codeIconWrap}><Ionicons name="gift" size={24} color="#F59E0B"/></View>
              <View>
                <Text style={s.codeLabel}>{t("invite_code")}</Text>
                <Text style={s.code}>{INVITE_CODE}</Text>
              </View>
            </View>
            <View style={s.codeDivider}/>
            <View style={s.actions}>
              <ScalePressable containerStyle={s.primaryBtn} onPress={copyCode}>
                <Ionicons name="copy-outline" size={15} color="#0A0A0F"/>
                <Text style={s.primaryBtnText}>{t("copy_code")}</Text>
              </ScalePressable>
              <ScalePressable containerStyle={s.secondaryBtn} onPress={shareCode}>
                <Ionicons name="share-social-outline" size={15} color="#F59E0B"/>
                <Text style={s.secondaryBtnText}>{t("share_code")}</Text>
              </ScalePressable>
            </View>
          </LinearGradient>
        </AnimatedCard>

        {/* How it works */}
        {[{icon:"person-add-outline" as const,text:"Invitez un ami avec votre code"},{icon:"bag-check-outline" as const,text:"Il passe sa 1ère commande"},{icon:"star-outline" as const,text:"Vous gagnez tous les deux des points"}].map((step,i)=>(
          <View key={i} style={s.stepRow}>
            <View style={s.stepNum}><Text style={s.stepNumText}>{i+1}</Text></View>
            <View style={s.stepIconWrap}><Ionicons name={step.icon} size={18} color="#F59E0B"/></View>
            <Text style={s.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#0A0A0F"},
  content:{padding:18,gap:18},
  eyebrow:{color:"#F59E0B",fontSize:10,fontWeight:"900",textTransform:"uppercase",letterSpacing:1.5},
  title:{color:"#F5F0E8",fontSize:28,fontWeight:"900"},
  subtitle:{color:"#9B9BB0",lineHeight:20,fontSize:13},
  card:{borderRadius:26,overflow:"hidden"},
  cardGradient:{padding:22,gap:18,borderRadius:26,borderWidth:1,borderColor:"#2A2A3A"},
  codeSection:{flexDirection:"row",alignItems:"center",gap:16},
  codeIconWrap:{width:52,height:52,borderRadius:26,backgroundColor:"rgba(245,158,11,0.15)",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"rgba(245,158,11,0.3)"},
  codeLabel:{color:"#9B9BB0",fontSize:11,fontWeight:"700",textTransform:"uppercase",letterSpacing:0.8,marginBottom:4},
  code:{color:"#F5F0E8",fontSize:30,fontWeight:"900",letterSpacing:3},
  codeDivider:{height:1,backgroundColor:"rgba(255,255,255,0.06)"},
  actions:{flexDirection:"row",gap:12},
  primaryBtn:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,backgroundColor:"#F59E0B",borderRadius:16,paddingVertical:13},
  primaryBtnText:{color:"#0A0A0F",fontWeight:"900"},
  secondaryBtn:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,backgroundColor:"rgba(245,158,11,0.1)",borderRadius:16,paddingVertical:13,borderWidth:1,borderColor:"rgba(245,158,11,0.25)"},
  secondaryBtnText:{color:"#F59E0B",fontWeight:"800"},
  stepRow:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#12121A",borderRadius:18,padding:14,borderWidth:1,borderColor:"#2A2A3A"},
  stepNum:{width:24,height:24,borderRadius:12,backgroundColor:"rgba(245,158,11,0.12)",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"rgba(245,158,11,0.2)"},
  stepNumText:{color:"#F59E0B",fontWeight:"900",fontSize:12},
  stepIconWrap:{width:36,height:36,borderRadius:18,backgroundColor:"rgba(245,158,11,0.08)",alignItems:"center",justifyContent:"center"},
  stepText:{flex:1,color:"#9B9BB0",fontWeight:"600",lineHeight:20,fontSize:13},
});
