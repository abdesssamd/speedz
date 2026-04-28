import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { Ionicons } from "@expo/vector-icons";

export function LanguageScreen() {
  const { language, setLanguage, t, isRTL } = useApp();

  const options = [
    { id: "fr", label: t("french"), sublabel: "Français", flag: "🇫🇷" },
    { id: "ar", label: t("arabic"), sublabel: "العربية", flag: "🇩🇿" },
  ] as const;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.eyebrow}>Préférences</Text>
        <Text style={[s.title,{textAlign:isRTL?"right":"left"}]}>{t("language")}</Text>
        <Text style={[s.subtitle,{textAlign:isRTL?"right":"left"}]}>{t("language_subtitle")}</Text>

        <AnimatedCard style={s.card}>
          {options.map((opt)=>{
            const active = language===opt.id;
            return (
              <ScalePressable key={opt.id} containerStyle={[s.langRow,active&&s.langRowActive]} onPress={()=>setLanguage(opt.id)}>
                <Text style={s.langFlag}>{opt.flag}</Text>
                <View style={{flex:1}}>
                  <Text style={[s.langLabel,active&&s.langLabelActive]}>{opt.label}</Text>
                  <Text style={s.langSublabel}>{opt.sublabel}</Text>
                </View>
                <View style={[s.checkCircle,active&&s.checkCircleActive]}>
                  {active?<Ionicons name="checkmark" size={14} color="#0A0A0F"/>:null}
                </View>
              </ScalePressable>
            );
          })}
        </AnimatedCard>
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
  card:{backgroundColor:"#12121A",borderRadius:24,borderWidth:1,borderColor:"#2A2A3A",overflow:"hidden"},
  langRow:{flexDirection:"row",alignItems:"center",gap:14,padding:18,borderBottomWidth:1,borderBottomColor:"#1E1E2C"},
  langRowActive:{backgroundColor:"rgba(245,158,11,0.05)"},
  langFlag:{fontSize:28},
  langLabel:{color:"#9B9BB0",fontWeight:"700",fontSize:16},
  langLabelActive:{color:"#F5F0E8"},
  langSublabel:{color:"#5C5C70",fontSize:12,marginTop:2},
  checkCircle:{width:26,height:26,borderRadius:13,borderWidth:1,borderColor:"#2A2A3A",alignItems:"center",justifyContent:"center"},
  checkCircleActive:{backgroundColor:"#F59E0B",borderColor:"#F59E0B"},
});
