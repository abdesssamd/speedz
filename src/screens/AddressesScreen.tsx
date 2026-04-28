import React, { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedCard } from "../components/AnimatedCard";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { Ionicons } from "@expo/vector-icons";

export function AddressesScreen() {
  const { savedAddresses, addSavedAddress, t, isRTL } = useApp();
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");

  const onSave = () => {
    if (!label.trim() || !address.trim()) return;
    addSavedAddress({ label, address });
    setLabel(""); setAddress("");
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.title,{textAlign:isRTL?"right":"left"}]}>{t("saved_addresses")}</Text>

        {savedAddresses.map((item,index)=>(
          <AnimatedCard key={item.id} delay={Math.min(index*70,180)} style={s.addressCard}>
            <View style={s.addressTop}>
              <View style={s.addressIconWrap}><Ionicons name="location" size={16} color="#F59E0B"/></View>
              <View style={{flex:1}}>
                <View style={s.addressLabelRow}>
                  <Text style={s.addressLabel}>{item.label}</Text>
                  {item.isDefault?<View style={s.defaultBadge}><Text style={s.defaultBadgeText}>{t("default_address_badge")}</Text></View>:null}
                </View>
                <Text style={[s.addressText,{textAlign:isRTL?"right":"left"}]}>{item.address}</Text>
              </View>
            </View>
          </AnimatedCard>
        ))}

        <AnimatedCard style={s.formCard}>
          <View style={s.formHeader}>
            <View style={s.formIconWrap}><Ionicons name="add" size={18} color="#F59E0B"/></View>
            <Text style={s.formTitle}>{t("add_address")}</Text>
          </View>
          <View style={s.inputWrap}>
            <Ionicons name="bookmark-outline" size={15} color="#5C5C70"/>
            <TextInput value={label} onChangeText={setLabel} placeholder={t("address_placeholder")} placeholderTextColor="#3A3A50"
              style={[s.input,{textAlign:isRTL?"right":"left"}]}/>
          </View>
          <View style={[s.inputWrap,{alignItems:"flex-start"}]}>
            <Ionicons name="map-outline" size={15} color="#5C5C70" style={{marginTop:2}}/>
            <TextInput value={address} onChangeText={setAddress} placeholder={t("full_address")} placeholderTextColor="#3A3A50"
              style={[s.input,s.multiline,{textAlign:isRTL?"right":"left"}]} multiline/>
          </View>
          <ScalePressable containerStyle={s.saveBtn} onPress={onSave}>
            <Ionicons name="checkmark" size={16} color="#0A0A0F"/>
            <Text style={s.saveBtnText}>{t("save_address")}</Text>
          </ScalePressable>
        </AnimatedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#0A0A0F"},
  content:{padding:18,gap:14,paddingBottom:32},
  title:{color:"#F5F0E8",fontSize:28,fontWeight:"900"},
  addressCard:{backgroundColor:"#12121A",borderRadius:20,borderWidth:1,borderColor:"#2A2A3A",padding:16},
  addressTop:{flexDirection:"row",alignItems:"flex-start",gap:12},
  addressIconWrap:{width:36,height:36,borderRadius:18,backgroundColor:"rgba(245,158,11,0.12)",alignItems:"center",justifyContent:"center",marginTop:2,borderWidth:1,borderColor:"rgba(245,158,11,0.2)"},
  addressLabelRow:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:4},
  addressLabel:{color:"#F5F0E8",fontWeight:"800",fontSize:16},
  defaultBadge:{backgroundColor:"rgba(245,158,11,0.12)",borderRadius:999,paddingHorizontal:8,paddingVertical:4,borderWidth:1,borderColor:"rgba(245,158,11,0.25)"},
  defaultBadgeText:{color:"#F59E0B",fontWeight:"800",fontSize:11},
  addressText:{color:"#9B9BB0",lineHeight:20,fontSize:13},
  formCard:{backgroundColor:"#12121A",borderRadius:22,borderWidth:1,borderColor:"#2A2A3A",padding:18,gap:14},
  formHeader:{flexDirection:"row",alignItems:"center",gap:10},
  formIconWrap:{width:34,height:34,borderRadius:17,backgroundColor:"rgba(245,158,11,0.1)",alignItems:"center",justifyContent:"center"},
  formTitle:{color:"#F5F0E8",fontWeight:"800",fontSize:17},
  inputWrap:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#16161F",borderRadius:16,borderWidth:1,borderColor:"#2A2A3A",paddingHorizontal:14,paddingVertical:4},
  input:{flex:1,color:"#F5F0E8",paddingVertical:12,fontSize:14},
  multiline:{minHeight:80,textAlignVertical:"top",paddingTop:12},
  saveBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,backgroundColor:"#F59E0B",borderRadius:16,paddingVertical:14},
  saveBtnText:{color:"#0A0A0F",fontWeight:"900",fontSize:15},
});
